import { describe, it, expect } from 'vitest';
import { calculateStatus, calculateWaitTime, calculateRiskScore, determineTrend, recalculateZone } from '../src/services/zone-calculator';

describe('Zone Calculator', () => {
  describe('calculateStatus', () => {
    it('returns clear when under 50%', () => {
      expect(calculateStatus(200, 1000)).toBe('clear');
      expect(calculateStatus(0, 1000)).toBe('clear');
      expect(calculateStatus(499, 1000)).toBe('clear');
    });

    it('returns moderate between 50-75%', () => {
      expect(calculateStatus(500, 1000)).toBe('moderate');
      expect(calculateStatus(700, 1000)).toBe('moderate');
    });

    it('returns crowded between 75-90%', () => {
      expect(calculateStatus(750, 1000)).toBe('crowded');
      expect(calculateStatus(890, 1000)).toBe('crowded');
    });

    it('returns critical at 90%+', () => {
      expect(calculateStatus(900, 1000)).toBe('critical');
      expect(calculateStatus(1000, 1000)).toBe('critical');
    });
  });

  describe('calculateWaitTime', () => {
    it('returns 0 for empty zones', () => {
      expect(calculateWaitTime(0, 1000, 'entry_gate')).toBe(0);
    });

    it('returns higher wait for food courts', () => {
      const foodWait = calculateWaitTime(800, 1000, 'food_court');
      const gateWait = calculateWaitTime(800, 1000, 'entry_gate');
      expect(foodWait).toBeGreaterThan(gateWait);
    });

    it('returns 0 for seating', () => {
      expect(calculateWaitTime(500, 1000, 'seating')).toBe(0);
    });
  });

  describe('calculateRiskScore', () => {
    it('returns value between 0 and 1', () => {
      const score = calculateRiskScore(500, 600, 1000, 'rising');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('rising trend increases risk', () => {
      const risingRisk = calculateRiskScore(700, 800, 1000, 'rising');
      const fallingRisk = calculateRiskScore(700, 800, 1000, 'falling');
      expect(risingRisk).toBeGreaterThan(fallingRisk);
    });

    it('clamps at 1 for extreme values', () => {
      const score = calculateRiskScore(1000, 1000, 1000, 'rising');
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('determineTrend', () => {
    it('returns rising when predicted > current by 5%+', () => {
      expect(determineTrend(400, 500, 1000)).toBe('rising');
    });

    it('returns falling when predicted < current by 5%+', () => {
      expect(determineTrend(500, 400, 1000)).toBe('falling');
    });

    it('returns stable when difference < 5%', () => {
      expect(determineTrend(500, 520, 1000)).toBe('stable');
    });
  });

  describe('recalculateZone', () => {
    const mockZone = {
      id: 'test',
      name: 'Test Zone',
      type: 'entry_gate' as const,
      capacity: 1000,
      currentOccupancy: 500,
      predictedOccupancy: 600,
      status: 'clear' as const,
      predictedStatus: 'clear' as const,
      waitTime: 0,
      predictedWaitTime: 0,
      congestionTrend: 'stable' as const,
      riskScore: 0,
      coordinates: { lat: 0, lng: 0 },
      adjacentZones: [],
      lastUpdated: Date.now(),
    };

    it('recalculates all computed fields', () => {
      const result = recalculateZone(mockZone, 800);
      expect(result.currentOccupancy).toBe(800);
      expect(result.status).toBe('crowded');
      expect(result.waitTime).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('updates lastUpdated', () => {
      const result = recalculateZone(mockZone);
      expect(result.lastUpdated).toBeGreaterThanOrEqual(mockZone.lastUpdated);
    });
  });
});
