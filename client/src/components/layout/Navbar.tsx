import { NavLink } from 'react-router-dom';
import { useZones } from '../../context/ZoneContext';

export function Navbar() {
  const { summary, alerts } = useZones();
  const criticalAlerts = alerts.filter((a) => a.type === 'critical' && !a.resolved);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-glass-border">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-astra-500 flex items-center justify-center shadow-glow">
              <span className="text-lg font-black text-white">A</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                <span className="gradient-text">AstraFlow</span>
                <span className="text-white/60 font-light ml-1">X</span>
              </h1>
              <p className="text-[10px] text-white/25 -mt-0.5 tracking-widest uppercase">Crowd Intelligence</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Dashboard
              </span>
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Live Map
              </span>
            </NavLink>
            <NavLink to="/navigate" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Navigate
              </span>
            </NavLink>
            <NavLink to="/ai" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                AI Chat
              </span>
            </NavLink>
            <NavLink to="/staff" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Staff Panel
              </span>
            </NavLink>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/50 font-medium">LIVE</span>
            </div>

            {/* Stadium utilization */}
            {summary && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border">
                <span className="text-xs text-white/40">Stadium</span>
                <span className={`text-xs font-bold font-mono ${
                  summary.overallUtilization > 80 ? 'text-red-400' :
                  summary.overallUtilization > 60 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {summary.overallUtilization}%
                </span>
              </div>
            )}

            {/* Alert badge */}
            {criticalAlerts.length > 0 && (
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center animate-pulse">
                  <span className="text-xs">🚨</span>
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                  {criticalAlerts.length}
                </span>
              </div>
            )}

            {/* Mobile menu */}
            <div className="md:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileMenu() {
  return (
    <div className="relative group">
      <button className="w-8 h-8 rounded-lg bg-glass-light border border-glass-border flex items-center justify-center">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-2 w-48 py-2 glass-panel opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
        <NavLink to="/" className="block px-4 py-2 text-sm hover:bg-glass-light">Dashboard</NavLink>
        <NavLink to="/map" className="block px-4 py-2 text-sm hover:bg-glass-light">Live Map</NavLink>
        <NavLink to="/navigate" className="block px-4 py-2 text-sm hover:bg-glass-light">Navigate</NavLink>
        <NavLink to="/ai" className="block px-4 py-2 text-sm hover:bg-glass-light">AI Chat</NavLink>
        <NavLink to="/staff" className="block px-4 py-2 text-sm hover:bg-glass-light">Staff Panel</NavLink>
      </div>
    </div>
  );
}
