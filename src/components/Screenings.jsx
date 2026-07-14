import React, { useState } from 'react';
import { ArrowUpRight, Calendar, Clock, MapPin, Ticket } from 'lucide-react';
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

export default function Screenings({ onSelectEvent, activeCategory = 'f1', setActiveCategory, setActiveView }) {
  const allScreenings = dataService.getScreenings();
  
  const filteredScreenings = allScreenings.filter(item => item.category === activeCategory);
  const f1Count = allScreenings.filter(item => item.category === 'f1').length;
  const footballCount = allScreenings.filter(item => item.category === 'world_cup').length;

  const handleCardClick = (event) => {
    if (event.category === 'world_cup') {
      if (setActiveView) {
        setActiveView('booking');
      } else if (onSelectEvent) {
        onSelectEvent(event);
      }
    } else if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  return (
    <section id="screenings" className="screenings-section" data-scroll-section>
      <div className="grid-container screenings-container">
        
        {/* Section Header & Tab Controls */}
        <div className="screenings-top-bar flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div className="screenings-title-group">
            <LineReveal delay={0.1} className="section-index font-tech text-red-500">02 // CURATED CALENDAR</LineReveal>
            <LineReveal delay={0.2} className="section-title font-impact text-4xl md:text-5xl text-white" as="h2">UPCOMING SCREENINGS</LineReveal>
          </div>

          <RevealItem delay={0.3} className="category-tabs font-tech flex flex-wrap gap-3">
            <button 
              type="button"
              className={`tab-btn tab-f1 transition-all ${activeCategory === 'f1' ? 'active-f1 bg-red-600 border-red-500 text-white font-bold' : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:border-gray-700'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('f1');
              }}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '4px', border: '1px solid' }}
            >
              <div className="tab-brand-row flex items-center gap-2">
                <F1Logo className="tab-logo-img h-4 w-auto object-contain" />
                <span>FORMULA 1 RACES</span>
              </div>
              <span className="tab-count text-[11px] opacity-80 block mt-1">{f1Count} NEXT RACE OPTION</span>
            </button>
            
            <button 
              type="button"
              className={`tab-btn tab-football transition-all ${activeCategory === 'world_cup' ? 'active-football bg-red-600 border-red-500 text-white font-bold' : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:border-gray-700'}`}
              onClick={() => {
                if (setActiveCategory) setActiveCategory('world_cup');
              }}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '4px', border: '1px solid' }}
            >
              <div className="tab-brand-row flex items-center gap-2">
                <FIFALogo className="fifa-tab-logo h-4 w-auto object-contain" />
                <span>WORLD CUP MATCHES</span>
              </div>
              <span className="tab-count text-[11px] opacity-80 block mt-1">{footballCount} GRAND FINALE OPTION</span>
            </button>
          </RevealItem>
        </div>

        {/* Category Description Banner */}
        <div className={`tab-banner font-tech banner-${activeCategory} bg-zinc-950 border border-zinc-800 p-4 rounded-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-3`}>
          <LineReveal delay={0.25} className="banner-text text-xs md:text-sm text-gray-300">
            {activeCategory === 'f1' ? (
              <span className="banner-accent-f1 font-bold text-white">// FORMULA 1 NEXT RACE: BELGIAN GRAND PRIX AT BREW N CUE CAFE (40 SEATS MAX) — ₹199</span>
            ) : (
              <span className="font-bold text-white">// FIFA WORLD CUP FINAL 2026: <span className="text-yellow-400 font-impact tracking-wider">PVR INOX, BEACH ROAD, VIZAG</span> — <span className="text-emerald-400 font-impact text-base">₹499/-</span> (SEATING + SNACK + BEVERAGE INCLUDED)</span>
            )}
          </LineReveal>
          <LineReveal delay={0.35} className="banner-status text-xs px-3 py-1 bg-red-950 text-red-300 border border-red-800 rounded font-bold uppercase tracking-wider">
            <span>{activeCategory === 'world_cup' ? 'CHOOSE SEATS & VERIFY UTR' : 'REGISTER DETAILS & PAY VIA UPI QR'}</span>
          </LineReveal>
        </div>

        {/* Screening Cards Grid */}
        <div className="screenings-grid">
          {filteredScreenings.map((event, idx) => {
            const isF1 = event.category === 'f1';
            const isWorldCup = event.category === 'world_cup';
            return (
              <RevealItem 
                key={event.id} 
                delay={(idx % 4) * 0.12}
                className={`screening-card card-${event.category} scroll-reveal-card transition-transform hover:-translate-y-1.5`}
              >
                {/* Background outline index watermark */}
                <div className="card-watermark font-impact font-outline" aria-hidden="true">
                  0{idx + 1}
                </div>

                <div className="card-content-wrap flex flex-col justify-between h-full p-6">
                  <div>
                    <div className="card-top-row flex justify-between items-center mb-4">
                      <span className="event-competition font-tech text-xs text-gray-400 flex items-center gap-2">
                        {isF1 ? <F1Logo className="card-logo-img h-3.5 w-auto" /> : <FIFALogo className="fifa-card-logo h-3.5 w-auto" />}
                        <span className="comp-text font-bold text-white">{event.competition}</span>
                      </span>

                      <span className={`badge-status text-[11px] font-tech font-bold px-2 py-0.5 rounded border ${
                        event.isLive 
                          ? 'bg-red-950 text-red-400 border-red-700 animate-pulse' 
                          : 'bg-zinc-900 text-gray-300 border-zinc-700'
                      }`}>
                        {event.status}
                      </span>
                    </div>

                    <div className="card-main">
                      <LineReveal delay={0.15} className="event-name font-impact text-2xl md:text-3xl text-white mb-3" as="h3">{event.name}</LineReveal>

                      <div className="event-metadata font-tech text-xs text-gray-300 space-y-2">
                        <LineReveal delay={0.22} className="meta-row flex items-center gap-2">
                          <Calendar size={14} className="text-red-500 flex-shrink-0" />
                          <span>{event.date} // {event.time}</span>
                        </LineReveal>
                        <LineReveal delay={0.34} className="meta-row venue-row flex items-center gap-2">
                          <MapPin size={14} className="text-red-500 flex-shrink-0" />
                          <span className="truncate">{event.venue} // {event.capacity}</span>
                        </LineReveal>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions pt-5 mt-5 border-t border-zinc-800 flex items-center justify-between">
                    <div className="font-tech">
                      <span className="text-[11px] text-gray-400 block">PASS PRICE:</span>
                      <span className="text-lg font-bold text-emerald-400">₹{event.ticket_price || (isWorldCup ? 499 : 199)}</span>
                      {isWorldCup && <span className="text-[10px] text-gray-400 block font-normal leading-tight">+ SNACK & BEVERAGE INCLUDED</span>}
                    </div>

                    <button 
                      type="button"
                      className="btn-brutalist card-btn py-2.5 px-4 text-xs font-tech font-bold flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white border-red-500"
                      onClick={() => handleCardClick(event)}
                    >
                      <RollingText text={isWorldCup ? "CHOOSE SEATS & BOOK" : "REGISTER & PAY"} stagger={true} />
                      {isWorldCup ? <Ticket size={16} /> : <ArrowUpRight size={16} />}
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
