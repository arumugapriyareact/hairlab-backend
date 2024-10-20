const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Products', ProductSchema);