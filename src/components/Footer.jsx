import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import RollingText from './RollingText';
import LineReveal, { RevealItem } from './LineReveal';
import './Footer.css';

const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline', marginRight:4}}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function Footer({ setActiveView }) {
  return (
    <footer className="footer-section" data-scroll-section>
      <div className="grid-container footer-container">
        
        <div className="footer-top">
          <div className="f-brand">
            <LineReveal delay={0.1} className="footer-logo font-editorial" as="h2">THE GUILD</LineReveal>
            <LineReveal delay={0.25} className="footer-manifesto font-editorial" as="p">BUILT FOR FANS.</LineReveal>
          </div>

          <div className="f-links font-tech">
            <RevealItem delay={0.3} className="link-group">
              <span className="lg-title">LOCATION</span>
              <span className="lg-val">
                <MapPin size={13} style={{display:'inline', marginRight:4}}/> 
                VISAKHAPATNAM, INDIA
              </span>
            </RevealItem>

            <RevealItem delay={0.38} className="link-group">
              <span className="lg-title">SOCIAL CHANNEL</span>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="lg-link">
                <InstagramIcon /> 
                <RollingText text="@THEGUILD.VZAG" stagger={true} />
              </a>
            </RevealItem>

            <RevealItem delay={0.46} className="link-group">
              <span className="lg-title">DIRECT INQUIRY</span>
              <a href="mailto:hello@theguildvzag.com" className="lg-link">
                <Mail size={13} style={{display:'inline', marginRight:4}}/> 
                <RollingText text="HELLO@THEGUILDVZAG.COM" stagger={true} />
              </a>
            </RevealItem>
          </div>
        </div>

        <div className="footer-bottom font-tech">
          <div className="b-left">
            <LineReveal delay={0.5}>© {new Date().getFullYear()} THE GUILD // VISAKHAPATNAM. ALL RIGHTS RESERVED.</LineReveal>
          </div>
        </div>

      </div>
    </footer>
  );
}
