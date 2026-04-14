import { Zone, NavigationRoute, NavigationResult } from '../types';
import { logger } from '../utils/logger';

interface GraphEdge {
  to: string;
  weight: number;
}

type WeightMode = 'current' | 'predicted';

/**
 * Calculates edge weight based on congestion of the target zone.
 * Higher congestion = Higher weight = Less favorable route.
 */
function calculateEdgeWeight(zone: Zone, mode: WeightMode): number {
  const occupancy = mode === 'current' ? zone.currentOccupancy : zone.predictedOccupancy;
  const ratio = occupancy / zone.capacity;

  // Base weight (representing physical distance/time) + congestion penalty
  const baseWeight = 1;
  const congestionPenalty = ratio * ratio * 10; // Quadratic penalty for high congestion
  const waitPenalty = (mode === 'current' ? zone.waitTime : zone.predictedWaitTime) * 0.5;

  return baseWeight + congestionPenalty + waitPenalty;
}

/**
 * Builds adjacency list graph from zone data.
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
 * Dijkstra's shortest path algorithm.
 * Returns the path and total weight from source to destination.
 */
function dijkstra(
  graph: Map<string, GraphEdge[]>,
  source: string,
  destination: string
): { path: string[]; totalWeight: number } | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  // Priority queue implemented as sorted array (sufficient for small graph)
  const queue: Array<{ node: string; distance: number }> = [];

  // Initialize
  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    previous.set(node, null);
  }

  distances.set(source, 0);
  queue.push({ node: source, distance: 0 });

  while (queue.length > 0) {
    // Sort by distance and pick minimum
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

  // Reconstruct path
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
 * Converts Dijkstra result to NavigationRoute with human-readable metrics.
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
    estimatedTime: Math.round(result.totalWeight * 2), // ~2 min per weight unit
    congestionLevel: Math.round(avgCongestion * 100) / 100,
  };
}

/**
 * Main navigation function.
 * Finds fastest route now AND fastest predicted route, then recommends.
 */
export function findBestRoute(
  zones: Zone[],
  sourceId: string,
  destinationId: string
): NavigationResult | null {
  logger.debug('Finding routes', { source: sourceId, destination: destinationId });

  const currentGraph = buildGraph(zones, 'current');
  const predictedGraph = buildGraph(zones, 'predicted');

  const currentResult = dijkstra(currentGraph, sourceId, destinationId);
  const predictedResult = dijkstra(predictedGraph, sourceId, destinationId);

  if (!currentResult || !predictedResult) {
    logger.warn('No route found', { source: sourceId, destination: destinationId });
    return null;
  }

  const fastestNow = toNavigationRoute(currentResult, zones, 'current');
  const fastestPredicted = toNavigationRoute(predictedResult, zones, 'predicted');

  // Generate recommendation
  let recommendation: string;
  if (fastestPredicted.totalWeight < fastestNow.totalWeight * 0.8) {
    recommendation = `Wait 10-15 minutes — the predicted route via ${fastestPredicted.path.join(' → ')} will be ~${Math.round((1 - fastestPredicted.totalWeight / fastestNow.totalWeight) * 100)}% faster.`;
  } else if (fastestNow.totalWeight < fastestPredicted.totalWeight * 0.8) {
    recommendation = `Go now! The current route is optimal. Congestion is expected to increase by ~${Math.round((fastestPredicted.totalWeight / fastestNow.totalWeight - 1) * 100)}%.`;
  } else {
    recommendation = `Both routes are similar. Current route: ~${fastestNow.estimatedTime} min. Consider leaving now for the most predictable experience.`;
  }

  return { fastestNow, fastestPredicted, recommendation };
}

/**
 * Find zones with shortest queues for a given type.
 */
export function findShortestQueue(zones: Zone[], zoneType: string): Zone[] {
  return zones
    .filter((z) => z.type === zoneType)
    .sort((a, b) => a.waitTime - b.waitTime);
}
