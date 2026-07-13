import React from 'react';
import './LineReveal.css';

/**
 * LineReveal Component — Wraps a single line of text in an overflow-hidden container
 * so it rises and swipes open line-by-line independently from other lines.
 */
export default function LineReveal({ children, delay = 0, className = '', inline = false, style = {}, as: Tag = 'span' }) {
  const wrapClass = `reveal-line-wrap ${inline ? 'reveal-inline' : ''} ${className}`;
  const customStyle = { ...style, '--line-delay': `${delay}s` };

  return (
    <Tag className={wrapClass} style={customStyle}>
      <span className="reveal-line-inner">
        {children}
      </span>
    </Tag>
  );
}

/**
 * RevealItem Component — Wraps blocks, buttons, or non-text elements
 * so they reveal in sync after the line-by-line text above them.
 */
export function RevealItem({ children, delay = 0, className = '', style = {}, as: Tag = 'div' }) {
  const customStyle = { ...style, '--line-delay': `${delay}s` };

  return (
    <Tag className={`reveal-item-wrap ${className}`} style={customStyle}>
      {children}
    </Tag>
  );
}
