const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Customer = require('../models/Customer');

// Dashboard metrics route
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateMatch = {
      createdAt: { $gte: start, $lte: end }
    };

    // 1. Metrics Calculations
    const metrics = await Promise.all([
      // Total Sales
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$finalTotal' }
          }
        }
      ]),

      // Total Customers (unique customers in period)
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: '$phoneNumber'
          }
        },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 }
          }
        }
      ]),

      // Total Service Revenue
      Billing.aggregate([
        { $match: dateMatch },
        { $unwind: '$services' },
        {
          $group: {
            _id: null,
            totalServiceRevenue: { $sum: '$services.finalPrice' }
          }
        }
      ]),

      // Total Customer Visits
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: 1 }
          }
        }
      ]),

      // Total Discounts Given
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: null,
            serviceDiscounts: {
              $sum: {
                $reduce: {
                  input: '$services',
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.discount'] }
                }
              }
            },
            productDiscounts: {
              $sum: {
                $reduce: {
                  input: '$products',
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.discount'] }
                }
              }
            }
          }
        }
      ])
    ]);

    // 2. Charts Data Calculations
    const chartsData = await Promise.all([
      // Sales vs Expenses (Daily)
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sales: { $sum: '$finalTotal' },
            expenses: { $sum: '$subtotal' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Customer Growth
      Customer.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newCustomers: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Employee-Wise Sales
      Billing.aggregate([
        { $match: dateMatch },
        { $unwind: '$services' },
        {
          $group: {
            _id: '$services.staffName',
            revenue: { $sum: '$services.finalPrice' },
            totalDiscounts: { $sum: '$services.discount' },
            serviceCount: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]),

      // Service Distribution
      Billing.aggregate([
        { $match: dateMatch },
        { $unwind: '$services' },
        {
          $group: {
            _id: '$services.name',
            count: { $sum: 1 },
            revenue: { $sum: '$services.finalPrice' },
            totalDiscounts: { $sum: '$services.discount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Top 5 Products
      Billing.aggregate([
        { $match: dateMatch },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.name',
            value: {
              $sum: {
                $multiply: [
                  { $subtract: ['$products.price', '$products.discount'] },
                  '$products.quantity'
                ]
              }
            },
            quantity: { $sum: '$products.quantity' },
            totalDiscounts: { $sum: '$products.discount' }
          }
        },
        { $sort: { value: -1 } },
        { $limit: 5 }
      ]),

      // Top 5 Customers
      Billing.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: '$phoneNumber',
            firstName: { $first: '$firstName' },
            lastName: { $first: '$lastName' },
            totalSpent: { $sum: '$finalTotal' },
            visitCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 }
      ])
    ]);

    const dashboardData = {
      metrics: {
        totalSales: metrics[0][0]?.totalSales || 0,
        totalCustomers: metrics[1][0]?.totalCustomers || 0,
        totalServiceRevenue: metrics[2][0]?.totalServiceRevenue || 0,
        totalVisits: metrics[3][0]?.totalVisits || 0,
        totalDiscounts: {
          services: metrics[4][0]?.serviceDiscounts || 0,
          products: metrics[4][0]?.productDiscounts || 0
        }
      },
      charts: {
        salesVsExpenses: chartsData[0].map(item => ({
          name: item._id,
          sales: item.sales,
          expenses: item.expenses
        })),
        customerGrowth: chartsData[1].map(item => ({
          name: item._id,
          customers: item.newCustomers
        })),
        employeeSales: chartsData[2].map(item => ({
          name: item._id,
          revenue: item.revenue,
          discounts: item.totalDiscounts,
          serviceCount: item.serviceCount
        })),
        serviceDistribution: chartsData[3].map(item => ({
          name: item._id,
          count: item.count,
          revenue: item.revenue,
          discounts: item.totalDiscounts
        })),
        topProducts: chartsData[4].map(item => ({
          name: item._id,
          value: item.value,
          quantity: item.quantity,
          discounts: item.totalDiscounts
        })),
        topCustomers: chartsData[5].map(item => ({
          name: `${item.firstName} ${item.lastName}`,
          phoneNumber: item._id,
          value: item.totalSpent,
          visits: item.visitCount
        }))
      }
    };

    const totalDocs = await Billing.countDocuments(dateMatch);
    dashboardData.performance = {
      totalDocumentsProcessed: totalDocs
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Realtime metrics route
router.get('/realtime', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMetrics = await Billing.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          todaySales: { $sum: '$finalTotal' },
          todayTransactions: { $sum: 1 },
          todayCustomers: { $addToSet: '$phoneNumber' },
          todayDiscounts: {
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
                    in: { $add: ['$$value', '$$this.discount'] }
                  }
                }
              ]
            }
          }
        }
      }
    ]);

    res.json({
      todaySales: todayMetrics[0]?.todaySales || 0,
      todayTransactions: todayMetrics[0]?.todayTransactions || 0,
      todayUniqueCustomers: todayMetrics[0]?.todayCustomers?.length || 0,
      todayTotalDiscounts: todayMetrics[0]?.todayDiscounts || 0
    });
  } catch (error) {
    console.error('Realtime metrics error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List all billings route
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
      productName
    } = req.query;

    // Build match conditions
    const matchConditions = {};

    // Date filtering
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchConditions.createdAt = { $gte: start, $lte: end };
    }

    // Phone number filtering
    if (phoneNumber) {
      matchConditions.phoneNumber = phoneNumber;
    }

    // Payment method filtering
    if (paymentMethod && ['cash', 'card', 'upi'].includes(paymentMethod)) {
      matchConditions.paymentMethod = paymentMethod;
    }

    // Staff name filtering
    if (staffName) {
      matchConditions['services.staffName'] = staffName;
    }

    // Service name filtering
    if (serviceName) {
      matchConditions['services.name'] = serviceName;
    }

    // Product name filtering
    if (productName) {
      matchConditions['products.name'] = productName;
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          phoneNumber: 1,
          services: {
            $map: {
              input: '$services',
              as: 'service',
              in: {
                name: '$$service.name',
                price: '$$service.price',
                staffName: '$$service.staffName',
                finalPrice: '$$service.finalPrice',
                discount: '$$service.discount',
                duration: '$$service.duration'
              }
            }
          },
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                name: '$$product.name',
                price: '$$product.price',
                quantity: '$$product.quantity',
                discount: '$$product.discount',
                discountPercentage: '$$product.discountPercentage'
              }
            }
          },
          subtotal: 1,
          gst: 1,
          grandTotal: 1,
          cashback: 1,
          finalTotal: 1,
          paymentMethod: 1,
          amountPaid: 1,
          createdAt: 1,
          updatedAt: 1,
          totalServiceDiscount: {
            $reduce: {
              input: '$services',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.discount'] }
            }
          },
          totalProductDiscount: {
            $reduce: {
              input: '$products',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.discount'] }
            }
          }
        }
      },
      {
        $addFields: {
          totalDiscount: { $add: ['$totalServiceDiscount', '$totalProductDiscount'] },
          customerName: { $concat: ['$firstName', ' ', '$lastName'] }
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'customerName' ? 'firstName' : sortBy;
    pipeline.push({ $sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 } });

    // Get total count before pagination
    const totalDocs = await Billing.aggregate([
      ...pipeline,
      { $count: 'total' }
    ]);

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    // Execute aggregation
    const billings = await Billing.aggregate(pipeline);

    // Format response
    const response = {
      billings: billings.map(billing => ({
        id: billing._id,
        customerName: billing.customerName,
        firstName: billing.firstName,
        lastName: billing.lastName,
        phoneNumber: billing.phoneNumber,
        services: billing.services.map(service => ({
          name: service.name,
          price: service.price,
          staffName: service.staffName,
          finalPrice: service.finalPrice,
          discount: service.discount,
          duration: service.duration
        })),
        products: billing.products.map(product => ({
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          discount: product.discount,
          discountPercentage: product.discountPercentage
        })),
        paymentDetails: {
          subtotal: billing.subtotal,
          gst: billing.gst,
          grandTotal: billing.grandTotal,
          cashback: billing.cashback,
          finalTotal: billing.finalTotal,
          paymentMethod: billing.paymentMethod,
          amountPaid: billing.amountPaid
        },
        discounts: {
          serviceDiscount: billing.totalServiceDiscount,
          productDiscount: billing.totalProductDiscount,
          totalDiscount: billing.totalDiscount
        },
        createdAt: billing.createdAt,
        updatedAt: billing.updatedAt
      })),
      pagination: {
        total: totalDocs[0]?.total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((totalDocs[0]?.total || 0) / parseInt(limit))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('List billings error:', error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create new billing record
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      services,
      products,
      subtotal,
      gst,
      grandTotal,
      cashback,
      finalTotal,
      paymentMethod,
      amountPaid
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({ message: 'First name, last name, and phone number are required' });
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ message: 'At least one service is required' });
    }

    // Validate services with updated fields
    for (const service of services) {
      if (!service.name || !service.price || !service.staffName ||
        typeof service.finalPrice !== 'number' || typeof service.discount !== 'number') {
        return res.status(400).json({
          message: 'Each service must have name, price, staffName, finalPrice, and discount'
        });
      }

      // Validate price and discount relationships
      if (service.price < service.discount) {
        return res.status(400).json({
          message: 'Service discount cannot be greater than price'
        });
      }

      if (service.finalPrice !== service.price - service.discount) {
        return res.status(400).json({
          message: 'Service finalPrice must equal price minus discount'
        });
      }
    }

    // Validate products with updated fields
    if (products && Array.isArray(products)) {
      for (const product of products) {
        if (!product.name || !product.price || !product.quantity ||
          typeof product.discount !== 'number' || typeof product.discountPercentage !== 'number') {
          return res.status(400).json({
            message: 'Each product must have name, price, quantity, discount, and discountPercentage'
          });
        }

        // Validate price and discount relationships
        if (product.price < product.discount) {
          return res.status(400).json({
            message: 'Product discount cannot be greater than price'
          });
        }

        // Validate discount percentage
        const calculatedDiscount = (product.price * product.discountPercentage) / 100;
        if (Math.abs(calculatedDiscount - product.discount) > 0.01) { // Allow small rounding differences
          return res.status(400).json({
            message: 'Product discount does not match the discount percentage'
          });
        }
      }
    }

    // Validate payment details
    if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (typeof amountPaid !== 'number' || amountPaid < 0) {
      return res.status(400).json({ message: 'Invalid amount paid' });
    }

    // Validate totals
    if (typeof subtotal !== 'number' || typeof gst !== 'number' ||
      typeof grandTotal !== 'number' || typeof finalTotal !== 'number') {
      return res.status(400).json({ message: 'Invalid total amounts' });
    }

    // Validate total calculations
    const calculatedServiceTotal = services.reduce((sum, service) => sum + service.finalPrice, 0);
    const calculatedProductTotal = products ? products.reduce((sum, product) =>
      sum + (product.price - product.discount) * product.quantity, 0) : 0;

    const calculatedSubtotal = calculatedServiceTotal + calculatedProductTotal;

    // if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
    //   return res.status(400).json({ message: 'Subtotal does not match calculated total' });
    // }

    const calculatedGrandTotal = subtotal + gst;
    // if (Math.abs(calculatedGrandTotal - grandTotal) > 0.01) {
    //   return res.status(400).json({ message: 'Grand total does not match calculated total' });
    // }

    const calculatedFinalTotal = grandTotal - (cashback || 0);
    // if (Math.abs(calculatedFinalTotal - finalTotal) > 0.01) {
    //   return res.status(400).json({ message: 'Final total does not match calculated total' });
    // }

    // Create new billing record
    const newBilling = new Billing({
      firstName,
      lastName,
      phoneNumber,
      services: services.map(service => ({
        name: service.name,
        price: service.price,
        staffName: service.staffName,
        finalPrice: service.finalPrice,
        discount: service.discount,
        duration: service.duration
      })),
      products: products ? products.map(product => ({
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        discount: product.discount,
        discountPercentage: product.discountPercentage
      })) : [],
      subtotal,
      gst,
      grandTotal,
      cashback: cashback || 0,
      finalTotal,
      paymentMethod,
      amountPaid
    });

    // Save the billing record
    const savedBilling = await newBilling.save();

    // Try to find or create/update customer record
    try {
      const existingCustomer = await Customer.findOne({ phoneNumber });
      if (!existingCustomer) {
        const newCustomer = new Customer({
          firstName,
          lastName,
          phoneNumber
        });
        await newCustomer.save();
      } else if (existingCustomer.firstName !== firstName || existingCustomer.lastName !== lastName) {
        // Update customer name if it has changed
        existingCustomer.firstName = firstName;
        existingCustomer.lastName = lastName;
        await existingCustomer.save();
      }
    } catch (customerError) {
      console.error('Error handling customer record:', customerError);
    }

    // Return success response with detailed billing information
    res.status(201).json({
      message: 'Billing record created successfully',
      billing: {
        id: savedBilling._id,
        customerName: `${savedBilling.firstName} ${savedBilling.lastName}`,
        firstName: savedBilling.firstName,
        lastName: savedBilling.lastName,
        phoneNumber: savedBilling.phoneNumber,
        services: savedBilling.services,
        products: savedBilling.products,
        paymentDetails: {
          subtotal: savedBilling.subtotal,
          gst: savedBilling.gst,
          grandTotal: savedBilling.grandTotal,
          cashback: savedBilling.cashback,
          finalTotal: savedBilling.finalTotal,
          paymentMethod: savedBilling.paymentMethod,
          amountPaid: savedBilling.amountPaid
        },
        createdAt: savedBilling.createdAt,
        updatedAt: savedBilling.updatedAt
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

module.exports = router;