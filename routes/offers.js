const express = require('express');
const router = express.Router();
const OfferLetter = require('../models/OfferLetter');
const Candidate = require('../models/Candidate');
const { generateOfferLetter } = require('../services/ai');

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const offers = await OfferLetter.find(filter).populate('candidate', 'firstName lastName email jobTitle').sort({ createdAt: -1 }).lean();
    res.json({ offers });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const offer = await OfferLetter.findById(req.params.id).populate('candidate', 'firstName lastName email jobTitle');
    if (!offer) return res.status(404).json({ error: 'Offer letter not found' });
    res.json(offer);
  } catch (err) { next(err); }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { candidateId, salary, currency, startDate, benefits, companyName } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const content = await generateOfferLetter({
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: candidate.jobTitle,
      department: candidate.department || 'General',
      salary,
      currency,
      startDate,
      benefits,
      companyName
    });

    const offer = await OfferLetter.create({
      candidate: candidateId,
      jobTitle: candidate.jobTitle,
      department: candidate.department || 'General',
      salary,
      currency,
      startDate,
      benefits,
      content,
      generatedByAI: true
    });

    res.status(201).json(offer);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const offer = await OfferLetter.create(req.body);
    res.status(201).json(offer);
  } catch (err) { next(err); }
});

router.patch('/:id/send', async (req, res, next) => {
  try {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer letter not found' });
    offer.status = 'sent';
    offer.sentAt = new Date();
    await offer.save();

    await Candidate.findByIdAndUpdate(offer.candidate, { stage: 'offer' });
    res.json(offer);
  } catch (err) { next(err); }
});

router.patch('/:id/respond', async (req, res, next) => {
  try {
    const { accepted } = req.body;
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer letter not found' });
    offer.status = accepted ? 'accepted' : 'declined';
    offer.respondedAt = new Date();
    await offer.save();

    if (accepted) {
      await Candidate.findByIdAndUpdate(offer.candidate, { stage: 'hired' });
    }
    res.json(offer);
  } catch (err) { next(err); }
});

module.exports = router;
