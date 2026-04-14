import { z } from 'zod';
import { logger } from './logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for AI features'),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  VITE_API_URL: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  BIGQUERY_DATASET: z.string().default('astraflow_analytics'),
  BIGQUERY_TABLE: z.string().default('crowd_metrics'),
});

export function validateEnv() {
  try {
    const parsed = envSchema.safeParse(process.env);
    
    if (!parsed.success) {
      const errors = parsed.error.format();
      logger.error('❌ Invalid environment variables:', { errors });
      
      // Critical variables that MUST be present for the app to function at all
      if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      logger.info('✅ Environment variables validated');
    }
  } catch (error) {
    logger.error('💥 Unexpected error during env validation:', { error });
  }
}
