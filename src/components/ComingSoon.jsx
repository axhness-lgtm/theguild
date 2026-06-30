import React from 'react';
import { Lock, CreditCard, Armchair, Award, Smartphone, Star } from 'lucide-react';
import './ComingSoon.css';

const ROADMAP_ITEMS = [
  {
    icon: <Smartphone size={22} />,
    title: 'MEMBER DASHBOARD',
    status: 'IN DEVELOPMENT',
    desc: 'Dedicated profile to track attended races, favorite clubs, and screening stats.'
  },
  {
    icon: <Armchair size={22} />,
    title: 'INTERACTIVE SEAT RESERVATIONS',
    status: 'ARCHITECTURE READY',
    desc: 'Select precise terrace tables or prime front-row lounge seating before arrival.'
  },
  {
    icon: <CreditCard size={22} />,
    title: 'RAZORPAY INTEGRATION',
    status: 'TESTING',
    desc: 'Seamless 1-tap UPI and card ticketing directly within your Guild wallet.'
  },
  {
    icon: <Award size={22} />,
    title: 'GUILD MEMBERSHIP & LOYALTY',
    status: 'CONCEPT',
    desc: 'Earn priority entry, complimentary craft drinks, and exclusive season pass badges.'
  },
  {
    icon: <Star size={22} />,
    title: 'PRIORITY BOOKING WINDOWS',
    status: 'PLANNED',
    desc: 'Tier-based 48-hour head starts before high-demand derby screenings go public.'
  }
];

export default function ComingSoon() {
  return (
    <section id="coming-soon" className="roadmap-section">
      <div className="grid-container roadmap-container">
        
        <div className="roadmap-header">
          <div className="r-left">
            <span className="section-index font-tech">04 // VERSION 2.0 ROADMAP</span>
            <h2 className="section-title font-editorial">COMING SOON TO THE GUILD</h2>
          </div>
          <div className="r-right font-tech">
            <Lock size={16} />
            <span>EXCLUSIVELY TEASED FOR MVP VALIDATION</span>
          </div>
        </div>

        <div className="roadmap-list">
          {ROADMAP_ITEMS.map((item, idx) => (
            <div key={idx} className="roadmap-row">
              <div className="row-meta font-tech">
                <span className="row-idx">[ 0{idx + 1} ]</span>
                <span className="row-status badge-status">{item.status}</span>
              </div>
              
              <div className="row-main">
                <div className="row-icon">{item.icon}</div>
                <div className="row-text">
                  <h3 className="roadmap-title font-editorial">{item.title}</h3>
                  <p className="roadmap-desc">{item.desc}</p>
                </div>
              </div>

              <div className="row-action font-tech">
                <span>// LOCKED</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
