import React from 'react';
import LineReveal, { RevealItem } from './LineReveal';
import './About.css';

export default function About() {
  return (
    <section id="about" className="about-section" data-scroll-section>
      <div className="grid-container about-container">
        
        <div className="about-header-row">
          <LineReveal delay={0.1} className="section-index font-tech">01 // MANIFESTO</LineReveal>
          <LineReveal delay={0.2} className="section-title font-impact" as="h2">WHAT IS THE GUILD?</LineReveal>
        </div>

        <div className="about-content-grid">
          <div className="about-column primary-column">
            <h3 className="about-lead font-impact">
              <LineReveal delay={0.28}>WE BUILD ATMOSPHERE,</LineReveal>
              <LineReveal delay={0.42} style={{ color: '#FF2E2E' }}>NOT TICKET QUEUES.</LineReveal>
            </h3>
            <div className="about-body">
              <LineReveal delay={0.52}>The Guild was born out of frustration with sterile sports bars and solitary</LineReveal>
              <LineReveal delay={0.62}>home streams. When a last-lap overtake happens in Formula 1 or a 90th-minute</LineReveal>
              <LineReveal delay={0.72}>winner strikes in football, the energy should shake the room.</LineReveal>
            </div>
          </div>

          <div className="about-column secondary-column">
            <RevealItem delay={0.3} className="ethos-card scroll-reveal-card">
              <span className="ethos-watermark font-impact font-outline" aria-hidden="true">01</span>
              <div className="ethos-content">
                <LineReveal delay={0.35} className="ethos-num font-tech">// ETHOS 01</LineReveal>
                <LineReveal delay={0.42} className="ethos-title font-impact" as="h4">COMMUNITY OVER COMMERCE</LineReveal>
                <LineReveal delay={0.5} className="ethos-text">
                  No corporate upsells. No noisy club crowds who don't know the rules. Every attendee is vetted for passion and respect for the sport.
                </LineReveal>
              </div>
            </RevealItem>

            <RevealItem delay={0.45} className="ethos-card scroll-reveal-card">
              <span className="ethos-watermark font-impact font-outline" aria-hidden="true">02</span>
              <div className="ethos-content">
                <LineReveal delay={0.5} className="ethos-num font-tech">// ETHOS 02</LineReveal>
                <LineReveal delay={0.57} className="ethos-title font-impact" as="h4">CURATED VENUES</LineReveal>
                <LineReveal delay={0.65} className="ethos-text">
                  From open-air coastal hangars along Beach Road to minimalist acoustic studios in Siripuram. Every location is engineered for immersive audio-visual impact.
                </LineReveal>
              </div>
            </RevealItem>
          </div>
        </div>

      </div>
    </section>
  );
}
