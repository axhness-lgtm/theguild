import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Screenings from './components/Screenings';
import Footer from './components/Footer';
import EventModal from './components/EventModal';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import BookingFlow from './components/booking/BookingFlow';
import AdminTicketingPortal from './components/admin/AdminTicketingPortal';
import LoadingScreen from './components/LoadingScreen';
import './index.css';
import './components/ScrollReveal.css';
import './components/LineReveal.css';
import { useScrollReveal } from './hooks/useScrollReveal';

export default function App() {
  useScrollReveal();
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('public');
  const [activeCategory, setActiveCategory] = useState('f1');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const checkRoute = () => {
      if (window.location.pathname.toLowerCase() === '/founder') {
        setActiveView('admin-ticketing');
      }
    };
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  const handleSetView = (view) => {
    if (view === 'public' && window.location.pathname.toLowerCase() === '/founder') {
      window.history.pushState({}, '', '/');
    } else if (view === 'admin' || view === 'admin-ticketing') {
      if (window.location.pathname.toLowerCase() !== '/founder') {
        window.history.pushState({}, '', '/founder');
      }
    }
    setActiveView(view);
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    handleSetView('public');
  };

  return (
    <div className="app-root">
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      
      <Navbar 
        activeView={activeView} 
        setActiveView={handleSetView}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {activeView === 'public' && (
        <main>
          <Hero activeCategory={activeCategory} setActiveView={handleSetView} />
          <Marquee />
          <Screenings 
            activeCategory={activeCategory} 
            setActiveCategory={setActiveCategory} 
            onSelectEvent={(ev) => setSelectedEvent(ev)} 
          />
          <Footer setActiveView={handleSetView} />
        </main>
      )}

      {activeView === 'booking' && (
        <main>
          <BookingFlow onReturnHome={() => handleSetView('public')} />
        </main>
      )}

      {(activeView === 'admin' || activeView === 'admin-ticketing') && (
        <main>
          {!isAdminLoggedIn ? (
            <AdminLogin 
              onLogin={() => setIsAdminLoggedIn(true)} 
              onExit={() => handleSetView('public')} 
            />
          ) : activeView === 'admin-ticketing' ? (
            <AdminTicketingPortal onSwitchToSignups={() => handleSetView('admin')} />
          ) : (
            <div className="admin-wrapper-inner">
              <div className="grid-container pt-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4 flex justify-between items-center font-tech text-xs">
                  <div>
                    <span className="text-gray-400">// SWITCH OPERATIONAL PORTALS: </span>
                    <strong className="text-white ml-2">GENERAL INTEREST SIGNUPS (CURRENT)</strong>
                  </div>
                  <button 
                    onClick={() => handleSetView('admin-ticketing')}
                    className="btn-brutalist py-2 px-4 text-xs"
                  >
                    ENTER INOX TICKETING CONTROL ROOM (147 SEATS) →
                  </button>
                </div>
              </div>
              <AdminDashboard onLogout={handleAdminLogout} />
            </div>
          )}
        </main>
      )}

      {/* Brutalist Interaction Modal */}
      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
}
