const express = require('express');
const router = express.Router();
const { screenCV, generateOfferLetter, summarizeCandidate } = require('../services/ai');
const { getActiveProvider, providers } = require('../config/ai-providers');

router.get('/status', (req, res) => {
  const active = getActiveProvider();
  res.json({
    configured: !!active,
    provider: active ? { name: active.name, model: active.model, freeTier: active.freeTier } : null,
    available: Object.entries(providers).map(([id, p]) => ({
      id,
      name: p.name,
      model: p.model,
      freeTier: p.freeTier,
      configured: !!process.env[p.envKey]
    }))
  });
});

router.post('/screen-cv', async (req, res) => {
  const { cvText, jobTitle, jobRequirements } = req.body;
  if (!cvText || !jobTitle) {
    return res.status(400).json({ error: 'cvText and jobTitle are required' });
  }

  try {
    const result = await screenCV(cvText, jobTitle, jobRequirements);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/generate-offer', async (req, res) => {
  const { candidateName, jobTitle, department, salary, currency, startDate, benefits, companyName } = req.body;
  if (!candidateName || !jobTitle || !salary || !currency) {
    return res.status(400).json({ error: 'candidateName, jobTitle, salary, and currency are required' });
  }

  try {
    const content = await generateOfferLetter(req.body);
    res.json({ content });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/summarize', async (req, res) => {
  const { cvText } = req.body;
  if (!cvText) {
    return res.status(400).json({ error: 'cvText is required' });
  }

  try {
    const summary = await summarizeCandidate(cvText);
    res.json({ summary });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
