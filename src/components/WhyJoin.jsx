import React from 'react';
import { Users, Building2, Zap, HeartHandshake, ShieldCheck } from 'lucide-react';
import './WhyJoin.css';

const PILLARS = [
  {
    icon: <Users size={28} />,
    title: 'WATCH WITH FANS',
    desc: 'Surround yourself exclusively with die-hard supporters who live and breathe the sport.'
  },
  {
    icon: <Building2 size={28} />,
    title: 'PREMIUM VENUES',
    desc: 'Custom-fitted acoustic spaces and coastal hangars engineered for cinematic sports viewing.'
  },
  {
    icon: <Zap size={28} />,
    title: 'GREAT ATMOSPHERE',
    desc: 'Chants, synchronized lighting, live F1 telemetry walls, and goosebump moments.'
  },
  {
    icon: <HeartHandshake size={28} />,
    title: 'MEET NEW PEOPLE',
    desc: 'Turn solitary game nights into lifelong rivalries and friendships with Visakhapatnam locals.'
  },
  {
    icon: <ShieldCheck size={28} />,
    title: 'COMMUNITY FIRST',
    desc: 'Vetted attendance ensures respect, safety, and an authentic uninhibited screening room.'
  }
];

export default function WhyJoin() {
  return (
    <section id="why-join" className="why-section">
      <div className="grid-container why-container">
        
        <div className="why-header">
          <span className="section-index font-tech">03 // CORE PILLARS</span>
          <h2 className="section-title font-editorial">WHY JOIN THE GUILD?</h2>
        </div>

        <div className="pillars-grid">
          {PILLARS.map((item, idx) => (
            <div key={idx} className="pillar-card">
              <div className="pillar-num font-tech">[ 0{idx + 1} ]</div>
              <div className="pillar-icon">{item.icon}</div>
              <h3 className="pillar-title font-editorial">{item.title}</h3>
              <p className="pillar-desc">{item.desc}</p>
            </div>
          ))}
          
          {/* 6th filler card to complete grid cleanly */}
          <div className="pillar-card join-cta-card">
            <div className="pillar-num font-tech">[ STATUS ]</div>
            <h3 className="pillar-title font-editorial">NO SOLO VIEWING.</h3>
            <p className="pillar-desc">
              Be there for the very first screening. Select any upcoming event above to join the invite list.
            </p>
            <a href="#screenings" className="btn-brutalist-outline mt-auto">
              <span>EXPLORE EVENTS</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
