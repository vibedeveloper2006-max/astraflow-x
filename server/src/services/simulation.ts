import { Zone, SimulationConfig, Alert } from '../types';
import { recalculateZone } from './zone-calculator';
import { generatePrediction } from './prediction-engine';
import { logger } from '../utils/logger';

/**
 * Generates realistic occupancy changes based on event type.
 */
function generateOccupancyDelta(zone: Zone, config: SimulationConfig): number {
  const { volatility, eventType } = config;
  const ratio = zone.currentOccupancy / zone.capacity;

  // Base random change
  const randomFactor = (Math.random() - 0.5) * 2 * volatility;

  // Event-specific modifiers
  const eventModifiers: Record<string, () => number> = {
    normal: () => randomFactor * zone.capacity * 0.03,
    match_start: () => {
      // Entry gates and corridors surge; seating fills up
      if (zone.type === 'entry_gate' || zone.type === 'corridor') {
        return Math.abs(randomFactor) * zone.capacity * 0.08;
      }
      if (zone.type === 'seating') {
        return Math.abs(randomFactor) * zone.capacity * 0.05;
      }
      return randomFactor * zone.capacity * 0.02;
    },
    halftime: () => {
      // Food courts and restrooms surge; seating empties
      if (zone.type === 'food_court' || zone.type === 'restroom') {
        return Math.abs(randomFactor) * zone.capacity * 0.1;
      }
      if (zone.type === 'seating') {
        return -Math.abs(randomFactor) * zone.capacity * 0.06;
      }
      return randomFactor * zone.capacity * 0.04;
    },
    match_end: () => {
      // Exit gates and parking surge; everything else empties
      if (zone.type === 'exit_gate' || zone.type === 'parking') {
        return Math.abs(randomFactor) * zone.capacity * 0.12;
      }
      return -Math.abs(randomFactor) * zone.capacity * 0.05;
    },
    emergency: () => {
      // Everything surges toward exits
      if (zone.type === 'exit_gate' || zone.type === 'corridor') {
        return Math.abs(randomFactor) * zone.capacity * 0.15;
      }
      return -Math.abs(randomFactor) * zone.capacity * 0.08;
    },
  };

  const modifier = eventModifiers[eventType] ?? eventModifiers.normal;
  let delta = modifier();

  // Natural pressure: zones near capacity tend to slow down intake
  if (ratio > 0.85) {
    delta *= 0.3;
  }

  // Natural attraction: very empty zones attract more
  if (ratio < 0.2) {
    delta = Math.abs(delta) * 0.5;
  }

  return Math.round(delta);
}

/**
 * Runs one simulation tick — updates all zones.
 */
export function simulateTick(zones: Zone[], config: SimulationConfig): Zone[] {
  return zones.map((zone) => {
    const delta = generateOccupancyDelta(zone, config);
    const newOccupancy = Math.max(0, Math.min(zone.capacity, zone.currentOccupancy + delta));

    const recalculated = recalculateZone(zone, newOccupancy);
    return generatePrediction(recalculated);
  });
}

/**
 * Checks all zones for alert conditions and generates appropriate alerts.
 */
export function checkAlerts(zones: Zone[]): Alert[] {
  const alerts: Alert[] = [];

  for (const zone of zones) {
    // Critical alert — current status
    if (zone.status === 'critical') {
      alerts.push({
        id: `alert-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'critical',
        message: `🚨 CRITICAL: ${zone.name} is at ${Math.round((zone.currentOccupancy / zone.capacity) * 100)}% capacity (${zone.currentOccupancy}/${zone.capacity})`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // Early warning — predicted to become critical
    if (zone.status !== 'critical' && zone.predictedStatus === 'critical') {
      alerts.push({
        id: `alert-ew-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'early_warning',
        message: `⚠️ EARLY WARNING: ${zone.name} predicted to reach critical in ~15 min (${zone.predictedOccupancy}/${zone.capacity})`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // Warning — crowded and rising
    if (zone.status === 'crowded' && zone.congestionTrend === 'rising') {
      alerts.push({
        id: `alert-w-${zone.id}-${Date.now()}`,
        zoneId: zone.id,
        type: 'warning',
        message: `📈 WARNING: ${zone.name} is crowded and rising (risk: ${Math.round(zone.riskScore * 100)}%)`,
        timestamp: Date.now(),
        resolved: false,
      });
    }
  }

  return alerts;
}

/**
 * Generates staff action recommendations based on current zone state.
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
  const clearGates = zones.filter((z) => z.type === 'entry_gate' && z.status === 'clear');

  for (const zone of criticalZones) {
    if (zone.type === 'entry_gate' && clearGates.length > 0) {
      const alternative = clearGates[0];
      recommendations.push({
        action: `Redirect traffic from ${zone.name} → ${alternative.name}`,
        confidence: Math.round(zone.riskScore * 100) / 100,
        reason: `${zone.name} at ${Math.round((zone.currentOccupancy / zone.capacity) * 100)}% with ${zone.congestionTrend} trend. ${alternative.name} at ${Math.round((alternative.currentOccupancy / alternative.capacity) * 100)}%.`,
        affectedZones: [zone.id, alternative.id],
      });
    }

    if (zone.type === 'food_court') {
      const altFood = zones
        .filter((z) => z.type === 'food_court' && z.id !== zone.id)
        .sort((a, b) => a.waitTime - b.waitTime)[0];

      if (altFood) {
        recommendations.push({
          action: `Direct visitors from ${zone.name} to ${altFood.name}`,
          confidence: 0.87,
          reason: `${zone.name} wait: ${zone.waitTime} min. ${altFood.name} wait: ${altFood.waitTime} min.`,
          affectedZones: [zone.id, altFood.id],
        });
      }
    }

    if (zone.type === 'corridor' && zone.riskScore > 0.7) {
      recommendations.push({
        action: `Deploy additional staff to ${zone.name} for flow management`,
        confidence: 0.91,
        reason: `Corridor congestion at ${Math.round(zone.riskScore * 100)}% risk with ${zone.congestionTrend} trend.`,
        affectedZones: [zone.id],
      });
    }
  }

  // Predictive recommendation
  const earlyWarningZones = zones.filter(
    (z) => z.status !== 'critical' && z.predictedStatus === 'critical'
  );

  for (const zone of earlyWarningZones) {
    recommendations.push({
      action: `Pre-emptive action recommended for ${zone.name} — predicted critical in 15 min`,
      confidence: 0.78,
      reason: `Current: ${zone.currentOccupancy}/${zone.capacity}. Predicted: ${zone.predictedOccupancy}/${zone.capacity}. Trend: ${zone.congestionTrend}.`,
      affectedZones: [zone.id],
    });
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

logger.debug('Simulation engine loaded');
