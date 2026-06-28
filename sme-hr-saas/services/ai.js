const { getActiveProvider } = require('../config/ai-providers');

async function callLLM(messages, { temperature = 0.3, maxTokens = 1024 } = {}) {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error('No AI provider configured. Set GROQ_API_KEY, CEREBRAS_API_KEY, TOGETHER_API_KEY, or GEMINI_API_KEY.');
  }

  if (provider.isGemini) {
    return callGemini(provider, messages, { temperature, maxTokens });
  }

  const res = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: provider.headers(provider.apiKey),
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.name} API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(provider, messages, { temperature, maxTokens }) {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemInstruction = messages.find(m => m.role === 'system');

  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const url = `${provider.baseUrl}?key=${provider.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function buildRoleContext(role, company) {
  const parts = [];

  if (company) {
    parts.push(`Company: ${company.name} (${company.sector || 'general'}, ${company.size} employees, ${company.region || company.country})`);
    if (company.brandValues?.length) parts.push(`Values: ${company.brandValues.join(', ')}`);
    if (company.languages?.length) parts.push(`Working languages: ${company.languages.join(', ')}`);
    if (company.jointCommittee) parts.push(`Joint Committee (paritair comité): ${company.jointCommittee}`);
  }

  if (role) {
    parts.push(`\nRole: ${role.title} (${role.level}) — ${role.department}`);
    parts.push(`Contract: ${role.contractType}, ${role.workRegime}, ${role.remotePolicy}`);
    if (role.mustHaveSkills?.length) parts.push(`Must-have skills: ${role.mustHaveSkills.join(', ')}`);
    if (role.niceToHaveSkills?.length) parts.push(`Nice-to-have skills: ${role.niceToHaveSkills.join(', ')}`);
    if (role.minYearsExperience) parts.push(`Minimum experience: ${role.minYearsExperience} years`);
    if (role.educationLevel) parts.push(`Education: ${role.educationLevel}`);
    if (role.certifications?.length) parts.push(`Certifications valued: ${role.certifications.join(', ')}`);
    if (role.responsibilities?.length) parts.push(`Key responsibilities:\n${role.responsibilities.map(r => `- ${r}`).join('\n')}`);
    if (role.dealBreakers?.length) parts.push(`Deal breakers (auto-reject if missing): ${role.dealBreakers.join(', ')}`);
    if (role.cultureFit) parts.push(`Culture fit notes: ${role.cultureFit}`);
    if (role.language) parts.push(`Required language for role: ${role.language}`);

    const w = role.scoringWeights || {};
    parts.push(`\nScoring weights: Skills ${w.skills || 35}%, Experience ${w.experience || 25}%, Education ${w.education || 15}%, Language ${w.language || 15}%, Culture fit ${w.cultureFit || 10}%`);
  }

  return parts.join('\n');
}

async function screenCV(cvText, jobTitle, jobRequirements = '', role = null, company = null) {
  const roleContext = buildRoleContext(role, company);

  const systemPrompt = `You are an expert HR screening assistant for SMEs${company?.country === 'BE' ? ' in Belgium' : ''}.
Evaluate CVs with precision against the specific role requirements provided.

${roleContext ? `--- ROLE & COMPANY CONTEXT ---\n${roleContext}\n---\n` : ''}
SCORING RULES:
${role?.scoringWeights ? `
- Skills match: ${role.scoringWeights.skills}% of score. Check each must-have skill explicitly.
- Experience: ${role.scoringWeights.experience}% of score. Compare years and relevance.
- Education: ${role.scoringWeights.education}% of score. Check degree level and field.
- Language: ${role.scoringWeights.language}% of score. ${role.language ? `Role requires ${role.language}.` : 'Check multilingual ability.'}
- Culture fit: ${role.scoringWeights.cultureFit}% of score. Look for signals matching company values.
` : `
- Skills match: 35% — check explicitly against requirements
- Experience relevance: 25%
- Education fit: 15%
- Language ability: 15%
- Culture signals: 10%
`}
${role?.dealBreakers?.length ? `DEAL BREAKERS — if ANY of these are clearly missing, score below 30 and recommend "reject": ${role.dealBreakers.join(', ')}` : ''}

Return valid JSON only, no markdown fences. Schema:
{
  "score": <0-100>,
  "summary": "<2-3 sentence assessment>",
  "skills": { "matched": ["<skill>", ...], "missing": ["<required but not found>", ...], "bonus": ["<nice-to-have found>", ...] },
  "experience": { "years": <estimated>, "relevance": "high|medium|low" },
  "languageMatch": { "detected": ["<lang>", ...], "required": "${role?.language || 'en'}", "match": true|false },
  "redFlags": ["<concern>", ...],
  "strengths": ["<standout quality>", ...],
  "recommendation": "advance|maybe|reject",
  "reasoning": "<1 sentence explaining the score>"
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Job title: ${role?.title || jobTitle}
${jobRequirements ? `Additional requirements: ${jobRequirements}\n` : ''}
CV text:
${cvText.slice(0, 4000)}`
    }
  ];

  const raw = await callLLM(messages, { temperature: 0.15, maxTokens: 1200 });
  try {
    const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    if (role?.dealBreakers?.length && parsed.skills?.missing) {
      const hasDealBreaker = role.dealBreakers.some(db =>
        parsed.skills.missing.some(m => m.toLowerCase().includes(db.toLowerCase()))
      );
      if (hasDealBreaker && parsed.score > 30) {
        parsed.score = Math.min(parsed.score, 29);
        parsed.recommendation = 'reject';
        parsed.redFlags.push('Missing deal-breaker requirement');
      }
    }
    return parsed;
  } catch {
    return { score: 0, summary: raw, skills: { matched: [], missing: [], bonus: [] }, redFlags: ['Failed to parse AI response'], recommendation: 'maybe' };
  }
}

async function generateOfferLetter({ candidateName, jobTitle, department, salary, currency, startDate, benefits, companyName, role, company }) {
  const lang = role?.language || company?.primaryLanguage || 'en';
  const langInstruction = {
    en: 'Write in English.',
    nl: 'Schrijf in het Nederlands.',
    fr: 'Rédigez en français.',
    de: 'Schreiben Sie auf Deutsch.'
  }[lang] || 'Write in English.';

  const belgiumContext = (company?.country === 'BE' || role?.country === 'BE') ? `
Belgian employment context:
- Reference the applicable Joint Committee (paritaire comité) if known: ${role?.jointCommittee || company?.jointCommittee || 'not specified'}
- Contract type: ${role?.contractType || 'permanent'}
- Work regime: ${role?.workRegime || 'full-time'}
- Note: Belgian salaries are gross amounts. Do not attempt to calculate net.
- Standard Belgian benefits may include: meal vouchers, eco-cheques, group insurance, hospitalization insurance, company car, mobile phone allowance
- Mention the trial period has been abolished in Belgium (since 2014) for permanent contracts
` : '';

  const toneMap = { formal: 'formal and corporate', professional: 'professional but warm', casual: 'friendly and startup-like' };
  const tone = toneMap[company?.tone] || 'professional but warm';

  const messages = [
    {
      role: 'system',
      content: `You are an HR assistant generating offer letters for SMEs. ${langInstruction}
Tone: ${tone}.
${belgiumContext}
Include: role title, department, compensation, start date, benefits, and next steps.
Do not invent terms not provided. Use the currency as given.
If benefits are provided, list them clearly. Do not add benefits that aren't listed.`
    },
    {
      role: 'user',
      content: `Generate an offer letter:
- Company: ${companyName || company?.name || 'Our Company'}
- Candidate: ${candidateName}
- Position: ${role?.title || jobTitle}
- Department: ${department}
- Level: ${role?.level || 'not specified'}
- Salary: ${currency} ${salary.toLocaleString()} gross/year
- Contract: ${role?.contractType || 'permanent'}, ${role?.workRegime || 'full-time'}
- Remote policy: ${role?.remotePolicy || 'hybrid'}
- Start date: ${startDate}
- Benefits: ${benefits?.length ? benefits.join(', ') : (company?.defaultBenefits?.length ? company.defaultBenefits.join(', ') : 'Standard package')}
${role?.responsibilities?.length ? `- Key responsibilities: ${role.responsibilities.join('; ')}` : ''}
`
    }
  ];

  return callLLM(messages, { temperature: 0.4, maxTokens: 1800 });
}

async function generateRoleDescription(role, company) {
  const lang = role?.language || company?.primaryLanguage || 'en';
  const langInstruction = {
    en: 'Write in English.',
    nl: 'Schrijf in het Nederlands.',
    fr: 'Rédigez en français.',
    de: 'Schreiben Sie auf Deutsch.'
  }[lang] || 'Write in English.';

  const messages = [
    {
      role: 'system',
      content: `You are an HR copywriter for SMEs. ${langInstruction}
Write a compelling, honest job description. No buzzwords or exaggerations.
Structure: brief intro about the company, role summary, responsibilities, requirements (must-have vs nice-to-have), what we offer, how to apply.
Tone should match the company culture.`
    },
    {
      role: 'user',
      content: `Write a job description:
${buildRoleContext(role, company)}
Tone: ${company?.tone || 'professional'}
`
    }
  ];

  return callLLM(messages, { temperature: 0.5, maxTokens: 1500 });
}

async function summarizeCandidate(cvText) {
  const messages = [
    {
      role: 'system',
      content: 'Summarize this CV in 2-3 sentences for a hiring manager. Focus on experience level, key skills, and standout qualities.'
    },
    { role: 'user', content: cvText.slice(0, 3000) }
  ];

  return callLLM(messages, { temperature: 0.3, maxTokens: 200 });
}

module.exports = { callLLM, screenCV, generateOfferLetter, generateRoleDescription, summarizeCandidate, buildRoleContext };
