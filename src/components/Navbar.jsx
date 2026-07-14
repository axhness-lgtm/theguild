import React from 'react';
import RollingText from './RollingText';
import './Navbar.css';

export default function Navbar({ activeView, setActiveView, activeCategory = 'f1', setActiveCategory }) {
  return (
    <header className="navbar-wrapper is-revealed" data-scroll-section>
      <div className="grid-container navbar-container">
        <div 
          className="navbar-brand swipe-reveal-right flex items-center justify-start" 
          onClick={() => {
            setActiveView('public');
            if (setActiveCategory) setActiveCategory('world_cup');
          }}
          role="button"
          tabIndex={0}
        >
          <img src="/logo.png" alt="THE GUILD" className="brand-logo-img" />
        </div>

        {activeView === 'public' ? (
          <nav className="navbar-links font-tech flex items-center justify-center gap-4">
            <button 
              type="button"
              style={{ backgroundColor: 'transparent', background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1.05rem', letterSpacing: '0.15em', fontWeight: '800' }}
              className={`nav-link transition-all ${activeCategory === 'f1' ? 'text-red-500 font-black scale-105' : 'text-gray-300 hover:text-white'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('f1');
              }}
            >
              <RollingText text="[ FORMULA 1 ]" />
            </button>
            <button 
              type="button"
              style={{ backgroundColor: 'transparent', background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1.05rem', letterSpacing: '0.15em', fontWeight: '800' }}
              className={`nav-link transition-all ${activeCategory === 'world_cup' ? 'text-red-500 font-black scale-105' : 'text-gray-300 hover:text-white'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('world_cup');
              }}
            >
              <RollingText text="[ WORLD CUP ]" />
            </button>
          </nav>
        ) : activeView === 'booking' ? (
          <div className="navbar-admin-status font-tech">
            <span className="admin-tag border-emerald-500 text-emerald-400 bg-emerald-950/20">LIVE INOX 147-SEAT TICKETING</span>
            <button 
              className="btn-return"
              onClick={() => setActiveView('public')}
            >
              <RollingText text="[ ← RETURN TO PUBLIC SITE ]" stagger={false} />
            </button>
          </div>
        ) : (
          <div className="navbar-admin-status font-tech">
            <span className="admin-tag">FOUNDER CONTROL ROOM</span>
            <button 
              className="btn-return"
              onClick={() => setActiveView('public')}
            >
              <RollingText text="[ ← RETURN TO PUBLIC SITE ]" stagger={false} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
