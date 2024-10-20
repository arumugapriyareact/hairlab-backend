const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointments');
const Service = require('../models/Service');
const Customer = require('../models/Customer'); // Import the Customer model

// GET all appointments
router.get('/', async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('customer', 'firstName lastName')
            .populate('service', 'serviceName')
            .populate('staff', 'firstName lastName');
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// POST a new appointment
router.post('/', async (req, res) => {
    try {
        // Check if customer exists
        let customer = await Customer.findOne({ phoneNumber: req.body.phoneNumber });
        
        if (!customer) {
            // If customer doesn't exist, create a new one
            customer = new Customer({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phoneNumber: req.body.phoneNumber,
                // Add email if it's part of the request
                ...(req.body.email && { email: req.body.email })
            });
            await customer.save();
            console.log('New customer created:', customer);
        }

        // Create the new appointment
        const appointment = new Appointment({
            customer: customer._id, // Use the customer's ID
            service: req.body.service,
            staff: req.body.staff,
            dateTime: req.body.dateTime,
            notes: req.body.notes
        });

        const newAppointment = await appointment.save();
        console.log('New appointment created:', newAppointment);
        
        res.status(201).json(newAppointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(400).json({ message: error.message });
    }
});

// GET a specific appointment
router.get('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('customer', 'firstName lastName phoneNumber email')
            .populate('service', 'serviceName')
            .populate('staff', 'firstName lastName');
        if (appointment == null) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to update an appointment
router.put('/:id', async (req, res) => {
    try {
        const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE an appointment
router.delete('/:id', async (req, res) => {
    try {
        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Appointment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET all services (for populating the service dropdown)
router.get('/services/list', async (req, res) => {
    try {
        const services = await Service.find({}, 'serviceName');
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;