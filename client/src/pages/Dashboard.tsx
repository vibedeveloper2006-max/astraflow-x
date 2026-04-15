import { useZones } from '../context/ZoneContext';
import { GlassPanel, StatCard } from '../components/ui/GlassPanel';
import { ZoneCard } from '../components/ui/ZoneCard';
import { AlertPanel } from '../components/ui/AlertPanel';
import { resolveAlert } from '../services/api';
import { Zone, Alert } from '../types';

export function Dashboard() {
  const { zones, alerts, summary, loading } = useZones();

  if (loading) return <LoadingSkeleton />;

  const criticalZones = zones.filter((z: Zone) => z.status === 'critical');
  const risingZones = zones.filter((z: Zone) => z.congestionTrend === 'rising').sort((a: Zone, b: Zone) => b.riskScore - a.riskScore);
  const topRiskZones = [...zones].sort((a: Zone, b: Zone) => b.riskScore - a.riskScore).slice(0, 6);

  async function handleResolveAlert(alertId: string) {
    try {
      await resolveAlert(alertId);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-tertiary to-surface-primary border border-glass-border p-8">
        <div className="absolute inset-0 bg-radial-glow" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Live Monitoring Active</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Sawai Mansingh Stadium</span>
          </h1>
          <p className="text-white/40 max-w-xl">
            Real-time crowd intelligence dashboard — monitoring {summary?.totalZones ?? 0} zones
            with predictive AI analytics
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Stadium statistics summary">
        <StatCard
          label="Total Occupancy"
          value={summary?.totalOccupancy?.toLocaleString() ?? '—'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          subtitle={`of ${summary?.totalCapacity?.toLocaleString() ?? '—'}`}
          color="text-neon-cyan"
        />
        <StatCard
          label="Utilization"
          value={`${summary?.overallUtilization ?? 0}%`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          color={
            (summary?.overallUtilization ?? 0) > 80 ? 'text-neon-red' :
            (summary?.overallUtilization ?? 0) > 60 ? 'text-neon-orange' : 'text-neon-green'
          }
        />
        <StatCard
          label="Critical Zones"
          value={summary?.criticalZones ?? 0}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
          color="text-neon-red"
          trend={criticalZones.length > 0 ? 'up' : 'stable'}
        />
        <StatCard
          label="Active Alerts"
          value={alerts.filter((a: Alert) => !a.resolved).length}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          color="text-neon-purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Zone Cards - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-neon-cyan">◆</span> Highest Risk Zones
            </h2>
            <span className="text-xs text-white/30 font-mono">{zones.length} zones total</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {topRiskZones.map((zone: Zone) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </div>

          {/* Rising Congestion Warning */}
          {risingZones.length > 0 && (
            <GlassPanel className="border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span>📈</span>
                <h3 className="text-sm font-semibold text-amber-400">Rising Congestion Detected</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {risingZones.slice(0, 4).map((zone: Zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-2 rounded-lg bg-glass-light">
                    <span className="text-sm text-white/70">{zone.name}</span>
                    <span className="text-xs font-mono text-amber-400">{Math.round(zone.riskScore * 100)}% risk</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}
        </div>

        {/* Alerts Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-neon-purple">◆</span> Live Alerts
          </h2>
          <AlertPanel alerts={alerts} onResolve={handleResolveAlert} maxItems={8} />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-busy="true" aria-label="Loading dashboard data">
      <div className="h-40 rounded-2xl bg-surface-tertiary/50" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-tertiary/50" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-surface-tertiary/50" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-tertiary/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
