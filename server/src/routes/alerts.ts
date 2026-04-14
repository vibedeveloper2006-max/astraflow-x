import { Router, Request, Response } from 'express';
import { Alert } from '../types';

export function createAlertRoutes(getAlerts: () => Alert[], setAlerts: (alerts: Alert[]) => void): Router {
  const router = Router();

  // GET /api/alerts — list all alerts
  router.get('/', (req: Request, res: Response) => {
    const alerts = getAlerts();
    const type = req.query.type as string | undefined;
    const unresolved = req.query.unresolved === 'true';

    let filtered = alerts;
    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }
    if (unresolved) {
      filtered = filtered.filter((a) => !a.resolved);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to last 50
    filtered = filtered.slice(0, 50);

    res.json({ success: true, data: filtered, timestamp: Date.now() });
  });

  // PATCH /api/alerts/:id/resolve — resolve an alert
  router.patch('/:id/resolve', (req: Request, res: Response) => {
    const alerts = getAlerts();
    const idx = alerts.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Alert not found', timestamp: Date.now() });
      return;
    }

    alerts[idx] = { ...alerts[idx], resolved: true };
    setAlerts(alerts);

    res.json({ success: true, data: alerts[idx], timestamp: Date.now() });
  });

  // DELETE /api/alerts/resolved — clear all resolved alerts
  router.delete('/resolved', (_req: Request, res: Response) => {
    const alerts = getAlerts();
    const remaining = alerts.filter((a) => !a.resolved);
    const cleared = alerts.length - remaining.length;
    setAlerts(remaining);

    res.json({ success: true, data: { cleared }, timestamp: Date.now() });
  });

  return router;
}
