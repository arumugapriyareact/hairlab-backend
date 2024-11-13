const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  // Customer Information
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true
  },
  dob: {
    type: Date,
    required: false
  },

  // Services
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      set: v => Math.round(v)
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    staffName: {
      type: String,
      required: true
    },
    finalPrice: {
      type: Number,
      required: true,
      set: v => Math.round(v)
    },
    discount: {
      type: Number,
      required: false,
      default: 0,
      set: v => Math.round(v)
    }
  }],

  // Products
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      set: v => Math.round(v)
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    discount: {
      type: Number,
      required: false,
      default: 0,
      set: v => Math.round(v)
    },
    discountPercentage: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
      max: 100,
      set: v => Math.round(v)
    },
    finalPrice: {
      type: Number,
      required: true,
      set: v => Math.round(v)
    }
  }],

  // Bill Details
  subtotal: {
    type: Number,
    required: true,
    set: v => Math.round(v)
  },
  gstPercentage: {
    type: Number,
    required: true,
    default: 18,
    min: 0,
    max: 100
  },
  gst: {
    type: Number,
    required: true,
    set: v => Math.round(v)
  },
  grandTotal: {
    type: Number,
    required: true,
    set: v => Math.round(v)
  },
  cashback: {
    type: Number,
    default: 0,
    set: v => Math.round(v)
  },
  finalTotal: {
    type: Number,
    required: true,
    set: v => Math.round(v)
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'upi']
  },
  amountPaid: {
    type: Number,
    required: true,
    set: v => Math.round(v)
  }
}, {
  timestamps: true
});

// Virtual for customer name
billingSchema.virtual('customerName').get(function() {
  const firstName = this.firstName || '';
  const lastName = this.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Anonymous';
});

// Method to get total discount
billingSchema.methods.getTotalDiscount = function() {
  const serviceDiscounts = this.services.reduce((sum, service) => 
    sum + (service.discount || 0), 0);
  
  const productDiscounts = this.products.reduce((sum, product) => 
    sum + ((product.discount || 0) * product.quantity), 0);
  
  return Math.round(serviceDiscounts + productDiscounts);
};

const Billing = mongoose.model('Billing', billingSchema);

// Customer Schema for tracking customer history
const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true
  },
  dob: {
    type: Date,
    required: false
  },
  totalVisits: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    set: v => Math.round(v)
  },
  lastVisit: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = { Billing, Customer };