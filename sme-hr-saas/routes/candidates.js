const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');

router.get('/', async (req, res, next) => {
  try {
    const { stage, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [candidates, total] = await Promise.all([
      Candidate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Candidate.countDocuments(filter)
    ]);
    res.json({ candidates, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

router.get('/pipeline', async (req, res, next) => {
  try {
    const stages = ['applied', 'screened', 'interview', 'offer', 'hired'];
    const pipeline = {};
    for (const stage of stages) {
      pipeline[stage] = await Candidate.find({ stage }).sort({ aiScore: -1 }).lean();
    }
    res.json(pipeline);
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const result = await Candidate.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 }, avgScore: { $avg: '$aiScore' } } }
    ]);
    const total = await Candidate.countDocuments();
    const avgScore = await Candidate.aggregate([
      { $match: { aiScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$aiScore' } } }
    ]);
    res.json({ byStage: result, total, avgAiScore: Math.round(avgScore[0]?.avg || 0) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const candidate = await Candidate.create(req.body);
    res.status(201).json(candidate);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) { next(err); }
});

router.patch('/:id/stage', async (req, res, next) => {
  try {
    const { stage } = req.body;
    const valid = ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected'];
    if (!valid.includes(stage)) return res.status(400).json({ error: `Invalid stage. Must be: ${valid.join(', ')}` });
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, { stage }, { new: true });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) { next(err); }
});

router.post('/:id/notes', async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    candidate.notes.push({ text: req.body.text, author: req.body.author });
    await candidate.save();
    res.status(201).json(candidate);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json({ message: 'Candidate deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
