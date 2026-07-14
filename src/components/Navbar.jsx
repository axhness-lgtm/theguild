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
          <nav className="navbar-links font-tech flex items-center justify-end gap-1 sm:gap-3 md:gap-4 shrink-0">
            <button 
              type="button"
              style={{ backgroundColor: 'transparent', background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', cursor: 'pointer' }}
              className={`nav-link transition-all px-1.5 sm:px-3 py-1 text-xs sm:text-sm md:text-base tracking-wider md:tracking-widest font-black shrink-0 ${activeCategory === 'f1' ? 'text-red-500 scale-105' : 'text-gray-300 hover:text-white'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('f1');
              }}
            >
              <RollingText text="[ FORMULA 1 ]" />
            </button>
            <button 
              type="button"
              style={{ backgroundColor: 'transparent', background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none', cursor: 'pointer' }}
              className={`nav-link transition-all px-1.5 sm:px-3 py-1 text-xs sm:text-sm md:text-base tracking-wider md:tracking-widest font-black shrink-0 ${activeCategory === 'world_cup' ? 'text-red-500 scale-105' : 'text-gray-300 hover:text-white'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('world_cup');
              }}
            >
              <RollingText text="[ WORLD CUP ]" />
            </button>
          </nav>
        ) : activeView === 'booking' ? (
          <div className="navbar-admin-status font-tech flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="admin-tag border-emerald-500 text-emerald-400 bg-emerald-950/20 text-[10px] sm:text-xs px-2 py-1">LIVE TICKETING</span>
            <button 
              className="btn-return text-xs sm:text-sm px-2 py-1 shrink-0"
              onClick={() => setActiveView('public')}
            >
              <RollingText text="[ ← EXIT ]" stagger={false} />
            </button>
          </div>
        ) : (
          <div className="navbar-admin-status font-tech flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="admin-tag text-[10px] sm:text-xs px-2 py-1">CONTROL ROOM</span>
            <button 
              className="btn-return text-xs sm:text-sm px-2 py-1 shrink-0"
              onClick={() => setActiveView('public')}
            >
              <RollingText text="[ ← EXIT ]" stagger={false} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
