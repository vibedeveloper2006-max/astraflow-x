import { Router, Request, Response } from 'express';
import { Zone, OccupancyUpdateSchema } from '../types';
import { recalculateZone } from '../services/zone-calculator';
import { generatePrediction } from '../services/prediction-engine';
import { validateBody } from '../middleware/validation';

/**
 * Creates all zone-related API routes.
 * @param getZones - Getter for current in-memory zone state.
 * @param setZones - Setter to update in-memory zone state.
 */
export function createZoneRoutes(getZones: () => Zone[], setZones: (zones: Zone[]) => void): Router {
  const router = Router();

  // GET /api/zones — list all zones
  router.get('/', (_req: Request, res: Response) => {
    const zones = getZones();
    res.json({
      success: true,
      data: zones,
      timestamp: Date.now(),
    });
  });

  // IMPORTANT: /stats/summary MUST be registered before /:id to prevent
  // Express from matching "stats" as a dynamic segment value.
  // GET /api/zones/stats/summary — stadium-wide occupancy summary
  router.get('/stats/summary', (_req: Request, res: Response) => {
    const zones = getZones();
    const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
    const totalOccupancy = zones.reduce((s, z) => s + z.currentOccupancy, 0);
    const criticalCount = zones.filter((z) => z.status === 'critical').length;
    const crowdedCount = zones.filter((z) => z.status === 'crowded').length;
    const highRiskZones = zones
      .filter((z) => z.riskScore > 0.7)
      .sort((a, b) => b.riskScore - a.riskScore)
      .map((z) => ({ id: z.id, name: z.name, riskScore: z.riskScore }));

    res.json({
      success: true,
      data: {
        totalCapacity,
        totalOccupancy,
        overallUtilization: totalCapacity > 0
          ? Math.round((totalOccupancy / totalCapacity) * 100)
          : 0,
        criticalZones: criticalCount,
        crowdedZones: crowdedCount,
        clearZones: zones.filter((z) => z.status === 'clear').length,
        highRiskZones,
        totalZones: zones.length,
      },
      timestamp: Date.now(),
    });
  });

  // GET /api/zones/:id — get single zone by ID
  router.get('/:id', (req: Request, res: Response) => {
    const zone = getZones().find((z) => z.id === req.params.id);
    if (!zone) {
      res.status(404).json({ success: false, error: 'Zone not found', timestamp: Date.now() });
      return;
    }
    res.json({ success: true, data: zone, timestamp: Date.now() });
  });

  // PATCH /api/zones/:id/occupancy — update zone occupancy (staff only)
  router.patch(
    '/:id/occupancy',
    validateBody(OccupancyUpdateSchema.pick({ newOccupancy: true })),
    (req: Request, res: Response) => {
      const zones = getZones();
      const idx = zones.findIndex((z) => z.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ success: false, error: 'Zone not found', timestamp: Date.now() });
        return;
      }

      const { newOccupancy } = req.body as { newOccupancy: number };
      if (newOccupancy < 0) {
        res.status(400).json({
          success: false,
          error: 'Occupancy cannot be negative',
          timestamp: Date.now(),
        });
        return;
      }
      if (newOccupancy > zones[idx].capacity) {
        res.status(400).json({
          success: false,
          error: `Occupancy cannot exceed capacity (${zones[idx].capacity})`,
          timestamp: Date.now(),
        });
        return;
      }

      zones[idx] = generatePrediction(recalculateZone(zones[idx], newOccupancy));
      setZones(zones);

      res.json({ success: true, data: zones[idx], timestamp: Date.now() });
    }
  );

  return router;
}
