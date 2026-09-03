/**
 * Process-wide ioredis client.
 *
 * One connection per Node process. It is stashed on `globalThis` so Next's dev
 * hot-reload re-uses the existing socket instead of opening a new one on every
 * module reload — left unchecked that leaks connections until Redis refuses them.
 */
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { __courselyRedis?: Redis }

export const redis: Redis =
  globalForRedis.__courselyRedis ??
  new Redis(process.env.REDIS_URL, {
    // Do not dial on construction: the socket opens on the first command, so
    // importing this module from a test or a CLI script costs nothing.
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.__courselyRedis = redis
