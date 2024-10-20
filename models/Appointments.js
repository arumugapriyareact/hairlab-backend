const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    dateTime: { type: Date, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointments', AppointmentSchema);