import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import path from 'path';

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountPath) {
      const resolvedPath = path.resolve(serviceAccountPath);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(resolvedPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      logger.info('Firebase initialized with service account');
    } else {
      // Fallback for Cloud Run (uses default credentials)
      admin.initializeApp({
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      logger.info('Firebase initialized with default credentials');
    }

    initialized = true;
  } catch (error) {
    logger.warn('Firebase initialization skipped - running in demo mode', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    initialized = false;
  }
}

export function getDatabase(): admin.database.Database | null {
  if (!initialized) return null;
  return admin.database();
}

export function getAuth(): admin.auth.Auth | null {
  if (!initialized) return null;
  return admin.auth();
}

export { admin };
