const express = require('express');
const router = express.Router();
const Report = require('../models/Reports'); // Adjust the path as necessary
const Customer = require('../models/Customer'); // Adjust the path as necessary

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Total Sales
    const salesData = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      // {
      //   $group: {
      //     _id: null,
      //     totalSales: { $sum: '$finalTotal' }
      //   }
      // }
    ]);

    const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;
    console.log('Total Sales:', salesData);

    // 2. New Customers
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });

    console.log('New Customers:', newCustomers);

    // 3. Employee Services
    const employeeServices = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $unwind: '$services'
      },
      {
        $group: {
          _id: '$services.staff',
          serviceCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalServices: { $sum: '$serviceCount' }
        }
      }
    ]);

    const totalEmployeeServices = employeeServices.length > 0 ? employeeServices[0].totalServices : 0;
    console.log('Total Employee Services:', totalEmployeeServices);

    // 4. Average Service Cost
    const serviceCostData = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $unwind: '$services'
      },
      {
        $group: {
          _id: null,
          totalServiceCost: { $sum: '$services.price' },
          totalServices: { $sum: 1 }
        }
      }
    ]);

    const averageServiceCost = serviceCostData.length > 0 
      ? serviceCostData[0].totalServiceCost / serviceCostData[0].totalServices 
      : 0;
    console.log('Average Service Cost:', averageServiceCost);

    // Prepare the response
    const dashboardData = {
      totalSales,
      newCustomers,
      employeeServices: totalEmployeeServices,
      averageServiceCost,
    };

    console.log('Dashboard Data:', dashboardData);

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;