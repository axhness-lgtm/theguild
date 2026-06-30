import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Sparkles, Users, Flag } from 'lucide-react';
import { dataService } from '../services/dataService';
import './EventModal.css';

export default function EventModal({ event, onClose }) {
  if (!event) return null;

  const isBritishGP = event.id === 'f1-british-2026' || event.hasPackageSelection;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    instagram: '',
    sportCategory: event.category || 'f1',
    packagePreference: isBritishGP ? 'QUALIFYING + RACE DAY WEEKEND PASS' : 'N/A'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    setIsSubmitting(true);
    await dataService.submitInterest({
      name: form.name,
      phone: form.phone,
      instagram: form.instagram,
      sportCategory: form.sportCategory,
      selectedEvent: event.name,
      packagePreference: form.packagePreference
    });
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-tag font-tech">
            <span>[ DEMAND VALIDATION FORM ]</span>
          </div>
          <button className="btn-close font-tech" onClick={onClose} aria-label="Close modal">
            <span>CLOSE</span>
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="modal-success animate-fade-in">
            <div className="success-icon">
              <CheckCircle size={48} color="var(--text-primary)" />
            </div>
            <h3 className="success-title font-editorial">INTEREST REGISTERED.</h3>
            <p className="success-message">
              We'll notify you when registrations open for <strong>{event.name}</strong>.
              {isBritishGP && (
                <span className="block mt-2 font-tech text-red" style={{color: '#FF2E2E', display: 'block', marginTop: '0.75rem'}}>
                  SELECTED PACKAGE: // {form.packagePreference}
                </span>
              )}
            </p>
            <div className="success-notice font-tech">
              <span>// NO TICKET REQUIRED YET. YOU ARE ON THE INVITATION LIST.</span>
            </div>
            <button className="btn-brutalist success-btn" onClick={onClose}>
              <span>Return to Calendar</span>
            </button>
          </div>
        ) : (
          <div className="modal-body">
            
            {/* Event Specs Panel */}
            <div className="event-specs-panel">
              <div className="spec-item">
                <span className="spec-label font-tech">COMPETITION</span>
                <span className="spec-val font-editorial">{event.competition}</span>
              </div>
              <h2 className="modal-event-title font-editorial">{event.name}</h2>
              
              <div className="spec-grid font-tech">
                <div className="spec-box">
                  <span className="s-label">DATE & TIME</span>
                  <span className="s-val">{event.date} // {event.time}</span>
                </div>
                <div className="spec-box">
                  <span className="s-label">ESTIMATED CAPACITY</span>
                  <span className="s-val"><Users size={14} style={{display:'inline', marginRight:4}}/>{event.capacity}</span>
                </div>
              </div>

              <div className="spec-atmosphere">
                <span className="spec-label font-tech"><Sparkles size={13} style={{display:'inline', marginRight:4}}/> EXPECTED ATMOSPHERE</span>
                <p className="atmosphere-desc">{event.atmosphere}</p>
              </div>

              <div className="specs-disclaimer font-tech">
                <ShieldAlert size={14} />
                <span>THIS IS A PASSION-FIRST SCREENING. REGISTRATION OPENS SOON.</span>
              </div>
            </div>

            {/* Interest Form Panel */}
            <form className="interest-form" onSubmit={handleSubmit}>
              <div className="form-header font-tech">
                <span>SUBMIT YOUR INTEREST</span>
              </div>

              <div className="form-group">
                <label className="font-tech" htmlFor="name">FULL NAME *</label>
                <input 
                  type="text" 
                  id="name" 
                  required 
                  placeholder="E.G. ARJUN RAJU"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="font-tech" htmlFor="phone">PHONE NUMBER *</label>
                <input 
                  type="tel" 
                  id="phone" 
                  required 
                  placeholder="+91 98480 XXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="font-tech" htmlFor="instagram">INSTAGRAM HANDLE (OPTIONAL)</label>
                <input 
                  type="text" 
                  id="instagram" 
                  placeholder="@yourhandle"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
              </div>

              {/* British Grand Prix Package Selection */}
              {isBritishGP ? (
                <div className="form-group package-selection-box animate-fade-in">
                  <label className="font-tech package-label">
                    <Flag size={13} style={{display:'inline', marginRight:5, color:'#FF2E2E'}}/>
                    SILVERSTONE SCREENING OPTION *
                  </label>
                  <div className="package-options">
                    <label className={`package-card ${form.packagePreference === 'QUALIFYING + RACE DAY WEEKEND PASS' ? 'package-active' : ''}`}>
                      <input 
                        type="radio" 
                        name="packagePref" 
                        value="QUALIFYING + RACE DAY WEEKEND PASS"
                        checked={form.packagePreference === 'QUALIFYING + RACE DAY WEEKEND PASS'}
                        onChange={(e) => setForm({ ...form, packagePreference: e.target.value })}
                      />
                      <div className="package-info">
                        <span className="p-title font-tech">QUALIFYING + RACE DAY</span>
                        <span className="p-sub">FULL WEEKEND ACCESS (SAT JUL 04 & SUN JUL 05)</span>
                      </div>
                    </label>

                    <label className={`package-card ${form.packagePreference === 'RACE DAY ONLY (SUN, JUL 05)' ? 'package-active' : ''}`}>
                      <input 
                        type="radio" 
                        name="packagePref" 
                        value="RACE DAY ONLY (SUN, JUL 05)"
                        checked={form.packagePreference === 'RACE DAY ONLY (SUN, JUL 05)'}
                        onChange={(e) => setForm({ ...form, packagePreference: e.target.value })}
                      />
                      <div className="package-info">
                        <span className="p-title font-tech">RACE DAY ONLY</span>
                        <span className="p-sub">SUNDAY MAIN EVENT ONLY (SUN JUL 05 // 7:30 PM)</span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="font-tech" htmlFor="sport">PREFERRED SPORT</label>
                  <select 
                    id="sport" 
                    value={form.sportCategory}
                    onChange={(e) => setForm({ ...form, sportCategory: e.target.value })}
                    className="font-tech"
                  >
                    <option value="f1">FORMULA 1</option>
                    <option value="football">FOOTBALL</option>
                  </select>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-brutalist submit-btn"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'RECORDING...' : "CONFIRM INTEREST"}</span>
              </button>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
