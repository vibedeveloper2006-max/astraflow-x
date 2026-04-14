import { Zone, CongestionTrend } from '../types';
import { calculateStatus, calculateWaitTime } from './zone-calculator';
import { logger } from '../utils/logger';

interface OccupancyHistory {
  timestamp: number;
  occupancy: number;
}

// In-memory history storage for trend analysis
const zoneHistory: Map<string, OccupancyHistory[]> = new Map();
const HISTORY_WINDOW = 10; // Keep last 10 data points
const PREDICTION_HORIZON_MINUTES = 15;

/**
 * Records a zone's current occupancy for trend analysis.
 */
export function recordOccupancy(zoneId: string, occupancy: number): void {
  const history = zoneHistory.get(zoneId) ?? [];
  history.push({ timestamp: Date.now(), occupancy });

  // Keep only recent history
  if (history.length > HISTORY_WINDOW) {
    history.shift();
  }

  zoneHistory.set(zoneId, history);
}

/**
 * Calculates the rate of change in occupancy using linear regression.
 * Returns occupancy change per minute.
 */
function calculateOccupancyRate(history: OccupancyHistory[]): number {
  if (history.length < 2) return 0;

  const n = history.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  const startTime = history[0].timestamp;

  for (let i = 0; i < n; i++) {
    const x = (history[i].timestamp - startTime) / 60000; // Convert to minutes
    const y = history[i].occupancy;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Predicts future occupancy using linear regression on historical data.
 * Clamps result between 0 and capacity.
 */
export function predictOccupancy(zoneId: string, capacity: number, currentOccupancy: number): number {
  const history = zoneHistory.get(zoneId);

  if (!history || history.length < 2) {
    // Naive prediction: 10% increase if no history
    return Math.min(capacity, Math.round(currentOccupancy * 1.1));
  }

  const rate = calculateOccupancyRate(history);
  const predicted = currentOccupancy + rate * PREDICTION_HORIZON_MINUTES;

  return Math.max(0, Math.min(capacity, Math.round(predicted)));
}

/**
 * Determines trend direction from rate of change.
 */
export function predictTrend(zoneId: string): CongestionTrend {
  const history = zoneHistory.get(zoneId);
  if (!history || history.length < 2) return 'stable';

  const rate = calculateOccupancyRate(history);
  if (rate > 2) return 'rising';
  if (rate < -2) return 'falling';
  return 'stable';
}

/**
 * Full zone prediction — updates all predicted fields.
 */
export function generatePrediction(zone: Zone): Zone {
  recordOccupancy(zone.id, zone.currentOccupancy);

  const predictedOccupancy = predictOccupancy(zone.id, zone.capacity, zone.currentOccupancy);
  const trend = predictTrend(zone.id);

  const predictedStatus = calculateStatus(predictedOccupancy, zone.capacity);
  const predictedWaitTime = calculateWaitTime(predictedOccupancy, zone.capacity, zone.type);

  logger.debug(`Prediction for ${zone.id}`, {
    current: zone.currentOccupancy,
    predicted: predictedOccupancy,
    trend,
  });

  return {
    ...zone,
    predictedOccupancy,
    predictedStatus,
    predictedWaitTime,
    congestionTrend: trend,
  };
}

/**
 * Batch prediction for all zones.
 */
export function generateAllPredictions(zones: Zone[]): Zone[] {
  return zones.map(generatePrediction);
}

/**
 * Gets prediction confidence based on amount of historical data.
 * More data points = higher confidence (up to 95%).
 */
export function getPredictionConfidence(zoneId: string): number {
  const history = zoneHistory.get(zoneId);
  if (!history) return 0.5;
  return Math.min(0.95, 0.5 + history.length * 0.05);
}

/**
 * Resets history for a zone (useful for testing).
 */
export function resetHistory(zoneId?: string): void {
  if (zoneId) {
    zoneHistory.delete(zoneId);
  } else {
    zoneHistory.clear();
  }
}
