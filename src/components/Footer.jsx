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
    <footer className="footer-section font-sports-italic" data-scroll-section>
      <div className="grid-container footer-container">
        
        <div className="footer-top">
          <div className="f-brand">
            <RevealItem delay={0.1} className="footer-logo-container">
              <img src="/logo.png" alt="THE GUILD" className="footer-brand-logo" />
            </RevealItem>
          </div>

          <div className="f-links">
            <RevealItem delay={0.3} className="link-group">
              <span className="lg-title">Location</span>
              <span className="lg-val">
                <MapPin size={13} style={{display:'inline', marginRight:4}}/> 
                Visakhapatnam, India
              </span>
            </RevealItem>

            <RevealItem delay={0.38} className="link-group">
              <span className="lg-title">Social Channel</span>
              <a href="https://www.instagram.com/theguild.vizag/" target="_blank" rel="noopener noreferrer" className="lg-link">
                <InstagramIcon /> 
                <RollingText text="@theguild.vizag" stagger={true} />
              </a>
            </RevealItem>

            <RevealItem delay={0.46} className="link-group">
              <span className="lg-title">Direct Inquiry</span>
              <a href="mailto:theguild.vizag@gmail.com" className="lg-link">
                <Mail size={13} style={{display:'inline', marginRight:4}}/> 
                <RollingText text="theguild.vizag@gmail.com" stagger={true} />
              </a>
            </RevealItem>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="b-left">
            <LineReveal delay={0.5}>© {new Date().getFullYear()} The Guild // Visakhapatnam. All Rights Reserved.</LineReveal>
          </div>
        </div>

      </div>
    </footer>
  );
}
