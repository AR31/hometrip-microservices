const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const moment = require('moment');
const { calculateOccupancyRate, aggregateMetrics } = require('../utils/analyticsUtils');

/**
 * Get Host Dashboard Statistics
 */
exports.getHostStats = async (req, res) => {
  try {
    const hostId = req.user.id;
    const { period = '7d' } = req.query;

    // Determine date range
    const now = moment();
    let startDate;

    switch (period) {
      case '7d':
        startDate = now.clone().subtract(7, 'days');
        break;
      case '30d':
        startDate = now.clone().subtract(30, 'days');
        break;
      case '90d':
        startDate = now.clone().subtract(90, 'days');
        break;
      case '1y':
        startDate = now.clone().subtract(1, 'year');
        break;
      default:
        startDate = now.clone().subtract(7, 'days');
    }

    // Get total stats for the period
    const stats = await Analytics.aggregate([
      {
        $match: {
          hostId: mongoose.Types.ObjectId(hostId),
          type: { $in: ['host_dashboard', 'revenue', 'bookings'] },
          date: { $gte: startDate.toDate(), $lte: now.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          totalBookings: { $sum: '$metrics.totalBookings' },
          confirmedBookings: { $sum: '$metrics.confirmedBookings' },
          completedBookings: { $sum: '$metrics.completedBookings' },
          cancelledBookings: { $sum: '$metrics.cancelledBookings' },
          totalListings: { $max: '$metrics.totalListings' },
          activeListings: { $max: '$metrics.activeListings' },
          averageRating: { $avg: '$metrics.averageRating' },
          totalReviews: { $sum: '$metrics.totalReviews' },
          occupancyRate: { $avg: '$metrics.occupancyRate' },
          listingViews: { $sum: '$metrics.listingViews' },
          uniqueGuests: { $sum: '$metrics.uniqueGuests' }
        }
      }
    ]);

    // Get time-series data for charts
    const timeSeriesData = await Analytics.find({
      hostId: mongoose.Types.ObjectId(hostId),
      type: 'revenue',
      date: { $gte: startDate.toDate(), $lte: now.toDate() }
    })
      .select('date metrics.totalRevenue metrics.totalBookings')
      .sort({ date: 1 })
      .lean();

    // Get upcoming bookings (from booking service via events)
    const upcomingCheckIns = await Analytics.findOne({
      hostId: mongoose.Types.ObjectId(hostId),
      type: 'bookings',
      status: 'processed'
    })
      .sort({ date: -1 })
      .lean();

    res.json({
      success: true,
      period,
      summary: stats[0] || {
        totalRevenue: 0,
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalListings: 0,
        activeListings: 0,
        averageRating: null,
        totalReviews: 0,
        occupancyRate: 0,
        listingViews: 0,
        uniqueGuests: 0
      },
      timeSeries: timeSeriesData,
      upcomingCheckIns: upcomingCheckIns?.metrics || null
    });
  } catch (error) {
    logger.error('Error fetching host stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching host statistics',
      error: error.message
    });
  }
};

/**
 * Get Admin KPI Dashboard
 */
exports.getAdminStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Determine date range
    const now = moment();
    let startDate;

    switch (period) {
      case '7d':
        startDate = now.clone().subtract(7, 'days');
        break;
      case '30d':
        startDate = now.clone().subtract(30, 'days');
        break;
      case '90d':
        startDate = now.clone().subtract(90, 'days');
        break;
      case '1y':
        startDate = now.clone().subtract(1, 'year');
        break;
      default:
        startDate = now.clone().subtract(7, 'days');
    }

    // Get platform-wide stats
    const stats = await Analytics.aggregate([
      {
        $match: {
          type: 'admin_dashboard',
          date: { $gte: startDate.toDate(), $lte: now.toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          totalCommission: { $sum: '$metrics.commission' },
          totalPlatformFee: { $sum: '$metrics.platformFee' },
          totalBookings: { $sum: '$metrics.totalBookings' },
          confirmedBookings: { $sum: '$metrics.confirmedBookings' },
          completedBookings: { $sum: '$metrics.completedBookings' },
          cancelledBookings: { $sum: '$metrics.cancelledBookings' },
          totalUsers: { $max: '$metrics.totalUsers' },
          newUsers: { $sum: '$metrics.newUsers' },
          hostCount: { $max: '$metrics.hostCount' },
          guestCount: { $max: '$metrics.guestCount' },
          totalListings: { $max: '$metrics.totalListings' },
          newListings: { $sum: '$metrics.newListings' },
          activeListings: { $max: '$metrics.activeListings' },
          totalReviews: { $sum: '$metrics.totalReviews' },
          averageRating: { $avg: '$metrics.averageRating' },
          listingViews: { $sum: '$metrics.listingViews' }
        }
      }
    ]);

    // Get time-series data for KPI charts
    const revenueTimeSeries = await Analytics.find({
      type: 'admin_dashboard',
      date: { $gte: startDate.toDate(), $lte: now.toDate() }
    })
      .select('date metrics.totalRevenue metrics.totalBookings metrics.newUsers')
      .sort({ date: 1 })
      .lean();

    // Get top hosts by revenue
    const topHosts = await Analytics.aggregate([
      {
        $match: {
          type: 'revenue',
          hostId: { $ne: null },
          date: { $gte: startDate.toDate(), $lte: now.toDate() }
        }
      },
      {
        $group: {
          _id: '$hostId',
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          totalBookings: { $sum: '$metrics.totalBookings' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'host'
        }
      }
    ]);

    res.json({
      success: true,
      period,
      summary: stats[0] || {
        totalRevenue: 0,
        totalCommission: 0,
        totalPlatformFee: 0,
        totalBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalUsers: 0,
        newUsers: 0,
        hostCount: 0,
        guestCount: 0,
        totalListings: 0,
        newListings: 0,
        activeListings: 0,
        totalReviews: 0,
        averageRating: null,
        listingViews: 0
      },
      timeSeries: revenueTimeSeries,
      topHosts: topHosts.map(host => ({
        hostId: host._id,
        hostName: host.host?.[0]?.fullName || 'Unknown',
        totalRevenue: host.totalRevenue,
        totalBookings: host.totalBookings
      }))
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin statistics',
      error: error.message
    });
  }
};

/**
 * Generate Report
 */
exports.generateReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate, format = 'json' } = req.body;
    const hostId = req.user.role === 'host' ? req.user.id : req.body.hostId;

    // Validate dates
    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Build query
    const query = {
      date: { $gte: start.toDate(), $lte: end.toDate() }
    };

    if (reportType === 'host' && hostId) {
      query.hostId = mongoose.Types.ObjectId(hostId);
      query.type = { $in: ['host_dashboard', 'revenue', 'bookings'] };
    } else if (reportType === 'admin') {
      query.type = 'admin_dashboard';
    }

    // Fetch data
    const analyticsData = await Analytics.find(query)
      .sort({ date: 1 })
      .lean();

    // Aggregate report
    const report = {
      type: reportType,
      period: {
        from: start.format('YYYY-MM-DD'),
        to: end.format('YYYY-MM-DD')
      },
      generatedAt: new Date().toISOString(),
      summary: aggregateMetrics(analyticsData),
      data: analyticsData
    };

    // Format response
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report_${reportType}_${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

/**
 * Track Event (internal endpoint for event collection)
 */
exports.trackEvent = async (req, res) => {
  try {
    const { eventType, hostId, data } = req.body;

    // Store analytics event
    const analytics = new Analytics({
      type: eventType,
      hostId: hostId || null,
      period: 'daily',
      date: new Date(),
      yearMonthDay: moment().format('YYYY-MM-DD'),
      metrics: data,
      source: 'event'
    });

    await analytics.save();

    logger.debug(`Tracked event: ${eventType}`);

    res.json({
      success: true,
      message: 'Event tracked'
    });
  } catch (error) {
    logger.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking event',
      error: error.message
    });
  }
};

/**
 * Get Analytics Summary for Dashboard
 */
exports.getSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const hostId = req.user.role === 'host' ? req.user.id : null;

    const startDate = moment().subtract(days, 'days').toDate();

    const query = {
      date: { $gte: startDate }
    };

    if (hostId) {
      query.hostId = mongoose.Types.ObjectId(hostId);
    }

    const summary = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$metrics.totalRevenue' },
          totalBookings: { $sum: '$metrics.totalBookings' },
          totalUsers: { $sum: '$metrics.newUsers' }
        }
      }
    ]);

    res.json({
      success: true,
      summary,
      period: `Last ${days} days`
    });
  } catch (error) {
    logger.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary',
      error: error.message
    });
  }
};

/**
 * Helper function to convert report to CSV
 */
function convertToCSV(report) {
  let csv = 'Date,Total Revenue,Total Bookings,Confirmed,Completed,Cancelled\n';

  report.data.forEach(record => {
    csv += `${moment(record.date).format('YYYY-MM-DD')},${record.metrics.totalRevenue || 0},${record.metrics.totalBookings || 0},${record.metrics.confirmedBookings || 0},${record.metrics.completedBookings || 0},${record.metrics.cancelledBookings || 0}\n`;
  });

  return csv;
}

module.exports = exports;
