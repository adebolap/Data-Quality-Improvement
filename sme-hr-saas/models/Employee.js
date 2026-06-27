const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  role: { type: String, required: true },
  department: { type: String, required: true },
  dateOfBirth: { type: Date },
  hireDate: { type: Date, default: Date.now },
  salary: { type: Number },
  currency: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'terminated'], default: 'active' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  avatar: { type: String },
  locale: { type: String, default: 'en' },
  timezone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, required: true }
  },
  taxId: { type: String },
  workPermit: {
    required: { type: Boolean, default: false },
    expiryDate: Date,
    document: String
  },
  gdprConsent: {
    given: { type: Boolean, default: false },
    date: Date,
    withdrawnDate: Date
  },
  dataRetentionDays: { type: Number },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, { timestamps: true });

employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
