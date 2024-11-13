// models/CarouselImage.js
const mongoose = require('mongoose');

const carouselImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  url: {
    type: String,
    required: [true, 'Image URL is required']
  },
  address: {
    type: String,
    default: '20,Krishna,Aditya Nagar, Chunchgatta Main Rd, Kothnoor Dinne, 8th Phase, J. P. Nagar, Bengaluru, Karnataka 560078'
  },
  phone: {
    type: String,
    default: '+91 9353515799'
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
carouselImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CarouselImage', carouselImageSchema);