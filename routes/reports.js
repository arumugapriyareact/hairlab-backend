const express = require('express');
const router = express.Router();
const Report = require('../models/Reports');
const { Billing } = require('../models/Billing');
const mongoose = require('mongoose');

// Get reports summary with date range
router.get('/summary', async (req, res) => {
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

    // Get billing summary
    const billingsSummary = await Billing.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalTotal' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$finalTotal' },
          totalServiceRevenue: {
            $sum: { $reduce: { input: '$services', initialValue: 0, in: { $add: ['$$value', '$$this.finalPrice'] } } }
          },
          totalProductRevenue: {
            $sum: { $reduce: { input: '$products', initialValue: 0, in: { $add: ['$$value', '$$this.finalPrice'] } } }
          },
          totalServiceDiscount: {
            $sum: { $reduce: { input: '$services', initialValue: 0, in: { $add: ['$$value', { $ifNull: ['$$this.discount', 0] }] } } }
          },
          totalProductDiscount: {
            $sum: { $reduce: { input: '$products', initialValue: 0, in: { $add: ['$$value', { $multiply: [{ $ifNull: ['$$this.discount', 0] }, '$$this.quantity'] }] } } }
          },
          serviceCount: { $sum: { $size: '$services' } },
          productCount: { $sum: { $size: '$products' } },
          cashPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$finalTotal', 0] }
          },
          cardPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$finalTotal', 0] }
          },
          upiPayments: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'upi'] }, '$finalTotal', 0] }
          },
          uniqueCustomers: { $addToSet: '$phoneNumber' }
        }
      },
      {
        $project: {
          _id: 0,
          summary: {
            totalRevenue: { $round: ['$totalRevenue', 0] },
            services: {
              count: '$serviceCount',
              revenue: { $round: ['$totalServiceRevenue', 0] },
              discount: { $round: ['$totalServiceDiscount', 0] }
            },
            products: {
              count: '$productCount',
              revenue: { $round: ['$totalProductRevenue', 0] },
              discount: { $round: ['$totalProductDiscount', 0] }
            },
            transactions: {
              total: '$totalTransactions',
              average: { $round: ['$averageTransaction', 0] }
            },
            payments: {
              cash: { $round: ['$cashPayments', 0] },
              card: { $round: ['$cardPayments', 0] },
              upi: { $round: ['$upiPayments', 0] }
            },
            customers: {
              total: { $size: '$uniqueCustomers' }
            }
          }
        }
      }
    ]);

    const summary = billingsSummary[0]?.summary || {
      totalRevenue: 0,
      services: { count: 0, revenue: 0, discount: 0 },
      products: { count: 0, revenue: 0, discount: 0 },
      transactions: { total: 0, average: 0 },
      payments: { cash: 0, card: 0, upi: 0 },
      customers: { total: 0 }
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get detailed transactions list
router.get('/transactions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentMethod,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

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

    if (paymentMethod) {
      matchConditions.paymentMethod = paymentMethod;
    }

    if (minAmount || maxAmount) {
      matchConditions.finalTotal = {};
      if (minAmount) matchConditions.finalTotal.$gte = Number(minAmount);
      if (maxAmount) matchConditions.finalTotal.$lte = Number(maxAmount);
    }

    const billings = await Billing.find(matchConditions)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Billing.countDocuments(matchConditions);

    res.json({
      transactions: billings.map(bill => ({
        id: bill._id,
        date: bill.createdAt,
        customer: {
          name: bill.customerName,
          phoneNumber: bill.phoneNumber
        },
        services: bill.services.map(s => ({
          name: s.name,
          staffName: s.staffName,
          price: s.price,
          discount: s.discount,
          finalPrice: s.finalPrice
        })),
        products: bill.products.map(p => ({
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          discount: p.discount,
          finalPrice: p.finalPrice
        })),
        payment: {
          subtotal: bill.subtotal,
          gst: bill.gst,
          discount: bill.getTotalDiscount(),
          total: bill.finalTotal,
          method: bill.paymentMethod
        }
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Generate periodic report
router.post('/generate/:period', async (req, res) => {
  try {
    const { period } = req.params;
    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        return res.status(400).json({ message: 'Invalid period' });
    }

    const response = await fetch(`${req.protocol}://${req.get('host')}/api/reports/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    const summary = await response.json();

    const report = new Report({
      reportType: period,
      startDate,
      endDate,
      summary
    });

    await report.save();

    res.status(201).json({
      message: 'Report generated successfully',
      report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;