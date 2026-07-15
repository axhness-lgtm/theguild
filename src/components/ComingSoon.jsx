import React from 'react';
import './ComingSoon.css';

export default function ComingSoon({ onAdminAccess }) {
  return (
    <div className="coming-soon-root">
      {/* Background Atmosphere */}
      <div className="coming-soon-bg-grid" />
      <div className="coming-soon-bg-glow" />

      {/* Header Bar */}
      <header className="coming-soon-header">
        <div className="coming-soon-logo-wrap">
          <img 
            src="/logo.png" 
            alt="THE GUILD" 
            style={{ maxHeight: '52px', width: 'auto', objectFit: 'contain', display: 'block' }} 
          />
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="coming-soon-main">
        <div className="coming-soon-tag">
          // INOX AUDITORIUM 03 // VIZAG, AP //
        </div>

        <h1 className="coming-soon-headline">
          THE LIVE CINEMA & SPORTS CLUB <br />
          <span className="accent">COMING SOON</span>
        </h1>

        <p className="coming-soon-sub">
          We are currently preparing Vizag's premier stadium-seating screening experience for the upcoming FIFA World Cup Finals & Formula 1 Grand Prix. All reservations, ticketing pipelines, and unblockable sightline seat mappings are locked and actively tracked.
        </p>
      </main>

      {/* Footer Bar */}
      <footer className="coming-soon-footer" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <span>© {new Date().getFullYear()} THE GUILD VIZAG. ALL RIGHTS RESERVED. // DESIGNED FOR THE FANS</span>
        </div>
      </footer>
    </div>
  );
}
