const express = require('express');
const router = express.Router();
const { Billing, Customer } = require('../models/Billing');
const mongoose = require('mongoose');

// Create new billing record
router.post('/', async (req, res) => {
  try {
    const { customer, services, products, billing } = req.body;

    // Basic validation
    if (!customer.phoneNumber || customer.phoneNumber.length !== 10) {
      return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
    }

    if ((!services || !services.length) && (!products || !products.length)) {
      return res.status(400).json({ message: 'At least one service or product is required' });
    }

    // Validate services if present
    if (services && services.length > 0) {
      for (const service of services) {
        if (!service.serviceId || !service.name || !service.staffId || !service.staffName || typeof service.finalPrice !== 'number') {
          return res.status(400).json({
            message: 'Each service must have serviceId, name, staffId, staffName, and finalPrice'
          });
        }
      }
    }

    // Validate products if present
    if (products && products.length > 0) {
      for (const product of products) {
        if (!product.productId || !product.name || typeof product.price !== 'number' || !product.quantity) {
          return res.status(400).json({
            message: 'Each product must have productId, name, price, and quantity'
          });
        }
      }
    }

    // Create new billing record
    const newBilling = new Billing({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      dob: customer.dob ? new Date(customer.dob) : undefined,
      services: services.map(service => ({
        serviceId: service.serviceId,
        name: service.name,
        price: Math.round(service.price),
        staffId: service.staffId,
        staffName: service.staffName,
        finalPrice: Math.round(service.finalPrice),
        discount: Math.round(service.discount || 0)
      })),
      products: products.map(product => ({
        productId: product.productId,
        name: product.name,
        price: Math.round(product.price),
        quantity: product.quantity,
        discount: Math.round(product.discount || 0),
        discountPercentage: Math.round(product.discountPercentage || 0),
        finalPrice: Math.round(product.finalPrice)
      })),
      subtotal: Math.round(billing.subtotal),
      gstPercentage: billing.gstPercentage,
      gst: Math.round(billing.gst),
      grandTotal: Math.round(billing.grandTotal),
      cashback: Math.round(billing.cashback || 0),
      finalTotal: Math.round(billing.finalTotal),
      paymentMethod: billing.paymentMethod,
      amountPaid: Math.round(billing.amountPaid)
    });

    const savedBilling = await newBilling.save();

    // Update or create customer record
    try {
      let customerRecord = await Customer.findOne({ phoneNumber: customer.phoneNumber });
      const billingDate = new Date();

      if (!customerRecord) {
        customerRecord = new Customer({
          firstName: customer.firstName,
          lastName: customer.lastName,
          phoneNumber: customer.phoneNumber,
          email: customer.email,
          dob: customer.dob ? new Date(customer.dob) : undefined,
          totalVisits: 1,
          totalSpent: billing.finalTotal,
          lastVisit: billingDate
        });
      } else {
        customerRecord.totalVisits += 1;
        customerRecord.totalSpent += billing.finalTotal;
        customerRecord.lastVisit = billingDate;
        
        // Update customer details if provided
        if (customer.firstName) customerRecord.firstName = customer.firstName;
        if (customer.lastName) customerRecord.lastName = customer.lastName;
        if (customer.email) customerRecord.email = customer.email;
        if (customer.dob) customerRecord.dob = new Date(customer.dob);
      }

      await customerRecord.save();
    } catch (customerError) {
      console.error('Error updating customer record:', customerError);
      // Don't fail the billing creation if customer update fails
    }

    res.status(201).json({
      message: 'Billing record created successfully',
      billing: {
        id: savedBilling._id,
        customerName: savedBilling.customerName,
        phoneNumber: savedBilling.phoneNumber,
        services: savedBilling.services,
        products: savedBilling.products,
        paymentDetails: {
          subtotal: savedBilling.subtotal,
          gstPercentage: savedBilling.gstPercentage,
          gst: savedBilling.gst,
          grandTotal: savedBilling.grandTotal,
          cashback: savedBilling.cashback,
          finalTotal: savedBilling.finalTotal,
          paymentMethod: savedBilling.paymentMethod,
          amountPaid: savedBilling.amountPaid
        },
        totalDiscount: savedBilling.getTotalDiscount(),
        createdAt: savedBilling.createdAt
      }
    });

  } catch (error) {
    console.error('Create billing error:', error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get billing list with filters and pagination
router.get('/list', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      phoneNumber,
      paymentMethod,
      staffName,
      serviceName,
      productName,
      minAmount,
      maxAmount
    } = req.query;

    // Build match conditions
    const matchConditions = {};

    // Date filtering
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchConditions.createdAt.$lte = endDateTime;
      }
    }

    // Amount range filtering
    if (minAmount || maxAmount) {
      matchConditions.finalTotal = {};
      if (minAmount) matchConditions.finalTotal.$gte = parseInt(minAmount);
      if (maxAmount) matchConditions.finalTotal.$lte = parseInt(maxAmount);
    }

    // Other filters
    if (phoneNumber) matchConditions.phoneNumber = phoneNumber;
    if (paymentMethod) matchConditions.paymentMethod = paymentMethod;
    if (staffName) matchConditions['services.staffName'] = new RegExp(staffName, 'i');
    if (serviceName) matchConditions['services.name'] = new RegExp(serviceName, 'i');
    if (productName) matchConditions['products.name'] = new RegExp(productName, 'i');

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $addFields: {
          customerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$firstName', ''] },
                  ' ',
                  { $ifNull: ['$lastName', ''] }
                ]
              }
            }
          },
          totalDiscount: {
            $add: [
              {
                $reduce: {
                  input: '$services',
                  initialValue: 0,
                  in: { $add: ['$$value', { $ifNull: ['$$this.discount', 0] }] }
                }
              },
              {
                $reduce: {
                  input: '$products',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      {
                        $multiply: [
                          { $ifNull: ['$$this.discount', 0] },
                          { $ifNull: ['$$this.quantity', 1] }
                        ]
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'customerName' ? 'customerName' : sortBy;
    pipeline.push({ $sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 } });

    // Get total count before pagination
    const totalDocs = await Billing.aggregate([...pipeline, { $count: 'total' }]);
    const total = totalDocs[0]?.total || 0;

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    // Execute query
    const billings = await Billing.aggregate(pipeline);

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalTotal' },
          totalBills: { $sum: 1 },
          averageBillValue: { $avg: '$finalTotal' },
          totalServices: { $sum: { $size: '$services' } },
          totalProducts: { $sum: { $size: '$products' } }
        }
      }
    ];

    const summaryStats = await Billing.aggregate(summaryPipeline);
    const summary = summaryStats[0] || {
      totalRevenue: 0,
      totalBills: 0,
      averageBillValue: 0,
      totalServices: 0,
      totalProducts: 0
    };

    // Format response
    const response = {
      billings: billings.map(billing => ({
        id: billing._id,
        customerName: billing.customerName.trim() || 'Anonymous',
        phoneNumber: billing.phoneNumber,
        services: billing.services,
        products: billing.products,
        paymentDetails: {
          subtotal: billing.subtotal,
          gstPercentage: billing.gstPercentage,
          gst: billing.gst,
          grandTotal: billing.grandTotal,
          cashback: billing.cashback,
          finalTotal: billing.finalTotal,
          paymentMethod: billing.paymentMethod,
          amountPaid: billing.amountPaid
        },
        totalDiscount: billing.totalDiscount,
        createdAt: billing.createdAt
      })),
      summary: {
        totalRevenue: Math.round(summary.totalRevenue),
        totalBills: summary.totalBills,
        averageBillValue: Math.round(summary.averageBillValue),
        totalServices: summary.totalServices,
        totalProducts: summary.totalProducts
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('List billings error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get detailed billing record by ID
router.get('/:id', async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id);
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    res.json({
      id: billing._id,
      customerInfo: {
        name: billing.customerName,
        phoneNumber: billing.phoneNumber,
        email: billing.email,
        dob: billing.dob
      },
      services: billing.services,
      products: billing.products,
      paymentDetails: {
        subtotal: billing.subtotal,
        gstPercentage: billing.gstPercentage,
        gst: billing.gst,
        grandTotal: billing.grandTotal,
        cashback: billing.cashback,
        finalTotal: billing.finalTotal,
        paymentMethod: billing.paymentMethod,
        amountPaid: billing.amountPaid
      },
      totalDiscount: billing.getTotalDiscount(),
      createdAt: billing.createdAt,
      updatedAt: billing.updatedAt
    });
  } catch (error) {
    console.error('Get billing error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get billing summary statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchConditions = {};
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        matchConditions.createdAt.$lte = endDateTime;
      }
    }

    const summary = await Billing.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalTotal' },
          totalBills: { $sum: 1 },
          averageBillValue: { $avg: '$finalTotal' },
          totalServices: { $sum: { $size: '$services' } },
          totalProducts: { $sum: { $size: '$products' } },
          totalDiscount: {
            $sum: {
              $add: [
                {
                  $reduce: {
                    input: '$services',
                    initialValue: 0,
                    in: { $add: ['$$value', '$$this.discount'] }
                  }
                },
                {
                  $reduce: {
                    input: '$products',
                    initialValue: 0,
                    in: { $add: ['$$value', { $multiply: ['$$this.discount', '$$this.quantity'] }] }
                  }
                }
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $round: ['$totalRevenue', 0] },
          totalBills: 1,
          averageBillValue: { $round: ['$averageBillValue', 0] },
          totalServices: 1,
          totalProducts: 1,
          totalDiscount: { $round: ['$totalDiscount', 0] }
        }
      }
    ]);

    res.json(summary[0] || {
      totalRevenue: 0,
      totalBills: 0,
      averageBillValue: 0,
      totalServices: 0,
      totalProducts: 0,
      totalDiscount: 0
    });
  } catch (error) {
    console.error('Get billing statistics error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;