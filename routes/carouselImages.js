// routes/carouselImages.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CarouselImage = require('../models/CarouselImages');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/carousel';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'carousel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all carousel images
router.get('/', async (req, res) => {
  try {
    const images = await CarouselImage.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload a new image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Check maximum images limit
    const imageCount = await CarouselImage.countDocuments();
    if (imageCount >= 2) {
      // Remove uploaded file if limit exceeded
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Maximum number of images (2) reached' });
    }

    const imageUrl = `/uploads/carousel/${req.file.filename}`;
    const carouselImage = new CarouselImage({
      title: req.body.title,
      url: imageUrl,
      address: req.body.address,
      phone: req.body.phone,
      description: req.body.description
    });

    const savedImage = await carouselImage.save();
    res.status(201).json(savedImage);
  } catch (error) {
    // Remove uploaded file if save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ message: error.message });
  }
});

// Update image details
router.put('/:id', async (req, res) => {
  try {
    const updatedImage = await CarouselImage.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        address: req.body.address,
        phone: req.body.phone,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedImage) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json(updatedImage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an image
router.delete('/:id', async (req, res) => {
  try {
    const image = await CarouselImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete physical file
    const filePath = path.join('public', image.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await CarouselImage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;