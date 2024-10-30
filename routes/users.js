const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // For password hashing

// GET all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password from response
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new user
router.post('/', async (req, res) => {
    try {
        // Check if email already exists
        const emailExists = await User.findOne({ email: req.body.email.toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            ...req.body,
            password: hashedPassword,
            email: req.body.email.toLowerCase()
        });

        const newUser = await user.save();
        
        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.password;
        
        res.status(201).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET a specific user
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT to update a user
router.put('/:id', async (req, res) => {
    try {
        const updates = { ...req.body };
        
        // If updating email, check if new email already exists
        if (updates.email) {
            updates.email = updates.email.toLowerCase();
            const emailExists = await User.findOne({ 
                email: updates.email,
                _id: { $ne: req.params.id }
            });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already exists' });
            }
        }

        // If updating password, hash it
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        } else {
            delete updates.password; // Don't update password if not provided
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { ...updates, updatedAt: Date.now() },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE a user
router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;