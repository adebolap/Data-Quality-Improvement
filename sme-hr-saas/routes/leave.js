const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');

router.get('/', async (req, res, next) => {
  try {
    const { status, employee, type, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (type) filter.type = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter).populate('employee', 'firstName lastName department').populate('approver', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      LeaveRequest.countDocuments(filter)
    ]);
    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [pending, approved, rejected, byType] = await Promise.all([
      LeaveRequest.countDocuments({ status: 'pending' }),
      LeaveRequest.countDocuments({ status: 'approved' }),
      LeaveRequest.countDocuments({ status: 'rejected' }),
      LeaveRequest.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, totalDays: { $sum: '$days' } } }])
    ]);
    res.json({ pending, approved, rejected, byType });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id).populate('employee', 'firstName lastName department').populate('approver', 'firstName lastName');
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    res.json(request);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const request = await LeaveRequest.create(req.body);
    const populated = await request.populate('employee', 'firstName lastName department');
    res.status(201).json(populated);
  } catch (err) { next(err); }
});

router.patch('/:id/approve', async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Can only approve pending requests' });
    request.status = 'approved';
    request.approver = req.body.approverId;
    request.approvedAt = new Date();
    await request.save();
    res.json(request);
  } catch (err) { next(err); }
});

router.patch('/:id/reject', async (req, res, next) => {
  try {
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Can only reject pending requests' });
    request.status = 'rejected';
    request.approver = req.body.approverId;
    request.rejectionReason = req.body.reason || '';
    await request.save();
    res.json(request);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const request = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    res.json({ message: 'Leave request deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
