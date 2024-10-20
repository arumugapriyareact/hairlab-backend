const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const { name, email, branch } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists, update their information
      user.name = name;
      user.branch = branch;
      await user.save();
    } else {
      // If user doesn't exist, create a new user
      user = new User({
        name,
        email,
        branch
      });
      await user.save();
    }

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;