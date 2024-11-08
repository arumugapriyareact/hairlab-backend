// models/Reports.js
const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  // Report Metadata
  reportType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'custom']
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  reportPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },

  // Financial Metrics
  totalServiceRevenue: {
    type: Number,
    required: true,
    default: 0
  },
  totalProductRevenue: {
    type: Number,
    required: true,
    default: 0
  },
  totalGST: {
    type: Number,
    required: true,
    default: 0
  },
  totalCashback: {
    type: Number,
    required: true,
    default: 0
  },
  totalDiscounts: {
    services: {
      type: Number,
      required: true,
      default: 0
    },
    products: {
      type: Number,
      required: true,
      default: 0
    }
  },

  // Customer Metrics
  uniqueCustomers: {
    type: Number,
    required: true,
    default: 0
  },
  totalTransactions: {
    type: Number,
    required: true,
    default: 0
  },
  customerSegmentation: {
    new: {
      count: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    },
    returning: {
      count: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 }
    }
  },

  // Staff Performance
  staffPerformance: [{
    staffName: {
      type: String,
      required: true
    },
    serviceCount: {
      type: Number,
      required: true,
      default: 0
    },
    revenue: {
      type: Number,
      required: true,
      default: 0
    },
    totalDiscounts: {
      type: Number,
      required: true,
      default: 0
    },
    services: [{
      name: String,
      price: Number,
      finalPrice: Number,
      discount: Number
    }],
    averageRating: {
      type: Number,
      default: 0
    }
  }],

  // Payment Distribution
  paymentDistribution: {
    cash: {
      type: Number,
      default: 0
    },
    card: {
      type: Number,
      default: 0
    },
    upi: {
      type: Number,
      default: 0
    }
  },

  // Service Analytics
  topServices: [{
    name: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true
    },
    revenue: {
      type: Number,
      required: true
    },
    discounts: {
      type: Number,
      required: true
    },
    staffDistribution: [{
      staff: String,
      count: Number
    }]
  }],

  // Product Analytics
  topProducts: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    revenue: {
      type: Number,
      required: true
    },
    discounts: {
      type: Number,
      required: true
    }
  }],

  // Customer Analytics
  topCustomers: [{
    firstName: String,
    lastName: String,
    phoneNumber: String,
    totalSpent: Number,
    visits: Number
  }],

  // Time Analysis
  timeAnalysis: {
    peakHours: [{
      hour: Number,
      customers: Number,
      revenue: Number
    }],
    weekdayDistribution: [{
      day: String,
      customers: Number,
      revenue: Number
    }]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ReportSchema.index({ reportDate: 1 });
ReportSchema.index({ 'reportPeriod.startDate': 1, 'reportPeriod.endDate': 1 });
ReportSchema.index({ reportType: 1 });

// Virtual for total revenue
ReportSchema.virtual('totalRevenue').get(function() {
  return this.totalServiceRevenue + this.totalProductRevenue;
});

// Virtual for total discounts
ReportSchema.virtual('totalDiscountsAmount').get(function() {
  return this.totalDiscounts.services + this.totalDiscounts.products;
});

// Method to calculate average transaction value
ReportSchema.methods.getAverageTransactionValue = function() {
  if (this.totalTransactions === 0) return 0;
  return (this.totalServiceRevenue + this.totalProductRevenue) / this.totalTransactions;
};

const Reports = mongoose.model('Reports', ReportSchema);
