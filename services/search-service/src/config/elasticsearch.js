const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

let client = null;

/**
 * Initialize Elasticsearch client
 */
const initElasticsearch = async () => {
  try {
    const node = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';

    client = new Client({
      node: node,
      requestTimeout: 30000,
      sniffOnStart: false
    });

    // Test connection
    const health = await client.cluster.health();
    logger.info(`Elasticsearch connected. Status: ${health.status}`);

    return client;
  } catch (error) {
    logger.warn('Failed to connect to Elasticsearch (search functionality will be limited):', error.message);
    client = null;
    return null;
  }
};

/**
 * Get Elasticsearch client
 */
const getClient = () => {
  if (!client) {
    throw new Error('Elasticsearch client not initialized. Call initElasticsearch() first.');
  }
  return client;
};

/**
 * Close Elasticsearch connection
 */
const closeElasticsearch = async () => {
  try {
    if (client) {
      await client.close();
      logger.info('Elasticsearch connection closed');
      client = null;
    }
  } catch (error) {
    logger.error('Error closing Elasticsearch connection:', error);
  }
};

module.exports = {
  initElasticsearch,
  getClient,
  closeElasticsearch
};
