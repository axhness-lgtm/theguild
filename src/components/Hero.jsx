import React from 'react';
import { ArrowDown, Globe, Sparkles, Flame } from 'lucide-react';
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
      {/* Massive Background Poster Watermark inspired by Wilder & Messi references */}
      <div className="hero-poster-watermark font-impact font-outline" aria-hidden="true">
        2026
      </div>

      <div className="grid-container hero-container">
        
        {/* Top Swiss Grid Meta Header */}
        <div className="hero-meta-grid font-tech">
          <div className="meta-cell">
            <Globe size={13} style={{ display: 'inline', marginRight: '6px' }} />
            <span>ORIGIN // VISAKHAPATNAM, INDIA</span>
          </div>
          <div className="meta-cell text-center hidden-mobile">
            <span>COORDINATES // 17.6868° N, 83.2185° E</span>
          </div>
          <div className="meta-cell text-right">
            <span className="live-pill"><Flame size={12} style={{ display: 'inline', marginRight: '4px', color: '#FF2E2E' }} /> DEMAND VALIDATION MVP</span>
          </div>
        </div>

        {/* Editorial Sports Poster Body */}
        <div className="hero-main-layout">
          
          {/* Left Vertical Index Column (Wilder Reference Inspiration) */}
          <aside className="hero-vertical-index font-tech hidden-mobile">
            <div className="v-index-item">
              <span className="v-num">01</span>
              <span className="v-label">// V6 TURBO TELEMETRY</span>
            </div>
            <div className="v-index-item">
              <span className="v-num">02</span>
              <span className="v-label">// STADIUM ACOUSTICS</span>
            </div>
            <div className="v-index-item">
              <span className="v-num">03</span>
              <span className="v-label">// VIZAG HANGARS</span>
            </div>
          </aside>

          {/* Main Typography Impact Spread */}
          <div className="hero-poster-center">
            <div className="hero-tagline font-tech">
              <span>[ COMMUNITY OVER COMMERCE // EXCLUSIVE SCREENING COLLECTIVE ]</span>
            </div>

            <h1 className="hero-title font-impact">
              SPORTS WERE <br />
              <span className="hero-accent-block font-impact">NEVER MEANT</span> <br />
              TO BE WATCHED <br />
              <span className="text-hollow font-outline">ALONE.</span>
            </h1>

            <div className="hero-subgrid">
              <div className="subgrid-left">
                <h2 className="hero-subtitle font-editorial">
                  WHERE STRANGERS BECOME TEAMMATES.
                </h2>
              </div>
              
              <div className="subgrid-right">
                <p className="hero-description">
                  Instead of watching Formula 1 races or football matches alone at home, members gather for carefully curated screening experiences across Visakhapatnam. Not just a watch party—an atmosphere driven by synchronized telemetry, acoustic arrays, and uninhibited passion.
                </p>

                <div className="hero-cta-group">
                  <a 
                    href="#screenings" 
                    className="btn-brutalist hero-btn"
                    onClick={scrollToScreenings}
                  >
                    <span>EXPLORE CURATED CALENDAR</span>
                    <ArrowDown size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Ticker/Info Grid */}
        <div className="hero-footer-grid font-tech">
          <div className="footer-cell">
            <span className="label">PRIMARY ROSTER</span>
            <span className="value font-condensed" style={{fontSize: '1.1rem'}}>FORMULA 1 // FIFA WORLD CUP</span>
          </div>
          <div className="footer-cell">
            <span className="label">COMMUNITY ETHOS</span>
            <span className="value font-condensed" style={{fontSize: '1.1rem'}}>PASSION OVER COMMERCE</span>
          </div>
          <div className="footer-cell">
            <span className="label">CURRENT PHASE</span>
            <span className="value font-condensed" style={{color: '#FF2E2E', fontSize: '1.1rem'}}>REGISTER INTEREST ONLY</span>
          </div>
        </div>

      </div>
    </section>
  );
}
