const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug', 'verbose'],
    required: true,
    index: true
  },

  // Source information
  service: {
    type: String,
    required: true,
    index: true
  },
  hostname: String,
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development',
    index: true
  },

  // Log content
  message: {
    type: String,
    required: true,
    index: 'text'
  },
  stack: String,

  // Request context
  requestId: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  method: String,
  url: String,
  statusCode: Number,
  responseTime: Number, // in ms
  userAgent: String,
  ip: String,

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Error details
  errorCode: String,
  errorType: String,

  // Tags for filtering
  tags: {
    type: [String],
    default: [],
    index: true
  },

  // Retention
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: false, // We use timestamp field instead
  collection: 'logs'
});

// Indexes for performance
logSchema.index({ timestamp: -1, level: 1 });
logSchema.index({ service: 1, timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ requestId: 1 });
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create log
logSchema.statics.createLog = async function(logData) {
  // Set expiration date based on level (retention policy)
  if (!logData.expiresAt) {
    const retentionDays = {
      error: 90,    // 3 months
      warn: 60,     // 2 months
      info: 30,     // 1 month
      debug: 7,     // 1 week
      verbose: 3    // 3 days
    };

    const days = retentionDays[logData.level] || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    logData.expiresAt = expiresAt;
  }

  return this.create(logData);
};

// Static method to query logs
logSchema.statics.queryLogs = async function(filters = {}, options = {}) {
  const {
    service,
    level,
    startDate,
    endDate,
    userId,
    requestId,
    search,
    tags,
    limit = 100,
    skip = 0,
    sort = { timestamp: -1 }
  } = { ...filters, ...options };

  const query = {};

  if (service) query.service = service;
  if (level) query.level = level;
  if (userId) query.userId = userId;
  if (requestId) query.requestId = requestId;
  if (tags && tags.length > 0) query.tags = { $in: tags };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    logs,
    total,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit)
  };
};

// Static method to get statistics
logSchema.statics.getStats = async function(filters = {}) {
  const { service, startDate, endDate } = filters;

  const match = {};
  if (service) match.service = service;
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);

  const byService = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$service',
        total: { $sum: 1 },
        errors: {
          $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] }
        },
        warnings: {
          $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] }
        }
      }
    },
    { $sort: { total: -1 } }
  ]);

  return {
    byLevel: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        avgResponseTime: stat.avgResponseTime
      };
      return acc;
    }, {}),
    byService
  };
};

module.exports = mongoose.model('Log', logSchema);
