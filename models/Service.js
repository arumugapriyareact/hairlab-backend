const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    serviceName: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true }, // in minutes
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Services', ServiceSchema);
