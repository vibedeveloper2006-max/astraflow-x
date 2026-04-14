import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Zone, Alert } from './types';
import { INITIAL_ZONES } from './config/stadium-data';
import { initializeFirebase } from './config/firebase';
import { initGemini } from './services/gemini';
import { createZoneRoutes } from './routes/zones';
import { createNavigationRoutes } from './routes/navigation';
import { createAIRoutes } from './routes/ai';
import { createAlertRoutes } from './routes/alerts';
import { createSimulationRoutes } from './routes/simulation';
import { apiLimiter } from './middleware/rate-limiter';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { validateEnv } from './utils/env-validator';

dotenv.config({ path: '../.env' });
dotenv.config();
validateEnv();

// ── In-Memory State ─────────────────────────────────────
let zones: Zone[] = [...INITIAL_ZONES];
let alerts: Alert[] = [];

const getZones = (): Zone[] => zones;
const setZones = (z: Zone[]): void => { zones = z; };
const getAlerts = (): Alert[] => alerts;
const setAlerts = (a: Alert[]): void => { alerts = a; };

// ── Initialize Services ─────────────────────────────────
initializeFirebase();
initGemini();

// ── Express App ─────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Global Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

// Health check (no auth)
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'AstraFlow X API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: Date.now(),
    },
  });
});

// Auth middleware for protected routes
app.use('/api', authMiddleware);

// ── Routes ──────────────────────────────────────────────
app.use('/api/zones', createZoneRoutes(getZones, setZones));
app.use('/api/navigation', createNavigationRoutes(getZones));
app.use('/api/ai', createAIRoutes(getZones));
app.use('/api/alerts', createAlertRoutes(getAlerts, setAlerts));
app.use('/api/simulation', createSimulationRoutes(getZones, setZones, getAlerts, setAlerts));

// ── Error Handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now(),
  });
});

// ── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`⚡ AstraFlow X API running on http://localhost:${PORT}`);
  logger.info(`📊 ${zones.length} zones loaded for Sawai Mansingh Stadium`);
  logger.info(`🔑 Auth: ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'Firebase' : 'Demo mode'}`);
  logger.info(`🤖 AI: ${process.env.GEMINI_API_KEY ? 'Gemini' : 'Mock mode'}`);
});

export default app;
