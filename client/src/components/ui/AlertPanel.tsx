import { Alert } from '../../types';

interface AlertItemProps {
  alert: Alert;
  onResolve?: (id: string) => void;
}

const alertStyles: Record<string, { icon: string; border: string; bg: string }> = {
  critical: { icon: '🚨', border: 'border-red-500/30', bg: 'bg-red-500/5' },
  early_warning: { icon: '⚠️', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  warning: { icon: '📈', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
  normal: { icon: '✅', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
};

export function AlertItem({ alert, onResolve }: AlertItemProps) {
  const style = alertStyles[alert.type] ?? alertStyles.normal;
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <div
      className={`p-4 rounded-xl border ${style.border} ${style.bg} backdrop-blur-md
        animate-slide-up transition-all duration-300
        ${alert.type === 'critical' ? 'animate-pulse-slow' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 leading-relaxed">{alert.message}</p>
            <p className="text-xs text-white/30 mt-1 font-mono">{timeAgo}</p>
          </div>
        </div>
        {onResolve && !alert.resolved && (
          <button
            onClick={() => onResolve(alert.id)}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10
                       border border-white/10 transition-all duration-200 flex-shrink-0"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface AlertPanelProps {
  alerts: Alert[];
  onResolve?: (id: string) => void;
  maxItems?: number;
}

export function AlertPanel({ alerts, onResolve, maxItems = 10 }: AlertPanelProps) {
  const displayed = alerts.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <div className="glass-panel p-6 text-center">
        <span className="text-3xl mb-2 block">✅</span>
        <p className="text-sm text-white/40">No active alerts</p>
        <p className="text-xs text-white/20 mt-1">All systems operating normally</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onResolve={onResolve} />
      ))}
      {alerts.length > maxItems && (
        <p className="text-xs text-white/30 text-center py-2">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}
