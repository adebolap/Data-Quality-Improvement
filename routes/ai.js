const express = require('express');
const router = express.Router();
const { screenCV, generateOfferLetter, summarizeCandidate, generateRoleDescription } = require('../services/ai');
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
  const { cvText, jobTitle, jobRequirements, roleId } = req.body;
  if (!cvText || (!jobTitle && !roleId)) {
    return res.status(400).json({ error: 'cvText and either jobTitle or roleId are required' });
  }

  try {
    let role = null;
    let company = null;
    if (roleId) {
      const RoleTemplate = require('../models/RoleTemplate');
      role = await RoleTemplate.findById(roleId).lean();
      const Company = require('../models/Company');
      company = await Company.findOne().lean();
    }
    const result = await screenCV(cvText, role?.title || jobTitle, jobRequirements, role, company);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/generate-offer', async (req, res) => {
  const { candidateName, jobTitle, department, salary, currency, startDate, benefits, companyName, roleId } = req.body;
  if (!candidateName || (!jobTitle && !roleId) || !salary || !currency) {
    return res.status(400).json({ error: 'candidateName, jobTitle/roleId, salary, and currency are required' });
  }

  try {
    let role = null;
    let company = null;
    if (roleId) {
      const RoleTemplate = require('../models/RoleTemplate');
      role = await RoleTemplate.findById(roleId).lean();
      const Company = require('../models/Company');
      company = await Company.findOne().lean();
    }
    const content = await generateOfferLetter({ ...req.body, role, company });
    res.json({ content });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/generate-description', async (req, res) => {
  const { roleId } = req.body;
  if (!roleId) return res.status(400).json({ error: 'roleId is required' });

  try {
    const RoleTemplate = require('../models/RoleTemplate');
    const role = await RoleTemplate.findById(roleId).lean();
    if (!role) return res.status(404).json({ error: 'Role template not found' });
    const Company = require('../models/Company');
    const company = await Company.findOne().lean();
    const description = await generateRoleDescription(role, company);
    res.json({ description });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/summarize', async (req, res) => {
  const { cvText } = req.body;
  if (!cvText) return res.status(400).json({ error: 'cvText is required' });

  try {
    const summary = await summarizeCandidate(cvText);
    res.json({ summary });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
