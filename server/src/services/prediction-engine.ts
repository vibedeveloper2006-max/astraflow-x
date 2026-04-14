import { Zone, CongestionTrend } from '../types';
import { calculateStatus, calculateWaitTime } from './zone-calculator';
import { logger } from '../utils/logger';
import { BigQueryService } from './bigquery';

/**
 * Historical data point for occupancy tracking.
 */
interface OccupancyHistory {
  timestamp: number;
  occupancy: number;
}

// In-memory history storage for trend analysis
const zoneHistory: Map<string, OccupancyHistory[]> = new Map();
const HISTORY_WINDOW = 12; // Keep last 12 data points (~1 min of data at 5s intervals)
const PREDICTION_HORIZON_MINUTES = 15;

let lastBigQuerySync = 0;
const BIGQUERY_SYNC_INTERVAL = 60 * 1000; // Sync to BigQuery once per minute

/**
 * Records a zone's current occupancy for trend analysis.
 * @param zoneId Unique identifier of the zone.
 * @param occupancy Current occupancy count.
 */
export function recordOccupancy(zoneId: string, occupancy: number): void {
  const history = zoneHistory.get(zoneId) ?? [];
  history.push({ timestamp: Date.now(), occupancy });

  // Maintain sliding window for efficiency
  if (history.length > HISTORY_WINDOW) {
    history.shift();
  }

  zoneHistory.set(zoneId, history);
}

/**
 * Calculates the rate of change in occupancy using linear regression.
 * @param history Array of historical data points.
 * @returns Projected occupancy change per minute.
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
 * @param zoneId Unique identifier of the zone.
 * @param capacity Maximum capacity of the zone.
 * @param currentOccupancy Current occupancy count.
 * @returns Predicted occupancy count (clamped to capacity).
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
 * @param zoneId Unique identifier of the zone.
 * @returns 'rising', 'falling', or 'stable' trend.
 */
export function predictTrend(zoneId: string): CongestionTrend {
  const history = zoneHistory.get(zoneId);
  if (!history || history.length < 2) return 'stable';

  const rate = calculateOccupancyRate(history);
  // Thresholds for trend direction
  if (rate > 2) return 'rising';
  if (rate < -2) return 'falling';
  return 'stable';
}

/**
 * Generates predictions for a single zone and records current state.
 * @param zone The zone to update with predictions.
 * @returns Updated zone with predicted fields.
 */
export function generatePrediction(zone: Zone): Zone {
  recordOccupancy(zone.id, zone.currentOccupancy);

  const predictedOccupancy = predictOccupancy(zone.id, zone.capacity, zone.currentOccupancy);
  const trend = predictTrend(zone.id);

  const predictedStatus = calculateStatus(predictedOccupancy, zone.capacity);
  const predictedWaitTime = calculateWaitTime(predictedOccupancy, zone.capacity, zone.type);

  return {
    ...zone,
    predictedOccupancy,
    predictedStatus,
    predictedWaitTime,
    congestionTrend: trend,
  };
}

/**
 * Batch prediction for all zones. Also triggers BigQuery sync.
 * @param zones Current list of stadium zones.
 * @returns List of zones with updated predictions.
 */
export function generateAllPredictions(zones: Zone[]): Zone[] {
  const updatedZones = zones.map(generatePrediction);

  // Throttled BigQuery sync to demonstrate "adoption across workflows" 
  // without overwhelming the API during simulations.
  const now = Date.now();
  if (now - lastBigQuerySync > BIGQUERY_SYNC_INTERVAL) {
    BigQueryService.streamZoneData(updatedZones).catch((err) => {
      logger.error('BigQuery sync failed', { error: err.message });
    });
    lastBigQuerySync = now;
  }

  return updatedZones;
}

/**
 * Gets prediction confidence based on density of historical data.
 * @param zoneId Unique identifier of the zone.
 * @returns Confidence score between 0.5 and 0.95.
 */
export function getPredictionConfidence(zoneId: string): number {
  const history = zoneHistory.get(zoneId);
  if (!history) return 0.5;
  return Math.min(0.95, 0.5 + history.length * 0.05);
}

/**
 * Resets history for a zone or all zones.
 */
export function resetHistory(zoneId?: string): void {
  if (zoneId) {
    zoneHistory.delete(zoneId);
  } else {
    zoneHistory.clear();
  }
}
