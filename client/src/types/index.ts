// ── Zone Types ──────────────────────────────────────────

export type ZoneStatus = 'clear' | 'moderate' | 'crowded' | 'critical';
export type ZoneType = 'entry_gate' | 'seating' | 'food_court' | 'restroom' | 'parking' | 'vip_lounge' | 'exit_gate' | 'corridor';
export type CongestionTrend = 'rising' | 'falling' | 'stable';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  capacity: number;
  currentOccupancy: number;
  predictedOccupancy: number;
  status: ZoneStatus;
  predictedStatus: ZoneStatus;
  waitTime: number;
  predictedWaitTime: number;
  congestionTrend: CongestionTrend;
  riskScore: number;
  coordinates: { lat: number; lng: number };
  adjacentZones: string[];
  lastUpdated: number;
}

// ── Alert Types ─────────────────────────────────────────

export type AlertType = 'normal' | 'warning' | 'critical' | 'early_warning';

export interface Alert {
  id: string;
  zoneId: string;
  type: AlertType;
  message: string;
  timestamp: number;
  resolved: boolean;
}

// ── Navigation Types ────────────────────────────────────

export interface NavigationRoute {
  path: string[];
  totalWeight: number;
  estimatedTime: number;
  congestionLevel: number;
}

export interface NavigationResult {
  fastestNow: NavigationRoute;
  fastestPredicted: NavigationRoute;
  recommendation: string;
}

// ── AI Types ────────────────────────────────────────────

export interface AIChatResponse {
  reply: string;
  confidence: number;
  relatedZones: string[];
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: number;
  suggestions?: string[];
}

// ── Staff Types ─────────────────────────────────────────

export interface StaffRecommendation {
  action: string;
  confidence: number;
  reason: string;
  affectedZones: string[];
}

// ── API Response ────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ── Stadium Summary ─────────────────────────────────────

export interface StadiumSummary {
  totalCapacity: number;
  totalOccupancy: number;
  overallUtilization: number;
  criticalZones: number;
  crowdedZones: number;
  clearZones: number;
  highRiskZones: Array<{ id: string; name: string; riskScore: number }>;
  totalZones: number;
}

// ── Simulation ──────────────────────────────────────────

export interface SimulationStatus {
  running: boolean;
  config: {
    intervalMs: number;
    volatility: number;
    eventType: string;
  };
}
