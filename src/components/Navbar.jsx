import React from 'react';
import './Navbar.css';

export default function Navbar({ activeView, setActiveView }) {
  return (
    <header className="navbar-wrapper">
      <div className="grid-container navbar-container">
        <div 
          className="navbar-brand" 
          onClick={() => setActiveView('public')}
          role="button"
          tabIndex={0}
        >
          <span className="brand-title font-editorial">THE GUILD</span>
          <span className="brand-meta font-tech">// VISAKHAPATNAM — MVP 1.0</span>
        </div>

        {activeView === 'public' ? (
          <nav className="navbar-links font-tech">
            <a href="#about" className="nav-link">01. ETHOS</a>
            <a href="#screenings" className="nav-link">02. SCREENINGS</a>
            <a href="#why-join" className="nav-link">03. PILLARS</a>
            <a href="#coming-soon" className="nav-link">04. ROADMAP</a>
          </nav>
        ) : (
          <div className="navbar-admin-status font-tech">
            <span className="admin-tag">FOUNDER CONTROL ROOM</span>
            <button 
              className="btn-return"
              onClick={() => setActiveView('public')}
            >
              [ ← RETURN TO PUBLIC SITE ]
            </button>
          </div>
        )}

        <div className="navbar-action">
          <button 
            className="admin-toggle-btn font-tech"
            onClick={() => setActiveView(activeView === 'public' ? 'admin' : 'public')}
            title="Toggle Founder Portal"
          >
            {activeView === 'public' ? 'FOUNDER // LOGIN' : 'EXIT // PORTAL'}
          </button>
        </div>
      </div>
    </header>
  );
}
