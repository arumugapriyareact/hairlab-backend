// models/Reports.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'custom']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  summary: {
    totalRevenue: {
      type: Number,
      required: true,
      default: 0
    },
    services: {
      count: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      discount: { type: Number, default: 0 }
    },
    products: {
      count: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      discount: { type: Number, default: 0 }
    },
    transactions: {
      total: { type: Number, default: 0 },
      average: { type: Number, default: 0 }
    },
    payments: {
      cash: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      upi: { type: Number, default: 0 }
    },
    customers: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

const Report = mongoose.model('Report', ReportSchema);
module.exports = Report;