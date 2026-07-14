import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import RollingText from './RollingText';
import LineReveal, { RevealItem } from './LineReveal';
import { UPCOMING_SCREENINGS } from '../services/dataService';
import './Hero.css';

export default function Hero({ activeCategory = 'f1', setActiveView, onSelectEvent }) {
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);

  const scrollToScreenings = (e) => {
    e.preventDefault();
    const elem = document.getElementById('screenings');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCtaClick = (e) => {
    e.preventDefault();
    if (activeCategory === 'world_cup') {
      if (setActiveView) {
        setActiveView('booking');
      } else {
        scrollToScreenings(e);
      }
    } else if (onSelectEvent) {
      const f1Option = UPCOMING_SCREENINGS.find(item => item.category === 'f1');
      if (f1Option) {
        onSelectEvent(f1Option);
      } else {
        scrollToScreenings(e);
      }
    } else {
      scrollToScreenings(e);
    }
  };

  return (
    <section className="hero-section split-hero-section" data-scroll-section>
      <div className="split-hero-container">
        
        {/* Left Side: 2.png (683x768) -> 4.png on hover */}
        <div 
          className={`hero-side hero-side-left ${hoverLeft ? 'is-hovered' : ''}`}
          data-scroll-section
          onMouseEnter={() => setHoverLeft(true)}
          onMouseLeave={() => setHoverLeft(false)}
        >
          <img src="/2.png" alt="Formula 1 Atmosphere Left" className="side-img base-img" />
          <img src="/4.png" alt="Formula 1 Atmosphere Left Active" className={`side-img hover-img ${hoverLeft ? 'active' : ''}`} />
        </div>

        {/* Right Side: 3.png -> 5.png on hover */}
        <div 
          className={`hero-side hero-side-right ${hoverRight ? 'is-hovered' : ''}`}
          data-scroll-section
          onMouseEnter={() => setHoverRight(true)}
          onMouseLeave={() => setHoverRight(false)}
        >
          <img src="/3.png" alt="Formula 1 Atmosphere Right" className="side-img base-img" />
          <img src="/5.png" alt="Formula 1 Atmosphere Right Active" className={`side-img hover-img ${hoverRight ? 'active' : ''}`} />
        </div>

        {/* Central Floating Elements: F1/FIFA Logo & Compact Sporty CTA */}
        <div className="hero-center-overlay-group">
          <RevealItem delay={0.2} className="hero-f1-logo-wrap" data-scroll-section>
            {activeCategory === 'world_cup' ? (
              <img src="/fifa.png" alt="FIFA World Cup" className="hero-center-f1-logo" />
            ) : (
              <img src="/f1.png" alt="Formula 1" className="hero-center-f1-logo" />
            )}
          </RevealItem>
          
          <RevealItem delay={0.35} data-scroll-section>
            <button 
              type="button"
              className="center-cta-btn font-tech"
              onClick={handleCtaClick}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LineReveal inline={true} delay={0.45}>
                <RollingText 
                  text={activeCategory === 'world_cup' ? "[ BOOK TICKETS NOW ]" : "[ NEXT RACE ]"} 
                  stagger={true} 
                />
              </LineReveal>
              <ArrowDown size={14} className="cta-arrow" />
            </button>
          </RevealItem>
        </div>

      </div>
    </section>
  );
}
