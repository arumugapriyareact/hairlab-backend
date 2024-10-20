const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    hireDate: { type: Date, required: true },
    salary: { type: Number, required: true },
    availability: { type: Boolean, default: true }, 
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staffs', StaffSchema);