const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');

// Get all bills
router.get('/', async (req, res) => {
    try {
        console.log('Fetching bills...');
        const bills = await Billing.find();
        console.log('Bills fetched:', bills.length);
        res.status(200).json(bills);
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: error.message });
    }
});

// Edit a bill
router.put('/:id', async (req, res) => {
    try {
        console.log('Updating bill:', req.params.id);
        const updatedBill = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        console.log('Bill updated:', updatedBill);
        res.status(200).json(updatedBill);
    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a bill
router.delete('/:id', async (req, res) => {
    try {
        console.log('Deleting bill:', req.params.id);
        const deletedBill = await Billing.findByIdAndDelete(req.params.id);
        if (!deletedBill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        console.log('Bill deleted:', deletedBill);
        res.status(200).json({ message: 'Bill deleted successfully' });
    } catch (error) {
        console.error('Error deleting bill:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;