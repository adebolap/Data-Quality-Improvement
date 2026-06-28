const mongoose = require('mongoose');

const roleTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  level: { type: String, enum: ['junior', 'mid', 'senior', 'lead', 'head'], default: 'mid' },
  location: { type: String },
  language: { type: String, enum: ['en', 'nl', 'fr', 'de'], default: 'en' },
  country: { type: String, default: 'BE' },
  mustHaveSkills: [String],
  niceToHaveSkills: [String],
  minYearsExperience: { type: Number, default: 0 },
  educationLevel: { type: String },
  certifications: [String],
  responsibilities: [String],
  cultureFit: { type: String },
  dealBreakers: [String],
  salaryRange: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'EUR' }
  },
  benefits: [String],
  contractType: { type: String, enum: ['permanent', 'fixed-term', 'freelance', 'interim', 'student'], default: 'permanent' },
  jointCommittee: { type: String },
  workRegime: { type: String, enum: ['full-time', 'part-time', '4/5', '3/5'], default: 'full-time' },
  remotePolicy: { type: String, enum: ['on-site', 'hybrid', 'remote'], default: 'hybrid' },
  scoringWeights: {
    skills: { type: Number, default: 35 },
    experience: { type: Number, default: 25 },
    education: { type: Number, default: 15 },
    language: { type: Number, default: 15 },
    cultureFit: { type: Number, default: 10 }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

roleTemplateSchema.index({ isActive: 1, department: 1 });

module.exports = mongoose.model('RoleTemplate', roleTemplateSchema);
