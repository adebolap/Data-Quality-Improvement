require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/pipeline', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pipeline.html'));
});

app.get('/employees', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employees.html'));
});

app.get('/leave', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leave.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HR SaaS running on port ${PORT}`));
