import { Zone, ZoneStatus, CongestionTrend } from '../types';

/**
 * Derives the active operation status of a zone based on its current flow density.
 * Uses mathematical thresholds to classify the crowd state.
 * 
 * - clear: < 50% utilization
 * - moderate: 50% - 75% utilization
 * - crowded: 75% - 90% utilization
 * - critical: >= 90% utilization (Safety hazard territory)
 * 
 * @param currentOccupancy - Number of people currently in the zone
 * @param capacity - Maximum safe capacity of the zone
 * @returns {ZoneStatus} The classified status string
 */
export function calculateStatus(currentOccupancy: number, capacity: number): ZoneStatus {
  const safeCapacity = capacity || 1;
  const ratio = currentOccupancy / safeCapacity;
  
  if (ratio < 0.5) return 'clear';
  if (ratio < 0.75) return 'moderate';
  if (ratio < 0.9) return 'crowded';
  return 'critical';
}

/**
 * Calculates estimated wait time (latency) in minutes.
 * Model incorporates zone-specific service multipliers (e.g., higher for food courts).
 * Uses a quadratic relationship to current occupancy ratio to model nonlinear queue growth.
 * 
 * @param currentOccupancy - Number of people currently in the zone
 * @param capacity - Maximum safe capacity of the zone
 * @param zoneType - Category of the zone (e.g., 'entry_gate')
 * @returns {number} Estimated wait time in minutes
 */
export function calculateWaitTime(currentOccupancy: number, capacity: number, zoneType: string): number {
  const safeCapacity = capacity || 1;
  const ratio = currentOccupancy / safeCapacity;
  
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
  // Non-linear wait time growth as density increases
  return Math.round(ratio * ratio * multiplier);
}

/**
 * Computes a normalized safety risk score (0 to 1).
 * Weighted average of current density, predicted density, and movement trends.
 * 
 * @param currentOccupancy - Current density
 * @param predictedOccupancy - AI-predicted future density
 * @param capacity - Zone capacity
 * @param trend - Direction of crowd movement ('rising', 'stable', 'falling')
 * @returns {number} Normalized risk score (0.0 to 1.0)
 */
export function calculateRiskScore(
  currentOccupancy: number,
  predictedOccupancy: number,
  capacity: number,
  trend: CongestionTrend
): number {
  const safeCapacity = capacity || 1;
  const currentRatio = currentOccupancy / safeCapacity;
  const predictedRatio = predictedOccupancy / safeCapacity;

  const trendModifiers: Record<CongestionTrend, number> = {
    rising: 0.2,
    stable: 0,
    falling: -0.15,
  };

  // 40% current, 30% predicted, 30% trend-adjusted current
  const raw = currentRatio * 0.4 + predictedRatio * 0.3 + (currentRatio + trendModifiers[trend]) * 0.3;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100;
}

/**
 * Determines the current velocity/direction of the crowd flow.
 * Compares current vs predicted states using a 5% delta deadband to filter noise.
 * 
 * @param currentOccupancy - Starting density
 * @param predictedOccupancy - Expected future density
 * @param capacity - Boundary capacity
 * @returns {CongestionTrend} The derived movement trend
 */
export function determineTrend(currentOccupancy: number, predictedOccupancy: number, capacity: number): CongestionTrend {
  const safeCapacity = capacity || 1;
  const diff = (predictedOccupancy - currentOccupancy) / safeCapacity;
  
  if (diff > 0.05) return 'rising';
  if (diff < -0.05) return 'falling';
  return 'stable';
}

/**
 * Holistic logic engine to synchronize and update all reactive properties of a zone.
 * Should be called whenever 'currentOccupancy' changes to ensure system consistency.
 * 
 * @param zone - The zone object to update
 * @param newOccupancy - (Optional) New occupancy value if updating
 * @returns {Zone} The fully updated zone object
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

