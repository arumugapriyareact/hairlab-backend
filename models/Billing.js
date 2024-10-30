const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  services: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    staff: {
      type: String,
      required: true
    },
    duration: Number
  }],
  products: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  gst: {
    type: Number,
    required: true
  },
  grandTotal: {
    type: Number,
    required: true
  },
  cashback: {
    type: Number,
    default: 0
  },
  finalTotal: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'upi']
  },
  amountPaid: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Billing', billingSchema);