const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  services: [{ name: String, price: Number }],
  subtotal: { type: Number, required: true },
  gst: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  cashback: { type: Number, default: 0 },
  referralBonus: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Billings', BillingSchema);