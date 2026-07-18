import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Screenings from './components/Screenings';
import Footer from './components/Footer';
import EventModal from './components/EventModal';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import LoadingScreen from './components/LoadingScreen';
import './index.css';
import './components/ScrollReveal.css';
import './components/LineReveal.css';
import { useScrollReveal } from './hooks/useScrollReveal';

export default function App() {
  useScrollReveal();
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('public');
  const [activeCategory, setActiveCategory] = useState('football');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/founder' || path === '/admin') {
        setActiveView('admin');
      } else if (path === '/formula1' || path === '/f1') {
        setActiveCategory('f1');
        setActiveView('public');
      } else {
        setActiveCategory('football');
        setActiveView('public');
        if (path === '/' || path === '') {
          window.history.replaceState({}, '', '/football');
        }
      }
    };
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  const handleSetCategory = (cat) => {
    setActiveCategory(cat);
    if (cat === 'f1') {
      if (window.location.pathname.toLowerCase() !== '/formula1') {
        window.history.pushState({}, '', '/formula1');
      }
    } else if (cat === 'football') {
      if (window.location.pathname.toLowerCase() !== '/football') {
        window.history.pushState({}, '', '/football');
      }
    }
  };

  const handleSetView = (view) => {
    if (view === 'public') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/founder' || path === '/admin' || path === '/') {
        const targetUrl = activeCategory === 'f1' ? '/formula1' : '/football';
        window.history.pushState({}, '', targetUrl);
      }
    } else if (view === 'admin') {
      const path = window.location.pathname.toLowerCase();
      if (path !== '/founder' && path !== '/admin') {
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
        setActiveCategory={handleSetCategory}
      />

      {activeView === 'public' && (
        <main>
          <Hero 
            activeCategory={activeCategory} 
            setActiveView={handleSetView} 
            onSelectEvent={(ev) => setSelectedEvent(ev)} 
          />
          <Marquee />
          <Screenings 
            activeCategory={activeCategory} 
            setActiveCategory={handleSetCategory} 
            setActiveView={handleSetView}
            onSelectEvent={(ev) => setSelectedEvent(ev)} 
          />
          <Footer setActiveView={handleSetView} />
        </main>
      )}

      {activeView === 'admin' && (
        <main>
          {!isAdminLoggedIn ? (
            <AdminLogin 
              onLogin={() => setIsAdminLoggedIn(true)} 
              onExit={() => handleSetView('public')} 
            />
          ) : (
            <div className="admin-wrapper-inner">
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
