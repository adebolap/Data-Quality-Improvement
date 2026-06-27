const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

router.get('/', async (req, res, next) => {
  try {
    const { department, status, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Employee.countDocuments(filter)
    ]);
    res.json({ employees, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [total, active, departments] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Employee.distinct('department')
    ]);
    res.json({ total, active, inactive: total - active, departments });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('manager', 'firstName lastName');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
