import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Zone, Alert, SimulationConfig } from '../types';
import { simulateTick, checkAlerts, generateStaffRecommendations } from '../services/simulation';
import { validateBody } from '../middleware/validation';

const SimConfigSchema = z.object({
  intervalMs: z.number().int().min(500).max(30000).optional(),
  volatility: z.number().min(0.1).max(2).optional(),
  eventType: z.enum(['normal', 'match_start', 'halftime', 'match_end', 'emergency']).optional(),
});

export function createSimulationRoutes(
  getZones: () => Zone[],
  setZones: (zones: Zone[]) => void,
  getAlerts: () => Alert[],
  setAlerts: (alerts: Alert[]) => void
): Router {
  const router = Router();

  let simulationInterval: ReturnType<typeof setInterval> | null = null;
  let currentConfig: SimulationConfig = {
    intervalMs: 3000,
    volatility: 0.7,
    eventType: 'normal',
  };

  /**
   * Internal helper to execute a single simulation step
   * and process the resulting updates and alerts.
   */
  const executeTick = () => {
    const zones = getZones();
    const updated = simulateTick(zones, currentConfig);
    setZones(updated);

    const newAlerts = checkAlerts(updated);
    if (newAlerts.length > 0) {
      const existing = getAlerts();
      setAlerts([...existing, ...newAlerts].slice(-200)); // Keep last 200 alerts
    }
    return { updated, newAlerts };
  };

  /**
   * Starts the simulation interval based on the current configuration.
   */
  const startSimulation = () => {
    if (simulationInterval) clearInterval(simulationInterval);
    simulationInterval = setInterval(executeTick, currentConfig.intervalMs);
  };

  /**
   * Stops the active simulation if running.
   */
  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  };

  // POST /api/simulation/start — start simulation
  router.post('/start', validateBody(SimConfigSchema), (req: Request, res: Response) => {
    currentConfig = { ...currentConfig, ...req.body };
    startSimulation();

    res.json({
      success: true,
      data: { status: 'running', config: currentConfig },
      timestamp: Date.now(),
    });
  });

  // POST /api/simulation/stop — stop simulation
  router.post('/stop', (_req: Request, res: Response) => {
    stopSimulation();

    res.json({
      success: true,
      data: { status: 'stopped' },
      timestamp: Date.now(),
    });
  });

  // POST /api/simulation/tick — run single tick manually
  router.post('/tick', (_req: Request, res: Response) => {
    const { updated, newAlerts } = executeTick();

    res.json({
      success: true,
      data: { zones: updated, newAlerts },
      timestamp: Date.now(),
    });
  });

  // PATCH /api/simulation/config — update current config
  router.patch('/config', validateBody(SimConfigSchema), (req: Request, res: Response) => {
    currentConfig = { ...currentConfig, ...req.body };

    // Automatically restart with new interval/config if already running
    if (simulationInterval) {
      startSimulation();
    }

    res.json({
      success: true,
      data: { config: currentConfig, running: !!simulationInterval },
      timestamp: Date.now(),
    });
  });

  // GET /api/simulation/status
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        running: !!simulationInterval,
        config: currentConfig,
      },
      timestamp: Date.now(),
    });
  });

  // GET /api/simulation/recommendations — staff AI recommendations
  router.get('/recommendations', (_req: Request, res: Response) => {
    const zones = getZones();
    const recommendations = generateStaffRecommendations(zones);

    res.json({
      success: true,
      data: recommendations,
      timestamp: Date.now(),
    });
  });

  return router;
}
