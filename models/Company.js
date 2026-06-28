const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, default: 'BE' },
  region: { type: String, enum: ['flanders', 'wallonia', 'brussels', 'other'] },
  languages: [{ type: String, enum: ['nl', 'fr', 'de', 'en'] }],
  primaryLanguage: { type: String, enum: ['nl', 'fr', 'de', 'en'], default: 'en' },
  sector: { type: String },
  jointCommittee: { type: String },
  size: { type: String, enum: ['1-10', '11-50', '51-200', '201-500'], default: '11-50' },
  vatNumber: { type: String },
  defaultBenefits: [String],
  defaultCurrency: { type: String, default: 'EUR' },
  leavePolicy: {
    annualDays: { type: Number, default: 20 },
    sectoralDays: { type: Number, default: 0 },
    adv: { type: Number, default: 0 }
  },
  tone: { type: String, enum: ['formal', 'professional', 'casual'], default: 'professional' },
  brandValues: [String],
  logo: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
