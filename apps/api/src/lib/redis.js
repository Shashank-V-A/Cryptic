import Redis from 'ioredis';

let client;
let unavailable = false;

export function getRedis(url) {
  if (unavailable) {
    throw new Error('Redis marked unavailable');
  }
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 2) {
          unavailable = true;
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });
    client.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[redis]', err.message);
      }
    });
  }
  return client;
}

export function isRedisAvailable() {
  return Boolean(client) && !unavailable;
}
