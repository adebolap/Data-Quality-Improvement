const providers = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
    model: 'llama-3.3-70b-versatile',
    freeTier: '6,000 req/day, 6K tokens/min',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    envKey: 'CEREBRAS_API_KEY',
    model: 'llama-3.3-70b',
    freeTier: '30 req/min, 1M tokens/day',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    envKey: 'TOGETHER_API_KEY',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    freeTier: '$5 free credit on signup',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    })
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    envKey: 'GEMINI_API_KEY',
    model: 'gemini-2.0-flash',
    freeTier: '15 req/min, 1M tokens/day',
    headers: (key) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    }),
    isGemini: true
  }
};

function getActiveProvider() {
  const preferred = process.env.AI_PROVIDER || 'groq';
  const order = [preferred, ...Object.keys(providers).filter(k => k !== preferred)];

  for (const id of order) {
    const p = providers[id];
    if (process.env[p.envKey]) {
      return { id, ...p, apiKey: process.env[p.envKey] };
    }
  }
  return null;
}

module.exports = { providers, getActiveProvider };
