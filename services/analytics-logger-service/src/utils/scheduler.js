const logger = require('./logger');
const AggregationService = require('../services/aggregationService');

/**
 * Schedule periodic tasks
 */
class Scheduler {
  /**
   * Start scheduler
   */
  static start() {
    logger.info('Starting scheduler...');

    // Aggregate daily to weekly every day at 2 AM
    this.scheduleTask('aggregateDailyToWeekly', () => {
      AggregationService.aggregateDailyToWeekly();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Aggregate daily to monthly every day at 3 AM
    this.scheduleTask('aggregateDailyToMonthly', () => {
      AggregationService.aggregateDailyToMonthly();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Cleanup old data every week
    this.scheduleTask('cleanupOldData', () => {
      const retentionDays = parseInt(process.env.RETENTION_DAYS || 730);
      AggregationService.cleanupOldData(retentionDays);
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

    logger.info('Scheduler started');
  }

  /**
   * Schedule a task
   */
  static scheduleTask(taskName, taskFn, interval) {
    setInterval(() => {
      try {
        logger.debug(`Executing scheduled task: ${taskName}`);
        taskFn();
      } catch (error) {
        logger.error(`Error executing scheduled task ${taskName}:`, error);
      }
    }, interval);

    logger.info(`Scheduled task '${taskName}' with interval ${interval}ms`);
  }
}

module.exports = Scheduler;
