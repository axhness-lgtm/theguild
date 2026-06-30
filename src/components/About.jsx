import React from 'react';
import './About.css';

export default function About() {
  return (
    <section id="about" className="about-section">
      <div className="grid-container about-container">
        
        <div className="about-header-row">
          <div className="section-index font-tech">01 // MANIFESTO</div>
          <h2 className="section-title font-impact">WHAT IS THE GUILD?</h2>
        </div>

        <div className="about-content-grid">
          <div className="about-column primary-column">
            <h3 className="about-lead font-impact">
              WE BUILD ATMOSPHERE, <br />
              <span style={{ color: '#FF2E2E' }}>NOT TICKET QUEUES.</span>
            </h3>
            <p className="about-body">
              The Guild was born out of frustration with sterile sports bars and solitary home streams. When a last-lap overtake happens in Formula 1 or a 90th-minute winner strikes in football, the energy should shake the room.
            </p>
          </div>

          <div className="about-column secondary-column">
            <div className="ethos-card">
              <span className="ethos-watermark font-impact font-outline" aria-hidden="true">01</span>
              <div className="ethos-content">
                <span className="ethos-num font-tech">// ETHOS 01</span>
                <h4 className="ethos-title font-impact">COMMUNITY OVER COMMERCE</h4>
                <p className="ethos-text">
                  No corporate upsells. No noisy club crowds who don't know the rules. Every attendee is vetted for passion and respect for the sport.
                </p>
              </div>
            </div>

            <div className="ethos-card">
              <span className="ethos-watermark font-impact font-outline" aria-hidden="true">02</span>
              <div className="ethos-content">
                <span className="ethos-num font-tech">// ETHOS 02</span>
                <h4 className="ethos-title font-impact">CURATED VENUES</h4>
                <p className="ethos-text">
                  From open-air coastal hangars along Beach Road to minimalist acoustic studios in Siripuram. Every location is engineered for immersive audio-visual impact.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
