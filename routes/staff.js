const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff'); // Adjust path as necessary

// GET all staff members
router.get('/', async (req, res) => {
    try {
        const staffMembers = await Staff.find();
        res.json(staffMembers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new staff member
router.post('/', async (req, res) => {
    const staff = new Staff(req.body);
    try {
        const newStaff = await staff.save();
        res.status(201).json(newStaff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET a specific staff member
router.get('/:id', async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (staff == null) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to update a staff member
router.put('/:id', async (req, res) => {
    try {
        const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedStaff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE a staff member
router.delete('/:id', async (req, res) => {
    try {
        await Staff.findByIdAndDelete(req.params.id);
        res.json({ message: 'Staff member deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH to update staff availability
router.patch('/:id/availability', async (req, res) => {
    try {
        const { availability } = req.body;
        if (typeof availability !== 'boolean') {
            return res.status(400).json({ message: 'Availability must be a boolean value' });
        }
        const updatedStaff = await Staff.findByIdAndUpdate(
            req.params.id, 
            { availability: availability },
            { new: true }
        );
        if (!updatedStaff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.json(updatedStaff);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;