const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema({
  totalSales: { type: Number, required: true },
  totalServices: { type: Number, required: true },
  totalEnquiries: { type: Number, required: true },
  newCustomers: { type: Number, required: true },
  averageServiceCost: { type: Number, required: true },
  averageCustomerValue: { type: Number, required: true },
  averageEmployeeService: { type: Number, required: true },
  salesExpenseRate: [{
    month: String,
    sales: Number,
    expenses: Number
  }],
  bookingCount: [{
    day: String,
    count: Number
  }],
  managerRevenue: [{
    manager: String,
    revenue: Number
  }],
  employeeRevenue: [{
    employee: String,
    revenue: Number
  }],
  serviceCount: [{
    service: String,
    count: Number
  }],
  customerRevenue: [{
    month: String,
    revenue: Number
  }],
  topProducts: [{
    product: String,
    sales: Number
  }],
  topServices: [{
    service: String,
    bookings: Number
  }],
  topCustomers: [{
    customer: String,
    spending: Number
  }],
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dashboards', DashboardSchema);