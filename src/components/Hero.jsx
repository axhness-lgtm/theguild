import React from 'react';
import { ArrowDown, Globe } from 'lucide-react';
import './Hero.css';

export default function Hero() {
  const scrollToScreenings = (e) => {
    e.preventDefault();
    const elem = document.getElementById('screenings');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section">
      <div className="grid-container hero-container">
        
        {/* Top Swiss Grid Meta Header */}
        <div className="hero-meta-grid font-tech">
          <div className="meta-cell">
            <Globe size={13} />
            <span>ORIGIN // VISAKHAPATNAM, INDIA</span>
          </div>
          <div className="meta-cell text-center hidden-mobile">
            <span>COORDINATES // 17.6868° N, 83.2185° E</span>
          </div>
          <div className="meta-cell text-right">
            <span>STATUS // DEMAND VALIDATION MVP</span>
          </div>
        </div>

        {/* Massive Statement */}
        <div className="hero-main-content">
          <div className="hero-tagline font-tech">
            [ COMMUNITY FIRST — EXCLUSIVE SCREENING EXPERIENCES ]
          </div>

          <h1 className="hero-title font-editorial">
            SPORTS WERE NEVER <br />
            MEANT TO BE <br />
            <span className="text-stroke">WATCHED ALONE.</span>
          </h1>

          <div className="hero-subgrid">
            <div className="subgrid-left">
              <h2 className="hero-subtitle font-editorial">
                WHERE STRANGERS BECOME TEAMMATES.
              </h2>
            </div>
            
            <div className="subgrid-right">
              <p className="hero-description">
                Instead of watching Formula 1 races or football matches alone at home, members gather for carefully curated screening experiences across Visakhapatnam. Not just a watch party—an atmosphere driven by shared emotion and passion.
              </p>

              <div className="hero-cta-group">
                <a 
                  href="#screenings" 
                  className="btn-brutalist"
                  onClick={scrollToScreenings}
                >
                  <span>Explore Upcoming Screenings</span>
                  <ArrowDown size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ticker/Info Grid */}
        <div className="hero-footer-grid font-tech">
          <div className="footer-cell">
            <span className="label">PRIMARY FOCUS</span>
            <span className="value">FORMULA 1 // FOOTBALL</span>
          </div>
          <div className="footer-cell">
            <span className="label">COMMUNITY ETHOS</span>
            <span className="value">PASSION OVER COMMERCE</span>
          </div>
          <div className="footer-cell">
            <span className="label">CURRENT PHASE</span>
            <span className="value">COLLECTING INTEREST ONLY</span>
          </div>
        </div>

      </div>
    </section>
  );
}
