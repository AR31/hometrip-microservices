const moment = require('moment');

/**
 * Calculate occupancy rate
 */
exports.calculateOccupancyRate = (bookedNights, availableNights) => {
  if (availableNights === 0) return 0;
  return Math.round((bookedNights / availableNights) * 100);
};

/**
 * Aggregate metrics from analytics data
 */
exports.aggregateMetrics = (analyticsData) => {
  return analyticsData.reduce((acc, record) => {
    return {
      totalRevenue: (acc.totalRevenue || 0) + (record.metrics?.totalRevenue || 0),
      totalBookings: (acc.totalBookings || 0) + (record.metrics?.totalBookings || 0),
      confirmedBookings: (acc.confirmedBookings || 0) + (record.metrics?.confirmedBookings || 0),
      completedBookings: (acc.completedBookings || 0) + (record.metrics?.completedBookings || 0),
      cancelledBookings: (acc.cancelledBookings || 0) + (record.metrics?.cancelledBookings || 0),
      totalUsers: (acc.totalUsers || 0) + (record.metrics?.newUsers || 0),
      totalListings: Math.max(acc.totalListings || 0, record.metrics?.totalListings || 0),
      activeListings: Math.max(acc.activeListings || 0, record.metrics?.activeListings || 0),
      totalReviews: (acc.totalReviews || 0) + (record.metrics?.totalReviews || 0),
      listingViews: (acc.listingViews || 0) + (record.metrics?.listingViews || 0),
      uniqueGuests: (acc.uniqueGuests || 0) + (record.metrics?.uniqueGuests || 0),
      averageRating: acc.averageRating || record.metrics?.averageRating || null
    };
  }, {});
};

/**
 * Format date for analytics queries
 */
exports.formatDateForAnalytics = (date) => {
  return moment(date).format('YYYY-MM-DD');
};

/**
 * Get date range for period
 */
exports.getDateRange = (period) => {
  const end = moment().endOf('day');
  let start;

  switch (period) {
    case '7d':
      start = moment().subtract(7, 'days').startOf('day');
      break;
    case '30d':
      start = moment().subtract(30, 'days').startOf('day');
      break;
    case '90d':
      start = moment().subtract(90, 'days').startOf('day');
      break;
    case '1y':
      start = moment().subtract(1, 'year').startOf('day');
      break;
    default:
      start = moment().subtract(7, 'days').startOf('day');
  }

  return { start, end };
};

/**
 * Calculate growth rate
 */
exports.calculateGrowthRate = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * Generate sparkline data (simplified time-series for charts)
 */
exports.generateSparklineData = (analyticsData, metric = 'totalRevenue', days = 30) => {
  const data = [];
  const end = moment();

  for (let i = days - 1; i >= 0; i--) {
    const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
    const record = analyticsData.find(r => moment(r.date).format('YYYY-MM-DD') === date);
    data.push({
      date,
      value: record?.metrics?.[metric] || 0
    });
  }

  return data;
};

/**
 * Calculate average metrics
 */
exports.calculateAverageMetrics = (analyticsData) => {
  if (analyticsData.length === 0) return {};

  const sum = analyticsData.reduce((acc, record) => {
    return {
      totalRevenue: (acc.totalRevenue || 0) + (record.metrics?.totalRevenue || 0),
      totalBookings: (acc.totalBookings || 0) + (record.metrics?.totalBookings || 0),
      occupancyRate: (acc.occupancyRate || 0) + (record.metrics?.occupancyRate || 0),
      averageRating: (acc.averageRating || 0) + (record.metrics?.averageRating || 0)
    };
  }, {});

  return {
    avgRevenue: Math.round(sum.totalRevenue / analyticsData.length),
    avgBookings: Math.round(sum.totalBookings / analyticsData.length),
    avgOccupancyRate: Math.round(sum.occupancyRate / analyticsData.length),
    avgRating: (sum.averageRating / analyticsData.length).toFixed(1)
  };
};
