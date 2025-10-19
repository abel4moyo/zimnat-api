const redis = require('redis');
const config = require('./environment');
const logger = require('../utils/logger');

let client = null;

const createRedisClient = () => {
  if (!client) {
    client = redis.createClient({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  return client;
};

const getRedisClient = () => {
  if (!client) {
    return createRedisClient();
  }
  return client;
};

const closeRedisConnection = async () => {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis connection closed');
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  closeRedisConnection
};
