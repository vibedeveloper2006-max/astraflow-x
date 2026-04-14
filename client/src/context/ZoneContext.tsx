import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Zone, Alert, StadiumSummary } from '../types';
import { fetchZones, fetchAlerts, fetchStadiumSummary } from '../services/api';

interface ZoneContextType {
  zones: Zone[];
  alerts: Alert[];
  summary: StadiumSummary | null;
  loading: boolean;
  error: string | null;
  refreshZones: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  getZoneById: (id: string) => Zone | undefined;
}

const ZoneContext = createContext<ZoneContextType | null>(null);

export function ZoneProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<StadiumSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshZones = useCallback(async () => {
    try {
      const [zonesData, summaryData] = await Promise.all([
        fetchZones(),
        fetchStadiumSummary(),
      ]);
      setZones(zonesData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch zones');
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    try {
      const alertsData = await fetchAlerts();
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, []);

  const getZoneById = useCallback(
    (id: string) => zones.find((z) => z.id === id),
    [zones]
  );

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([refreshZones(), refreshAlerts()]);
      setLoading(false);
    }
    init();
  }, [refreshZones, refreshAlerts]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshZones();
      refreshAlerts();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshZones, refreshAlerts]);

  return (
    <ZoneContext.Provider
      value={{ zones, alerts, summary, loading, error, refreshZones, refreshAlerts, getZoneById }}
    >
      {children}
    </ZoneContext.Provider>
  );
}

export function useZones(): ZoneContextType {
  const ctx = useContext(ZoneContext);
  if (!ctx) {
    throw new Error('useZones must be used within ZoneProvider');
  }
  return ctx;
}
