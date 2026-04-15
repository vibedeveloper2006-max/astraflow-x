import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ZoneProvider } from './context/ZoneContext';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { LiveMap } from './pages/LiveMap';
import { Navigation } from './pages/Navigation';
import { AIChat } from './pages/AIChat';
import { StaffDashboard } from './pages/StaffDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <ZoneProvider>
        {/* Skip to main content link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
                     focus:px-4 focus:py-2 focus:bg-neon-cyan focus:text-black focus:font-bold
                     focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>

        <div className="min-h-screen bg-surface-primary bg-grid">
          <div className="fixed inset-0 bg-radial-glow pointer-events-none" aria-hidden="true" />
          <Navbar />
          <main
            id="main-content"
            className="relative z-10 pt-20 pb-8 px-4 sm:px-6 max-w-[1600px] mx-auto"
            tabIndex={-1}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<LiveMap />} />
              <Route path="/navigate" element={<Navigation />} />
              <Route path="/ai" element={<AIChat />} />
              <Route path="/staff" element={<StaffDashboard />} />
            </Routes>
          </main>
        </div>
      </ZoneProvider>
    </BrowserRouter>
  );
}
