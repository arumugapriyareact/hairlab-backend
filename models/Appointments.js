const mongoose = require('mongoose');
mongoose.connection.useDb('hairlab');

const AppointmentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service'},
    products: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    dateTime: { type: Date, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointments', AppointmentSchema);