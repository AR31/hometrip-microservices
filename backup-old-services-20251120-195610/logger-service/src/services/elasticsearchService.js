const { Client } = require('@elastic/elasticsearch');
const config = require('../config');
const logger = require('../utils/logger');

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.indexName = config.ELASTICSEARCH_INDEX;
  }

  /**
   * Initialize Elasticsearch connection
   */
  async connect() {
    try {
      this.client = new Client({
        node: config.ELASTICSEARCH_URL,
        requestTimeout: 30000,
        sniffOnStart: true,
        sniffInterval: 10000,
        sniffOnConnectionFault: true
      });

      // Test connection
      const health = await this.client.cluster.health();
      logger.info(`Connected to Elasticsearch at ${config.ELASTICSEARCH_URL}`, {
        status: health.status,
        nodeCount: health.number_of_nodes
      });

      this.isConnected = true;

      // Create index if it doesn't exist
      await this.createIndexIfNotExists();

      return true;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Create index with mappings if it doesn't exist
   */
  async createIndexIfNotExists() {
    try {
      // Check if index exists
      const exists = await this.client.indices.exists({ index: this.indexName });

      if (!exists) {
        logger.info(`Creating Elasticsearch index: ${this.indexName}`);

        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 1,
              'refresh_interval': '1s',
              'index.mapping.total_fields.limit': 2000,
              analysis: {
                analyzer: {
                  default: {
                    type: 'standard',
                    stopwords: '_english_'
                  },
                  message_analyzer: {
                    type: 'standard',
                    stopwords: []
                  }
                }
              }
            },
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                level: {
                  type: 'keyword'
                },
                service: {
                  type: 'keyword'
                },
                hostname: {
                  type: 'keyword'
                },
                environment: {
                  type: 'keyword'
                },
                message: {
                  type: 'text',
                  analyzer: 'message_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                stack: {
                  type: 'text'
                },
                requestId: {
                  type: 'keyword'
                },
                userId: {
                  type: 'keyword'
                },
                method: {
                  type: 'keyword'
                },
                url: {
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                statusCode: {
                  type: 'integer'
                },
                responseTime: {
                  type: 'integer'
                },
                userAgent: {
                  type: 'text'
                },
                ip: {
                  type: 'ip'
                },
                errorCode: {
                  type: 'keyword'
                },
                errorType: {
                  type: 'keyword'
                },
                tags: {
                  type: 'keyword'
                },
                metadata: {
                  type: 'object',
                  enabled: true
                },
                expiresAt: {
                  type: 'date'
                }
              }
            }
          }
        });

        logger.info(`Index ${this.indexName} created successfully`);
      }
    } catch (error) {
      logger.error(`Error creating index ${this.indexName}:`, error);
      throw error;
    }
  }

  /**
   * Index a single log document
   */
  async indexLog(log) {
    if (!this.isConnected || !this.client) {
      logger.warn('Elasticsearch not connected, cannot index log');
      return null;
    }

    try {
      const result = await this.client.index({
        index: this.indexName,
        id: log._id.toString(),
        body: this.prepareDocument(log)
      });

      return result;
    } catch (error) {
      logger.error('Error indexing log in Elasticsearch:', error);
      return null;
    }
  }

  /**
   * Bulk index multiple logs
   */
  async bulkIndexLogs(logs) {
    if (!this.isConnected || !this.client) {
      logger.warn('Elasticsearch not connected, cannot bulk index logs');
      return null;
    }

    if (!logs || logs.length === 0) {
      return { processed: 0 };
    }

    try {
      const bulkBody = [];

      logs.forEach(log => {
        bulkBody.push({
          index: {
            _index: this.indexName,
            _id: log._id.toString()
          }
        });
        bulkBody.push(this.prepareDocument(log));
      });

      const result = await this.client.bulk({
        body: bulkBody
      });

      logger.debug(`Bulk indexed ${logs.length} logs to Elasticsearch`, {
        errors: result.errors,
        items: result.items.length
      });

      return {
        processed: result.items.length,
        errors: result.errors
      };
    } catch (error) {
      logger.error('Error bulk indexing logs in Elasticsearch:', error);
      return { processed: 0, error: error.message };
    }
  }

  /**
   * Search logs using Elasticsearch
   */
  async searchLogs(params) {
    if (!this.isConnected || !this.client) {
      throw new Error('Elasticsearch not connected');
    }

    const {
      query,
      service,
      level,
      startDate,
      endDate,
      from = 0,
      size = 100
    } = params;

    try {
      const esQuery = this.buildSearchQuery({
        query,
        service,
        level,
        startDate,
        endDate
      });

      const result = await this.client.search({
        index: this.indexName,
        from,
        size,
        body: esQuery
      });

      const logs = result.hits.hits.map(hit => ({
        _id: hit._id,
        ...hit._source
      }));

      return {
        logs,
        total: result.hits.total.value,
        page: Math.floor(from / size) + 1,
        pages: Math.ceil(result.hits.total.value / size)
      };
    } catch (error) {
      logger.error('Error searching logs in Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Build Elasticsearch query
   */
  buildSearchQuery(params) {
    const { query, service, level, startDate, endDate } = params;
    const filters = [];

    // Full-text search on message
    const must = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['message^2', 'stack', 'errorCode', 'url'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Add filters
    if (service) {
      filters.push({ term: { service } });
    }

    if (level) {
      filters.push({ term: { level } });
    }

    if (startDate || endDate) {
      const rangeFilter = { range: { timestamp: {} } };
      if (startDate) {
        rangeFilter.range.timestamp.gte = startDate;
      }
      if (endDate) {
        rangeFilter.range.timestamp.lte = endDate;
      }
      filters.push(rangeFilter);
    }

    const body = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filters
        }
      },
      sort: [{ timestamp: { order: 'desc' } }],
      _source: [
        'timestamp',
        'level',
        'service',
        'message',
        'requestId',
        'userId',
        'errorCode',
        'statusCode',
        'responseTime'
      ]
    };

    return body;
  }

  /**
   * Prepare document for Elasticsearch
   */
  prepareDocument(log) {
    const doc = {
      timestamp: log.timestamp || new Date(),
      level: log.level,
      service: log.service,
      message: log.message,
      hostname: log.hostname,
      environment: log.environment,
      requestId: log.requestId,
      userId: log.userId,
      method: log.method,
      url: log.url,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      userAgent: log.userAgent,
      ip: log.ip,
      stack: log.stack,
      errorCode: log.errorCode,
      errorType: log.errorType,
      tags: log.tags || [],
      metadata: log.metadata || {},
      expiresAt: log.expiresAt
    };

    // Remove undefined values
    Object.keys(doc).forEach(key => doc[key] === undefined && delete doc[key]);

    return doc;
  }

  /**
   * Delete old logs from Elasticsearch
   */
  async deleteOldLogs(days) {
    if (!this.isConnected || !this.client) {
      logger.warn('Elasticsearch not connected, cannot delete old logs');
      return null;
    }

    try {
      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - days);

      const result = await this.client.deleteByQuery({
        index: this.indexName,
        body: {
          query: {
            range: {
              timestamp: {
                lt: beforeDate.toISOString()
              }
            }
          }
        }
      });

      logger.info(`Deleted ${result.deleted} old logs from Elasticsearch`, { days });
      return result;
    } catch (error) {
      logger.error('Error deleting old logs from Elasticsearch:', error);
      return null;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const stats = await this.client.indices.stats({ index: this.indexName });
      const count = await this.client.count({ index: this.indexName });

      return {
        index: this.indexName,
        documentCount: count.count,
        stats: stats.indices[this.indexName]
      };
    } catch (error) {
      logger.error('Error getting index stats:', error);
      return null;
    }
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.close();
      }
      this.isConnected = false;
      logger.info('Disconnected from Elasticsearch');
    } catch (error) {
      logger.error('Error closing Elasticsearch connection:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      indexName: this.indexName
    };
  }
}

// Export singleton instance
module.exports = new ElasticsearchService();
