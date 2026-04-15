import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordOccupancy,
  predictOccupancy,
  predictTrend,
  generatePrediction,
  getPredictionConfidence,
  resetHistory,
} from '../services/prediction-engine';
import { Zone } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: 'predict-test-zone',
    name: 'Prediction Test Zone',
    type: 'food_court',
    capacity: 500,
    currentOccupancy: 250,
    predictedOccupancy: 275,
    status: 'moderate',
    predictedStatus: 'moderate',
    waitTime: 6,
    predictedWaitTime: 7,
    congestionTrend: 'stable',
    riskScore: 0.3,
    coordinates: { lat: 26.89, lng: 75.80 },
    adjacentZones: [],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

const ZONE_ID = 'predict-test-zone';

beforeEach(() => {
  resetHistory(); // Ensure clean state between tests
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── recordOccupancy ──────────────────────────────────────────────────────────

describe('recordOccupancy', () => {
  it('records occupancy data without throwing', () => {
    expect(() => recordOccupancy(ZONE_ID, 300)).not.toThrow();
  });

  it('increments confidence score as more data points are recorded', () => {
    const before = getPredictionConfidence(ZONE_ID);
    for (let i = 0; i < 5; i++) {
      recordOccupancy(ZONE_ID, 250 + i * 10);
      vi.advanceTimersByTime(5000);
    }
    const after = getPredictionConfidence(ZONE_ID);
    expect(after).toBeGreaterThan(before);
  });
});

// ── predictOccupancy ─────────────────────────────────────────────────────────

describe('predictOccupancy', () => {
  it('returns a value within 0 and capacity bounds', () => {
    const predicted = predictOccupancy(ZONE_ID, 500, 250);
    expect(predicted).toBeGreaterThanOrEqual(0);
    expect(predicted).toBeLessThanOrEqual(500);
  });

  it('returns a naive +10% estimate when no history exists', () => {
    const predicted = predictOccupancy('no-history-zone', 500, 200);
    expect(predicted).toBe(Math.min(500, Math.round(200 * 1.1)));
  });

  it('detects rising trend with consistent occupancy growth', () => {
    // Simulate steadily rising occupancy over 12 ticks (assume 1 min gap per tick)
    let occ = 100;
    for (let i = 0; i < 12; i++) {
      recordOccupancy(ZONE_ID, occ);
      occ += 20; // Rising by 20 each tick
      vi.advanceTimersByTime(60000); // 1 minute
    }
    const predicted = predictOccupancy(ZONE_ID, 500, occ);
    // With rising history, prediction should exceed current occupancy
    expect(predicted).toBeGreaterThan(occ);
  });

  it('clamps predicted value to capacity', () => {
    // Force a scenario near capacity
    for (let i = 0; i < 12; i++) {
      recordOccupancy(ZONE_ID, 480 + i);
      vi.advanceTimersByTime(60000); // 1 minute
    }
    const predicted = predictOccupancy(ZONE_ID, 500, 490);
    expect(predicted).toBeLessThanOrEqual(500);
  });
});

// ── predictTrend ─────────────────────────────────────────────────────────────

describe('predictTrend', () => {
  it('returns "stable" when no history exists for a zone', () => {
    expect(predictTrend('no-history-zone')).toBe('stable');
  });

  it('returns "rising" when occupancy consistently increases', () => {
    let occ = 100;
    for (let i = 0; i < 6; i++) {
      recordOccupancy(ZONE_ID, occ);
      occ += 25; // Aggressively rising
      vi.advanceTimersByTime(60000);
    }
    expect(predictTrend(ZONE_ID)).toBe('rising');
  });

  it('returns "falling" when occupancy consistently decreases', () => {
    let occ = 400;
    for (let i = 0; i < 6; i++) {
      recordOccupancy(ZONE_ID, occ);
      occ -= 30; // Aggressively falling
      vi.advanceTimersByTime(60000);
    }
    expect(predictTrend(ZONE_ID)).toBe('falling');
  });

  it('returns "stable" for constant occupancy', () => {
    for (let i = 0; i < 6; i++) {
      recordOccupancy(ZONE_ID, 250); // Flat
      vi.advanceTimersByTime(60000);
    }
    expect(predictTrend(ZONE_ID)).toBe('stable');
  });
});

// ── generatePrediction ───────────────────────────────────────────────────────

describe('generatePrediction', () => {
  it('returns a zone with all required fields intact', () => {
    const zone = makeZone();
    const result = generatePrediction(zone);

    expect(result.id).toBe(zone.id);
    expect(result.name).toBe(zone.name);
    expect(result.capacity).toBe(zone.capacity);
    expect(result.predictedOccupancy).toBeDefined();
    expect(result.predictedStatus).toBeDefined();
    expect(result.congestionTrend).toMatch(/rising|falling|stable/);
  });

  it('predictedOccupancy is within 0–capacity range', () => {
    const zone = makeZone({ currentOccupancy: 400 });
    const result = generatePrediction(zone);
    expect(result.predictedOccupancy).toBeGreaterThanOrEqual(0);
    expect(result.predictedOccupancy).toBeLessThanOrEqual(zone.capacity);
  });

  it('records occupancy history as a side effect', () => {
    const before = getPredictionConfidence(ZONE_ID);
    generatePrediction(makeZone({ currentOccupancy: 300 }));
    const after = getPredictionConfidence(ZONE_ID);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

// ── getPredictionConfidence ──────────────────────────────────────────────────

describe('getPredictionConfidence', () => {
  it('returns 0.5 for zones with no history', () => {
    expect(getPredictionConfidence('brand-new-zone')).toBe(0.5);
  });

  it('returns a value between 0.5 and 0.95', () => {
    for (let i = 0; i < 12; i++) {
      recordOccupancy(ZONE_ID, 200 + i * 10);
      vi.advanceTimersByTime(5000);
    }
    const confidence = getPredictionConfidence(ZONE_ID);
    expect(confidence).toBeGreaterThanOrEqual(0.5);
    expect(confidence).toBeLessThanOrEqual(0.95);
  });
});

// ── resetHistory ─────────────────────────────────────────────────────────────

describe('resetHistory', () => {
  it('resets a specific zone\'s history, reverting confidence to 0.5', () => {
    for (let i = 0; i < 5; i++) {
      recordOccupancy(ZONE_ID, 200 + i);
      vi.advanceTimersByTime(5000);
    }
    expect(getPredictionConfidence(ZONE_ID)).toBeGreaterThan(0.5);
    resetHistory(ZONE_ID);
    expect(getPredictionConfidence(ZONE_ID)).toBe(0.5);
  });

  it('resets all zone histories when called without arguments', () => {
    recordOccupancy('zone-a', 100);
    recordOccupancy('zone-b', 200);
    resetHistory();
    expect(getPredictionConfidence('zone-a')).toBe(0.5);
    expect(getPredictionConfidence('zone-b')).toBe(0.5);
  });
});
