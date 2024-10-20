const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer'); // Adjust path as necessary

// GET all customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new customer
router.post('/', async (req, res) => {
    const customer = new Customer(req.body);
    try {
        const newCustomer = await customer.save();
        console.log(req)
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET a specific customer
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer == null) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to update a customer
router.put('/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCustomer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE a customer
router.delete('/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/phone/:phoneNumber', async (req, res) => {
    try {
        const customer = await Customer.findOne({ phoneNumber: req.params.phoneNumber });
        if (customer == null) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;