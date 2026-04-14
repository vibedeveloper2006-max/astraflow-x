import {
  Zone,
  Alert,
  NavigationResult,
  AIChatResponse,
  StadiumSummary,
  SimulationStatus,
  StaffRecommendation,
  ApiResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? `Request failed: ${response.status}`);
  }

  return data.data as T;
}

// ── Zone APIs ───────────────────────────────────────────

export async function fetchZones(): Promise<Zone[]> {
  return request<Zone[]>('/zones');
}

export async function fetchZone(id: string): Promise<Zone> {
  return request<Zone>(`/zones/${id}`);
}

export async function updateOccupancy(zoneId: string, newOccupancy: number): Promise<Zone> {
  return request<Zone>(`/zones/${zoneId}/occupancy`, {
    method: 'PATCH',
    body: JSON.stringify({ newOccupancy }),
  });
}

export async function fetchStadiumSummary(): Promise<StadiumSummary> {
  return request<StadiumSummary>('/zones/stats/summary');
}

// ── Alert APIs ──────────────────────────────────────────

export async function fetchAlerts(unresolvedOnly = true): Promise<Alert[]> {
  const query = unresolvedOnly ? '?unresolved=true' : '';
  return request<Alert[]>(`/alerts${query}`);
}

export async function resolveAlert(alertId: string): Promise<Alert> {
  return request<Alert>(`/alerts/${alertId}/resolve`, { method: 'PATCH' });
}

// ── Navigation APIs ─────────────────────────────────────

export async function findRoute(source: string, destination: string): Promise<NavigationResult> {
  return request<NavigationResult>('/navigation/route', {
    method: 'POST',
    body: JSON.stringify({ source, destination }),
  });
}

export async function findShortestQueue(zoneType: string): Promise<{ recommended: Zone; alternatives: Zone[] }> {
  return request<{ recommended: Zone; alternatives: Zone[] }>('/navigation/shortest-queue', {
    method: 'POST',
    body: JSON.stringify({ zoneType }),
  });
}

// ── AI APIs ─────────────────────────────────────────────

export async function chatWithAI(message: string, role?: string): Promise<AIChatResponse> {
  return request<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, role }),
  });
}

// ── Simulation APIs ─────────────────────────────────────

export async function startSimulation(config?: Partial<SimulationStatus['config']>): Promise<{ status: string; config: SimulationStatus['config'] }> {
  return request('/simulation/start', {
    method: 'POST',
    body: JSON.stringify(config ?? {}),
  });
}

export async function stopSimulation(): Promise<{ status: string }> {
  return request('/simulation/stop', { method: 'POST' });
}

export async function getSimulationStatus(): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulation/status');
}

export async function runSimulationTick(): Promise<{ zones: Zone[]; newAlerts: Alert[] }> {
  return request('/simulation/tick', { method: 'POST' });
}

export async function updateSimulationConfig(config: Partial<SimulationStatus['config']>): Promise<{ config: SimulationStatus['config']; running: boolean }> {
  return request('/simulation/config', {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}

export async function fetchRecommendations(): Promise<StaffRecommendation[]> {
  return request<StaffRecommendation[]>('/simulation/recommendations');
}
