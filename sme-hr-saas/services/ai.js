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

async function screenCV(cvText, jobTitle, jobRequirements = '') {
  const messages = [
    {
      role: 'system',
      content: `You are an HR screening assistant for SMEs. Evaluate CVs objectively.
Return valid JSON only, no markdown fences. Schema:
{
  "score": <0-100>,
  "summary": "<2-3 sentence assessment>",
  "skills": ["<matched skill>", ...],
  "redFlags": ["<concern>", ...],
  "recommendation": "advance|maybe|reject"
}`
    },
    {
      role: 'user',
      content: `Job title: ${jobTitle}
${jobRequirements ? `Requirements: ${jobRequirements}\n` : ''}
CV text:
${cvText.slice(0, 4000)}`
    }
  ];

  const raw = await callLLM(messages, { temperature: 0.2 });
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch {
    return { score: 0, summary: raw, skills: [], redFlags: ['Failed to parse AI response'], recommendation: 'maybe' };
  }
}

async function generateOfferLetter({ candidateName, jobTitle, department, salary, currency, startDate, benefits, companyName }) {
  const messages = [
    {
      role: 'system',
      content: `You are an HR assistant that generates professional offer letters for SMEs.
Write a clear, warm, legally appropriate offer letter.
Include: role, compensation, start date, benefits, and next steps.
Adapt tone to be professional but approachable — suitable for startups and SMEs.
Do not invent terms not provided. Use the currency as given.`
    },
    {
      role: 'user',
      content: `Generate an offer letter:
- Company: ${companyName || 'Our Company'}
- Candidate: ${candidateName}
- Position: ${jobTitle}
- Department: ${department}
- Salary: ${currency} ${salary.toLocaleString()}
- Start date: ${startDate}
- Benefits: ${benefits?.length ? benefits.join(', ') : 'Standard package'}
`
    }
  ];

  return callLLM(messages, { temperature: 0.4, maxTokens: 1500 });
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

module.exports = { callLLM, screenCV, generateOfferLetter, summarizeCandidate };
