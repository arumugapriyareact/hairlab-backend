const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointments');
const Customer = require('../models/Customer');

// GET all appointments
router.get('/', async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('customer')
            .populate('service')
            .populate('staff')
            .sort({ dateTime: 1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new appointment
router.post('/', async (req, res) => {
    try {
        const { customer, service, staff, dateTime, notes, status } = req.body;
        
        // Find or create customer
        let customerDoc = await Customer.findOne({ 
            phoneNumber: customer.phoneNumber 
        });

        if (!customerDoc) {
            customerDoc = await Customer.create({
                firstName: customer.firstName,
                lastName: customer.lastName,
                phoneNumber: customer.phoneNumber,
                email: customer.email
            });
        }

        // Create appointment
        const appointment = new Appointment({
            customer: customerDoc._id,
            service: service,
            staff: staff,
            dateTime: dateTime,
            notes: notes,
            status: status || 'confirmed'
        });

        const newAppointment = await appointment.save();
        
        // Populate the response
        const populatedAppointment = await Appointment.findById(newAppointment._id)
            .populate('customer')
            .populate('service')
            .populate('staff');

        res.status(201).json(populatedAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update appointment
router.put('/:id', async (req, res) => {
    try {
        const { customer, service, staff, dateTime, notes, status } = req.body;
        
        // Update or create customer
        let customerDoc = await Customer.findOne({ 
            phoneNumber: customer.phoneNumber 
        });

        if (!customerDoc) {
            customerDoc = await Customer.create({
                firstName: customer.firstName,
                lastName: customer.lastName,
                phoneNumber: customer.phoneNumber,
                email: customer.email
            });
        } else {
            // Update existing customer details
            customerDoc.firstName = customer.firstName;
            customerDoc.lastName = customer.lastName;
            customerDoc.email = customer.email;
            await customerDoc.save();
        }

        // Update appointment
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            {
                customer: customerDoc._id,
                service: service,
                staff: staff,
                dateTime: dateTime,
                notes: notes,
                status: status,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('customer')
         .populate('service')
         .populate('staff');

        if (!updatedAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.json(updatedAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE appointment
router.delete('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        
        await appointment.remove();
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;