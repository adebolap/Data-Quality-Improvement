const express = require('express');
const router = express.Router();
const RoleTemplate = require('../models/RoleTemplate');
const { generateRoleDescription } = require('../services/ai');

router.get('/', async (req, res, next) => {
  try {
    const { active, department } = req.query;
    const filter = {};
    if (active !== undefined) filter.isActive = active === 'true';
    if (department) filter.department = department;
    const roles = await RoleTemplate.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ roles });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const role = await RoleTemplate.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role template not found' });
    res.json(role);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const role = await RoleTemplate.create(req.body);
    res.status(201).json(role);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const role = await RoleTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!role) return res.status(404).json({ error: 'Role template not found' });
    res.json(role);
  } catch (err) { next(err); }
});

router.post('/:id/generate-description', async (req, res, next) => {
  try {
    const role = await RoleTemplate.findById(req.params.id).lean();
    if (!role) return res.status(404).json({ error: 'Role template not found' });
    const Company = require('../models/Company');
    const company = req.body.companyId ? await Company.findById(req.body.companyId).lean() : null;
    const description = await generateRoleDescription(role, company);
    res.json({ description });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const role = await RoleTemplate.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role template not found' });
    res.json({ message: 'Role template deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
