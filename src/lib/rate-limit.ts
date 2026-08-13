export type RateLimitRule = {
  maxRequests: number;
  windowMs: number;
};

export const RATE_LIMIT_RULES = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  forgotPassword: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  resendVerification: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  aiGenerate: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per min
  export: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  import: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
} as const;

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const memoryStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + rule.windowMs });
    return {
      allowed: true,
      remaining: rule.maxRequests - 1,
      resetInSeconds: Math.ceil(rule.windowMs / 1000),
    };
  }

  if (record.count >= rule.maxRequests) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  record.count += 1;
  const remaining = rule.maxRequests - record.count;
  const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
  return { allowed: true, remaining, resetInSeconds };
}

export function enforceRateLimit(action: keyof typeof RATE_LIMIT_RULES, identifier: string): void {
  const rule = RATE_LIMIT_RULES[action];
  const key = `ratelimit:${action}:${identifier}`;
  const result = checkRateLimit(key, rule);

  if (!result.allowed) {
    throw new Error(
      `Batas percobaan ${action} terlampaui. Silakan tunggu ${result.resetInSeconds} detik sebelum mencoba lagi.`,
    );
  }
}
