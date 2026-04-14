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
        <div className="min-h-screen bg-surface-primary bg-grid">
          <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
          <Navbar />
          <main className="relative z-10 pt-20 pb-8 px-4 sm:px-6 max-w-[1600px] mx-auto">
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
