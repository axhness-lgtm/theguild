import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import RollingText from './RollingText';
import './Hero.css';

export default function Hero({ activeCategory = 'f1', setActiveView }) {
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
      if (setActiveView) setActiveView('booking');
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
          onMouseEnter={() => setHoverLeft(true)}
          onMouseLeave={() => setHoverLeft(false)}
        >
          <img src="/2.png" alt="Formula 1 Atmosphere Left" className="side-img base-img" />
          <img src="/4.png" alt="Formula 1 Atmosphere Left Active" className={`side-img hover-img ${hoverLeft ? 'active' : ''}`} />
        </div>

        {/* Right Side: 3.png -> 5.png on hover */}
        <div 
          className={`hero-side hero-side-right ${hoverRight ? 'is-hovered' : ''}`}
          onMouseEnter={() => setHoverRight(true)}
          onMouseLeave={() => setHoverRight(false)}
        >
          <img src="/3.png" alt="Formula 1 Atmosphere Right" className="side-img base-img" />
          <img src="/5.png" alt="Formula 1 Atmosphere Right Active" className={`side-img hover-img ${hoverRight ? 'active' : ''}`} />
        </div>

        {/* Central Floating Elements: F1/FIFA Logo & Compact Sporty CTA */}
        <div className="hero-center-overlay-group">
          <div className="hero-f1-logo-wrap">
            {activeCategory === 'world_cup' ? (
              <img src="/fifa.png" alt="FIFA World Cup" className="hero-center-f1-logo" />
            ) : (
              <img src="/f1.png" alt="Formula 1" className="hero-center-f1-logo" />
            )}
          </div>
          
          <a 
            href={activeCategory === 'world_cup' ? "#booking" : "#screenings"} 
            className="center-cta-btn font-tech"
            onClick={handleCtaClick}
          >
            <RollingText 
              text={activeCategory === 'world_cup' ? "[ BOOK TICKETS NOW! ]" : "[ NEXT RACE ]"} 
              stagger={true} 
            />
            <ArrowDown size={14} className="cta-arrow" />
          </a>
        </div>

      </div>
    </section>
  );
}
