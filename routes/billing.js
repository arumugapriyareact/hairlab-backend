const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
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

    // Common date match condition
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

      // Total Service Cost
      Billing.aggregate([
        { $match: dateMatch },
        { $unwind: '$services' },
        {
          $group: {
            _id: null,
            totalServiceCost: { $sum: '$services.price' }
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
            expenses: { $sum: '$subtotal' } // Assuming cost price or use another field
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
            _id: '$services.staff',
            revenue: { $sum: '$services.price' }
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
            revenue: { $sum: '$services.price' }
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
            value: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
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
            customerName: { $first: '$customerName' },
            totalSpent: { $sum: '$finalTotal' },
            visitCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Structure the response
    const dashboardData = {
      metrics: {
        totalSales: metrics[0][0]?.totalSales || 0,
        totalCustomers: metrics[1][0]?.totalCustomers || 0,
        totalServiceCost: metrics[2][0]?.totalServiceCost || 0,
        totalVisits: metrics[3][0]?.totalVisits || 0
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
          revenue: item.revenue
        })),
        serviceDistribution: chartsData[3].map(item => ({
          name: item._id,
          count: item.count,
          revenue: item.revenue
        })),
        topProducts: chartsData[4].map(item => ({
          name: item._id,
          value: item.value
        })),
        topCustomers: chartsData[5].map(item => ({
          name: item.customerName,
          phoneNumber: item._id,
          value: item.totalSpent,
          visits: item.visitCount
        }))
      }
    };

    // Add performance metrics if needed
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

// Additional endpoint for real-time metrics (optional)
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
          todayCustomers: { $addToSet: '$phoneNumber' }
        }
      }
    ]);

    res.json({
      todaySales: todayMetrics[0]?.todaySales || 0,
      todayTransactions: todayMetrics[0]?.todayTransactions || 0,
      todayUniqueCustomers: todayMetrics[0]?.todayCustomers?.length || 0
    });
  } catch (error) {
    console.error('Realtime metrics error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;