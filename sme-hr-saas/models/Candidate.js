const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },
  jobTitle: { type: String, required: true },
  department: { type: String },
  stage: {
    type: String,
    enum: ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected'],
    default: 'applied'
  },
  cvUrl: { type: String },
  cvText: { type: String },
  aiScore: { type: Number, min: 0, max: 100 },
  aiSummary: { type: String },
  aiSkills: [String],
  aiRedFlags: [String],
  source: { type: String, enum: ['direct', 'referral', 'linkedin', 'jobboard', 'other'], default: 'direct' },
  notes: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    createdAt: { type: Date, default: Date.now }
  }],
  interviewDate: { type: Date },
  offerAmount: { type: Number },
  offerCurrency: { type: String },
  location: { type: String },
  rightToWork: { type: String },
  gdprConsent: {
    given: { type: Boolean, default: false },
    date: Date,
    withdrawnDate: Date
  },
  dataRetentionDays: { type: Number }
}, { timestamps: true });

candidateSchema.index({ stage: 1, jobTitle: 1 });
candidateSchema.index({ aiScore: -1 });

module.exports = mongoose.model('Candidate', candidateSchema);
