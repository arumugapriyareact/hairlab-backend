const express = require('express');
const router = express.Router();
const Reports = require('../models/Reports');

// Get all reports with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            phoneNumber,
            staffName,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        // Build query conditions
        const queryConditions = {};

        if (phoneNumber) {
            queryConditions.phoneNumber = phoneNumber;
        }

        if (startDate && endDate) {
            queryConditions.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (staffName) {
            queryConditions['services.staffName'] = staffName;
        }

        // Execute query with sorting and pagination
        const reports = await Reports.find(queryConditions)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Reports.countDocuments(queryConditions);

        // Transform data for frontend display
        const transformedReports = reports.map(report => ({
            phoneNumber: report.phoneNumber,
            customerName: report.customerName,
            services: report.services.map(service => ({
                name: service.name,
                price: service.price,
                discount: service.discount,
                staffName: service.staffName
            })),
            subtotal: report.subtotal,
            gst: report.gst,
            grandTotal: report.grandTotal,
            cashback: report.cashback,
            referralBonus: report.referralBonus,
            finalTotal: report.finalTotal,
            paymentMethod: report.paymentMethod,
            amountPaid: report.amountPaid,
            date: report.date
        }));

        res.status(200).json({
            reports: transformedReports,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: error.message });
    }
});

// Generate periodic report (daily/weekly/monthly)
router.post('/generate/:period', async (req, res) => {
    try {
        const { period } = req.params;
        let startDate, endDate;
        const now = new Date();

        // Set date range based on period
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
                return res.status(400).json({ message: 'Invalid period specified' });
        }

        // Get all transactions for the period
        const transactions = await Reports.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        // Generate analytics data
        const analyticsData = transactions.reduce((acc, transaction) => {
            // Calculate revenues
            acc.serviceRevenue += transaction.calculateServiceRevenue();
            acc.productRevenue += transaction.calculateProductRevenue();
            
            // Add discounts
            const discounts = transaction.calculateTotalDiscounts();
            acc.totalDiscounts.services += discounts.services;
            acc.totalDiscounts.products += discounts.products;
            
            // Staff performance
            transaction.services.forEach(service => {
                const staffData = acc.staffPerformance.find(s => s.staffName === service.staffName);
                if (staffData) {
                    staffData.serviceCount++;
                    staffData.revenue += service.price - service.discount;
                    staffData.totalDiscounts += service.discount;
                } else {
                    acc.staffPerformance.push({
                        staffId: service.staffId,
                        staffName: service.staffName,
                        serviceCount: 1,
                        revenue: service.price - service.discount,
                        totalDiscounts: service.discount
                    });
                }
            });

            return acc;
        }, {
            serviceRevenue: 0,
            productRevenue: 0,
            totalDiscounts: { services: 0, products: 0 },
            staffPerformance: []
        });

        res.status(200).json({
            period,
            startDate,
            endDate,
            analyticsData,
            transactionCount: transactions.length
        });
    } catch (error) {
        console.error(`Error generating ${req.params.period} report:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Additional routes remain the same...

module.exports = router;