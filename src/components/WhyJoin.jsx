import React from 'react';
import { Users, Building2, Zap, HeartHandshake, ShieldCheck } from 'lucide-react';
import RollingText from './RollingText';
import LineReveal, { RevealItem } from './LineReveal';
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
    <section id="why-join" className="why-section" data-scroll-section>
      <div className="grid-container why-container">
        
        <div className="why-header">
          <LineReveal delay={0.1} className="section-index font-tech">03 // CORE PILLARS</LineReveal>
          <LineReveal delay={0.2} className="section-title font-editorial" as="h2">WHY JOIN THE GUILD?</LineReveal>
        </div>

        <div className="pillars-grid">
          {PILLARS.map((item, idx) => (
            <RevealItem 
              key={idx} 
              delay={(idx % 3) * 0.12}
              className="pillar-card scroll-reveal-card"
            >
              <div className="pillar-num font-tech">[ 0{idx + 1} ]</div>
              <div className="pillar-icon">{item.icon}</div>
              <LineReveal delay={0.18} className="pillar-title font-editorial" as="h3">{item.title}</LineReveal>
              <LineReveal delay={0.28} className="pillar-desc" as="p">{item.desc}</LineReveal>
            </RevealItem>
          ))}
          
          {/* 6th filler card to complete grid cleanly */}
          <RevealItem delay={0.24} className="pillar-card join-cta-card scroll-reveal-card">
            <div className="pillar-num font-tech">[ STATUS ]</div>
            <LineReveal delay={0.2} className="pillar-title font-editorial" as="h3">NO SOLO VIEWING.</LineReveal>
            <LineReveal delay={0.3} className="pillar-desc" as="p">
              Be there for the very first screening. Select any upcoming event above to join the invite list.
            </LineReveal>
            <a href="#screenings" className="btn-brutalist-outline mt-auto">
              <RollingText text="EXPLORE EVENTS" stagger={true} />
            </a>
          </RevealItem>
        </div>

      </div>
    </section>
  );
}
