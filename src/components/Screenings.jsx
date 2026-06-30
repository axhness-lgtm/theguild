import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Clock, MapPin } from 'lucide-react';
import { dataService } from '../services/dataService';
import './Screenings.css';

const F1Logo = ({ className }) => (
  <img src="/f1.png" alt="Formula 1" className={`brand-asset-img ${className || ''}`} />
);

const FIFALogo = ({ className }) => (
  <img src="/fifa.png" alt="FIFA" className={`brand-asset-img ${className || ''}`} />
);

export default function Screenings({ onSelectEvent }) {
  const [activeTab, setActiveTab] = useState('f1');
  const allScreenings = dataService.getScreenings();
  
  const filteredScreenings = allScreenings.filter(item => item.category === activeTab);
  const f1Count = allScreenings.filter(item => item.category === 'f1').length;
  const footballCount = allScreenings.filter(item => item.category === 'football').length;

  return (
    <section id="screenings" className="screenings-section">
      <div className="grid-container screenings-container">
        
        {/* Section Header & Tab Controls */}
        <div className="screenings-top-bar">
          <div className="screenings-title-group">
            <span className="section-index font-tech">02 // CURATED CALENDAR</span>
            <h2 className="section-title font-editorial">UPCOMING SCREENINGS</h2>
          </div>

          <div className="category-tabs font-tech">
            <button 
              className={`tab-btn tab-f1 ${activeTab === 'f1' ? 'active-f1' : ''}`}
              onClick={() => setActiveTab('f1')}
            >
              <div className="tab-brand-row">
                <F1Logo className="tab-logo-img" />
              </div>
              <span className="tab-count">{f1Count} EVENT LISTED</span>
            </button>
            
            <button 
              className={`tab-btn tab-football ${activeTab === 'football' ? 'active-football' : ''}`}
              onClick={() => setActiveTab('football')}
            >
              <div className="tab-brand-row">
                <FIFALogo className="fifa-tab-logo" />
              </div>
              <span className="tab-count">{footballCount} EVENTS LISTED</span>
            </button>
          </div>
        </div>

        {/* Category Description Banner with transition state color accent */}
        <div className={`tab-banner font-tech banner-${activeTab}`}>
          <div className="banner-text">
            {activeTab === 'f1' ? (
              <span className="banner-accent-f1">// F1 RACING: HIGH-OCTANE LIVE TELEMETRY & SILVERSTONE ROOFTOP GATHERINGS</span>
            ) : (
              <span className="banner-accent-football">// FOOTBALL: FIFA WORLD CUP KNOCKOUTS, DERBIES & MIDNIGHT CHANTS</span>
            )}
          </div>
          <div className="banner-status">
            <span>NO TICKETS YET — REGISTER INTEREST TO UNLOCK INVITES</span>
          </div>
        </div>

        {/* Screening Cards Grid */}
        <div className="screenings-grid">
          {filteredScreenings.map((event) => {
            const isF1 = event.category === 'f1';
            return (
              <article key={event.id} className={`screening-card card-${event.category}`}>
                <div className="card-top-row">
                  <span className="event-competition font-tech">
                    {isF1 ? <F1Logo className="card-logo-img" /> : <FIFALogo className="fifa-card-logo" />}
                    <span className="comp-text">{event.competition}</span>
                  </span>

                  <span className={`badge-status ${event.isLive ? (isF1 ? 'badge-live-f1' : 'badge-live-fb') : ''}`}>
                    {event.status}
                  </span>
                </div>

                <div className="card-main">
                  <h3 className="event-name font-editorial">{event.name}</h3>

                  <div className="event-metadata font-tech">
                    <div className="meta-row">
                      <Calendar size={14} className="meta-icon" />
                      <span>{event.date}</span>
                    </div>
                    <div className="meta-row">
                      <Clock size={14} className="meta-icon" />
                      <span>{event.time}</span>
                    </div>
                    <div className="meta-row venue-row">
                      <MapPin size={14} className="meta-icon" />
                      <span>{event.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className={`btn-brutalist card-btn btn-${event.category}`}
                    onClick={() => onSelectEvent(event)}
                  >
                    <span>I'm Interested</span>
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
