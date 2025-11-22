const Dispute = require('../models/Dispute');
const Report = require('../models/Report');
const eventBus = require('../utils/eventBus');
const logger = require('../utils/logger');

// Create dispute
exports.createDispute = async (req, res) => {
  try {
    const { reservation, against, disputeType, description, evidence } = req.body;

    const dispute = new Dispute({
      reservation,
      initiatedBy: req.user.id,
      against,
      disputeType,
      description,
      evidence,
    });

    await dispute.save();

    await eventBus.publish('dispute.created', {
      disputeId: dispute._id,
      initiatedBy: req.user.id,
      against,
      type: disputeType,
    });

    logger.info(`Dispute created: ${dispute._id}`);

    res.status(201).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's disputes
exports.getUserDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ initiatedBy: req.user.id }, { against: req.user.id }],
    };

    if (status) filter.status = status;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Dispute.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get dispute by ID
exports.getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findById(id).lean();

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Check authorization
    if (
      dispute.initiatedBy !== req.user.id &&
      dispute.against !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Resolve dispute (admin only)
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes, refundAmount } = req.body;

    const dispute = await Dispute.findById(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    dispute.status = 'resolved';
    dispute.resolutionNotes = resolutionNotes;
    dispute.refundAmount = refundAmount || 0;
    dispute.resolvedBy = req.user.id;
    dispute.resolvedAt = new Date();

    await dispute.save();

    await eventBus.publish('dispute.resolved', {
      disputeId: dispute._id,
      resolvedBy: req.user.id,
      refundAmount: dispute.refundAmount,
    });

    logger.info(`Dispute resolved: ${dispute._id}`);

    res.json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    logger.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Create report
exports.createReport = async (req, res) => {
  try {
    const { reportedUser, reportedListing, reportType, reason, evidence } = req.body;

    const report = new Report({
      reporter: req.user.id,
      reportedUser,
      reportedListing,
      reportType,
      reason,
      evidence,
    });

    await report.save();

    await eventBus.publish('report.created', {
      reportId: report._id,
      reporter: req.user.id,
      reportedUser,
      reportedListing,
      type: reportType,
    });

    logger.info(`Report created: ${report._id}`);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get all reports (admin only)
exports.getAllReports = async (req, res) => {
  try {
    const { status, priority, reportType, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (reportType) filter.reportType = reportType;

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update report status (admin only)
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, actionTaken } = req.body;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    if (status) report.status = status;
    if (resolution) report.resolution = resolution;
    if (actionTaken) report.actionTaken = actionTaken;

    if (status === 'action_taken' || status === 'dismissed' || status === 'closed') {
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }

    await report.save();

    await eventBus.publish('report.updated', {
      reportId: report._id,
      status: report.status,
      actionTaken: report.actionTaken,
    });

    logger.info(`Report updated: ${report._id}`);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
