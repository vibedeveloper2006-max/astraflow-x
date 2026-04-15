import { describe, it, expect } from 'vitest';
import {
  calculateStatus,
  calculateWaitTime,
  calculateRiskScore,
  determineTrend,
  recalculateZone,
} from '../services/zone-calculator';
import { Zone } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: 'zone-test',
    name: 'Test Zone',
    type: 'entry_gate',
    capacity: 1000,
    currentOccupancy: 500,
    predictedOccupancy: 550,
    status: 'moderate',
    predictedStatus: 'moderate',
    waitTime: 4,
    predictedWaitTime: 5,
    congestionTrend: 'stable',
    riskScore: 0.3,
    coordinates: { lat: 26.89, lng: 75.80 },
    adjacentZones: [],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

// ── calculateStatus ──────────────────────────────────────────────────────────

describe('calculateStatus', () => {
  it('returns "clear" when occupancy < 50% of capacity', () => {
    expect(calculateStatus(400, 1000)).toBe('clear');
    expect(calculateStatus(0, 1000)).toBe('clear');
    expect(calculateStatus(499, 1000)).toBe('clear');
  });

  it('returns "moderate" when occupancy is 50–74% of capacity', () => {
    expect(calculateStatus(500, 1000)).toBe('moderate');
    expect(calculateStatus(749, 1000)).toBe('moderate');
  });

  it('returns "crowded" when occupancy is 75–89% of capacity', () => {
    expect(calculateStatus(750, 1000)).toBe('crowded');
    expect(calculateStatus(899, 1000)).toBe('crowded');
  });

  it('returns "critical" when occupancy >= 90% of capacity', () => {
    expect(calculateStatus(900, 1000)).toBe('critical');
    expect(calculateStatus(1000, 1000)).toBe('critical');
    expect(calculateStatus(1200, 1000)).toBe('critical'); // over capacity
  });

  it('handles zero capacity gracefully without dividing by zero', () => {
    expect(() => calculateStatus(100, 0)).not.toThrow();
  });
});

// ── calculateWaitTime ────────────────────────────────────────────────────────

describe('calculateWaitTime', () => {
  it('returns 0 for seating zones regardless of occupancy', () => {
    expect(calculateWaitTime(1000, 1000, 'seating')).toBe(0);
    expect(calculateWaitTime(0, 1000, 'seating')).toBe(0);
  });

  it('returns higher wait times for food courts than entry gates at same occupancy', () => {
    const foodWait = calculateWaitTime(800, 1000, 'food_court');
    const entryWait = calculateWaitTime(800, 1000, 'entry_gate');
    expect(foodWait).toBeGreaterThan(entryWait);
  });

  it('returns 0 wait when zone is empty', () => {
    expect(calculateWaitTime(0, 1000, 'food_court')).toBe(0);
    expect(calculateWaitTime(0, 1000, 'restroom')).toBe(0);
  });

  it('scales non-linearly (quadratic) — doubling ratio more than doubles wait time', () => {
    const half = calculateWaitTime(500, 1000, 'entry_gate');
    const full = calculateWaitTime(1000, 1000, 'entry_gate');
    expect(full).toBeGreaterThan(half * 2);
  });

  it('handles unknown zone types without throwing', () => {
    expect(() => calculateWaitTime(500, 1000, 'unknown_type')).not.toThrow();
  });
});

// ── calculateRiskScore ───────────────────────────────────────────────────────

describe('calculateRiskScore', () => {
  it('returns a value between 0 and 1', () => {
    const score = calculateRiskScore(500, 600, 1000, 'stable');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns higher risk for "rising" trend than "falling" at same occupancy', () => {
    const risingRisk = calculateRiskScore(700, 800, 1000, 'rising');
    const fallingRisk = calculateRiskScore(700, 800, 1000, 'falling');
    expect(risingRisk).toBeGreaterThan(fallingRisk);
  });

  it('clamps risk to 1.0 for highly overcrowded zones', () => {
    const score = calculateRiskScore(1000, 1000, 1000, 'rising');
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns a low risk score for a clear zone', () => {
    const score = calculateRiskScore(100, 120, 1000, 'stable');
    expect(score).toBeLessThan(0.3);
  });
});

// ── determineTrend ───────────────────────────────────────────────────────────

describe('determineTrend', () => {
  it('returns "rising" when predicted significantly exceeds current', () => {
    expect(determineTrend(500, 600, 1000)).toBe('rising');
  });

  it('returns "falling" when predicted is significantly below current', () => {
    expect(determineTrend(600, 500, 1000)).toBe('falling');
  });

  it('returns "stable" when the difference is within the 5% deadband', () => {
    expect(determineTrend(500, 510, 1000)).toBe('stable'); // Only 1% change
    expect(determineTrend(500, 500, 1000)).toBe('stable');
  });

  it('handles zero capacity gracefully', () => {
    expect(() => determineTrend(0, 0, 0)).not.toThrow();
  });
});

// ── recalculateZone ──────────────────────────────────────────────────────────

describe('recalculateZone', () => {
  it('updates currentOccupancy to the new value', () => {
    const zone = makeZone({ currentOccupancy: 500 });
    const result = recalculateZone(zone, 800);
    expect(result.currentOccupancy).toBe(800);
  });

  it('recalculates status based on new occupancy', () => {
    const zone = makeZone({ currentOccupancy: 400 }); // clear
    const result = recalculateZone(zone, 920); // critical
    expect(result.status).toBe('critical');
  });

  it('updates lastUpdated timestamp', () => {
    const before = Date.now();
    const zone = makeZone();
    const result = recalculateZone(zone, 500);
    expect(result.lastUpdated).toBeGreaterThanOrEqual(before);
  });

  it('preserves other zone properties not related to occupancy', () => {
    const zone = makeZone({ name: 'Gate A', coordinates: { lat: 1.0, lng: 2.0 } });
    const result = recalculateZone(zone, 300);
    expect(result.name).toBe('Gate A');
    expect(result.coordinates).toEqual({ lat: 1.0, lng: 2.0 });
  });

  it('uses current occupancy when no new value is provided', () => {
    const zone = makeZone({ currentOccupancy: 400 });
    const result = recalculateZone(zone);
    expect(result.currentOccupancy).toBe(400);
  });

  it('correctly derives riskScore within 0–1 bounds after recalculation', () => {
    const zone = makeZone({ currentOccupancy: 900 });
    const result = recalculateZone(zone, 900);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
  });
});
