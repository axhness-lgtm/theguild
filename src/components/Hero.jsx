import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import RollingText from './RollingText';
import LineReveal, { RevealItem } from './LineReveal';
import { UPCOMING_SCREENINGS } from '../services/dataService';
import './Hero.css';

export default function Hero({ activeCategory = 'f1', setActiveView, onSelectEvent }) {
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);

  const leftBaseImg = activeCategory === 'football' ? '/6.png' : '/2.png';
  const leftHoverImg = activeCategory === 'football' ? '/7.png' : '/4.png';
  const rightBaseImg = activeCategory === 'football' ? '/8.png' : '/3.png';
  const rightHoverImg = activeCategory === 'football' ? '/9.png' : '/5.png';

  const scrollToScreenings = (e) => {
    e.preventDefault();
    const elem = document.getElementById('screenings');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCtaClick = (e) => {
    e.preventDefault();
    scrollToScreenings(e);
  };

  return (
    <section className="hero-section split-hero-section" data-scroll-section>
      <div className="split-hero-container">
        
        {/* Left Side: 6.png -> 7.png on hover for Football, or 2.png -> 4.png for F1 */}
        <div 
          className={`hero-side hero-side-left ${hoverLeft ? 'is-hovered' : ''}`}
          data-scroll-section
          onMouseEnter={() => setHoverLeft(true)}
          onMouseLeave={() => setHoverLeft(false)}
        >
          <img src={leftBaseImg} alt={`${activeCategory === 'football' ? 'Football' : 'Formula 1'} Atmosphere Left`} className="side-img base-img" />
          <img src={leftHoverImg} alt={`${activeCategory === 'football' ? 'Football' : 'Formula 1'} Atmosphere Left Active`} className={`side-img hover-img ${hoverLeft ? 'active' : ''}`} />
        </div>

        {/* Right Side: 8.png -> 9.png on hover for Football, or 3.png -> 5.png for F1 */}
        <div 
          className={`hero-side hero-side-right ${hoverRight ? 'is-hovered' : ''}`}
          data-scroll-section
          onMouseEnter={() => setHoverRight(true)}
          onMouseLeave={() => setHoverRight(false)}
        >
          <img src={rightBaseImg} alt={`${activeCategory === 'football' ? 'Football' : 'Formula 1'} Atmosphere Right`} className="side-img base-img" />
          <img src={rightHoverImg} alt={`${activeCategory === 'football' ? 'Football' : 'Formula 1'} Atmosphere Right Active`} className={`side-img hover-img ${hoverRight ? 'active' : ''}`} />
        </div>

        {/* Central Floating Elements: F1/Football Logo & Compact Sporty CTA */}
        <div className="hero-center-overlay-group">
          <div className="hero-f1-logo-wrap animate-fade-in is-revealed reveal-active">
            {activeCategory === 'football' ? (
              <img src="/fifa.png" alt="Football" className="hero-center-f1-logo" />
            ) : (
              <img src="/f1.png" alt="Formula 1" className="hero-center-f1-logo" />
            )}
          </div>
          
          <div className="hero-cta-wrapper animate-fade-in is-revealed reveal-active flex flex-col items-center">
            <button 
              type="button"
              className="center-cta-btn font-tech"
              onClick={handleCtaClick}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RollingText 
                text={activeCategory === 'football' ? "[ BROWSE MATCHES ]" : "[ NEXT RACE ]"} 
                stagger={true} 
              />
              <ArrowDown size={14} className="cta-arrow" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
