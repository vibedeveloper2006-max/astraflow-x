import { Zone, ZoneStatus, CongestionTrend } from '../types';

/**
 * Derives zone status from occupancy ratio using mathematical thresholds.
 * < 50% → clear | 50–75% → moderate | 75–90% → crowded | ≥ 90% → critical
 */
export function calculateStatus(currentOccupancy: number, capacity: number): ZoneStatus {
  const ratio = currentOccupancy / capacity;
  if (ratio < 0.5) return 'clear';
  if (ratio < 0.75) return 'moderate';
  if (ratio < 0.9) return 'crowded';
  return 'critical';
}

/**
 * Calculates wait time in minutes based on occupancy ratio and zone type.
 * Food courts and restrooms inherently have higher service times.
 */
export function calculateWaitTime(currentOccupancy: number, capacity: number, zoneType: string): number {
  const ratio = currentOccupancy / capacity;
  const baseMultipliers: Record<string, number> = {
    entry_gate: 8,
    food_court: 25,
    restroom: 15,
    parking: 10,
    corridor: 5,
    seating: 0,
    vip_lounge: 3,
    exit_gate: 6,
  };

  const multiplier = baseMultipliers[zoneType] ?? 5;
  return Math.round(ratio * ratio * multiplier);
}

/**
 * Computes a 0–1 risk score considering:
 * - Current occupancy ratio (40% weight)
 * - Predicted occupancy ratio (30% weight)
 * - Congestion trend modifier (30% weight)
 */
export function calculateRiskScore(
  currentOccupancy: number,
  predictedOccupancy: number,
  capacity: number,
  trend: CongestionTrend
): number {
  const currentRatio = currentOccupancy / capacity;
  const predictedRatio = predictedOccupancy / capacity;

  const trendModifiers: Record<CongestionTrend, number> = {
    rising: 0.2,
    stable: 0,
    falling: -0.15,
  };

  const raw = currentRatio * 0.4 + predictedRatio * 0.3 + (currentRatio + trendModifiers[trend]) * 0.3;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
}

/**
 * Determines congestion trend by comparing current vs predicted occupancy.
 * Uses 5% threshold to avoid noise.
 */
export function determineTrend(currentOccupancy: number, predictedOccupancy: number, capacity: number): CongestionTrend {
  const diff = (predictedOccupancy - currentOccupancy) / capacity;
  if (diff > 0.05) return 'rising';
  if (diff < -0.05) return 'falling';
  return 'stable';
}

/**
 * Full zone recalculation — derives all computed fields from raw inputs.
 */
export function recalculateZone(zone: Zone, newOccupancy?: number): Zone {
  const occupancy = newOccupancy ?? zone.currentOccupancy;
  const trend = determineTrend(occupancy, zone.predictedOccupancy, zone.capacity);

  return {
    ...zone,
    currentOccupancy: occupancy,
    status: calculateStatus(occupancy, zone.capacity),
    predictedStatus: calculateStatus(zone.predictedOccupancy, zone.capacity),
    waitTime: calculateWaitTime(occupancy, zone.capacity, zone.type),
    predictedWaitTime: calculateWaitTime(zone.predictedOccupancy, zone.capacity, zone.type),
    congestionTrend: trend,
    riskScore: calculateRiskScore(occupancy, zone.predictedOccupancy, zone.capacity, trend),
    lastUpdated: Date.now(),
  };
}
