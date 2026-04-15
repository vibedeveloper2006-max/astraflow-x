import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Zone, Alert } from '../types';
import { INITIAL_ZONES } from '../config/stadium-data';
import { createZoneRoutes } from '../routes/zones';
import { createAlertRoutes } from '../routes/alerts';
import { createSimulationRoutes } from '../routes/simulation';

// ── Test App Factory ─────────────────────────────────────────────────────────

function createTestApp() {
  let zones: Zone[] = [...INITIAL_ZONES];
  let alerts: Alert[] = [];

  const getZones = () => zones;
  const setZones = (z: Zone[]) => { zones = z; };
  const getAlerts = () => alerts;
  const setAlerts = (a: Alert[]) => { alerts = a; };

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Skip auth middleware for testing — use a passthrough
  app.use('/api', (_req, _res, next) => {
    (_req as any).user = { uid: 'test-user', email: 'test@test.com', role: 'staff' };
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { service: 'AstraFlow X API' } }));
  app.use('/api/zones', createZoneRoutes(getZones, setZones));
  app.use('/api/alerts', createAlertRoutes(getAlerts, setAlerts));
  app.use('/api/simulation', createSimulationRoutes(getZones, setZones, getAlerts, setAlerts));

  return { app, getZones, setZones, getAlerts, setAlerts };
}

// ── Health ───────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with service info', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('AstraFlow X API');
  });
});

// ── Zones ────────────────────────────────────────────────────────────────────

describe('GET /api/zones', () => {
  it('returns all zones with success=true', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/zones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('each zone has required fields', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/zones');
    const zone = res.body.data[0];
    expect(zone).toHaveProperty('id');
    expect(zone).toHaveProperty('name');
    expect(zone).toHaveProperty('capacity');
    expect(zone).toHaveProperty('currentOccupancy');
    expect(zone).toHaveProperty('status');
    expect(zone).toHaveProperty('riskScore');
  });
});

describe('GET /api/zones/stats/summary', () => {
  it('returns correct summary data including totalZones', async () => {
    const { app, getZones } = createTestApp();
    const res = await request(app).get('/api/zones/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalZones).toBe(getZones().length);
    expect(res.body.data).toHaveProperty('totalCapacity');
    expect(res.body.data).toHaveProperty('totalOccupancy');
    expect(res.body.data).toHaveProperty('overallUtilization');
    expect(res.body.data).toHaveProperty('criticalZones');
    expect(res.body.data).toHaveProperty('clearZones');
  });

  it('overallUtilization is between 0 and 100', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/zones/stats/summary');
    expect(res.body.data.overallUtilization).toBeGreaterThanOrEqual(0);
    expect(res.body.data.overallUtilization).toBeLessThanOrEqual(100);
  });
});

describe('GET /api/zones/:id', () => {
  it('returns a zone for a valid id', async () => {
    const { app, getZones } = createTestApp();
    const zone = getZones()[0];
    const res = await request(app).get(`/api/zones/${zone.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(zone.id);
  });

  it('returns 404 for an unknown zone id', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/zones/nonexistent-zone-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PATCH /api/zones/:id/occupancy', () => {
  it('updates occupancy successfully with valid data', async () => {
    const { app, getZones } = createTestApp();
    const zone = getZones()[0];
    const newOccupancy = Math.floor(zone.capacity * 0.5);
    const res = await request(app)
      .patch(`/api/zones/${zone.id}/occupancy`)
      .send({ newOccupancy });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentOccupancy).toBe(newOccupancy);
  });

  it('returns 400 when occupancy exceeds capacity', async () => {
    const { app, getZones } = createTestApp();
    const zone = getZones()[0];
    const res = await request(app)
      .patch(`/api/zones/${zone.id}/occupancy`)
      .send({ newOccupancy: zone.capacity + 1000 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/capacity/i);
  });

  it('returns 400 when newOccupancy is negative', async () => {
    const { app, getZones } = createTestApp();
    const zone = getZones()[0];
    const res = await request(app)
      .patch(`/api/zones/${zone.id}/occupancy`)
      .send({ newOccupancy: -10 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when newOccupancy is missing from request body', async () => {
    const { app, getZones } = createTestApp();
    const zone = getZones()[0];
    const res = await request(app)
      .patch(`/api/zones/${zone.id}/occupancy`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for unknown zone id', async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .patch('/api/zones/does-not-exist/occupancy')
      .send({ newOccupancy: 100 });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ── Alerts ────────────────────────────────────────────────────────────────────

describe('GET /api/alerts', () => {
  it('returns empty array when no alerts exist', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});

describe('PATCH /api/alerts/:id/resolve', () => {
  it('returns 404 for unknown alert id', async () => {
    const { app } = createTestApp();
    const res = await request(app).patch('/api/alerts/unknown-alert/resolve');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('resolves an existing alert successfully', async () => {
    const { app, setAlerts } = createTestApp();
    // Seed an alert
    const alert: Alert = {
      id: 'test-alert-1',
      zoneId: 'zone-1',
      type: 'warning',
      message: 'Test alert',
      timestamp: Date.now(),
      resolved: false,
    };
    setAlerts([alert]);

    const res = await request(app).patch('/api/alerts/test-alert-1/resolve');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resolved).toBe(true);
  });
});

// ── Simulation ───────────────────────────────────────────────────────────────

describe('GET /api/simulation/status', () => {
  it('returns simulation status with running field', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/simulation/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.running).toBe('boolean');
  });
});

describe('POST /api/simulation/start', () => {
  it('starts successfully with empty body', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/simulation/start').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('running');
    // Clean up
    await request(app).post('/api/simulation/stop');
  });

  it('starts with a valid eventType', async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post('/api/simulation/start')
      .send({ eventType: 'match_start' });
    expect(res.status).toBe(200);
    expect(res.body.data.config.eventType).toBe('match_start');
    await request(app).post('/api/simulation/stop');
  });

  it('returns 400 for invalid eventType', async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post('/api/simulation/start')
      .send({ eventType: 'invalid_event' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/simulation/stop', () => {
  it('stops the simulation and returns stopped status', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/simulation/start').send({});
    const res = await request(app).post('/api/simulation/stop');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('stopped');
  });
});

describe('POST /api/simulation/tick', () => {
  it('runs a single tick and returns updated zones', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/simulation/tick');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.zones)).toBe(true);
    expect(Array.isArray(res.body.data.newAlerts)).toBe(true);
  });
});

// ── Input Sanitization ───────────────────────────────────────────────────────

describe('sanitizeText utility', () => {
  it('strips HTML tags from input', async () => {
    const { sanitizeText } = await import('../utils/sanitize');
    expect(sanitizeText('<script>alert("xss")</script>Hello')).not.toContain('<script>');
    expect(sanitizeText('<b>bold</b>')).not.toContain('<b>');
  });

  it('truncates to maxLength', async () => {
    const { sanitizeText } = await import('../utils/sanitize');
    const long = 'a'.repeat(2000);
    expect(sanitizeText(long, 100).length).toBeLessThanOrEqual(100);
  });

  it('removes javascript: injection', async () => {
    const { sanitizeText } = await import('../utils/sanitize');
    expect(sanitizeText('javascript:alert(1)')).not.toContain('javascript:');
  });
});
