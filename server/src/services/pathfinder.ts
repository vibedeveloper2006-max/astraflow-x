import { Zone, NavigationRoute, NavigationResult } from '../types';
import { logger } from '../utils/logger';

/**
 * GraphEdge represents a connection between two zones with a calculated weight.
 */
interface GraphEdge {
  /** The unique identifier of the destination zone */
  to: string;
  /** The cost to traverse this edge (congestion-weighted) */
  weight: number;
}

/**
 * WeightMode determines whether to use current or predicted occupancy for routing.
 */
type WeightMode = 'current' | 'predicted';

/**
 * Calculates edge weight based on the congestion and characteristics of the target zone.
 * Higher congestion leads to a higher weight, making the route less favorable.
 * 
 * @param zone - The destination zone to evaluate
 * @param mode - The weight calculation mode ('current' or 'predicted')
 * @returns A numerical weight representing the cost to enter this zone
 */
function calculateEdgeWeight(zone: Zone, mode: WeightMode): number {
  const occupancy = mode === 'current' ? zone.currentOccupancy : zone.predictedOccupancy;
  const ratio = (occupancy || 0) / (zone.capacity || 1);

  // Base weight (representing physical distance/time) + congestion penalty
  const baseWeight = 1;
  // Quadratic penalty for high congestion to strongly discourage overcrowded paths
  const congestionPenalty = ratio * ratio * 10; 
  const waitPenalty = (mode === 'current' ? zone.waitTime : zone.predictedWaitTime) * 0.5;

  return baseWeight + congestionPenalty + waitPenalty;
}

/**
 * Builds an adjacency list graph from zone data for pathfinding.
 * 
 * @param zones - Array of all stadium zones
 * @param mode - The weight mode to apply to edges
 * @returns A Map serving as an adjacency list
 */
function buildGraph(zones: Zone[], mode: WeightMode): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  const zoneMap = new Map<string, Zone>();

  for (const zone of zones) {
    zoneMap.set(zone.id, zone);
  }

  for (const zone of zones) {
    const edges: GraphEdge[] = [];
    for (const adjacentId of zone.adjacentZones) {
      const adjacentZone = zoneMap.get(adjacentId);
      if (adjacentZone) {
        edges.push({
          to: adjacentId,
          weight: calculateEdgeWeight(adjacentZone, mode),
        });
      }
    }
    graph.set(zone.id, edges);
  }

  return graph;
}

/**
 * Dijkstra's shortest path algorithm implementation.
 * Finds the optimal route between two nodes in a weighted graph.
 * 
 * @param graph - The adjacency list graph
 * @param source - Starting node ID
 * @param destination - Target node ID
 * @returns Object containing the path array and total weight, or null if unreachable
 */
function dijkstra(
  graph: Map<string, GraphEdge[]>,
  source: string,
  destination: string
): { path: string[]; totalWeight: number } | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  // Use a simple sorted array for priority queue (O(V log V) for this dataset size)
  const queue: Array<{ node: string; distance: number }> = [];

  // Initialize all distances to Infinity
  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    previous.set(node, null);
  }

  distances.set(source, 0);
  queue.push({ node: source, distance: 0 });

  while (queue.length > 0) {
    // Pick the node with the minimum distance
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();

    if (!current) break;
    if (visited.has(current.node)) continue;
    if (current.node === destination) break;

    visited.add(current.node);

    const edges = graph.get(current.node) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      const newDist = (distances.get(current.node) ?? Infinity) + edge.weight;
      if (newDist < (distances.get(edge.to) ?? Infinity)) {
        distances.set(edge.to, newDist);
        previous.set(edge.to, current.node);
        queue.push({ node: edge.to, distance: newDist });
      }
    }
  }

  // Backtrack to reconstruct the shortest path
  const path: string[] = [];
  let current: string | null | undefined = destination;

  while (current) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  if (path[0] !== source) return null;

  return {
    path,
    totalWeight: distances.get(destination) ?? Infinity,
  };
}

/**
 * Normalizes Dijkstra output into a localized NavigationRoute object.
 * 
 * @param result - Raw result from Dijkstra algorithm
 * @param zones - Array of stadium zones
 * @param mode - Weight mode used for calculation
 * @returns Formatted navigation data
 */
function toNavigationRoute(
  result: { path: string[]; totalWeight: number },
  zones: Zone[],
  mode: WeightMode
): NavigationRoute {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  let totalCongestion = 0;
  for (const nodeId of result.path) {
    const zone = zoneMap.get(nodeId);
    if (zone) {
      const occupancy = mode === 'current' ? zone.currentOccupancy : zone.predictedOccupancy;
      totalCongestion += occupancy / zone.capacity;
    }
  }

  const avgCongestion = result.path.length > 0 ? totalCongestion / result.path.length : 0;

  return {
    path: result.path,
    totalWeight: Math.round(result.totalWeight * 100) / 100,
    estimatedTime: Math.round(result.totalWeight * 2), // Rough heuristic: 2min per weight unit
    congestionLevel: Math.round(avgCongestion * 100) / 100,
  };
}

/**
 * Main cross-temporal navigation engine.
 * Compares current optimal routes against predicted future states to provide 
 * proactive visitor recommendations.
 * 
 * @param zones - Current state of all stadium zones
 * @param sourceId - Visitor's current location ID
 * @param destinationId - Visitor's target location ID
 * @returns Best routes and an intelligent recommendation string
 */
export function findBestRoute(
  zones: Zone[],
  sourceId: string,
  destinationId: string
): NavigationResult | null {
  logger.debug('Calculating spatial routes', { source: sourceId, destination: destinationId });

  const currentGraph = buildGraph(zones, 'current');
  const predictedGraph = buildGraph(zones, 'predicted');

  const currentResult = dijkstra(currentGraph, sourceId, destinationId);
  const predictedResult = dijkstra(predictedGraph, sourceId, destinationId);

  if (!currentResult || !predictedResult) {
    logger.warn('No valid route identified between zones', { source: sourceId, destination: destinationId });
    return null;
  }

  const fastestNow = toNavigationRoute(currentResult, zones, 'current');
  const fastestPredicted = toNavigationRoute(predictedResult, zones, 'predicted');

  // Logic to determine if waiting is better than moving now
  let recommendation: string;
  if (fastestPredicted.totalWeight < fastestNow.totalWeight * 0.8) {
    recommendation = `Wait 10-15 minutes — the predicted route via ${fastestPredicted.path.join(' → ')} will be ~${Math.round((1 - fastestPredicted.totalWeight / fastestNow.totalWeight) * 100)}% faster.`;
  } else if (fastestNow.totalWeight < fastestPredicted.totalWeight * 0.8) {
    recommendation = `Go now! The current route is optimal. Future congestion is expected to increase path resistance by ~${Math.round((fastestPredicted.totalWeight / fastestNow.totalWeight - 1) * 100)}%.`;
  } else {
    recommendation = `Both routes are currently similar. Destination arrival: ~${fastestNow.estimatedTime} min. Consider moving now for the most stable experience.`;
  }

  return { fastestNow, fastestPredicted, recommendation };
}

/**
 * Identifies zones of a specific type with the lowest wait times.
 * Useful for finding the fastest food courts or restrooms.
 * 
 * @param zones - Array of stadium zones
 * @param zoneType - Type of zone to filter (e.g., 'food_court')
 * @returns Sorted array of zones by wait time
 */
export function findShortestQueue(zones: Zone[], zoneType: string): Zone[] {
  return zones
    .filter((z) => z.type === zoneType)
    .sort((a, b) => a.waitTime - b.waitTime);
}

