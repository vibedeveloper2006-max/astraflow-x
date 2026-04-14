import { useState } from 'react';
import { useZones } from '../context/ZoneContext';
import { GlassPanel } from '../components/ui/GlassPanel';
import { NavigationResult } from '../types';
import { findRoute, findShortestQueue } from '../services/api';

export function Navigation() {
  const { zones } = useZones();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [result, setResult] = useState<NavigationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueType, setQueueType] = useState('food_court');
  const [queueResult, setQueueResult] = useState<{ name: string; wait: number } | null>(null);

  async function handleFindRoute() {
    if (!source || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const data = await findRoute(source, destination);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find route');
    } finally {
      setLoading(false);
    }
  }

  async function handleFindQueue() {
    try {
      const data = await findShortestQueue(queueType);
      setQueueResult({ name: data.recommended.name, wait: data.recommended.waitTime });
    } catch {
      /* ignore */
    }
  }

  const getZoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold gradient-text">Smart Navigation</h1>
        <p className="text-sm text-white/40 mt-1">AI-powered routing with real-time & predictive congestion awareness</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Route Finder */}
        <GlassPanel glow="cyan">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Route Finder
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">From</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="glass-input cursor-pointer">
                <option value="" className="bg-surface-primary">Select start zone</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id} className="bg-surface-primary">{z.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-glass-light border border-glass-border flex items-center justify-center">
                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">To</label>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className="glass-input cursor-pointer">
                <option value="" className="bg-surface-primary">Select destination</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id} className="bg-surface-primary">{z.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFindRoute}
              disabled={!source || !destination || loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan/20 to-astra-500/20 border border-neon-cyan/30
                         text-neon-cyan font-semibold text-sm hover:from-neon-cyan/30 hover:to-astra-500/30
                         transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                  Finding route...
                </span>
              ) : 'Find Optimal Route'}
            </button>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        </GlassPanel>

        {/* Quick Queue Finder */}
        <GlassPanel glow="purple">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-neon-purple">⏱️</span>
            Shortest Queue Finder
          </h2>

          <div className="space-y-3">
            <p className="text-sm text-white/40">Find the zone with the shortest wait time by type.</p>

            <div className="grid grid-cols-2 gap-2">
              {['food_court', 'restroom', 'entry_gate', 'parking'].map((type) => (
                <button
                  key={type}
                  onClick={() => { setQueueType(type); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                    queueType === type
                      ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                      : 'bg-glass-light text-white/50 border border-transparent hover:border-glass-border'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={handleFindQueue}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border border-neon-purple/30
                         text-neon-purple font-semibold text-sm hover:from-neon-purple/30 hover:to-neon-pink/30
                         transition-all duration-300 shadow-glow-purple"
            >
              Find Shortest Queue
            </button>

            {queueResult && (
              <div className="p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20 animate-scale-in">
                <p className="text-sm text-white/70">🎯 Recommended:</p>
                <p className="text-lg font-bold text-neon-purple mt-1">{queueResult.name}</p>
                <p className="text-sm text-white/40 mt-1">Wait time: <span className="font-mono text-neon-green">{queueResult.wait} min</span></p>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Route Result */}
      {result && (
        <div className="grid lg:grid-cols-2 gap-6 animate-slide-up">
          <RoutePanel
            title="🚀 Fastest Route Now"
            route={result.fastestNow}
            getZoneName={getZoneName}
            color="cyan"
          />
          <RoutePanel
            title="🔮 Best Predicted Route"
            route={result.fastestPredicted}
            getZoneName={getZoneName}
            color="purple"
          />

          {/* AI Recommendation */}
          <div className="lg:col-span-2">
            <GlassPanel className="border-astra-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/70 mb-1">AI Recommendation</h3>
                  <p className="text-sm text-white/90 leading-relaxed">{result.recommendation}</p>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutePanel({
  title,
  route,
  getZoneName,
  color,
}: {
  title: string;
  route: { path: string[]; totalWeight: number; estimatedTime: number; congestionLevel: number };
  getZoneName: (id: string) => string;
  color: 'cyan' | 'purple';
}) {
  const accent = color === 'cyan' ? 'neon-cyan' : 'neon-purple';

  return (
    <GlassPanel>
      <h3 className="text-sm font-semibold mb-4">{title}</h3>

      {/* Route Path */}
      <div className="space-y-2 mb-4">
        {route.path.map((nodeId, idx) => (
          <div key={nodeId} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full border-2 border-${accent}/50 flex items-center justify-center`}>
              <span className={`text-[10px] font-bold text-${accent}`}>{idx + 1}</span>
            </div>
            <span className="text-sm text-white/70">{getZoneName(nodeId)}</span>
            {idx < route.path.length - 1 && (
              <div className={`flex-1 h-px bg-${accent}/20`} />
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Time</p>
          <p className={`text-sm font-bold font-mono text-${accent}`}>{route.estimatedTime}m</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Weight</p>
          <p className="text-sm font-bold font-mono text-white/70">{route.totalWeight}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-glass-light">
          <p className="text-xs text-white/40">Congestion</p>
          <p className={`text-sm font-bold font-mono ${
            route.congestionLevel > 0.7 ? 'text-red-400' :
            route.congestionLevel > 0.5 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {Math.round(route.congestionLevel * 100)}%
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
