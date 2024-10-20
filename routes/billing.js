const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Customer = require('../models/Customer');

// Create a new bill
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

    // Create the new bill
    const newBill = new Billing({
      customerName: `${customer.firstName} ${customer.lastName}`, // Construct customerName from firstName and lastName
      phoneNumber: req.body.phoneNumber,
      services: req.body.services,
      products: req.body.products, // Add this line if your model includes products
      subtotal: req.body.subtotal,
      gst: req.body.gst,
      grandTotal: req.body.grandTotal,
      cashback: req.body.cashback || 0,
      finalTotal: req.body.finalTotal,
      paymentMethod: req.body.paymentMethod,
      amountPaid: req.body.amountPaid
    });
    
    const savedBill = await newBill.save();
    console.log('New bill created:', savedBill);
    
    res.status(201).json(savedBill);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(400).json({ message: error.message });
  }
});


// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await Billing.find();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific bill
router.get('/:id', async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a bill
router.put('/:id', async (req, res) => {
  try {
    const updatedBill = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedBill) return res.status(404).json({ message: 'Bill not found' });
    res.json(updatedBill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a bill
router.delete('/:id', async (req, res) => {
  try {
    const deletedBill = await Billing.findByIdAndDelete(req.params.id);
    if (!deletedBill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;