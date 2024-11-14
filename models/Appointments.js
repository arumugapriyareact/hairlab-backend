const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customers',  // Updated to match the Customer model name
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Services',   // Updated to match expected Service model name
        required: true
    },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staffs',     // Updated to match expected Staff model name
        required: true
    },
    dateTime: { 
        type: Date, 
        required: true 
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'completed'],
        default: 'confirmed'
    },
    notes: { 
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

module.exports = mongoose.model('Appointments', AppointmentSchema);