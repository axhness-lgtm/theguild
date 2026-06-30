import React from 'react';
import './Marquee.css';

export default function Marquee() {
  const items = [
    "SPORTS WERE NEVER MEANT TO BE WATCHED ALONE",
    "//",
    "VISAKHAPATNAM COMMUNITY GATHERINGS",
    "//",
    "FORMULA 1 LIVE TELEMETRY & ROOFTOP HANGARS",
    "//",
    "FIFA WORLD CUP STADIUM ACOUSTICS",
    "//",
    "COMMUNITY OVER COMMERCE",
    "//",
    "REGISTER YOUR INTEREST TODAY",
    "//"
  ];

  return (
    <div className="marquee-container font-tech">
      <div className="marquee-track animate-marquee">
        {/* Render 3 repetitions for seamless infinite looping on ultra-wide screens */}
        {[...items, ...items, ...items].map((text, idx) => (
          <span key={idx} className="marquee-item">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
