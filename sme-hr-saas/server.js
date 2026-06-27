require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/ai', require('./routes/ai'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/offers', require('./routes/offers'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pipeline', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pipeline.html')));
app.get('/employees', (req, res) => res.sendFile(path.join(__dirname, 'public', 'employees.html')));
app.get('/leave', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leave.html')));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`PeopleBase running on port ${PORT}`));
}).catch(() => {
  console.warn('Starting without database — API routes will fail, static UI will still work');
  app.listen(PORT, () => console.log(`PeopleBase running on port ${PORT} (no DB)`));
});
