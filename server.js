const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

mongoose.connection.useDb('hairlabtestß');

dotenv.config();

const app = express();

const corsOptions = {
  origin: ['http://127.0.0.1:5501', 'http://localhost:5501'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

const username = encodeURIComponent(process.env.MONGO_USERNAME);
const password = encodeURIComponent(process.env.MONGO_PASSWORD);

const mongoURI = `mongodb+srv://${username}:${password}@${process.env.MONGO_CLUSTER}/hairlabtest?retryWrites=true&w=majority&appName=${process.env.MONGO_DBNAME}`;
console.log(mongoURI)
console.log('Attempting to connect to MongoDB Atlas...');
console.log('MongoDB URI (without password):', mongoURI.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB Atlas successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const authRoutes = require('./routes/auth');
const billingRoutes = require('./routes/billing');
const reportsRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const customerRoutes = require('./routes/customer');
const serviceRoutes = require('./routes/service');
const staffRoutes = require('./routes/staff');
const appointmentRoutes = require('./routes/appointments');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');

app.use('/api/billing', billingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));