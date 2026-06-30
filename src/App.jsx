import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Screenings from './components/Screenings';
import WhyJoin from './components/WhyJoin';
import ComingSoon from './components/ComingSoon';
import Footer from './components/Footer';
import EventModal from './components/EventModal';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

export default function App() {
  const [activeView, setActiveView] = useState('public');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setActiveView('public');
  };

  return (
    <div className="app-root">
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />

      {activeView === 'public' ? (
        <main>
          <Hero />
          <About />
          <Screenings onSelectEvent={(ev) => setSelectedEvent(ev)} />
          <WhyJoin />
          <ComingSoon />
          <Footer setActiveView={setActiveView} />
        </main>
      ) : (
        <main>
          {!isAdminLoggedIn ? (
            <AdminLogin 
              onLogin={() => setIsAdminLoggedIn(true)} 
              onExit={() => setActiveView('public')} 
            />
          ) : (
            <AdminDashboard onLogout={handleAdminLogout} />
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
