import { useState } from 'react';
import { useZones } from '@/context/ZoneContext';
import { Zone } from '@/types';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ZoneCard } from '@/components/ui/ZoneCard';

const STADIUM_CENTER = { lat: 26.8923, lng: 75.8019 };

const statusColors: Record<string, string> = {
  clear: '#22c55e',
  moderate: '#f59e0b',
  crowded: '#f97316',
  critical: '#ef4444',
};

export function LiveMap() {
  const { zones } = useZones();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredZones = filter === 'all' ? zones : zones.filter((z: Zone) => z.type === filter);

  const zoneTypes = [...new Set(zones.map((z: Zone) => z.type))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold gradient-text">Live Stadium Map</h1>
          <p className="text-sm text-white/40 mt-1">Real-time zone monitoring with interactive visualization</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Legend */}
          <div className="flex items-center gap-3 px-4 py-2 glass-panel">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-white/50 capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-3">
          <GlassPanel className="p-0 overflow-hidden h-[600px] relative">
            {/* Stadium Visualization */}
            <div className="absolute inset-0 bg-surface-primary">
              <StadiumVisualization
                zones={filteredZones}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
              />
            </div>

            {/* Map Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
              <div className="glass-panel p-3 pointer-events-auto">
                <p className="text-xs text-white/40 mb-1">📍 Sawai Mansingh Stadium, Jaipur</p>
                <p className="text-xs font-mono text-white/30">{STADIUM_CENTER.lat}°N, {STADIUM_CENTER.lng}°E</p>
              </div>
              <div className="glass-panel p-3 pointer-events-auto">
                <p className="text-xs text-white/40">Zones visible: <span className="text-neon-cyan font-bold">{filteredZones.length}</span></p>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Filter */}
          <GlassPanel className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-white/70">Filter by Type</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  filter === 'all' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-glass-light text-white/50 border border-transparent'
                }`}
              >
                All
              </button>
              {zoneTypes.map((type: string) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all capitalize ${
                    filter === type ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-glass-light text-white/50 border border-transparent'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </GlassPanel>

          {/* Selected Zone Detail */}
          {selectedZone ? (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-white/70">Selected Zone</h3>
              <ZoneCard zone={selectedZone} />
            </div>
          ) : (
            <GlassPanel className="text-center py-8">
              <p className="text-white/30 text-sm">Click a zone on the map to view details</p>
            </GlassPanel>
          )}

          {/* Zone List */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-white/70">All Zones</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredZones.map((zone: Zone) => (
                <ZoneCard key={zone.id} zone={zone} compact onClick={setSelectedZone} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive Stadium SVG Visualization
function StadiumVisualization({
  zones,
  selectedZone,
  onSelectZone,
}: {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
}) {
  // Map zone coordinates to SVG positions
  const minLat = Math.min(...zones.map((z) => z.coordinates.lat));
  const maxLat = Math.max(...zones.map((z) => z.coordinates.lat));
  const minLng = Math.min(...zones.map((z) => z.coordinates.lng));
  const maxLng = Math.max(...zones.map((z) => z.coordinates.lng));

  const mapToSvg = (lat: number, lng: number) => {
    const padded = 0.15;
    const x = ((lng - minLng) / (maxLng - minLng || 1)) * (1 - 2 * padded) + padded;
    const y = (1 - (lat - minLat) / (maxLat - minLat || 1)) * (1 - 2 * padded) + padded;
    return { x: x * 100, y: y * 100 };
  };

  const sizeMap: Record<string, number> = {
    seating: 5,
    parking: 4,
    entry_gate: 3.5,
    exit_gate: 3.5,
    food_court: 3.5,
    corridor: 3,
    restroom: 2.5,
    vip_lounge: 3.5,
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ background: '#0a0e1a' }}>
      {/* Grid */}
      <defs>
        <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />

      {/* Stadium Outline */}
      <ellipse cx="50" cy="50" rx="30" ry="22" fill="none" stroke="rgba(0,240,255,0.08)" strokeWidth="0.3" strokeDasharray="2 1" />
      <ellipse cx="50" cy="50" rx="18" ry="12" fill="none" stroke="rgba(34,197,94,0.1)" strokeWidth="0.2" />
      <text x="50" y="50" textAnchor="middle" fill="rgba(34,197,94,0.15)" fontSize="2" fontFamily="monospace">PITCH</text>

      {/* Adjacency Lines */}
      {zones.map((zone: Zone) =>
        zone.adjacentZones.map((adjId: string) => {
          const adj = zones.find((z) => z.id === adjId);
          if (!adj || zone.id > adjId) return null;
          const from = mapToSvg(zone.coordinates.lat, zone.coordinates.lng);
          const to = mapToSvg(adj.coordinates.lat, adj.coordinates.lng);
          return (
            <line
              key={`${zone.id}-${adjId}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.15"
            />
          );
        })
      )}

      {/* Zone Nodes */}
      {zones.map((zone) => {
        const pos = mapToSvg(zone.coordinates.lat, zone.coordinates.lng);
        const color = statusColors[zone.status];
        const size = sizeMap[zone.type] ?? 3;
        const isSelected = selectedZone?.id === zone.id;
        const occupancyRatio = zone.currentOccupancy / zone.capacity;

        return (
          <g key={zone.id} onClick={() => onSelectZone(zone)} className="cursor-pointer">
            {/* Pulse ring for critical */}
            {zone.status === 'critical' && (
              <circle cx={pos.x} cy={pos.y} r={size + 2} fill="none" stroke={color} strokeWidth="0.2" opacity="0.4">
                <animate attributeName="r" from={size} to={size + 4} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Selection ring */}
            {isSelected && (
              <circle cx={pos.x} cy={pos.y} r={size + 1.5} fill="none" stroke="#00f0ff" strokeWidth="0.3">
                <animate attributeName="r" values={`${size + 1};${size + 2};${size + 1}`} dur="2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Background circle */}
            <circle cx={pos.x} cy={pos.y} r={size} fill={color} opacity={0.12} filter="url(#glow)" />

            {/* Fill arc representing occupancy */}
            <circle
              cx={pos.x} cy={pos.y} r={size - 0.5}
              fill="none"
              stroke={color} strokeWidth="0.8"
              strokeDasharray={`${occupancyRatio * 2 * Math.PI * (size - 0.5)} ${2 * Math.PI * (size - 0.5)}`}
              transform={`rotate(-90 ${pos.x} ${pos.y})`}
              opacity="0.7"
            />

            {/* Center dot */}
            <circle cx={pos.x} cy={pos.y} r="1" fill={color} opacity="0.9" />

            {/* Label */}
            <text x={pos.x} y={pos.y + size + 2} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="1.6" fontFamily="Inter, sans-serif">
              {zone.name.split(' ').slice(0, 2).join(' ')}
            </text>
            <text x={pos.x} y={pos.y + size + 3.8} textAnchor="middle" fill={color} fontSize="1.3" fontFamily="monospace" fontWeight="bold">
              {Math.round(occupancyRatio * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
