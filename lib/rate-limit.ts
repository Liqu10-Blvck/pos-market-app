interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter helper for Node.js API routes.
 * 
 * @param key Unique key to identify the client (e.g. UID or IP)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(key) || { timestamps: [] };

  // Filter timestamps to keep only those within the active window
  const validTimestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    return { success: false, remaining: 0 };
  }

  validTimestamps.push(now);
  memoryStore.set(key, { timestamps: validTimestamps });

  return { success: true, remaining: limit - validTimestamps.length };
}
