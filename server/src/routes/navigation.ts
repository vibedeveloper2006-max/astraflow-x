import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Zone } from '../types';
import { findBestRoute, findShortestQueue } from '../services/pathfinder';
import { validateBody } from '../middleware/validation';

const NavigationRequestSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
});

const QueueRequestSchema = z.object({
  zoneType: z.string().min(1),
});

export function createNavigationRoutes(getZones: () => Zone[]): Router {
  const router = Router();

  // POST /api/navigation/route — find best route
  router.post('/route', validateBody(NavigationRequestSchema), (req: Request, res: Response) => {
    const { source, destination } = req.body;
    const zones = getZones();

    const sourceExists = zones.some((z) => z.id === source);
    const destExists = zones.some((z) => z.id === destination);

    if (!sourceExists || !destExists) {
      res.status(404).json({
        success: false,
        error: `Zone not found: ${!sourceExists ? source : destination}`,
        timestamp: Date.now(),
      });
      return;
    }

    const result = findBestRoute(zones, source, destination);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'No route found between these zones',
        timestamp: Date.now(),
      });
      return;
    }

    res.json({ success: true, data: result, timestamp: Date.now() });
  });

  // POST /api/navigation/shortest-queue — find shortest queue
  router.post('/shortest-queue', validateBody(QueueRequestSchema), (req: Request, res: Response) => {
    const { zoneType } = req.body;
    const zones = getZones();
    const sorted = findShortestQueue(zones, zoneType);

    if (sorted.length === 0) {
      res.status(404).json({
        success: false,
        error: `No zones of type "${zoneType}" found`,
        timestamp: Date.now(),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        recommended: sorted[0],
        alternatives: sorted.slice(1),
      },
      timestamp: Date.now(),
    });
  });

  return router;
}
