const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const moment = require('moment');

class AggregationService {
  /**
   * Aggregate daily analytics to weekly
   */
  static async aggregateDailyToWeekly() {
    try {
      const oneWeekAgo = moment().subtract(1, 'week').startOf('day').toDate();

      // Get all daily records from the past week
      const dailyRecords = await Analytics.find({
        period: 'daily',
        date: { $gte: oneWeekAgo }
      });

      // Group by week and aggregate
      const weeklyData = {};

      dailyRecords.forEach(record => {
        const weekKey = moment(record.date).startOf('week').format('YYYY-MM-DD');

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            date: moment(weekKey).toDate(),
            period: 'weekly',
            metrics: {
              totalRevenue: 0,
              totalBookings: 0,
              confirmedBookings: 0,
              completedBookings: 0,
              cancelledBookings: 0,
              newUsers: 0,
              totalListings: 0,
              newListings: 0,
              listingViews: 0,
              totalReviews: 0
            }
          };
        }

        // Aggregate metrics
        const metrics = weeklyData[weekKey].metrics;
        metrics.totalRevenue += record.metrics.totalRevenue || 0;
        metrics.totalBookings += record.metrics.totalBookings || 0;
        metrics.confirmedBookings += record.metrics.confirmedBookings || 0;
        metrics.completedBookings += record.metrics.completedBookings || 0;
        metrics.cancelledBookings += record.metrics.cancelledBookings || 0;
        metrics.newUsers += record.metrics.newUsers || 0;
        metrics.totalListings = Math.max(metrics.totalListings, record.metrics.totalListings || 0);
        metrics.newListings += record.metrics.newListings || 0;
        metrics.listingViews += record.metrics.listingViews || 0;
        metrics.totalReviews += record.metrics.totalReviews || 0;
      });

      // Save weekly records
      for (const [weekKey, data] of Object.entries(weeklyData)) {
        await Analytics.updateOne(
          {
            type: data.type,
            period: 'weekly',
            date: data.date
          },
          { $set: data },
          { upsert: true }
        );
      }

      logger.info(`Aggregated ${Object.keys(weeklyData).length} weekly records`);
    } catch (error) {
      logger.error('Error aggregating daily to weekly:', error);
    }
  }

  /**
   * Aggregate daily analytics to monthly
   */
  static async aggregateDailyToMonthly() {
    try {
      const oneMonthAgo = moment().subtract(1, 'month').startOf('day').toDate();

      // Get all daily records from the past month
      const dailyRecords = await Analytics.find({
        period: 'daily',
        date: { $gte: oneMonthAgo }
      });

      // Group by month and aggregate
      const monthlyData = {};

      dailyRecords.forEach(record => {
        const monthKey = moment(record.date).startOf('month').format('YYYY-MM-DD');

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            date: moment(monthKey).toDate(),
            period: 'monthly',
            metrics: {
              totalRevenue: 0,
              totalBookings: 0,
              confirmedBookings: 0,
              completedBookings: 0,
              cancelledBookings: 0,
              newUsers: 0,
              totalListings: 0,
              newListings: 0,
              activeListings: 0,
              listingViews: 0,
              totalReviews: 0,
              averageRating: 0
            }
          };
        }

        // Aggregate metrics
        const metrics = monthlyData[monthKey].metrics;
        metrics.totalRevenue += record.metrics.totalRevenue || 0;
        metrics.totalBookings += record.metrics.totalBookings || 0;
        metrics.confirmedBookings += record.metrics.confirmedBookings || 0;
        metrics.completedBookings += record.metrics.completedBookings || 0;
        metrics.cancelledBookings += record.metrics.cancelledBookings || 0;
        metrics.newUsers += record.metrics.newUsers || 0;
        metrics.totalListings = Math.max(metrics.totalListings, record.metrics.totalListings || 0);
        metrics.activeListings = Math.max(metrics.activeListings, record.metrics.activeListings || 0);
        metrics.newListings += record.metrics.newListings || 0;
        metrics.listingViews += record.metrics.listingViews || 0;
        metrics.totalReviews += record.metrics.totalReviews || 0;
      });

      // Save monthly records
      for (const [monthKey, data] of Object.entries(monthlyData)) {
        await Analytics.updateOne(
          {
            type: data.type,
            period: 'monthly',
            date: data.date
          },
          { $set: data },
          { upsert: true }
        );
      }

      logger.info(`Aggregated ${Object.keys(monthlyData).length} monthly records`);
    } catch (error) {
      logger.error('Error aggregating daily to monthly:', error);
    }
  }

  /**
   * Cleanup old analytics records based on retention policy
   */
  static async cleanupOldData(retentionDays = 730) {
    try {
      const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

      const result = await Analytics.deleteMany({
        date: { $lt: cutoffDate }
      });

      logger.info(`Deleted ${result.deletedCount} old analytics records`);
    } catch (error) {
      logger.error('Error cleaning up old analytics data:', error);
    }
  }

  /**
   * Calculate host statistics
   */
  static async calculateHostStats(hostId) {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const stats = await Analytics.aggregate([
        {
          $match: {
            hostId,
            date: { $gte: thirtyDaysAgo }
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
            avgOccupancyRate: { $avg: '$metrics.occupancyRate' },
            totalListingViews: { $sum: '$metrics.listingViews' },
            uniqueGuests: { $sum: '$metrics.uniqueGuests' }
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('Error calculating host stats:', error);
      return {};
    }
  }

  /**
   * Calculate admin platform statistics
   */
  static async calculatePlatformStats() {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const stats = await Analytics.aggregate([
        {
          $match: {
            type: 'admin_dashboard',
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$metrics.totalRevenue' },
            totalCommission: { $sum: '$metrics.commission' },
            totalBookings: { $sum: '$metrics.totalBookings' },
            confirmedBookings: { $sum: '$metrics.confirmedBookings' },
            completedBookings: { $sum: '$metrics.completedBookings' },
            cancelledBookings: { $sum: '$metrics.cancelledBookings' },
            newUsers: { $sum: '$metrics.newUsers' },
            totalUsers: { $max: '$metrics.totalUsers' },
            totalListings: { $max: '$metrics.totalListings' },
            activeListings: { $max: '$metrics.activeListings' },
            newListings: { $sum: '$metrics.newListings' },
            avgRating: { $avg: '$metrics.averageRating' }
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('Error calculating platform stats:', error);
      return {};
    }
  }

  /**
   * Get top performers (hosts)
   */
  static async getTopPerformers(limit = 10, metric = 'totalRevenue') {
    try {
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

      const topPerformers = await Analytics.aggregate([
        {
          $match: {
            hostId: { $ne: null },
            type: 'revenue',
            date: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$hostId',
            totalRevenue: { $sum: '$metrics.totalRevenue' },
            totalBookings: { $sum: '$metrics.totalBookings' },
            completedBookings: { $sum: '$metrics.completedBookings' }
          }
        },
        { $sort: { [metric]: -1 } },
        { $limit: limit }
      ]);

      return topPerformers;
    } catch (error) {
      logger.error('Error getting top performers:', error);
      return [];
    }
  }

  /**
   * Get trends
   */
  static async getTrends(days = 30) {
    try {
      const cutoffDate = moment().subtract(days, 'days').toDate();

      const trends = await Analytics.aggregate([
        {
          $match: {
            type: 'admin_dashboard',
            date: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            totalRevenue: { $sum: '$metrics.totalRevenue' },
            totalBookings: { $sum: '$metrics.totalBookings' },
            newUsers: { $sum: '$metrics.newUsers' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return trends;
    } catch (error) {
      logger.error('Error calculating trends:', error);
      return [];
    }
  }
}

module.exports = AggregationService;
