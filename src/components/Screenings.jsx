import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Clock, MapPin } from 'lucide-react';
import { dataService } from '../services/dataService';
import RollingText from './RollingText';
import LineReveal, { RevealItem } from './LineReveal';
import './Screenings.css';

const F1Logo = ({ className }) => (
  <img src="/f1.png" alt="Formula 1" className={`brand-asset-img ${className || ''}`} />
);

const FIFALogo = ({ className }) => (
  <img src="/fifa.png" alt="FIFA" className={`brand-asset-img ${className || ''}`} />
);

export default function Screenings({ onSelectEvent, activeCategory = 'f1', setActiveCategory }) {
  const allScreenings = dataService.getScreenings();
  
  const filteredScreenings = allScreenings.filter(item => item.category === activeCategory);
  const f1Count = allScreenings.filter(item => item.category === 'f1').length;
  const footballCount = allScreenings.filter(item => item.category === 'world_cup').length;

  return (
    <section id="screenings" className="screenings-section" data-scroll-section>
      <div className="grid-container screenings-container">
        
        {/* Section Header & Tab Controls */}
        <div className="screenings-top-bar">
          <div className="screenings-title-group">
            <LineReveal delay={0.1} className="section-index font-tech">02 // CURATED CALENDAR</LineReveal>
            <LineReveal delay={0.2} className="section-title font-impact" as="h2">UPCOMING SCREENINGS</LineReveal>
          </div>

          <RevealItem delay={0.3} className="category-tabs font-tech">
            <button 
              className={`tab-btn tab-f1 ${activeCategory === 'f1' ? 'active-f1' : ''}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('f1');
              }}
            >
              <div className="tab-brand-row">
                <F1Logo className="tab-logo-img" />
              </div>
              <span className="tab-count"><RollingText text={`${f1Count} EVENT LISTED`} stagger={true} /></span>
            </button>
            
            <button 
              className={`tab-btn tab-football ${activeCategory === 'world_cup' ? 'active-football' : ''}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('world_cup');
              }}
            >
              <div className="tab-brand-row">
                <FIFALogo className="fifa-tab-logo" />
              </div>
              <span className="tab-count"><RollingText text={`${footballCount} EVENTS LISTED`} stagger={true} /></span>
            </button>
          </RevealItem>
        </div>

        {/* Category Description Banner with transition state color accent */}
        <div className={`tab-banner font-tech banner-${activeCategory}`}>
          <LineReveal delay={0.25} className="banner-text">
            {activeCategory === 'f1' ? (
              <span className="banner-accent-f1">// FORMULA 1: BELGIAN GRAND PRIX AT BREW N CUE CAFE (40 SEATS MAX) — ₹199</span>
            ) : (
              <span className="banner-accent-football">// FIFA WORLD CUP SEMI-FINALS AT BREW N CUE (40 SEATS MAX) — SINGLE ₹199 / BOTH MATCHES ₹349</span>
            )}
          </LineReveal>
          <LineReveal delay={0.35} className="banner-status">
            <span>LIMITED TO 40 SEATS — REGISTER & GIVE UTR POST PAYMENT</span>
          </LineReveal>
        </div>

        {/* Screening Cards Grid */}
        <div className="screenings-grid">
          {filteredScreenings.map((event, idx) => {
            const isF1 = event.category === 'f1';
            return (
              <RevealItem 
                key={event.id} 
                delay={(idx % 4) * 0.12}
                className={`screening-card card-${event.category} scroll-reveal-card`}
              >
                {/* Background outline index watermark inspired by Wilder/Messi posters */}
                <div className="card-watermark font-impact font-outline" aria-hidden="true">
                  0{idx + 1}
                </div>

                <div className="card-content-wrap">
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
                    <LineReveal delay={0.15} className="event-name font-impact" as="h3">{event.name}</LineReveal>

                    <div className="event-metadata font-tech">
                      <LineReveal delay={0.22} className="meta-row">
                        <Calendar size={14} className="meta-icon" />
                        <span>{event.date} // {event.time}</span>
                      </LineReveal>
                      <LineReveal delay={0.34} className="meta-row venue-row">
                        <MapPin size={14} className="meta-icon" />
                        <span>{event.venue} // {event.capacity}</span>
                      </LineReveal>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      className={`btn-brutalist card-btn btn-${event.category}`}
                      onClick={() => onSelectEvent(event)}
                    >
                      <RollingText text="REGISTER & BOOK" stagger={true} />
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </div>

      </div>
    </section>
  );
}
