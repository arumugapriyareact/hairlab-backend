// routes/dashboard.js
const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Base query for date range
        const dateRangeQuery = {
            createdAt: {
                $gte: start,
                $lte: end
            }
        };

        // 1. Total Sales
        const totalSalesResult = await Billing.aggregate([
            { $match: dateRangeQuery },
            { $group: {
                _id: null,
                totalSales: { $sum: "$finalTotal" }
            }}
        ]);
        const totalSales = totalSalesResult[0]?.totalSales || 0;

        // 2. Total Customers
        const totalCustomers = await Billing.distinct('phoneNumber', dateRangeQuery).length;

        // 3. Total Service Cost
        const serviceCostResult = await Billing.aggregate([
            { $match: dateRangeQuery },
            { $unwind: "$services" },
            { $group: {
                _id: null,
                totalServiceCost: { $sum: "$services.finalPrice" }
            }}
        ]);
        const totalServiceCost = serviceCostResult[0]?.totalServiceCost || 0;

        // 4. Total Visits (count of bills)
        const totalVisits = await Billing.countDocuments(dateRangeQuery);

        // 5. Sales vs Expenses by Date
        const salesVsExpenses = await Billing.aggregate([
            { $match: dateRangeQuery },
            { 
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }},
                    sales: { $sum: "$finalTotal" },
                    expenses: { 
                        $sum: {
                            $add: [
                                { $sum: "$services.finalPrice" },
                                { $sum: "$products.finalPrice" }
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } },
            { 
                $project: {
                    _id: 0,
                    name: "$_id",
                    sales: 1,
                    expenses: 1
                }
            }
        ]);

        // 6. Customer Growth
        const customerGrowth = await Billing.aggregate([
            { $match: dateRangeQuery },
            {
                $group: {
                    _id: {
                        phoneNumber: "$phoneNumber",
                        firstName: "$firstName",
                        lastName: "$lastName"
                    },
                    totalAmount: { $sum: "$finalTotal" },
                    visits: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: { 
                        $concat: [
                            "$_id.firstName", 
                            " ", 
                            "$_id.lastName"
                        ]
                    },
                    value: "$totalAmount",
                    visits: 1
                }
            },
            { $sort: { value: -1 } }
        ]);

        // 7. Employee-wise Sales
        const employeeSales = await Billing.aggregate([
            { $match: dateRangeQuery },
            { $unwind: "$services" },
            {
                $group: {
                    _id: "$services.staffName",
                    revenue: { $sum: "$services.finalPrice" }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    revenue: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // 8. Service Distribution
        const serviceDistribution = await Billing.aggregate([
            { $match: dateRangeQuery },
            { $unwind: "$services" },
            {
                $group: {
                    _id: "$services.name",
                    count: { $sum: 1 },
                    revenue: { $sum: "$services.finalPrice" }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    count: 1,
                    value: "$revenue"
                }
            },
            { $sort: { value: -1 } },
            { $limit: 5 }
        ]);

        // 9. Top 5 Products
        const topProducts = await Billing.aggregate([
            { $match: dateRangeQuery },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.name",
                    totalSold: { $sum: "$products.quantity" },
                    revenue: { 
                        $sum: { 
                            $multiply: ["$products.price", "$products.quantity"]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    count: "$totalSold",
                    value: "$revenue"
                }
            },
            { $sort: { value: -1 } },
            { $limit: 5 }
        ]);

        // 10. Top 5 Customers
        const topCustomers = await Billing.aggregate([
            { $match: dateRangeQuery },
            {
                $group: {
                    _id: {
                        phoneNumber: "$phoneNumber",
                        name: { $concat: ["$firstName", " ", "$lastName"] }
                    },
                    totalSpent: { $sum: "$finalTotal" },
                    visits: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id.name",
                    value: "$totalSpent",
                    visits: 1
                }
            },
            { $sort: { value: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            totalSales,
            totalCustomers,
            totalServiceCost,
            totalVisits,
            charts: {
                salesVsExpenses,
                customerGrowth,
                employeeSales,
                serviceDistribution,
                topProducts,
                topCustomers
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;