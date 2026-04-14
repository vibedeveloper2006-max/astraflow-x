import { Zone } from '../../types';

interface ZoneCardProps {
  zone: Zone;
  compact?: boolean;
  onClick?: (zone: Zone) => void;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  clear: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Clear' },
  moderate: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', label: 'Moderate' },
  crowded: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Crowded' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Critical' },
};

const typeIcons: Record<string, string> = {
  entry_gate: '🚪',
  seating: '💺',
  food_court: '🍔',
  restroom: '🚻',
  parking: '🅿️',
  vip_lounge: '⭐',
  exit_gate: '🚶',
  corridor: '🏃',
};

const trendIcons: Record<string, { icon: string; color: string }> = {
  rising: { icon: '📈', color: 'text-red-400' },
  falling: { icon: '📉', color: 'text-emerald-400' },
  stable: { icon: '➡️', color: 'text-white/40' },
};

export function ZoneCard({ zone, compact = false, onClick }: ZoneCardProps) {
  const status = statusConfig[zone.status];
  const predicted = statusConfig[zone.predictedStatus];
  const trend = trendIcons[zone.congestionTrend];
  const occupancyPercent = Math.round((zone.currentOccupancy / zone.capacity) * 100);

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(zone)}
        className="w-full glass-panel p-3 text-left hover:bg-glass-heavy transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{typeIcons[zone.type]}</span>
            <span className="text-sm font-medium truncate">{zone.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.dot} ${zone.status === 'critical' ? 'animate-pulse-fast' : ''}`} />
            <span className={`text-xs font-mono ${status.text}`}>{occupancyPercent}%</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(zone)}
      className={`w-full glass-panel p-5 text-left hover:bg-glass-heavy transition-all duration-300 cursor-pointer
        ${zone.status === 'critical' ? 'border-red-500/30 shadow-glow-red' : ''}
        ${zone.status === 'crowded' ? 'border-orange-500/20' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[zone.type]}</span>
          <div>
            <h3 className="font-semibold text-sm">{zone.name}</h3>
            <span className="text-xs text-white/30 capitalize">{zone.type.replace('_', ' ')}</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${status.bg} ${status.text} border border-current/20`}>
          {status.label}
        </div>
      </div>

      {/* Occupancy Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-white/50">Occupancy</span>
          <span className="font-mono text-white/70">{zone.currentOccupancy}/{zone.capacity}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              occupancyPercent >= 90 ? 'bg-red-500' :
              occupancyPercent >= 75 ? 'bg-orange-500' :
              occupancyPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Wait</p>
          <p className="text-sm font-bold font-mono">{zone.waitTime}m</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Risk</p>
          <p className={`text-sm font-bold font-mono ${zone.riskScore > 0.7 ? 'text-red-400' : zone.riskScore > 0.4 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {Math.round(zone.riskScore * 100)}%
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Trend</p>
          <p className={`text-sm ${trend.color}`}>{trend.icon}</p>
        </div>
      </div>

      {/* Prediction Footer */}
      <div className="mt-3 pt-3 border-t border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white/30">Predicted:</span>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${predicted.bg} ${predicted.text}`}>
            {predicted.label}
          </div>
        </div>
        <span className="text-xs text-white/30 font-mono">
          ~{zone.predictedWaitTime}m wait
        </span>
      </div>
    </button>
  );
}
