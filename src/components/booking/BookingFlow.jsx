import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShieldCheck, AlertTriangle, QrCode, Upload, RefreshCw, MapPin, Users, Ticket, Award } from 'lucide-react';
import { ticketingService } from '../../services/ticketingService';
import RollingText from '../RollingText';
import LineReveal, { RevealItem } from '../LineReveal';
import './BookingFlow.css';

/**
 * BookingFlow — Master Controller for the INOX 147-seat FIFA World Cup Final Booking Experience.
 * Manages 5 modular pages/steps:
 * 1. Overview (Event info & rules)
 * 2. Seat Map (Interactive BookMyShow-style cinema seat selection with consecutive enforcement)
 * 3. Contact Details (Atomic seat reservation + starts 10-minute countdown)
 * 4. UPI QR Payment (Timer countdown + UTR + Screenshot submission)
 * 5. Confirmation & Timeline (Booking status & digital ticket preview)
 */
export default function BookingFlow({ onReturnHome }) {
  const [step, setStep] = useState('overview'); // 'overview' | 'seatmap' | 'contact' | 'payment' | 'confirmation'
  const [ticketingData, setTicketingData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [ruleError, setRuleError] = useState(null);
  
  // Contact Form State
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('+91 ');
  const [userEmail, setUserEmail] = useState('');
  const [isReserving, setIsReserving] = useState(false);

  // Active Booking State (after reservation created)
  const [activeBooking, setActiveBooking] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 minutes (600s)

  // Payment State
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Load ticketing state whenever step changes
  const reloadTicketingData = () => {
    const data = ticketingService.getTicketingData();
    setTicketingData(data);
  };

  useEffect(() => {
    reloadTicketingData();
  }, [step]);

  // 10-Minute Countdown Timer Loop when activeBooking exists and status is HELD or PENDING_PAYMENT
  useEffect(() => {
    if (!activeBooking || !['HELD', 'PENDING_PAYMENT'].includes(activeBooking.status)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(activeBooking.expires_at).getTime();
      const diffSeconds = Math.round((expires - now) / 1000);

      if (diffSeconds <= 0) {
        clearInterval(interval);
        setCountdown(0);
        // Automatically run cleanup and update booking state
        const updated = ticketingService.getTicketingData();
        setTicketingData(updated);
        const expiredBooking = updated.bookings.find(b => b.id === activeBooking.id);
        if (expiredBooking) {
          setActiveBooking(expiredBooking);
        }
      } else {
        setCountdown(diffSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBooking]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 2: Seat Selection Handler
  const handleSeatClick = (seat) => {
    setRuleError(null);
    if (seat.status !== 'AVAILABLE') return;

    let updatedSelection = [...selectedSeats];
    if (updatedSelection.includes(seat.label)) {
      updatedSelection = updatedSelection.filter(l => l !== seat.label);
    } else {
      updatedSelection.push(seat.label);
    }

    // If more than 4, reject
    if (updatedSelection.length > 4) {
      setRuleError('[ RULE VIOLATION ] MAXIMUM 4 SEATS ALLOWED PER BOOKING.');
      return;
    }

    // Validate consecutive rule on current selection
    if (updatedSelection.length > 1) {
      const check = ticketingService.validateConsecutiveSelection(updatedSelection);
      if (!check.valid) {
        setRuleError(`[ RULE VIOLATION ] ${check.error.toUpperCase()}`);
        return;
      }
    }

    setSelectedSeats(updatedSelection);
  };

  // Step 3: Trigger Atomic Reservation
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!userName || userPhone.length < 10 || !userEmail.includes('@')) {
      alert('Please fill out all contact details with valid phone and email.');
      return;
    }

    setIsReserving(true);
    try {
      const newBooking = await ticketingService.createReservation({
        userName,
        userPhone,
        userEmail,
        selectedSeats
      });
      setActiveBooking(newBooking);
      setStep('payment');
    } catch (err) {
      alert(`Reservation Failed: ${err.message}`);
      reloadTicketingData(); // Refresh seat map
      setStep('seatmap');
    } finally {
      setIsReserving(false);
    }
  };

  // Step 4: Submit UPI Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!screenshotUrl) {
      alert('Please upload your payment screenshot before confirming.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const updated = await ticketingService.submitPayment(activeBooking.id, {
        utr: utrNumber || 'SCREENSHOT_VERIFIED',
        screenshotUrl: screenshotUrl
      });
      setActiveBooking(updated);
      setStep('confirmation');
    } catch (err) {
      alert(`Payment Submission Error: ${err.message}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsCompressing(true);
        setScreenshotName(file.name);
        const dataUrl = await processAndCompressImage(file);
        setScreenshotUrl(dataUrl);
      } catch (err) {
        alert(`Screenshot processing error: ${err.message}`);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  if (!ticketingData) return <div className="booking-root text-center py-12 font-tech">INITIALIZING INOX SEAT MATRIX...</div>;

  const { event, seats } = ticketingData;
  const totalSeatsSold = seats.filter(s => ['HELD', 'BOOKED'].includes(s.status)).length;
  const seatsAvailableCount = seats.filter(s => s.status === 'AVAILABLE').length;

  return (
    <div className="booking-root">
      
      {/* Top Header Bar */}
      <div className="grid-container">
        <div className="booking-header-bar">
          <div className="h-left">
            <span className="booking-step-badge">
              <Ticket size={14} />
              <span>INOX AUDITORIUM 03 // VISAKHAPATNAM</span>
            </span>
            <h1 className="booking-event-title font-impact">{event.name}</h1>
            <p className="booking-venue-sub">{event.venue} — {event.date} // {event.time}</p>
          </div>

          <div className="h-right flex items-center gap-4">
            {activeBooking && ['HELD', 'PENDING_PAYMENT'].includes(activeBooking.status) && countdown > 0 && (
              <div className="timer-pill">
                <Clock size={16} />
                <span>RESERVATION EXPIRES IN: {formatCountdown(countdown)}</span>
              </div>
            )}
            <button 
              className="btn-brutalist-outline text-xs py-2 px-4"
              onClick={onReturnHome}
            >
              <ArrowLeft size={14} />
              <RollingText text="RETURN TO PUBLIC SITE" stagger={true} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 1: OVERVIEW & SCREENING RULES (STREAMLINED FOR FAST CHECKOUT)
          ========================================================================= */}
      {step === 'overview' && (
        <div className="grid-container">
          <div className="booking-overview-grid max-w-4xl mx-auto">
            <div className="overview-main w-full">
              <div className="overview-banner-card bg-zinc-900 border border-zinc-800 p-8 is-revealed reveal-active animate-fade-in">
                <LineReveal delay={0.1} className="section-index font-tech text-red-500 text-xs">// SCREEN 03 // INOX VARUN'S MALL</LineReveal>
                <LineReveal delay={0.2} as="h2" className="text-3xl font-impact text-white mt-1 mb-3">FIFA WORLD CUP FINAL // LIVE SCREENING</LineReveal>
                <RevealItem delay={0.3} className="text-gray-300 text-sm mb-6 leading-relaxed">
                  Join Visakhapatnam's most passionate collective inside an acoustically engineered 147-seat auditorium. Synchronized stadium sound arrays and private laser projection.
                </RevealItem>

                <RevealItem delay={0.4} className="grid grid-cols-2 gap-4 mb-8 bg-black/40 p-4 border border-zinc-800 font-tech text-sm">
                  <div>
                    <span className="text-gray-400 block text-xs">// TICKET PRICE</span>
                    <strong className="text-white text-lg">₹{event.ticket_price}</strong> <span className="text-xs text-gray-400">ALL INCLUSIVE</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs">// SEATS AVAILABLE</span>
                    <strong className="text-red-500 text-lg">{seatsAvailableCount} / 147</strong> <span className="text-xs text-gray-400">OPEN NOW</span>
                  </div>
                </RevealItem>

                <RevealItem delay={0.5} className="booking-rules-box bg-zinc-950 border border-zinc-800 p-4 mb-8">
                  <div className="rules-title font-tech text-xs text-gray-400 mb-2">// QUICK BOOKING RULES</div>
                  <ul className="text-xs text-gray-300 space-y-2 font-tech">
                    <li className="flex items-center gap-2"><span className="text-red-500">●</span> <strong>MAX 4 SEATS:</strong> Up to 4 consecutive seats per transaction.</li>
                    <li className="flex items-center gap-2"><span className="text-yellow-500">●</span> <strong>CONSECUTIVE ONLY:</strong> Seats must be adjacent within the exact same row.</li>
                    <li className="flex items-center gap-2"><span className="text-emerald-500">●</span> <strong>10-MIN TIMER:</strong> Complete UPI verification within 10 mins once seats are picked.</li>
                  </ul>
                </RevealItem>

                <RevealItem delay={0.6}>
                  <button 
                    className="btn-brutalist w-full py-4 text-center justify-center text-sm"
                    onClick={() => setStep('seatmap')}
                  >
                    <RollingText text="SELECT SEATS ON SCREEN 3 MAP →" stagger={true} />
                  </button>
                </RevealItem>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 2: INTERACTIVE BOOKMYSHOW-STYLE CINEMA SEAT MAP (INOX VARUN'S MALL)
          ========================================================================= */}
      {step === 'seatmap' && (
        <div className="grid-container">
          <div className="seatmap-container">
            
            {ruleError && (
              <div className="rule-warning-banner animate-bounce">
                <span>{ruleError}</span>
                <button onClick={() => setRuleError(null)} className="underline text-xs">DISMISS</button>
              </div>
            )}

            <div className="cinema-screen-wrap">
              <div className="cinema-screen-bar" />
              <span className="cinema-screen-label font-tech text-xs">// SCREEN 3 — INOX VARUN'S MALL, VISAKHAPATNAM // ALL SIGHTLINES UNBLOCKABLE //</span>
            </div>

            {/* Legend */}
            <div className="seatmap-legend mb-6">
              <div className="legend-item"><div className="legend-box legend-available" /><span>AVAILABLE (₹{event.ticket_price || 1})</span></div>
              <div className="legend-item"><div className="legend-box legend-selected" /><span>SELECTED</span></div>
              <div className="legend-item"><div className="legend-box legend-held" /><span>HELD</span></div>
              <div className="legend-item"><div className="legend-box legend-booked" /><span>BOOKED</span></div>
            </div>

            {/* Seat Rows Grid (Rows K down to A matching physical diagram exactly) */}
            <div className="seatmap-grid-wrap overflow-x-auto pb-6">
              {['K','J','I','H','G','F','E','D','C','B','A'].map((rowLabel) => {
                const rowSeats = seats
                  .filter(s => s.row_label === rowLabel)
                  .sort((a, b) => b.seat_number - a.seat_number);

                return (
                  <div key={rowLabel} className="seatmap-row flex items-center justify-center gap-2 my-1">
                    <span className="row-label-text font-bold text-xs w-6 text-center text-red-500 bg-zinc-900 border border-zinc-800 py-1 shrink-0">{rowLabel}</span>
                    
                    <div className="seats-in-row flex items-center gap-1.5 flex-wrap justify-center">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeats.includes(seat.label);
                        const statusClass = isSelected ? 'SELECTED' : seat.status;
                        
                        // Visual gaps corresponding to walkways & stairs
                        const showAisleBreak = seat.seat_number === 13 || seat.seat_number === 7;

                        return (
                          <React.Fragment key={seat.id}>
                            <button
                              type="button"
                              className={`seat-btn seat-${statusClass} w-8 h-8 text-[11px] font-bold rounded-sm border transition-all flex items-center justify-center shrink-0 ${isSelected ? 'bg-white text-black border-white scale-110 shadow-lg shadow-white/30' : seat.status === 'AVAILABLE' ? 'bg-zinc-800 text-gray-300 border-zinc-700 hover:border-red-500 hover:text-white' : 'bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-50'}`}
                              onClick={() => handleSeatClick(seat)}
                              title={`${seat.label} — ${seat.status === 'AVAILABLE' ? `₹${event.ticket_price || 1}` : seat.status}`}
                            >
                              {seat.seat_number}
                            </button>

                            {showAisleBreak && (
                              <div className="w-4 shrink-0" />
                            )}

                            {/* ENTRY / EXIT block on right side of rows K to F */}
                            {seat.seat_number === 7 && ['K','J','I','H','G','F'].includes(rowLabel) && (
                              <div className="flex items-center ml-4 px-3 py-1 bg-orange-950/40 border border-orange-500/50 text-orange-400 font-tech text-[10px] rounded shrink-0">
                                {rowLabel === 'I' ? 'ENTRY / EXIT →' : '▪ ▪ ▪'}
                              </div>
                            )}

                            {/* Stairs aisle gap on rows E, D, C, B right where seats 6, 5 would be */}
                            {seat.seat_number === 7 && ['E','D','C','B'].includes(rowLabel) && (
                              <div className="w-8 h-8 flex items-center justify-center text-zinc-600 font-mono text-[10px] shrink-0" title="Stairs / Aisle">
                                ||
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <span className="row-label-text font-bold text-xs w-6 text-center text-red-500 bg-zinc-900 border border-zinc-800 py-1 shrink-0">{rowLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Summary Bar */}
            <div className="seatmap-bottom-bar bg-zinc-900 border-t border-zinc-800 p-4 sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 mt-6">
              <div className="selection-summary font-tech text-sm">
                <div className="summary-seats text-white">
                  {selectedSeats.length > 0 ? (
                    <span>SELECTED SEATS: <strong className="text-red-500 text-base">[{selectedSeats.join(', ')}]</strong> ({selectedSeats.length} SEAT{selectedSeats.length > 1 ? 'S' : ''})</span>
                  ) : (
                    <span className="text-gray-400">CLICK 1 TO 4 CONSECUTIVE SEATS ON MAP ABOVE</span>
                  )}
                </div>
                {selectedSeats.length > 0 && (
                  <div className="summary-total text-gray-300 text-xs mt-0.5">
                    TOTAL PAYABLE: <strong className="text-white text-base">₹{selectedSeats.length * event.ticket_price}</strong> (ALL INCLUSIVE)
                  </div>
                )}
              </div>

              <div>
                {selectedSeats.length > 0 && (
                  <button 
                    className="btn-brutalist py-3 px-6 text-xs"
                    onClick={() => setStep('contact')}
                  >
                    <RollingText text="PROCEED TO CONTACT DETAILS →" stagger={true} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 3: CONTACT DETAILS & ATOMIC RESERVATION LOCK (STREAMLINED)
          ========================================================================= */}
      {step === 'contact' && (
        <div className="grid-container">
          <div className="contact-form-wrap max-w-xl mx-auto bg-zinc-900 border border-zinc-800 p-8 my-6">
            <span className="section-index font-tech text-red-500 text-xs">// 02 — ATTENDEE INFO</span>
            <h2 className="text-2xl font-impact mt-1 mb-4">RESERVE SEATS & START TIMER</h2>

            <div className="bg-black/60 border border-zinc-800 p-4 mb-6 font-tech text-sm flex justify-between items-center">
              <div>
                <span className="text-gray-400 block text-xs">// SELECTED SEATS</span>
                <span className="text-white font-bold text-base">{selectedSeats.join(', ')}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-xs">// TOTAL PAYABLE</span>
                <span className="text-red-500 font-bold text-lg">₹{selectedSeats.length * event.ticket_price}</span>
              </div>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-4 font-tech">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">FULL NAME *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 text-white text-sm outline-none focus:border-red-500"
                  placeholder="e.g. Arjun Raju"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">WHATSAPP PHONE NUMBER * (FOR TICKET QR)</label>
                <input 
                  type="tel" 
                  required 
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 text-white text-sm outline-none focus:border-red-500"
                  placeholder="+91 98480 12345"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">EMAIL ADDRESS *</label>
                <input 
                  type="email" 
                  required 
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 text-white text-sm outline-none focus:border-red-500"
                  placeholder="arjun.raju@gmail.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-zinc-800">
                <button 
                  type="button"
                  className="text-xs text-gray-400 hover:text-white underline"
                  onClick={() => setStep('seatmap')}
                >
                  ← BACK TO SEAT MAP
                </button>
                <button 
                  type="submit" 
                  className="btn-brutalist py-3 px-6 text-xs"
                  disabled={isReserving}
                >
                  <RollingText text={isReserving ? "RESERVING..." : "LOCK SEATS & CONTINUE TO PAYMENT →"} stagger={true} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 4: STATIC UPI QR PAYMENT & UTR SUBMISSION
          ========================================================================= */}
      {step === 'payment' && activeBooking && (
        <div className="grid-container">
          
          {countdown === 0 || activeBooking.status === 'EXPIRED' ? (
            <div className="bg-red-950 border-2 border-red-500 p-8 text-center max-w-xl mx-auto font-tech">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-impact text-white mb-2">RESERVATION TIMER EXPIRED</h2>
              <p className="text-gray-300 text-sm mb-6">
                Your 10-minute reservation window has elapsed. To ensure zero double bookings, seats [{activeBooking.seats.join(', ')}] have been automatically released back to the available pool.
              </p>
              <button 
                className="btn-brutalist py-3 px-6 mx-auto"
                onClick={() => {
                  setSelectedSeats([]);
                  setActiveBooking(null);
                  setStep('seatmap');
                }}
              >
                SELECT NEW SEATS ON MAP
              </button>
            </div>
          ) : (
            <div className="payment-grid max-w-4xl mx-auto my-6 gap-8">
              
              {/* Left: Static UPI QR Code */}
              <div className="upi-qr-card bg-zinc-900 border border-zinc-800 p-6 text-center font-tech">
                <span className="section-index text-red-500 text-xs">// 03 — PAY VIA UPI QR</span>
                <h3 className="text-xl font-impact mt-1 mb-1">SCAN & PAY ₹{activeBooking.total_amount}</h3>
                <p className="text-xs text-gray-400 mb-4">GPay // PhonePe // Paytm // CRED</p>

                <div className="qr-image-box bg-white p-3 inline-block rounded border border-zinc-700 mx-auto">
                  <img 
                    src="/guildqr.png" 
                    alt="Official Guild UPI QR Code" 
                    className="qr-code-img w-48 h-48 mx-auto object-contain"
                  />
                </div>

                <div className="mt-4 bg-zinc-950 p-3 border border-zinc-800 text-left">
                  <span className="text-[10px] text-gray-400 block">// OFFICIAL UPI ID</span>
                  <div className="upi-id-box font-mono font-bold text-sm text-purple-300">steveoguri07-2@okicici</div>
                </div>
              </div>

              {/* Right: Screenshot Verification Form */}
              <div className="utr-form-card bg-zinc-900 border border-zinc-800 p-6 font-tech">
                <span className="section-index text-red-500 text-xs">// 04 — VERIFY PAYMENT</span>
                <h3 className="text-xl font-impact mt-1 mb-4">UPLOAD PAYMENT SCREENSHOT</h3>

                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed mb-2">
                    After completing the UPI transfer of <strong className="text-emerald-400 font-bold">₹{activeBooking.total_amount}</strong>, uploading a screenshot of your transaction receipt is <strong className="text-red-500 underline">mandatory</strong>. Our sureshot image compression engine secures and embeds it right into your booking record.
                  </p>

                  <div>
                    <label className="block text-xs text-white font-bold mb-1.5">MANDATORY TRANSACTION SCREENSHOT *</label>
                    <div className="screenshot-dropzone bg-zinc-950 border-2 border-dashed border-zinc-700 hover:border-red-500 p-5 text-center cursor-pointer transition-all rounded-lg">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="screenshot-input" 
                        required
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="screenshot-input" className="cursor-pointer block">
                        <Upload size={24} className="mx-auto text-red-500 mb-2" />
                        <span className="text-xs text-gray-200 block font-bold truncate">
                          {isCompressing ? 'COMPRESSING & PROCESSING...' : screenshotName ? `ATTACHED: ${screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT ]'}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          Supported: JPG, PNG, WEBP (Max ~50KB sureshot compression applied automatically)
                        </span>
                      </label>
                      {screenshotUrl && (
                        <div className="mt-4 bg-zinc-900 p-2 rounded border border-zinc-700">
                          <img src={screenshotUrl} alt="Screenshot Preview" className="max-h-36 mx-auto rounded object-contain" />
                          <span className="text-[10px] text-emerald-400 block mt-1">✓ SURESHOT COMPRESSED DATA EMBEDDED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-800">
                    <button 
                      type="submit" 
                      className="btn-brutalist w-full py-3.5 text-center justify-center text-xs bg-red-600 hover:bg-red-500 text-white border-red-500"
                      disabled={isSubmittingPayment || isCompressing || !screenshotUrl}
                    >
                      <RollingText text={isSubmittingPayment ? "SECURING SCREENSHOT & PASS..." : "SUBMIT SCREENSHOT & CONFIRM TICKETS →"} stagger={true} />
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          PAGE 5: BOOKING CONFIRMATION & TIMELINE PAGE
          ========================================================================= */}
      {step === 'confirmation' && activeBooking && (
        <div className="grid-container">
          <div className="confirmation-card">
            
            <div className="text-center mb-8 border-b border-zinc-800 pb-8">
              <CheckCircle2 size={54} className="text-emerald-500 mx-auto mb-4" />
              <LineReveal delay={0.1} className="section-index font-tech text-emerald-400">
                // STATUS: {activeBooking.status === 'CONFIRMED' ? 'TICKETS ISSUED & VERIFIED' : 'UNDER REVIEW — WAITING FOR ADMIN VERIFICATION'}
              </LineReveal>
              <h2 className="text-3xl font-impact text-white mt-2 mb-4">YOUR SEATS ARE RESERVED.</h2>
              <p className="text-gray-300 text-sm max-w-lg mx-auto">
                Thank you, {activeBooking.user_name}. We have received your UTR #{activeBooking.utr}. Our operations team verifies payment screenshots within 30 minutes.
              </p>

              <div className="booking-id-pill">
                <span className="text-xs text-gray-400 block">// UNPREDICTABLE BOOKING ID</span>
                <strong className="text-white font-impact tracking-wider">{activeBooking.id}</strong>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-4 font-tech text-sm bg-zinc-900 border border-zinc-800 p-6 mb-8">
              <div>
                <span className="text-gray-400 block">// AUDITORIUM & SEATS</span>
                <strong className="text-white text-base">INOX AUD 03 — SEATS [{activeBooking.seats.join(', ')}]</strong>
              </div>
              <div>
                <span className="text-gray-400 block">// AMOUNT & UTR</span>
                <strong className="text-white text-base">₹{activeBooking.total_amount} (UTR #{activeBooking.utr})</strong>
              </div>
            </div>

            {/* State Machine Timeline */}
            <div className="mt-6">
              <h4 className="font-tech text-xs text-gray-400 tracking-widest uppercase">// BOOKING STATE MACHINE TIMELINE</h4>
              <div className="timeline-list">
                {activeBooking.timeline && activeBooking.timeline.map((item, idx) => {
                  const isLatest = idx === activeBooking.timeline.length - 1;
                  return (
                    <div key={idx} className={`timeline-item ${isLatest ? 'timeline-active' : ''}`}>
                      <div className="timeline-dot" />
                      <div className="timeline-state">
                        [{item.state}] — <span className="text-xs font-normal text-gray-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="timeline-note">{item.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-zinc-800 flex justify-between items-center">
              <button 
                className="btn-brutalist-outline text-xs py-3 px-6"
                onClick={reloadTicketingData}
              >
                <RefreshCw size={14} />
                <span>REFRESH TIMELINE STATUS</span>
              </button>

              <button 
                className="btn-brutalist py-3 px-6"
                onClick={onReturnHome}
              >
                <RollingText text="BACK TO HOME SCREEN" stagger={true} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
