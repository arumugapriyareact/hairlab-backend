const express = require('express');
const router = express.Router();
const Service = require('../models/Service'); // Adjust path as necessary

// GET all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new service
router.post('/', async (req, res) => {
    const service = new Service(req.body);
    try {
        const newService = await service.save();
        res.status(201).json(newService);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET a specific service
router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (service == null) {
            return res.status(404).json({ message: 'Service not found' });
        }
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to update a service
router.put('/:id', async (req, res) => {
    try {
        const updatedService = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedService);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE a service
router.delete('/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;