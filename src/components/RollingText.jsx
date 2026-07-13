import React from 'react';
import './RollingText.css';

/**
 * RollingText Component — Inspired by Lando Norris / Quadrille websites.
 * Wraps text in dual layers (`primary` + `secondary`) that roll vertically when the parent link/button (`a`, `button`, `.rolling-hover-parent`) is hovered.
 * 
 * @param {string|React.ReactNode} text - Text string or content to roll
 * @param {boolean} [stagger=true] - Whether to roll character-by-character with staggered delays
 * @param {string} [className=''] - Additional class names
 */
export default function RollingText({ text, children, stagger = true, className = '' }) {
  const content = text !== undefined ? text : children;

  // If content is not a string (or if stagger is explicitly disabled), do a smooth block roll
  if (typeof content !== 'string' || !stagger) {
    return (
      <span className={`rolling-block-wrap ${className}`}>
        <span className="rolling-block-primary">{content}</span>
        <span className="rolling-block-secondary" aria-hidden="true">{content}</span>
      </span>
    );
  }

  // If content is a string and stagger is enabled, split by character
  const chars = Array.from(content);

  return (
    <span className={`rolling-text-wrap ${className}`}>
      {chars.map((char, idx) => (
        <span 
          key={idx} 
          className="rolling-char" 
          style={{ '--char-index': idx }}
        >
          <span className="rolling-char-primary">{char === ' ' ? '\u00A0' : char}</span>
          <span className="rolling-char-secondary" aria-hidden="true">{char === ' ' ? '\u00A0' : char}</span>
        </span>
      ))}
    </span>
  );
}
