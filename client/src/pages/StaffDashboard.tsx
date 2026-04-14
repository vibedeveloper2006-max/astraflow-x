import { useState, useEffect } from 'react';
import { useZones } from '../context/ZoneContext';
import { GlassPanel, StatCard } from '../components/ui/GlassPanel';
import { ZoneCard } from '../components/ui/ZoneCard';
import { AlertPanel } from '../components/ui/AlertPanel';
import { StaffRecommendation, SimulationStatus } from '../types';
import {
  startSimulation, stopSimulation, getSimulationStatus,
  updateSimulationConfig, fetchRecommendations,
  updateOccupancy, resolveAlert,
} from '../services/api';

export function StaffDashboard() {
  const { zones, alerts, summary } = useZones();
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [recommendations, setRecommendations] = useState<StaffRecommendation[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [newOccupancy, setNewOccupancy] = useState('');
  const [eventType, setEventType] = useState('normal');

  useEffect(() => {
    loadSimStatus();
    loadRecommendations();
    const iv = setInterval(loadRecommendations, 5000);
    return () => clearInterval(iv);
  }, []);

  async function loadSimStatus() {
    try { setSimStatus(await getSimulationStatus()); } catch { /* demo */ }
  }
  async function loadRecommendations() {
    try { setRecommendations(await fetchRecommendations()); } catch { /* demo */ }
  }
  async function handleStartSim() {
    try { await startSimulation({ eventType: eventType as 'normal' }); await loadSimStatus(); } catch { /* */ }
  }
  async function handleStopSim() {
    try { await stopSimulation(); await loadSimStatus(); } catch { /* */ }
  }
  async function handleChangeEvent(type: string) {
    setEventType(type);
    try { await updateSimulationConfig({ eventType: type as 'normal' }); } catch { /* */ }
  }
  async function handleUpdateOccupancy() {
    if (!selectedZoneId || !newOccupancy) return;
    try { await updateOccupancy(selectedZoneId, parseInt(newOccupancy)); setNewOccupancy(''); } catch { /* */ }
  }
  async function handleResolve(id: string) {
    try { await resolveAlert(id); } catch { /* */ }
  }

  const criticalZones = zones.filter((z) => z.status === 'critical');
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold gradient-text">Staff Control Panel</h1>
          <p className="text-sm text-white/40 mt-1">Manage zones, predictions, and simulation</p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${simStatus?.running ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {simStatus?.running ? '● SIMULATION LIVE' : '○ PAUSED'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Critical Zones" value={criticalZones.length} icon={<span>🚨</span>} color="text-neon-red" />
        <StatCard label="Recommendations" value={recommendations.length} icon={<span>🤖</span>} color="text-neon-purple" />
        <StatCard label="Active Alerts" value={alerts.filter((a) => !a.resolved).length} icon={<span>🔔</span>} color="text-neon-orange" />
        <StatCard label="Utilization" value={`${summary?.overallUtilization ?? 0}%`} icon={<span>📊</span>} color="text-neon-cyan" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SimulationControls eventType={eventType} onChangeEvent={handleChangeEvent} onStart={handleStartSim} onStop={handleStopSim}
          zones={zones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}
          selectedZone={selectedZone ?? null} newOccupancy={newOccupancy} setNewOccupancy={setNewOccupancy}
          onUpdateOccupancy={handleUpdateOccupancy} />
        <RecommendationsList recommendations={recommendations} />
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">🚨 Active Alerts</h2>
          <AlertPanel alerts={alerts} onResolve={handleResolve} maxItems={6} />
          {criticalZones.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">⛔ Critical Zones</h2>
              {criticalZones.map((z) => <ZoneCard key={z.id} zone={z} compact />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimulationControls({ eventType, onChangeEvent, onStart, onStop, zones, selectedZoneId, setSelectedZoneId, selectedZone, newOccupancy, setNewOccupancy, onUpdateOccupancy }: {
  eventType: string; onChangeEvent: (t: string) => void; onStart: () => void; onStop: () => void;
  zones: { id: string; name: string; currentOccupancy: number; capacity: number }[];
  selectedZoneId: string | null; setSelectedZoneId: (id: string | null) => void;
  selectedZone: { currentOccupancy: number; capacity: number } | null;
  newOccupancy: string; setNewOccupancy: (v: string) => void; onUpdateOccupancy: () => void;
}) {
  return (
    <div className="space-y-4">
      <GlassPanel glow="cyan">
        <h2 className="text-sm font-semibold mb-3">⚡ Simulation Engine</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={onStart} className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all">▶ Start</button>
          <button onClick={onStop} className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">■ Stop</button>
        </div>
        <p className="text-xs text-white/40 mb-2">Event Scenario</p>
        <div className="grid grid-cols-2 gap-2">
          {['normal', 'match_start', 'halftime', 'match_end', 'emergency'].map((e) => (
            <button key={e} onClick={() => onChangeEvent(e)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium capitalize ${eventType === e ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-glass-light text-white/40 border border-transparent'}`}>
              {e.replace('_', ' ')}
            </button>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel>
        <h2 className="text-sm font-semibold mb-3">✏️ Update Occupancy</h2>
        <select value={selectedZoneId ?? ''} onChange={(e) => setSelectedZoneId(e.target.value)} className="glass-input text-sm mb-2">
          <option value="" className="bg-surface-primary">Select zone</option>
          {zones.map((z) => <option key={z.id} value={z.id} className="bg-surface-primary">{z.name} ({z.currentOccupancy}/{z.capacity})</option>)}
        </select>
        {selectedZone && <p className="text-xs text-white/30 mb-2">Current: {selectedZone.currentOccupancy} / Max: {selectedZone.capacity}</p>}
        <input type="number" value={newOccupancy} onChange={(e) => setNewOccupancy(e.target.value)} placeholder="New occupancy" className="glass-input text-sm mb-2" />
        <button onClick={onUpdateOccupancy} disabled={!selectedZoneId || !newOccupancy} className="w-full py-2 rounded-lg bg-astra-500/20 border border-astra-500/30 text-astra-400 text-sm font-semibold disabled:opacity-30">Update</button>
      </GlassPanel>
    </div>
  );
}

function RecommendationsList({ recommendations }: { recommendations: StaffRecommendation[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">🤖 AI Recommendations</h2>
      {recommendations.length === 0 ? (
        <GlassPanel className="text-center py-8"><p className="text-white/30 text-sm">✅ No actions needed</p></GlassPanel>
      ) : recommendations.map((rec, i) => (
        <GlassPanel key={i} className={rec.confidence > 0.85 ? 'border-neon-cyan/20' : ''}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold text-white/90 flex-1">{rec.action}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-2 ${rec.confidence > 0.85 ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-amber-500/20 text-amber-400'}`}>
              {Math.round(rec.confidence * 100)}%
            </span>
          </div>
          <p className="text-xs text-white/40">{rec.reason}</p>
          <div className="flex gap-1 mt-2">
            {rec.affectedZones.map((z) => <span key={z} className="px-2 py-0.5 rounded text-[10px] bg-glass-light text-white/40 font-mono">{z}</span>)}
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
