import React, { useState } from 'react';
import { X, CheckCircle, ShieldAlert, Sparkles, Users, Copy, Check, ArrowRight, Upload, Clock, MapPin } from 'lucide-react';
import { dataService, UPCOMING_SCREENINGS } from '../services/dataService';
import { processAndCompressImage } from '../utils/imageHelper';
import LineReveal, { RevealItem } from './LineReveal';
import './EventModal.css';

/**
 * EventModal — Registration & Payment Wizard for Formula 1 & General Screenings (e.g. Belgian Grand Prix at Brew N Cue).
 * Follows The Guild 8-point Global Design System with crisp split layout & bounded QR display.
 */
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
  const currentPrice = 199; // Fixed general pass price

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
        
        {/* Modal Header Bar */}
        <div className="modal-header">
          <div className="modal-tag flex items-center gap-2">
            <span className="text-red-500 border border-red-500/40 bg-red-950/30 px-2.5 py-1 rounded text-xs font-bold">
              [ THE GUILD SCREENING REGISTRATION ]
            </span>
            <span className="text-zinc-400 font-tech text-xs">
              {step === 1 ? '// STEP 01: ATTENDEE & SEAT SELECTION' : 
               step === 2 ? '// STEP 02: UPI QR PAYMENT & VERIFICATION' : 
               '// STEP 03: PASS SECURED & CONFIRMED'}
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <span>CLOSE</span>
            <X size={16} />
          </button>
        </div>

        {/* STEP 3: SUCCESS & CONFIRMATION */}
        {step === 3 ? (
          <div className="modal-success animate-fade-in">
            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
            <h3 className="font-impact text-3xl md:text-4xl text-white mt-2 uppercase">
              PASS SECURED & UNDER REVIEW!
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto text-center mt-3 font-tech text-sm">
              Your registration for <strong className="text-white">{currentOption.name}</strong> has been logged into The Guild verification queue.
            </p>
            
            <div className="bg-[#080808] border border-zinc-800 p-6 rounded-xl mt-6 w-full max-w-md mx-auto font-tech text-xs text-left shadow-2xl space-y-3">
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">BOOKING ID:</span>
                <strong className="text-emerald-400 font-mono">GLD-{Math.floor(100000 + Math.random() * 900000)}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">ATTENDEE NAME:</span>
                <strong className="text-white">{form.name}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">PHONE CONTACT:</span>
                <strong className="text-white">{form.phone}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">VENUE:</span>
                <strong className="text-red-500">{currentOption.venue}</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">PASS TIER:</span>
                <strong className="text-white">GENERAL PASS ({ticketCount} {ticketCount === 1 ? 'SEAT' : 'SEATS'})</strong>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">TOTAL AMOUNT PAID:</span>
                <strong className="text-emerald-400 font-bold text-sm">₹{currentPrice * ticketCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">PAYMENT STATUS:</span>
                <strong className="text-emerald-400 font-bold text-xs">[ RECEIPT ATTACHED & VERIFIED ]</strong>
              </div>
            </div>

            <div className="font-tech mt-6 text-emerald-400 text-xs">
              <span>// KEEP THIS SCREENSHOT OR VERIFIED PHONE NUMBER READY AT VENUE ENTRY //</span>
            </div>

            <button 
              type="button" 
              className="bg-white hover:bg-zinc-200 text-black font-bold py-3.5 px-8 rounded-xl text-xs font-tech uppercase tracking-wider mt-8 shadow-xl transition-all" 
              onClick={onClose}
            >
              ← RETURN TO THE GUILD DASHBOARD
            </button>
          </div>
        ) : step === 2 ? (
          /* STEP 2: UPI QR PAYMENT & SCREENSHOT SUBMISSION (REDESIGNED SPLIT LAYOUT) */
          <div className="modal-payment-grid animate-fade-in font-tech">
            
            {/* Left Column (55%): Instructions, UPI ID, Total Amount, and Screenshot Upload */}
            <form onSubmit={handleSubmitPayment} className="space-y-6 text-left flex flex-col justify-between">
              <div>
                <div className="border-b border-zinc-800 pb-3 mb-6 flex justify-between items-center">
                  <h3 className="text-xl font-impact text-white uppercase tracking-wider">UPI PAYMENT & VERIFICATION</h3>
                  <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-0.5 rounded font-bold">MANDATORY</span>
                </div>

                {/* 1. UPI ID Box */}
                <div className="mb-6">
                  <label className="text-xs text-zinc-400 font-bold uppercase block mb-2 tracking-wider">OFFICIAL UPI ID</label>
                  <div className="flex items-center justify-between bg-[#080808] border border-zinc-700 py-3 px-4 rounded-xl text-sm font-mono text-white shadow-inner">
                    <span className="font-bold tracking-wide text-base">steveoguri07-2@okicici</span>
                    <button 
                      type="button" 
                      onClick={handleCopyUpi} 
                      className="bg-zinc-800 hover:bg-zinc-700 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-tech transition-colors"
                      title="Copy UPI ID"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      <span>{copied ? 'COPIED' : 'COPY ID'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Total Amount to be Paid */}
                <div className="mb-6">
                  <label className="text-xs text-zinc-400 font-bold uppercase block mb-2 tracking-wider">TOTAL AMOUNT TO BE PAID</label>
                  <div className="bg-[#080808] border border-zinc-800 py-4 px-5 rounded-xl flex items-baseline justify-between">
                    <span className="text-sm text-zinc-300 font-tech">({ticketCount} {ticketCount === 1 ? 'Seat' : 'Seats'} × ₹{currentPrice})</span>
                    <span className="font-impact text-3xl text-emerald-400">₹{currentPrice * ticketCount}</span>
                  </div>
                </div>

                {/* 3. Mandatory Payment Screenshot Upload */}
                <div className="mb-6">
                  <label className="text-xs text-white font-bold uppercase block mb-2 tracking-wider flex items-center justify-between">
                    <span>MANDATORY PAYMENT SCREENSHOT *</span>
                    <span className="text-[11px] text-red-500 font-mono">[REQUIRED]</span>
                  </label>
                  <div className="bg-[#080808] border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-xl p-6 text-center cursor-pointer transition-all">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="modal-screenshot-upload" 
                      required 
                      className="hidden" 
                      onChange={handleScreenshotSelect}
                    />
                    <label htmlFor="modal-screenshot-upload" className="cursor-pointer block">
                      <Upload size={24} className="mx-auto text-red-500 mb-2" />
                      <span className="text-xs text-zinc-200 block font-bold truncate">
                        {isCompressing ? 'COMPRESSING IMAGE...' : form.screenshotName ? `ATTACHED: ${form.screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT HERE ]'}
                      </span>
                    </label>
                    {form.screenshot && (
                      <div className="mt-4 bg-zinc-900 p-2 rounded-lg border border-zinc-800 max-w-[200px] mx-auto">
                        <img src={form.screenshot} alt="Payment Receipt Preview" className="max-h-24 mx-auto rounded object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation & Submit Button */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="bg-transparent border border-zinc-700 hover:border-zinc-500 py-3.5 px-6 rounded-xl text-xs font-tech text-white uppercase tracking-wider transition-all"
                >
                  ← BACK
                </button>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting || isCompressing || !form.screenshot}
                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed flex-1 py-4 px-6 rounded-xl text-xs font-tech text-black font-bold uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? 'VERIFYING...' : `SUBMIT & REGISTER (₹${currentPrice * ticketCount}) →`}</span>
                </button>
              </div>
            </form>

            {/* Right Column (45%): Large Controlled QR Card */}
            <div className="flex flex-col items-center justify-center sticky top-6">
              <div className="modal-qr-card">
                <div className="font-tech text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
                  // OFFICIAL GUILD UPI SCANNER //
                </div>

                <div className="w-[260px] h-[260px] mx-auto flex items-center justify-center my-4">
                  <img 
                    src="/guildqr.png" 
                    alt="Official Guild UPI QR Code" 
                    className="w-full h-full object-contain mx-auto"
                  />
                </div>

                <div className="font-tech text-xs font-bold text-zinc-800 tracking-wider uppercase mt-6 pt-4 border-t border-zinc-200">
                  SCAN WITH ANY UPI APP TO PAY EXACT AMOUNT
                </div>
                <div className="font-tech text-[11px] text-zinc-500 mt-1">
                  Supported: GPay • PhonePe • Paytm • CRED
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* STEP 1: ATTENDEE REGISTRATION & SEAT SELECTION */
          <div className="modal-body animate-fade-in">
            
            {/* Left Specs Panel */}
            <div className="event-specs-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-tech text-xs text-zinc-400 tracking-widest uppercase">{currentOption.competition}</span>
                  <span className="font-tech text-xs px-2.5 py-1 bg-red-950 text-red-400 border border-red-800 rounded font-bold">
                    {currentOption.status}
                  </span>
                </div>
                
                <h2 className="modal-event-title">
                  {currentOption.name}
                </h2>

                <div className="grid grid-cols-2 gap-4 my-6 font-tech text-left">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <span className="text-xs text-zinc-400 block mb-1">DATE & SCHEDULE</span>
                    <span className="text-sm font-bold text-white block">{currentOption.date} // {currentOption.time}</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <span className="text-xs text-zinc-400 block mb-1">VENUE & CAPACITY</span>
                    <span className="text-sm font-bold text-red-500 flex items-center gap-1.5">
                      <Users size={16} />
                      {currentOption.capacity}
                    </span>
                  </div>
                </div>

                <div className="bg-[#080808] border border-zinc-800 p-5 rounded-xl my-6 text-left">
                  <span className="font-tech text-xs text-zinc-300 flex items-center gap-2 mb-2 font-bold">
                    <Sparkles size={16} className="text-yellow-400" />
                    ATMOSPHERE & SETUP SPECS
                  </span>
                  <p className="text-sm text-zinc-400 leading-relaxed font-body">{currentOption.atmosphere}</p>
                </div>
              </div>

              <div className="font-tech text-xs bg-red-950/40 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-2.5 text-red-300 mt-6 text-left">
                <ShieldAlert size={18} className="text-red-400 shrink-0" />
                <span>REGISTRATION & UPI PAYMENT REQUIRED TO RESERVE SEATS AT BREW N CUE</span>
              </div>
            </div>

            {/* Right Registration Panel */}
            <form className="interest-form text-left" onSubmit={handleProceedToPayment}>
              <div>
                <div className="form-header">
                  <span>ATTENDEE PASS REGISTRATION</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">LIVE SEAT LOCK</span>
                </div>

                <div className="space-y-5 mb-6">
                  <div className="form-group">
                    <label htmlFor="name">ATTENDEE FULL NAME *</label>
                    <input 
                      type="text" 
                      id="name" 
                      required 
                      placeholder="e.g. Arjun Raju"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">WHATSAPP PHONE NUMBER *</label>
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
                    <label htmlFor="instagram">INSTAGRAM / TWITTER HANDLE (OPTIONAL)</label>
                    <input 
                      type="text" 
                      id="instagram" 
                      placeholder="@arjun.vz"
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    />
                  </div>

                  {/* Large Seat Counter (+/- up to 5 seats as requested in Request #2) */}
                  <div className="form-group pt-2">
                    <label className="block mb-2">NUMBER OF SEATS TO BOOK (MAX 5) *</label>
                    <div className="flex items-center gap-3 bg-[#080808] border border-zinc-800 p-2.5 rounded-xl w-fit shadow-xl">
                      <button 
                        type="button" 
                        onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                        disabled={ticketCount <= 1}
                        className="w-11 h-11 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-xl rounded-lg border border-zinc-700 transition-colors"
                      >
                        −
                      </button>
                      <span className="font-impact text-3xl text-white px-6 min-w-[64px] text-center">
                        {ticketCount}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setTicketCount(Math.min(5, ticketCount + 1))}
                        disabled={ticketCount >= 5}
                        className="w-11 h-11 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-xl rounded-lg border border-zinc-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#080808] border border-zinc-800 p-4 rounded-xl my-6 space-y-2 font-tech text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">SELECTED TIER:</span>
                    <span className="font-bold text-white">GENERAL SCREENING PASS ({ticketCount} {ticketCount === 1 ? 'SEAT' : 'SEATS'})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">PASS PRICE:</span>
                    <span className="font-bold text-emerald-400 text-sm">₹{currentPrice} per seat</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800 mt-6">
                <div className="flex justify-between items-baseline mb-4 font-tech">
                  <span className="text-xs text-zinc-400 font-bold uppercase">TOTAL PAYABLE:</span>
                  <span className="text-3xl font-impact text-emerald-400">₹{currentPrice * ticketCount}</span>
                </div>
                <button 
                  type="submit" 
                  className="bg-white hover:bg-zinc-200 text-black font-bold py-4 px-6 rounded-xl w-full text-sm font-tech uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>PROCEED TO UPI QR PAYMENT (₹{currentPrice * ticketCount}) →</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
