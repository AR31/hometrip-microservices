const { getClient } = require('../config/elasticsearch');
const logger = require('../utils/logger');
const config = require('../config');

class ElasticsearchService {
  constructor() {
    this.indexName = config.elasticsearch.index;
  }

  /**
   * Initialize Elasticsearch index with mappings
   */
  async initializeIndex() {
    try {
      const client = getClient();
      const indexExists = await client.indices.exists({ index: this.indexName });

      if (!indexExists) {
        await client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  default: {
                    type: 'standard',
                    stopwords: '_english_'
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                description: { type: 'text' },
                location: { type: 'text' },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } }
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } }
                },
                address: { type: 'text' },
                lat: { type: 'geo_point' },
                lng: { type: 'geo_point' },
                price: { type: 'integer' },
                guests: { type: 'integer' },
                bedrooms: { type: 'integer' },
                beds: { type: 'integer' },
                bathrooms: { type: 'integer' },
                structure: { type: 'keyword' },
                propertyType: { type: 'keyword' },
                amenities: { type: 'keyword' },
                hostId: { type: 'keyword' },
                isActive: { type: 'boolean' },
                averageRating: { type: 'float' },
                reviewCount: { type: 'integer' },
                petsAllowed: { type: 'boolean' },
                instantBooking: { type: 'boolean' },
                selfCheckIn: { type: 'boolean' },
                freeParking: { type: 'boolean' },
                topRated: { type: 'boolean' },
                houseRules: { type: 'nested' },
                discounts: { type: 'nested' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });

        logger.info(`Elasticsearch index '${this.indexName}' created successfully`);
      } else {
        logger.info(`Elasticsearch index '${this.indexName}' already exists`);
      }
    } catch (error) {
      logger.error('Error initializing Elasticsearch index:', error);
      throw error;
    }
  }

  /**
   * Index a document (listing)
   */
  async indexDocument(id, document) {
    try {
      const client = getClient();
      await client.index({
        index: this.indexName,
        id: id.toString(),
        body: {
          ...document,
          id: id.toString()
        }
      });
      logger.debug(`Document indexed: ${id}`);
    } catch (error) {
      logger.error(`Error indexing document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(id, partialDocument) {
    try {
      const client = getClient();
      await client.update({
        index: this.indexName,
        id: id.toString(),
        body: {
          doc: partialDocument
        }
      });
      logger.debug(`Document updated: ${id}`);
    } catch (error) {
      logger.error(`Error updating document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id) {
    try {
      const client = getClient();
      await client.delete({
        index: this.indexName,
        id: id.toString()
      });
      logger.debug(`Document deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search listings
   */
  async search(query, filters = {}, page = 1, limit = 20) {
    try {
      const client = getClient();
      const from = (page - 1) * limit;

      // Build query
      const mustClauses = [];
      const filterClauses = [];

      // Text search on multiple fields
      if (query && query.trim()) {
        mustClauses.push({
          multi_match: {
            query: query.trim(),
            fields: ['title^2', 'description', 'location', 'city^2', 'country'],
            fuzziness: 'AUTO'
          }
        });
      }

      // Price filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const priceFilter = {};
        if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice;
        if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice;
        filterClauses.push({ range: { price: priceFilter } });
      }

      // Capacity filters
      if (filters.guests !== undefined) {
        filterClauses.push({ range: { guests: { gte: filters.guests } } });
      }
      if (filters.bedrooms !== undefined) {
        filterClauses.push({ range: { bedrooms: { gte: filters.bedrooms } } });
      }
      if (filters.beds !== undefined) {
        filterClauses.push({ range: { beds: { gte: filters.beds } } });
      }
      if (filters.bathrooms !== undefined) {
        filterClauses.push({ range: { bathrooms: { gte: filters.bathrooms } } });
      }

      // Location filters
      if (filters.city) {
        filterClauses.push({ match: { 'city.keyword': filters.city } });
      }
      if (filters.country) {
        filterClauses.push({ match: { 'country.keyword': filters.country } });
      }

      // Property type filters
      if (filters.structure) {
        filterClauses.push({ match: { structure: filters.structure } });
      }
      if (filters.propertyType) {
        filterClauses.push({ match: { propertyType: filters.propertyType } });
      }

      // Amenities filter
      if (filters.amenities && Array.isArray(filters.amenities) && filters.amenities.length > 0) {
        filterClauses.push({
          bool: {
            must: filters.amenities.map(amenity => ({
              match: { amenities: amenity }
            }))
          }
        });
      }

      // Boolean filters
      if (filters.petsAllowed === true) {
        filterClauses.push({ match: { petsAllowed: true } });
      }
      if (filters.instantBooking === true) {
        filterClauses.push({ match: { instantBooking: true } });
      }
      if (filters.selfCheckIn === true) {
        filterClauses.push({ match: { selfCheckIn: true } });
      }
      if (filters.freeParking === true) {
        filterClauses.push({ match: { freeParking: true } });
      }
      if (filters.topRated === true) {
        filterClauses.push({ match: { topRated: true } });
      }

      // Always filter for active listings
      filterClauses.push({ match: { isActive: true } });

      // Build the final query
      const esQuery = {
        bool: {
          ...(mustClauses.length > 0 && { must: mustClauses }),
          ...(filterClauses.length > 0 && { filter: filterClauses })
        }
      };

      // Determine sort
      let sort = [];
      if (filters.sortBy === 'price-asc') {
        sort = [{ price: { order: 'asc' } }];
      } else if (filters.sortBy === 'price-desc') {
        sort = [{ price: { order: 'desc' } }];
      } else if (filters.sortBy === 'rating') {
        sort = [
          { averageRating: { order: 'desc' } },
          { reviewCount: { order: 'desc' } }
        ];
      } else if (filters.sortBy === 'popular') {
        sort = [{ reviewCount: { order: 'desc' } }];
      } else if (filters.sortBy === 'newest') {
        sort = [{ createdAt: { order: 'desc' } }];
      } else {
        // Default: relevance (score)
        sort = [{ _score: { order: 'desc' } }];
      }

      // Execute search
      const response = await client.search({
        index: this.indexName,
        body: {
          query: esQuery,
          sort: sort,
          from: from,
          size: limit,
          _source: [
            'id', 'title', 'description', 'location', 'city', 'country',
            'price', 'guests', 'bedrooms', 'beds', 'bathrooms',
            'structure', 'propertyType', 'amenities', 'hostId',
            'averageRating', 'reviewCount', 'createdAt', 'updatedAt'
          ]
        }
      });

      const hits = response.hits.hits;
      const total = response.hits.total.value;

      logger.debug(`Search completed: ${hits.length} results from ${total} total`);

      return {
        listings: hits.map(hit => ({
          _id: hit._source.id,
          ...hit._source,
          _score: hit._score
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query, limit = 10) {
    try {
      const client = getClient();

      const response = await client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: query,
                    fields: ['title', 'city', 'country'],
                    fuzziness: 'AUTO',
                    prefix_length: 1
                  }
                }
              ],
              filter: [{ match: { isActive: true } }]
            }
          },
          aggs: {
            cities: {
              terms: {
                field: 'city.keyword',
                size: limit
              }
            },
            titles: {
              terms: {
                field: 'title.keyword',
                size: limit
              }
            }
          },
          size: 0
        }
      });

      const suggestions = [];

      // Add city suggestions
      if (response.aggregations.cities.buckets) {
        response.aggregations.cities.buckets.forEach(bucket => {
          suggestions.push({
            type: 'city',
            text: bucket.key,
            count: bucket.doc_count
          });
        });
      }

      // Add title suggestions
      if (response.aggregations.titles.buckets) {
        response.aggregations.titles.buckets.forEach(bucket => {
          suggestions.push({
            type: 'listing',
            text: bucket.key,
            count: bucket.doc_count
          });
        });
      }

      logger.debug(`Autocomplete: ${suggestions.length} suggestions for "${query}"`);

      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error('Autocomplete error:', error);
      throw error;
    }
  }

  /**
   * Get popular destinations
   */
  async getPopularDestinations(limit = 10) {
    try {
      const client = getClient();

      const response = await client.search({
        index: this.indexName,
        body: {
          query: {
            match: { isActive: true }
          },
          aggs: {
            cities: {
              terms: {
                field: 'city.keyword',
                size: limit,
                order: { totalRating: 'desc' }
              },
              aggs: {
                country: {
                  terms: {
                    field: 'country.keyword',
                    size: 1
                  }
                },
                avgRating: {
                  avg: {
                    field: 'averageRating'
                  }
                },
                totalRating: {
                  sum: {
                    field: 'averageRating'
                  }
                }
              }
            }
          },
          size: 0
        }
      });

      const destinations = response.aggregations.cities.buckets.map(bucket => ({
        city: bucket.key,
        country: bucket.country.buckets[0]?.key || 'Unknown',
        listingCount: bucket.doc_count,
        averageRating: bucket.avgRating.value || 0
      }));

      logger.debug(`Popular destinations: ${destinations.length} retrieved`);

      return destinations;
    } catch (error) {
      logger.error('Error fetching popular destinations:', error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents) {
    try {
      const client = getClient();
      const body = [];

      documents.forEach(doc => {
        body.push({ index: { _index: this.indexName, _id: doc.id } });
        body.push(doc);
      });

      if (body.length === 0) return { inserted: 0, errors: [] };

      const response = await client.bulk({ body });

      logger.info(`Bulk index: ${documents.length} documents processed`);

      return {
        inserted: documents.length - (response.errors ? Object.keys(response.items).length : 0),
        errors: response.errors ? response.items.filter(item => item.index?.error) : []
      };
    } catch (error) {
      logger.error('Bulk index error:', error);
      throw error;
    }
  }

  /**
   * Delete all documents in index
   */
  async deleteAllDocuments() {
    try {
      const client = getClient();
      await client.deleteByQuery({
        index: this.indexName,
        body: {
          query: { match_all: {} }
        }
      });
      logger.info('All documents deleted from index');
    } catch (error) {
      logger.error('Error deleting all documents:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();
