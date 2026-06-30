import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight } from 'lucide-react';
import './Admin.css';

export default function AdminLogin({ onLogin, onExit }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Default founder password: guild2026 or founder
    if (password === 'guild2026' || password === 'founder' || password === 'admin') {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <section className="admin-login-section animate-fade-in">
      <div className="grid-container admin-login-box">
        
        <div className="login-header">
          <div className="login-tag font-tech">
            <Lock size={14} />
            <span>FOUNDER SECURITY PROTOCOL</span>
          </div>
          <button className="btn-exit font-tech" onClick={onExit}>
            [ EXIT TO PUBLIC SITE ]
          </button>
        </div>

        <div className="login-body">
          <div className="login-intro">
            <h2 className="login-title font-editorial">THE GUILD // CONTROL ROOM</h2>
            <p className="login-subtitle">
              RESTRICTED FOUNDER ACCESS. VIEW & MANAGE DEMAND VALIDATION SUBMISSIONS.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <KeyRound size={18} className="key-icon" />
              <input 
                type="password" 
                placeholder="ENTER FOUNDER PASSPHRASE (HINT: guild2026)" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className="font-tech login-input"
                autoFocus
              />
              <button type="submit" className="btn-brutalist login-submit font-tech">
                <span>UNLOCK</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {error && (
              <div className="login-error font-tech animate-fade-in">
                <span>// ACCESS DENIED: INCORRECT FOUNDER PASSPHRASE</span>
              </div>
            )}
          </form>

          <div className="login-hint font-tech">
            <span>PASSPHRASE FOR DEMO: <strong>guild2026</strong></span>
          </div>
        </div>

      </div>
    </section>
  );
}
