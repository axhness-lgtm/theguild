import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const duration = 1500; // 1.5s total load time
    const intervalTime = 25;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsFading(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500); // 500ms fade out
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`loading-screen-wrapper ${isFading ? 'fade-out' : ''}`}>
      <div className="loader-content">
        <div className="loader-logo-wrap">
          <img src="/logo.png" alt="THE GUILD" className="loader-logo-img" />
        </div>
        
        <div className="loader-progress-section font-tech">
          <div className="loader-bar-bg">
            <div 
              className="loader-bar-fill" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          
          <div className="loader-status-row">
            <span className="loader-text">// INITIALIZING ATMOSPHERE ENGINE</span>
            <span className="loader-percent">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
