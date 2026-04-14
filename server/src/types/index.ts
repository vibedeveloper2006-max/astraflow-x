import { z } from 'zod';

// ── Zone Types ──────────────────────────────────────────

export const ZoneStatusEnum = z.enum(['clear', 'moderate', 'crowded', 'critical']);
export type ZoneStatus = z.infer<typeof ZoneStatusEnum>;

export const ZoneTypeEnum = z.enum(['entry_gate', 'seating', 'food_court', 'restroom', 'parking', 'vip_lounge', 'exit_gate', 'corridor']);
export type ZoneType = z.infer<typeof ZoneTypeEnum>;

export const CongestionTrendEnum = z.enum(['rising', 'falling', 'stable']);
export type CongestionTrend = z.infer<typeof CongestionTrendEnum>;

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ZoneTypeEnum,
  capacity: z.number().int().positive(),
  currentOccupancy: z.number().int().min(0),
  predictedOccupancy: z.number().int().min(0),
  status: ZoneStatusEnum,
  predictedStatus: ZoneStatusEnum,
  waitTime: z.number().min(0),
  predictedWaitTime: z.number().min(0),
  congestionTrend: CongestionTrendEnum,
  riskScore: z.number().min(0).max(1),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  adjacentZones: z.array(z.string()),
  lastUpdated: z.number(),
});

export type Zone = z.infer<typeof ZoneSchema>;

// ── Alert Types ─────────────────────────────────────────

export const AlertTypeEnum = z.enum(['normal', 'warning', 'critical', 'early_warning']);
export type AlertType = z.infer<typeof AlertTypeEnum>;

export const AlertSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  type: AlertTypeEnum,
  message: z.string(),
  timestamp: z.number(),
  resolved: z.boolean(),
});

export type Alert = z.infer<typeof AlertSchema>;

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

export const AIChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  role: z.enum(['attendee', 'staff']).optional(),
});

export type AIChatRequest = z.infer<typeof AIChatRequestSchema>;

export interface AIChatResponse {
  reply: string;
  confidence: number;
  relatedZones: string[];
  suggestions: string[];
}

// ── Staff Types ─────────────────────────────────────────

export const OccupancyUpdateSchema = z.object({
  zoneId: z.string(),
  newOccupancy: z.number().int().min(0),
});

export type OccupancyUpdate = z.infer<typeof OccupancyUpdateSchema>;

export interface StaffRecommendation {
  action: string;
  confidence: number;
  reason: string;
  affectedZones: string[];
}

// ── Auth Types ──────────────────────────────────────────

export const UserRoleEnum = z.enum(['attendee', 'staff', 'admin']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
}

// ── API Response Types ──────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ── Simulation Types ────────────────────────────────────

export interface SimulationConfig {
  intervalMs: number;
  volatility: number;
  eventType: 'normal' | 'match_start' | 'halftime' | 'match_end' | 'emergency';
}
