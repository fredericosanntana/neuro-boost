import rateLimit from 'express-rate-limit';

export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // Limit each IP to 100 requests per windowMs
    message: options.message || {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const strictRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Rate limit exceeded. Please wait before making more requests.',
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});