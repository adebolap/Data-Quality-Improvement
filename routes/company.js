const express = require('express');
const router = express.Router();
const Company = require('../models/Company');

router.get('/', async (req, res, next) => {
  try {
    const company = await Company.findOne().lean();
    if (!company) return res.json(null);
    res.json(company);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const existing = await Company.findOne();
    if (existing) {
      const updated = await Company.findByIdAndUpdate(existing._id, req.body, { new: true, runValidators: true });
      return res.json(updated);
    }
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (err) { next(err); }
});

module.exports = router;
