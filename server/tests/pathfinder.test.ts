import { describe, it, expect } from 'vitest';
import { findBestRoute, findShortestQueue } from '../src/services/pathfinder';
import { Zone } from '../src/types';

const mockZones: Zone[] = [
  {
    id: 'a', name: 'Zone A', type: 'entry_gate', capacity: 100,
    currentOccupancy: 20, predictedOccupancy: 30, status: 'clear', predictedStatus: 'clear',
    waitTime: 1, predictedWaitTime: 2, congestionTrend: 'stable', riskScore: 0.2,
    coordinates: { lat: 0, lng: 0 }, adjacentZones: ['b', 'c'], lastUpdated: Date.now(),
  },
  {
    id: 'b', name: 'Zone B', type: 'corridor', capacity: 100,
    currentOccupancy: 80, predictedOccupancy: 90, status: 'crowded', predictedStatus: 'critical',
    waitTime: 8, predictedWaitTime: 12, congestionTrend: 'rising', riskScore: 0.8,
    coordinates: { lat: 0, lng: 1 }, adjacentZones: ['a', 'd'], lastUpdated: Date.now(),
  },
  {
    id: 'c', name: 'Zone C', type: 'corridor', capacity: 100,
    currentOccupancy: 30, predictedOccupancy: 35, status: 'clear', predictedStatus: 'clear',
    waitTime: 1, predictedWaitTime: 2, congestionTrend: 'stable', riskScore: 0.3,
    coordinates: { lat: 1, lng: 0 }, adjacentZones: ['a', 'd'], lastUpdated: Date.now(),
  },
  {
    id: 'd', name: 'Zone D', type: 'food_court', capacity: 100,
    currentOccupancy: 50, predictedOccupancy: 60, status: 'moderate', predictedStatus: 'moderate',
    waitTime: 5, predictedWaitTime: 7, congestionTrend: 'rising', riskScore: 0.5,
    coordinates: { lat: 1, lng: 1 }, adjacentZones: ['b', 'c'], lastUpdated: Date.now(),
  },
];

describe('Pathfinder', () => {
  describe('findBestRoute', () => {
    it('finds a route between connected zones', () => {
      const result = findBestRoute(mockZones, 'a', 'd');
      expect(result).not.toBeNull();
      expect(result!.fastestNow.path[0]).toBe('a');
      expect(result!.fastestNow.path[result!.fastestNow.path.length - 1]).toBe('d');
    });

    it('prefers less congested routes', () => {
      const result = findBestRoute(mockZones, 'a', 'd');
      // Route via C should be preferred (less congested) over route via B
      expect(result!.fastestNow.path).toContain('c');
    });

    it('returns null for disconnected zones', () => {
      const isolated: Zone[] = [
        { ...mockZones[0], adjacentZones: [] },
        { ...mockZones[3], adjacentZones: [] },
      ];
      const result = findBestRoute(isolated, 'a', 'd');
      expect(result).toBeNull();
    });

    it('generates a recommendation', () => {
      const result = findBestRoute(mockZones, 'a', 'd');
      expect(result!.recommendation).toBeTruthy();
      expect(typeof result!.recommendation).toBe('string');
    });
  });

  describe('findShortestQueue', () => {
    it('returns zones sorted by wait time', () => {
      const result = findShortestQueue(mockZones, 'corridor');
      expect(result.length).toBe(2);
      expect(result[0].waitTime).toBeLessThanOrEqual(result[1].waitTime);
    });

    it('returns empty array for non-existent type', () => {
      const result = findShortestQueue(mockZones, 'nonexistent');
      expect(result.length).toBe(0);
    });
  });
});
