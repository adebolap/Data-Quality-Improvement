const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  jobTitle: { type: String, required: true },
  department: { type: String, required: true },
  salary: { type: Number, required: true },
  currency: { type: String, required: true },
  startDate: { type: Date, required: true },
  benefits: [String],
  content: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'declined'],
    default: 'draft'
  },
  generatedByAI: { type: Boolean, default: false },
  sentAt: { type: Date },
  respondedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('OfferLetter', offerLetterSchema);
