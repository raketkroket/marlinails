// Login attempt limits, shared across serverless instances via Upstash Redis (REST API).
// Locally (no Redis configured and not on Vercel) an in-memory store is used instead.
const memory = new Map();

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function rateLimitReady() {
  return Boolean(redisConfig()) || !process.env.VERCEL;
}

async function redis(commands) {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
  const results = await response.json();
  return results.map(item => {
    if (item.error) throw new Error(`Redis: ${item.error}`);
    return item.result;
  });
}

// Count a failed attempt; returns the count within the window and seconds until it resets.
export async function recordFailure(key, windowSeconds) {
  if (redisConfig()) {
    const [count, , ttl] = await redis([['INCR', key], ['EXPIRE', key, windowSeconds, 'NX'], ['TTL', key]]);
    return { count: Number(count), retryAfter: Math.max(1, Number(ttl)) };
  }
  const now = Date.now();
  const entry = memory.get(key);
  const current = entry && entry.until > now ? entry : { count: 0, until: now + windowSeconds * 1000 };
  current.count += 1;
  memory.set(key, current);
  return { count: current.count, retryAfter: Math.ceil((current.until - now) / 1000) };
}

export async function attempts(key) {
  if (redisConfig()) {
    const [count, ttl] = await redis([['GET', key], ['TTL', key]]);
    return { count: Number(count || 0), retryAfter: Math.max(1, Number(ttl)) };
  }
  const entry = memory.get(key);
  if (!entry || entry.until <= Date.now()) return { count: 0, retryAfter: 0 };
  return { count: entry.count, retryAfter: Math.ceil((entry.until - Date.now()) / 1000) };
}

export async function clearAttempts(key) {
  if (redisConfig()) await redis([['DEL', key]]);
  else memory.delete(key);
}

export function resetMemoryStore() {
  memory.clear();
}
