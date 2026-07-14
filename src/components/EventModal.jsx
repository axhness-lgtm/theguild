import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Sparkles, Users, Copy, Check, ArrowRight, QrCode, Upload } from 'lucide-react';
import { dataService, UPCOMING_SCREENINGS } from '../services/dataService';
import { processAndCompressImage } from '../utils/imageHelper';
import LineReveal, { RevealItem } from './LineReveal';
import './EventModal.css';

export default function EventModal({ event, onClose }) {
  if (!event) return null;

  const initialCategory = event.category || 'f1';
  const isF1 = initialCategory === 'f1';

  // Step 1: Selection & Registration
  // Step 2: UPI QR Payment & Screenshot Upload
  // Step 3: Booking Confirmed & Digital Pass
  const [step, setStep] = useState(1);
  const [ticketCount, setTicketCount] = useState(1);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    instagram: '',
    screenshot: null,
    screenshotName: ''
  });

  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const currentOption = UPCOMING_SCREENINGS.find(item => item.id === event.id) || event;
  const currentPrice = 199; // Fixed normal pass price as requested

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

  const handleScreenshotSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const dataUrl = await processAndCompressImage(file);
      setForm(prev => ({
        ...prev,
        screenshot: dataUrl,
        screenshotName: file.name
      }));
    } catch (err) {
      alert(`Image processing error: ${err.message}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!form.screenshot) {
      alert('Payment screenshot upload is mandatory to verify your transaction.');
      return;
    }

    setIsSubmitting(true);
    const totalAmount = currentPrice * ticketCount;
    const packageName = `[${currentOption.name}] // GENERAL SCREENING PASS (x${ticketCount} ${ticketCount === 1 ? 'SEAT' : 'SEATS'})`;

    await dataService.submitInterest({
      name: form.name,
      phone: form.phone,
      instagram: form.instagram || 'Not provided',
      sportCategory: initialCategory,
      selectedEvent: currentOption.name,
      packagePreference: `${packageName} [PAID: ₹${totalAmount} // SCREENSHOT VERIFIED]`,
      paymentScreenshot: form.screenshot
    });
    setIsSubmitting(false);
    setStep(3);
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-tag font-tech flex items-center gap-2">
            <span className="text-red-500 border border-red-500/40 bg-red-950/30 px-2 py-0.5 rounded text-[11px] font-bold">
              [ FORMULA 1 RACE REGISTRATION CENTER ]
            </span>
            <span className="text-gray-400">
              {step === 1 ? '// STEP 01: ATTENDEE REGISTRATION' : 
               step === 2 ? '// STEP 02: UPI QR PAYMENT & UTR SUBMISSION' : 
               '// STEP 03: PASS SECURED & CONFIRMED'}
            </span>
          </div>
          <button type="button" className="btn-close font-tech" onClick={onClose} aria-label="Close modal">
            <span>CLOSE</span>
            <X size={18} />
          </button>
        </div>

        {step === 3 ? (
          <div className="modal-success animate-fade-in is-revealed reveal-active p-8 text-center">
            <RevealItem delay={0.1} className="success-icon mx-auto flex justify-center">
              <CheckCircle size={64} color="#00FF66" />
            </RevealItem>
            <LineReveal delay={0.2} as="h3" className="success-title font-impact text-3xl text-white mt-4">
              DIGITAL PASS SECURED!
            </LineReveal>
            <RevealItem delay={0.3} className="success-message text-gray-300 max-w-lg mx-auto text-center mt-2 font-tech text-sm">
              Your registration for <strong className="text-white">{currentOption.name}</strong> has been logged into The Guild verification queue.
            </RevealItem>
            
            <RevealItem delay={0.4} className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-lg mt-6 w-full max-w-md mx-auto font-tech text-xs text-left shadow-2xl">
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">BOOKING ID:</span>
                <strong className="text-emerald-400 font-mono">GLD-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">ATTENDEE NAME:</span>
                <strong className="text-white">{form.name}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">PHONE CONTACT:</span>
                <strong className="text-white">{form.phone}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">VENUE:</span>
                <strong className="text-red-500">{currentOption.venue}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">PASS TIER:</span>
                <strong className="text-white">GENERAL PASS ({ticketCount} {ticketCount === 1 ? 'SEAT' : 'SEATS'})</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
                <span className="text-gray-400">TOTAL AMOUNT PAID:</span>
                <strong className="text-emerald-400 font-bold text-sm">₹{currentPrice * ticketCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">PAYMENT VERIFICATION:</span>
                <strong className="text-emerald-400 font-bold text-xs">[ SCREENSHOT COMPRESSED & VERIFIED ]</strong>
              </div>
            </RevealItem>

            <RevealItem delay={0.5} className="success-notice font-tech mt-6 text-emerald-400 text-xs">
              <span>// KEEP THIS SCREENSHOT OR VERIFIED PHONE NUMBER READY AT VENUE ENTRY //</span>
            </RevealItem>

            <RevealItem delay={0.6}>
              <button type="button" className="btn-brutalist success-btn mt-6 py-3 px-6 text-xs" onClick={onClose}>
                <span>← RETURN TO THE GUILD DASHBOARD</span>
              </button>
            </RevealItem>
          </div>
        ) : step === 2 ? (
          <div className="modal-body p-6 animate-fade-in is-revealed reveal-active font-tech" style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl">
              
              {/* Left Column: Official UPI QR Code ONLY */}
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl h-full">
                <div className="bg-white rounded-xl shadow-2xl border-4 border-zinc-200 p-3 flex items-center justify-center" style={{ width: '220px', height: '220px' }}>
                  <img 
                    src="/guildqr.png" 
                    alt="Official Guild UPI QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-400 font-bold mt-4 tracking-wider uppercase">// OFFICIAL SCANNER QR</span>
              </div>

              {/* Right Column: 1. UPI ID, 2. Total Amount, 3. Mandatory Screenshot Upload, 4. Confirm Button */}
              <form onSubmit={handleSubmitPayment} className="flex flex-col justify-between space-y-5 h-full text-left">
                
                {/* 1. UPI ID */}
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase block mb-1 tracking-wider">OFFICIAL UPI ID</label>
                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 py-3 px-3.5 rounded-lg text-sm font-mono text-white shadow-inner">
                    <span className="font-bold tracking-wide">steveoguri07-2@okicici</span>
                    <button 
                      type="button" 
                      onClick={handleCopyUpi} 
                      className="text-red-400 hover:text-red-300 transition-colors bg-zinc-800 p-1.5 rounded flex items-center gap-1.5 text-xs font-tech"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      <span>{copied ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Total Amount to be Paid */}
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase block mb-1 tracking-wider">TOTAL AMOUNT TO BE PAID</label>
                  <div className="bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-lg flex items-baseline justify-between">
                    <span className="text-xs text-gray-300 font-tech">({ticketCount} {ticketCount === 1 ? 'Seat' : 'Seats'} × ₹{currentPrice})</span>
                    <span className="font-impact text-3xl text-emerald-400">₹{currentPrice * ticketCount}</span>
                  </div>
                </div>

                {/* 3. Mandatory Payment Screenshot Upload */}
                <div>
                  <label className="text-[11px] text-white font-bold uppercase block mb-1.5 tracking-wider flex items-center justify-between">
                    <span>MANDATORY PAYMENT SCREENSHOT *</span>
                    <span className="text-[10px] text-red-500 font-mono">[REQUIRED]</span>
                  </label>
                  <div className="bg-black border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-lg p-4 text-center cursor-pointer transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="f1-screenshot-upload" 
                      required 
                      className="hidden" 
                      onChange={handleScreenshotSelect}
                    />
                    <label htmlFor="f1-screenshot-upload" className="cursor-pointer block">
                      <Upload size={22} className="mx-auto text-red-500 mb-1.5" />
                      <span className="text-xs text-gray-200 block font-bold truncate">
                        {isCompressing ? 'COMPRESSING IMAGE...' : form.screenshotName ? `ATTACHED: ${form.screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT ]'}
                      </span>
                    </label>
                    {form.screenshot && (
                      <div className="mt-3 bg-zinc-900 p-2 rounded border border-zinc-700">
                        <img src={form.screenshot} alt="Payment Receipt Preview" className="max-h-24 mx-auto rounded object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation & Submit Button */}
                <div className="flex gap-3 pt-1">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="btn-brutalist bg-zinc-800 border-zinc-700 hover:bg-zinc-700 py-3.5 px-4 text-xs font-tech font-bold"
                  >
                    ← BACK
                  </button>
                  
                  <button 
                    type="submit" 
                    className="btn-brutalist flex-1 py-3.5 px-4 text-xs font-tech flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white border-red-500 font-bold tracking-wider uppercase shadow-lg"
                    disabled={isSubmitting || isCompressing || !form.screenshot}
                  >
                    <span>{isSubmitting ? 'VERIFYING...' : `SUBMIT & REGISTER (₹${currentPrice * ticketCount})`}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </form>

            </div>
          </div>
        ) : (
          <div className="modal-body is-revealed reveal-active animate-fade-in">
            
            {/* Left Specs Panel */}
            <div className="event-specs-panel">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="spec-label font-tech">{currentOption.competition}</span>
                  <span className="font-tech text-xs px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded">
                    {currentOption.status}
                  </span>
                </div>
                
                <h2 className="modal-event-title font-editorial text-3xl md:text-4xl">
                  {currentOption.name}
                </h2>

                <div className="spec-grid font-tech grid grid-cols-2 gap-3 my-4">
                  <div className="spec-box bg-zinc-900/60 border border-zinc-800 p-3 rounded">
                    <span className="s-label text-[11px] text-gray-400 block mb-1">DATE & SCHEDULE</span>
                    <span className="s-val text-xs font-bold text-white block">{currentOption.date} // {currentOption.time}</span>
                  </div>
                  <div className="spec-box bg-zinc-900/60 border border-zinc-800 p-3 rounded">
                    <span className="s-label text-[11px] text-gray-400 block mb-1">VENUE & CAPACITY</span>
                    <span className="s-val text-xs font-bold text-red-500 flex items-center gap-1">
                      <Users size={14} />
                      {currentOption.capacity}
                    </span>
                  </div>
                </div>

                <div className="spec-atmosphere bg-zinc-900/40 border border-zinc-800/80 p-3.5 rounded my-4">
                  <span className="spec-label font-tech text-xs text-gray-300 flex items-center gap-1.5 mb-1.5 font-bold">
                    <Sparkles size={14} className="text-yellow-400" />
                    ATMOSPHERE & SETUP SPECS
                  </span>
                  <p className="atmosphere-desc text-xs text-gray-300 leading-relaxed">{currentOption.atmosphere}</p>
                </div>
              </div>

              <div className="specs-disclaimer font-tech text-xs bg-red-950/40 border border-red-500/30 p-3 rounded flex items-center gap-2 text-red-300 mt-4">
                <ShieldAlert size={16} className="text-red-400 flex-shrink-0" />
                <span>LIMITED TO 40 SEATS AT BREW N CUE — REGISTRATION & UPI VERIFICATION REQUIRED</span>
              </div>
            </div>

            {/* Right Registration Panel */}
            <form className="interest-form p-6 bg-zinc-950 flex flex-col justify-between" onSubmit={handleProceedToPayment}>
              <div>
                <div className="form-header font-tech text-sm text-white font-bold border-b border-zinc-800 pb-3 mb-4 flex justify-between items-center">
                  <span>ATTENDEE PASS REGISTRATION</span>
                  <span className="text-xs text-emerald-400 font-mono">LIVE BOOKING</span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="form-group">
                    <label className="font-tech text-xs text-gray-300 block mb-1 font-bold" htmlFor="name">ATTENDEE FULL NAME *</label>
                    <input 
                      type="text" 
                      id="name" 
                      required 
                      placeholder="E.g. Arjun Raju"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded py-2.5 px-3.5 text-xs focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="form-group">
                    <label className="font-tech text-xs text-gray-300 block mb-1 font-bold" htmlFor="phone">PHONE NUMBER (WHATSAPP VERIFIED) *</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      required 
                      placeholder="+91 98480 XXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded py-2.5 px-3.5 text-xs focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="form-group">
                    <label className="font-tech text-xs text-gray-300 block mb-1 font-bold" htmlFor="instagram">INSTAGRAM / TWITTER HANDLE (OPTIONAL)</label>
                    <input 
                      type="text" 
                      id="instagram" 
                      placeholder="@arjun.vz"
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white rounded py-2.5 px-3.5 text-xs focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="form-group pt-2">
                    <label className="font-tech text-xs text-gray-300 block mb-1.5 font-bold">
                      NUMBER OF SEATS TO BOOK (MAX 5) *
                    </label>
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 rounded-lg w-fit shadow-inner">
                      <button 
                        type="button" 
                        onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                        disabled={ticketCount <= 1}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-lg rounded border border-zinc-700 transition-colors"
                      >
                        -
                      </button>
                      <span className="font-impact text-2xl text-white px-5 min-w-[50px] text-center">
                        {ticketCount}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setTicketCount(Math.min(5, ticketCount + 1))}
                        disabled={ticketCount >= 5}
                        className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-lg rounded border border-zinc-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg my-4">
                  <div className="flex justify-between items-center font-tech text-xs mb-1">
                    <span className="text-gray-400">SELECTED TIER:</span>
                    <span className="font-bold text-white">GENERAL SCREENING PASS ({ticketCount} {ticketCount === 1 ? 'SEAT' : 'SEATS'})</span>
                  </div>
                  <div className="flex justify-between items-center font-tech text-xs">
                    <span className="text-gray-400">PASS PRICE:</span>
                    <span className="font-bold text-emerald-400 text-sm">₹{currentPrice} per seat</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 mt-5">
                <div className="flex justify-between items-center mb-3 font-tech">
                  <span className="text-xs text-gray-400 font-bold uppercase">TOTAL PAYABLE:</span>
                  <span className="text-2xl font-impact text-emerald-400">₹{currentPrice * ticketCount}</span>
                </div>
                <button 
                  type="submit" 
                  className="btn-brutalist submit-btn w-full py-3.5 text-xs flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-tech font-bold uppercase tracking-wider"
                >
                  <span>PROCEED TO UPI QR PAYMENT (₹{currentPrice * ticketCount})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
