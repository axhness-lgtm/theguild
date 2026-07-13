import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Sparkles, Users, Flag, Copy, Check, ArrowRight, QrCode } from 'lucide-react';
import { dataService } from '../services/dataService';
import LineReveal, { RevealItem } from './LineReveal';
import './EventModal.css';

export default function EventModal({ event, onClose }) {
  if (!event) return null;

  const isWorldCup = event.category === 'world_cup';
  const isF1 = event.category === 'f1';

  // Step 1: Registration Form & Package Selection
  // Step 2: QR Code Payment & UTR Entry
  // Step 3: Confirmation
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    instagram: '',
    packagePreference: isWorldCup ? `SINGLE MATCH PASS // ${event.name} (₹199)` : `BELGIAN GRAND PRIX GENERAL PASS // BREW N CUE (₹199)`,
    utr: ''
  });

  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine current price based on selected package
  const currentPrice = form.packagePreference.includes('BOTH SEMI-FINALS BUNDLE') ? 349 : 199;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('steveoguri07-2@okicici');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setStep(2);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!form.utr || form.utr.trim().length < 6) {
      alert('Please enter a valid UTR / Transaction ID after making payment.');
      return;
    }

    setIsSubmitting(true);
    await dataService.submitInterest({
      name: form.name,
      phone: form.phone,
      instagram: form.instagram,
      sportCategory: event.category || 'f1',
      selectedEvent: form.packagePreference,
      packagePreference: `${form.packagePreference} [PAID: ₹${currentPrice} // UTR: ${form.utr}]`
    });
    setIsSubmitting(false);
    setStep(3);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-tag font-tech">
            <span>
              {step === 1 ? '[ STEP 01 // REGISTRATION & TICKET SELECTION ]' : 
               step === 2 ? '[ STEP 02 // UPI QR PAYMENT & UTR SUBMISSION ]' : 
               '[ STEP 03 // BOOKING CONFIRMED ]'}
            </span>
          </div>
          <button className="btn-close font-tech" onClick={onClose} aria-label="Close modal">
            <span>CLOSE</span>
            <X size={18} />
          </button>
        </div>

        {step === 3 ? (
          <div className="modal-success animate-fade-in is-revealed reveal-active">
            <RevealItem delay={0.1} className="success-icon">
              <CheckCircle size={56} color="#00FF66" />
            </RevealItem>
            <LineReveal delay={0.2} as="h3" className="success-title font-impact text-2xl text-white mt-4">REGISTRATION CONFIRMED!</LineReveal>
            <RevealItem delay={0.3} className="success-message text-gray-300 max-w-md mx-auto text-center mt-2 font-tech">
              Your pass for <strong className="text-white">{form.packagePreference}</strong> has been secured and logged into the verification queue.
            </RevealItem>
            
            <RevealItem delay={0.4} className="bg-zinc-900/90 border border-zinc-800 p-4 rounded mt-6 w-full max-w-sm mx-auto font-tech text-xs text-left">
              <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-gray-400">ATTENDEE:</span>
                <strong className="text-white">{form.name}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-gray-400">PHONE:</span>
                <strong className="text-white">{form.phone}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-gray-400">VENUE & CAPACITY:</span>
                <strong className="text-red-500">BREW N CUE CAFE (40 SEATS MAX)</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2 mb-2">
                <span className="text-gray-400">AMOUNT PAID:</span>
                <strong className="text-emerald-400 font-bold">₹{currentPrice}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">VERIFIED UTR:</span>
                <strong className="text-white font-mono">{form.utr}</strong>
              </div>
            </RevealItem>

            <RevealItem delay={0.5} className="success-notice font-tech mt-6 text-emerald-400">
              <span>// SHOW THIS SCREEN OR VERIFIED PHONE NUMBER AT ENTRY //</span>
            </RevealItem>

            <RevealItem delay={0.6}>
              <button className="btn-brutalist success-btn mt-6" onClick={onClose}>
                <span>RETURN TO CURATED CALENDAR</span>
              </button>
            </RevealItem>
          </div>
        ) : step === 2 ? (
          <div className="modal-body p-4 animate-fade-in is-revealed reveal-active" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <LineReveal delay={0.1} className="bg-red-950/30 border border-red-500/40 py-1.5 px-3 rounded mb-3 font-tech text-xs text-red-400 text-center">
              // EXACTLY 40 SEATS MAX AT BREW N CUE — SCAN & PAY TO SECURE PASS
            </LineReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              
              {/* Left Box: Compact QR & Amount */}
              <RevealItem delay={0.2} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center shadow-lg">
                <div className="font-tech text-[11px] text-gray-400 uppercase mb-1">TOTAL AMOUNT PAYABLE</div>
                <div className="font-impact text-3xl text-emerald-400 mb-2">₹{currentPrice}</div>
                <div className="font-tech text-[11px] text-gray-400 mb-2 truncate" title={form.packagePreference}>
                  {form.packagePreference}
                </div>

                {/* Normal Sized Compact QR Code Box */}
                <div 
                  className="bg-white rounded shadow-md border border-zinc-300 mx-auto mb-3"
                  style={{ width: '150px', height: '150px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img 
                    src="/guildqr.png" 
                    alt="Official Guild UPI QR Code" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                <div className="font-tech text-[10px] text-gray-400 mb-1">// OFFICIAL UPI ID:</div>
                <div className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-700 py-1.5 px-2.5 rounded text-xs font-mono text-white">
                  <span>steveoguri07-2@okicici</span>
                  <button 
                    type="button" 
                    onClick={handleCopyUpi} 
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </RevealItem>

              {/* Right Box: UTR Form & Confirm */}
              <RevealItem delay={0.3} as="form" onSubmit={handleSubmitPayment} className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4 text-left flex flex-col justify-between h-full">
                <div>
                  <div className="font-tech text-xs text-emerald-400 mb-2 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <QrCode size={14} />
                    <span>STEP 2: SUBMIT VERIFICATION UTR</span>
                  </div>

                  <p className="font-tech text-[11px] text-gray-300 mb-3 leading-relaxed">
                    Once you have completed the UPI payment of <strong className="text-emerald-400">₹{currentPrice}</strong>, please input your 12-digit transaction reference (UTR) below to instantly confirm your seat.
                  </p>

                  <div className="form-group mb-4">
                    <label className="font-tech text-xs text-white block mb-1" htmlFor="utr">
                      12-DIGIT UTR / TRANSACTION ID *
                    </label>
                    <input 
                      type="text" 
                      id="utr" 
                      required 
                      placeholder="e.g. 319482710492"
                      value={form.utr}
                      onChange={(e) => setForm({ ...form, utr: e.target.value })}
                      style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
                      className="w-full bg-black border border-zinc-700 text-white font-mono rounded focus:border-red-500 outline-none transition-colors"
                    />
                    <span className="text-[10px] text-gray-500 font-tech mt-1 block">
                      Found in GPay, PhonePe, or Paytm history.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="btn-brutalist bg-zinc-800 border-zinc-700 hover:bg-zinc-700 py-2.5 px-3 text-xs"
                  >
                    ← BACK
                  </button>
                  
                  <button 
                    type="submit" 
                    className="btn-brutalist flex-1 py-2.5 px-2 text-xs flex items-center justify-center gap-1.5"
                    disabled={isSubmitting || !form.utr}
                  >
                    <span>{isSubmitting ? 'VERIFYING...' : `CONFIRM (₹${currentPrice})`}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </RevealItem>

            </div>
          </div>
        ) : (
          <div className="modal-body is-revealed reveal-active animate-fade-in">
            
            {/* Event Specs Panel */}
            <div className="event-specs-panel">
              <div className="spec-item">
                <span className="spec-label font-tech">COMPETITION</span>
                <LineReveal delay={0.1} className="spec-val font-editorial">{event.competition}</LineReveal>
              </div>
              <LineReveal delay={0.2} as="h2" className="modal-event-title font-editorial">{event.name}</LineReveal>
              
              <RevealItem delay={0.25} className="spec-grid font-tech">
                <div className="spec-box">
                  <span className="s-label">DATE & TIME</span>
                  <span className="s-val">{event.date} // {event.time}</span>
                </div>
                <div className="spec-box">
                  <span className="s-label">VENUE CAPACITY</span>
                  <span className="s-val text-red-500 font-bold"><Users size={14} style={{display:'inline', marginRight:4}}/>{event.capacity}</span>
                </div>
              </RevealItem>

              <RevealItem delay={0.32} className="spec-atmosphere">
                <span className="spec-label font-tech"><Sparkles size={13} style={{display:'inline', marginRight:4}}/> EXPECTED ATMOSPHERE</span>
                <p className="atmosphere-desc">{event.atmosphere}</p>
              </RevealItem>

              <RevealItem delay={0.38} className="specs-disclaimer font-tech">
                <ShieldAlert size={14} />
                <span>LIMITED TO 40 SEATS AT BREW N CUE — REGISTER NOW</span>
              </RevealItem>
            </div>

            {/* Interest Form Panel */}
            <RevealItem delay={0.25} as="form" className="interest-form" onSubmit={handleProceedToPayment}>
              <div className="form-header font-tech">
                <span>ATTENDEE REGISTRATION</span>
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

              {/* Package & Ticket Type Selection */}
              {isWorldCup ? (
                <div className="form-group package-selection-box animate-fade-in">
                  <label className="font-tech package-label">
                    <Flag size={13} style={{display:'inline', marginRight:5, color:'#FF2E2E'}}/>
                    CHOOSE WORLD CUP SEMI-FINAL PASS *
                  </label>
                  <div className="package-options">
                    <label className={`package-card ${form.packagePreference.includes('SINGLE MATCH PASS') ? 'package-active' : ''}`}>
                      <input 
                        type="radio" 
                        name="packagePref" 
                        value={`SINGLE MATCH PASS // ${event.name} (₹199)`}
                        checked={form.packagePreference.includes('SINGLE MATCH PASS')}
                        onChange={(e) => setForm({ ...form, packagePreference: e.target.value })}
                      />
                      <div className="package-info">
                        <span className="p-title font-tech">SINGLE MATCH PASS (₹199)</span>
                        <span className="p-sub">{event.name} ({event.date} // {event.time})</span>
                      </div>
                    </label>

                    <label className={`package-card ${form.packagePreference.includes('BOTH SEMI-FINALS BUNDLE') ? 'package-active' : ''}`}>
                      <input 
                        type="radio" 
                        name="packagePref" 
                        value="BOTH SEMI-FINALS BUNDLE PASS // SPAIN VS FRANCE + ENGLAND VS ARGENTINA (₹349)"
                        checked={form.packagePreference.includes('BOTH SEMI-FINALS BUNDLE')}
                        onChange={(e) => setForm({ ...form, packagePreference: e.target.value })}
                      />
                      <div className="package-info">
                        <span className="p-title font-tech text-emerald-400">BOTH SEMI-FINALS BUNDLE (₹349) 🔥</span>
                        <span className="p-sub">ACCESS BOTH MATCHES (JUL 15 & JUL 16) AT BREW N CUE // SAVE ₹49!</span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="form-group package-selection-box animate-fade-in">
                  <label className="font-tech package-label">
                    <Flag size={13} style={{display:'inline', marginRight:5, color:'#FF2E2E'}}/>
                    SELECTED SCREENING TICKET *
                  </label>
                  <div className="package-options">
                    <div className="package-card package-active">
                      <div className="package-info">
                        <span className="p-title font-tech">BELGIAN GRAND PRIX GENERAL PASS (₹199)</span>
                        <span className="p-sub">SPA-FRANCORCHAMPS AT BREW N CUE // LIMITED TO 40 SEATS</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-brutalist submit-btn mt-4 flex items-center justify-center gap-2"
              >
                <span>PROCEED TO PAYMENT (₹{currentPrice})</span>
                <ArrowRight size={16} />
              </button>
            </RevealItem>

          </div>
        )}

      </div>
    </div>
  );
}
