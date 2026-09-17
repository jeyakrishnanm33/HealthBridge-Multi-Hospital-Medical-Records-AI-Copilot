const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_SECRET_KEY: z.string().default('hb_internal_secret_key_change_in_production_32char'),
  AI_RAG_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.55),
  AI_ASSISTANT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  AI_ASSISTANT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  throw new Error('Environment validation failed. Please check your .env configuration.');
}

module.exports = parsed.data;
