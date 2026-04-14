import { Zone, SimulationConfig, Alert } from '../types';
import { recalculateZone } from './zone-calculator';
import { generatePrediction } from './prediction-engine';
import { logger } from '../utils/logger';

/**
 * Generates realistic occupancy changes based on the stadium's current event cycle.
 * Incorporates crowd behavior models for entry surges, halftime redirects, and exit rushes.
 * 
 * @param zone - The zone for which to calculate the delta
 * @param config - Global simulation configuration (volatility, event type)
 * @returns An integer representing the change in people count
 */
function generateOccupancyDelta(zone: Zone, config: SimulationConfig): number {
  const { volatility, eventType } = config;
  const ratio = (zone.currentOccupancy || 0) / (zone.capacity || 1);

  // Base random fluctuations to represent natural crowd movement
  const randomFactor = (Math.random() - 0.5) * 2 * volatility;

  // Event-specific behavioral modifiers
  const eventModifiers: Record<string, () => number> = {
    normal: () => randomFactor * zone.capacity * 0.03,
    match_start: () => {
      // Entry gates and corridors surge as visitors arrive
      if (zone.type === 'entry_gate' || zone.type === 'corridor') {
        return Math.abs(randomFactor) * zone.capacity * 0.08;
      }
      if (zone.type === 'seating') {
        return Math.abs(randomFactor) * zone.capacity * 0.05;
      }
      return randomFactor * zone.capacity * 0.02;
    },
    halftime: () => {
      // Massive surge toward amenities like food courts and restrooms
      if (zone.type === 'food_court' || zone.type === 'restroom') {
        return Math.abs(randomFactor) * zone.capacity * 0.1;
      }
      if (zone.type === 'seating') {
        return -Math.abs(randomFactor) * zone.capacity * 0.06;
      }
      return randomFactor * zone.capacity * 0.04;
    },
    match_end: () => {
      // Rapid drainage toward exit gates and parking lots
      if (zone.type === 'exit_gate' || zone.type === 'parking') {
        return Math.abs(randomFactor) * zone.capacity * 0.12;
      }
      return -Math.abs(randomFactor) * zone.capacity * 0.05;
    },
    emergency: () => {
      // High-volatility movement toward nearest exit paths
      if (zone.type === 'exit_gate' || zone.type === 'corridor') {
        return Math.abs(randomFactor) * zone.capacity * 0.15;
      }
      return -Math.abs(randomFactor) * zone.capacity * 0.08;
    },
  };

  const modifier = eventModifiers[eventType] ?? eventModifiers.normal;
  let delta = modifier();

  // Negative feedback: zones near capacity resist further intake
  if (ratio > 0.85) {
    delta *= 0.3;
  }

  // Attraction: nearly empty zones naturally pull more flow
  if (ratio < 0.2) {
    delta = Math.abs(delta) * 0.5;
  }

  return Math.round(delta);
}

/**
 * Executes a single discrete simulation step (tick).
 * Processes occupancy changes, recalculates zone metrics, and updates predictions.
 * 
 * @param zones - Current state of all stadium zones
 * @param config - Simulation settings for this tick
 * @returns Updated array of zones reflecting the new state
 */
export function simulateTick(zones: Zone[], config: SimulationConfig): Zone[] {
  return zones.map((zone) => {
    const delta = generateOccupancyDelta(zone, config);
    const newOccupancy = Math.max(0, Math.min(zone.capacity, zone.currentOccupancy + delta));

    // Calculate secondary metrics (status, wait times, risk)
    const recalculated = recalculateZone(zone, newOccupancy);
    // Apply predictive modeling to the updated state
    return generatePrediction(recalculated);
  });
}

/**
 * Scans the stadium state for safety-critical conditions and generates active alerts.
 * Supports early warnings based on predictive trends.
 * 
 * @param zones - Current state of all stadium zones
 * @returns Collection of active alerts for the security dashboard
 */
export function checkAlerts(zones: Zone[]): Alert[] {
  const alerts: Alert[] = [];

  for (const zone of zones) {
    // Immediate Critical Condition
    if (zone.status === 'critical') {
      alerts.push({
        id: `alert-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'critical',
        message: `🚨 CRITICAL: ${zone.name} is at ${Math.round(((zone.currentOccupancy || 0) / (zone.capacity || 1)) * 100)}% capacity (${zone.currentOccupancy}/${zone.capacity})`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // Predictive Early Warning (Proactive Safety)
    if (zone.status !== 'critical' && zone.predictedStatus === 'critical') {
      alerts.push({
        id: `alert-ew-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'early_warning',
        message: `⚠️ EARLY WARNING: ${zone.name} predicted to reach critical density in ~15 min (${zone.predictedOccupancy}/${zone.capacity})`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // Emerging Pattern Alert
    if (zone.status === 'crowded' && zone.congestionTrend === 'rising') {
      alerts.push({
        id: `alert-w-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'warning',
        message: `📈 TREND WARNING: ${zone.name} is crowded with a rising trend (vulnerability: ${Math.round(zone.riskScore * 100)}%)`,
        timestamp: Date.now(),
        resolved: false,
      });
    }
  }

  return alerts;
}

/**
 * Recommendation Engine for Stadium Staff.
 * Analyzes density anomalies and generates actionable crowd-management strategies.
 * 
 * @param zones - Current state of all stadium zones
 * @returns Sorted array of recommendations with confidence scores and reasoning
 */
export function generateStaffRecommendations(zones: Zone[]): Array<{
  action: string;
  confidence: number;
  reason: string;
  affectedZones: string[];
}> {
  const recommendations: Array<{
    action: string;
    confidence: number;
    reason: string;
    affectedZones: string[];
  }> = [];

  const criticalZones = zones.filter((z) => z.status === 'critical' || z.riskScore > 0.8);
  const clearGates = zones.filter((z) => (z.type === 'entry_gate' || z.type === 'exit_gate') && z.status === 'clear');

  for (const zone of criticalZones) {
    // Traffic Redirect Strategy
    if ((zone.type === 'entry_gate' || zone.type === 'exit_gate') && clearGates.length > 0) {
      const alternative = clearGates[0];
      recommendations.push({
        action: `Redirect traffic from ${zone.name} to ${alternative.name}`,
        confidence: Math.round(zone.riskScore * 100) / 100,
        reason: `${zone.name} is oversaturated (${Math.round((zone.currentOccupancy / zone.capacity) * 100)}%). ${alternative.name} has spare capacity.`,
        affectedZones: [zone.id, alternative.id],
      });
    }

    // Amenity Balancing Strategy
    if (zone.type === 'food_court') {
      const altFood = zones
        .filter((z) => z.type === 'food_court' && z.id !== zone.id)
        .sort((a, b) => a.waitTime - b.waitTime)[0];

      if (altFood && altFood.waitTime < zone.waitTime * 0.5) {
        recommendations.push({
          action: `Digital Signage: Direct hungry visitors toward ${altFood.name}`,
          confidence: 0.87,
          reason: `${zone.name} peak wait: ${zone.waitTime} min. Balanced arrival at ${altFood.name} reduces local density.`,
          affectedZones: [zone.id, altFood.id],
        });
      }
    }

    // Direct Intervention Strategy
    if (zone.type === 'corridor' && zone.riskScore > 0.7) {
      recommendations.push({
        action: `Dispatch physical flow-control units to ${zone.name}`,
        confidence: 0.91,
        reason: `Corridor "bottleneck" detected with high velocity risk (${Math.round(zone.riskScore * 100)}%).`,
        affectedZones: [zone.id],
      });
    }
  }

  // Predictive Resource Allocation
  const earlyWarningZones = zones.filter(
    (z) => z.status !== 'critical' && z.predictedStatus === 'critical'
  );

  for (const zone of earlyWarningZones) {
    recommendations.push({
      action: `Pre-emptive staffing for ${zone.name}`,
      confidence: 0.78,
      reason: `Predicted critical transition in < 15min. Current trend: ${zone.congestionTrend}.`,
      affectedZones: [zone.id],
    });
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

logger.debug('Crowd simulation engine operational');

