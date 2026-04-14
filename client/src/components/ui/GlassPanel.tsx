import { type ReactNode, type CSSProperties } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glow?: 'cyan' | 'purple' | 'red' | 'none';
  animate?: boolean;
}

export function GlassPanel({ children, className = '', style, glow = 'none', animate = true }: GlassPanelProps) {
  const glowStyles: Record<string, string> = {
    cyan: 'shadow-glow hover:shadow-glow-lg',
    purple: 'shadow-glow-purple',
    red: 'shadow-glow-red',
    none: '',
  };

  return (
    <div
      style={style}
      className={`
        glass-panel p-5
        ${glowStyles[glow]}
        ${animate ? 'animate-fade-in hover:scale-[1.01] transition-transform duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, trend, color = 'text-neon-cyan', subtitle }: StatCardProps) {
  const trendIcons: Record<string, string> = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColors: Record<string, string> = {
    up: 'text-neon-red',
    down: 'text-neon-green',
    stable: 'text-white/40',
  };

  return (
    <GlassPanel className="flex items-start gap-4">
      <div className={`p-3 rounded-xl bg-glass-light ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-2xl font-bold ${color}`}>{value}</span>
          {trend && (
            <span className={`text-sm font-mono ${trendColors[trend]}`}>
              {trendIcons[trend]}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-white/30 mt-1">{subtitle}</p>}
      </div>
    </GlassPanel>
  );
}
