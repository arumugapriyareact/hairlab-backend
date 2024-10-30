const express = require('express');
const router = express.Router();
const Report = require('../models/Billing');
const Customer = require('../models/Customer');

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    // Common match stage for date filtering
    const dateMatch = {
      createdAt: { $gte: start, $lte: end }
    };

    // 1. Calculate Metrics
    const [
      salesData,
      customerVisits,
      serviceCosts,
      totalVisits
    ] = await Promise.all([
      // Total Sales
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$finalTotal' }
          }
        }
      ]),

      // Unique Customers in Date Range
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: '$phoneNumber',
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 }
          }
        }
      ]),

      // Total Service Cost
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $unwind: '$services'
        },
        {
          $group: {
            _id: null,
            totalServiceCost: { $sum: '$services.price' }
          }
        }
      ]),

      // Total Visits (Billings)
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: null,
            totalVisits: { $sum: 1 }
          }
        }
      ])
    ]);

    // 2. Calculate Chart Data
    const [
      salesVsExpenses,
      customerGrowth,
      employeeSales,
      serviceDistribution,
      topProducts,
      topCustomers
    ] = await Promise.all([
      // Sales vs Expenses Graph Data
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sales: { $sum: '$finalTotal' },
            expenses: { $sum: '$subtotal' }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            sales: 1,
            expenses: 1
          }
        }
      ]),

      // Customer Growth Data
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            customers: { $addToSet: '$phoneNumber' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            customers: { $size: '$customers' }
          }
        },
        {
          $sort: { name: 1 }
        }
      ]),

      // Employee-wise Sales
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $unwind: '$services'
        },
        {
          $group: {
            _id: '$services.staff',
            revenue: { $sum: '$services.price' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            revenue: 1
          }
        },
        {
          $sort: { revenue: -1 }
        }
      ]),

      // Service Distribution
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $unwind: '$services'
        },
        {
          $group: {
            _id: '$services.name',
            count: { $sum: 1 },
            revenue: { $sum: '$services.price' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            count: 1,
            revenue: 1
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ]),

      // Top 5 Products
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $unwind: '$products'
        },
        {
          $group: {
            _id: '$products.name',
            value: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
            quantity: { $sum: '$products.quantity' }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            value: 1,
            quantity: 1
          }
        },
        {
          $sort: { value: -1 }
        },
        {
          $limit: 5
        }
      ]),

      // Top 5 Customers
      Report.aggregate([
        {
          $match: dateMatch
        },
        {
          $group: {
            _id: '$phoneNumber',
            name: { $first: '$customerName' },
            value: { $sum: '$finalTotal' },
            visits: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            phoneNumber: '$_id',
            name: 1,
            value: 1,
            visits: 1
          }
        },
        {
          $sort: { value: -1 }
        },
        {
          $limit: 5
        }
      ])
    ]);

    // Prepare the response
    const dashboardData = {
      metrics: {
        totalSales: salesData[0]?.totalSales || 0,
        totalCustomers: customerVisits[0]?.totalCustomers || 0,
        totalServiceCost: serviceCosts[0]?.totalServiceCost || 0,
        totalVisits: totalVisits[0]?.totalVisits || 0
      },
      charts: {
        salesVsExpenses,
        customerGrowth,
        employeeSales,
        serviceDistribution,
        topProducts,
        topCustomers
      },
      performance: {
        totalDocumentsProcessed: totalVisits[0]?.totalVisits || 0
      }
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

module.exports = router;