import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import './Footer.css';

const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline', marginRight:4}}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function Footer({ setActiveView }) {
  return (
    <footer className="footer-section">
      <div className="grid-container footer-container">
        
        <div className="footer-top">
          <div className="f-brand">
            <h2 className="footer-logo font-editorial">THE GUILD</h2>
            <p className="footer-manifesto font-editorial">BUILT FOR FANS.</p>
          </div>

          <div className="f-links font-tech">
            <div className="link-group">
              <span className="lg-title">LOCATION</span>
              <span className="lg-val">
                <MapPin size={13} style={{display:'inline', marginRight:4}}/> 
                VISAKHAPATNAM, INDIA
              </span>
            </div>

            <div className="link-group">
              <span className="lg-title">SOCIAL CHANNEL</span>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="lg-link">
                <InstagramIcon /> 
                @THEGUILD.VZAG
              </a>
            </div>

            <div className="link-group">
              <span className="lg-title">DIRECT INQUIRY</span>
              <a href="mailto:hello@theguildvzag.com" className="lg-link">
                <Mail size={13} style={{display:'inline', marginRight:4}}/> 
                HELLO@THEGUILDVZAG.COM
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom font-tech">
          <div className="b-left">
            <span>© {new Date().getFullYear()} THE GUILD // VISAKHAPATNAM. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="b-right">
            <button 
              className="secret-admin-link"
              onClick={() => setActiveView('admin')}
            >
              [ FOUNDER // DASHBOARD ]
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
