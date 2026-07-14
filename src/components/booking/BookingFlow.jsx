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
  const [targetSeatCount, setTargetSeatCount] = useState(2);
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

    // If currently 1 seat is selected, check if user is clicking another seat on the exact same row as an end point
    if (selectedSeats.length === 1 && !selectedSeats.includes(seat.label)) {
      const firstSeatLabel = selectedSeats[0];
      const firstSeatObj = ticketingData.seats.find(s => s.label === firstSeatLabel);
      if (firstSeatObj && firstSeatObj.row_label === seat.row_label) {
        const minNum = Math.min(firstSeatObj.seat_number, seat.seat_number);
        const maxNum = Math.max(firstSeatObj.seat_number, seat.seat_number);
        const rangeCount = maxNum - minNum + 1;
        if (rangeCount <= 4) {
          const rowRangeSeats = ticketingData.seats.filter(
            s => s.row_label === seat.row_label && s.seat_number >= minNum && s.seat_number <= maxNum
          );
          const allAvailable = rowRangeSeats.every(s => s.status === 'AVAILABLE');
          if (allAvailable && rowRangeSeats.length === rangeCount) {
            const rangeLabels = rowRangeSeats.map(s => s.label);
            setSelectedSeats(rangeLabels);
            if (targetSeatCount !== rangeCount) setTargetSeatCount(rangeCount);
            return;
          }
        } else {
          setRuleError('[ RULE VIOLATION ] MAXIMUM 4 SEATS ALLOWED PER BOOKING.');
          return;
        }
      }
    }

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
    if (updatedSelection.length > 0) setTargetSeatCount(updatedSelection.length);
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
              <span>VARUN INOX, BEACH ROAD, VIZAG</span>
            </span>
            <h1 className="booking-event-title font-impact">FIFA WORLD CUP FINAL</h1>
            <p className="booking-venue-sub font-tech font-bold text-emerald-400">20TH JULY | 00:30 AM ONWARDS — ₹{event.ticket_price} (SEATING + SNACK + BEVERAGE)</p>
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
        <div className="grid-container py-8">
          <div className="booking-overview-grid max-w-3xl mx-auto text-center">
            
            {/* Top Important Hierarchy Block */}
            <div className="overview-main w-full bg-zinc-950 border border-zinc-800 p-8 md:p-12 rounded-2xl shadow-2xl is-revealed reveal-active animate-fade-in">
              <LineReveal delay={0.1} className="font-tech text-red-500 text-sm font-bold tracking-widest uppercase mb-2">
                VARUN INOX, BEACH ROAD, VIZAG
              </LineReveal>
              
              <LineReveal delay={0.2} as="h2" className="text-4xl md:text-6xl font-impact text-white uppercase tracking-tight my-2">
                FIFA WORLD CUP FINAL
              </LineReveal>
              
              <LineReveal delay={0.3} className="font-tech text-emerald-400 text-lg md:text-xl font-bold uppercase tracking-wider mb-8">
                20TH JULY | 00:30 AM ONWARDS
              </LineReveal>

              {/* Price & Coverage Highlight Box */}
              <RevealItem delay={0.4} className="bg-zinc-900 border-2 border-zinc-700/80 p-6 rounded-xl max-w-lg mx-auto mb-10 shadow-xl">
                <div className="font-tech text-xs text-gray-400 uppercase tracking-widest mb-1">// OFFICIAL PASS TIER & PRICING</div>
                <div className="font-impact text-5xl text-white my-2">₹{event.ticket_price}/-</div>
                <div className="font-tech text-xs md:text-sm text-emerald-400 font-bold tracking-wider bg-black/60 border border-emerald-500/30 py-2.5 px-4 rounded-lg mt-3 inline-block">
                  INCLUDES: SEATING PRICE + SNACK + BEVERAGE
                </div>
              </RevealItem>

              {/* Separate Booking Rules Box with clear visual hierarchy */}
              <RevealItem delay={0.5} className="booking-rules-box bg-black/60 border border-zinc-800 p-6 rounded-xl max-w-xl mx-auto text-left mb-10">
                <div className="rules-title font-tech text-xs text-red-500 font-bold uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>// SEAT RESERVATION & BOOKING RULES</span>
                </div>
                <ul className="text-xs md:text-sm text-gray-300 space-y-3.5 font-tech">
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold text-base leading-none">●</span> 
                    <span><strong className="text-white">MAX 4 SEATS:</strong> Select up to 4 seats per booking. Use our pre-select counter before or during seat map selection.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-yellow-500 font-bold text-base leading-none">●</span> 
                    <span><strong className="text-white">CONSECUTIVE ADJACENT:</strong> Multiple seats must be consecutive within the same row (e.g. D1 to D3 automatically picks D2).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-500 font-bold text-base leading-none">●</span> 
                    <span><strong className="text-white">10-MIN UPI TIMER:</strong> Complete your UPI transaction and attach screenshot within 10 minutes once seats are locked.</span>
                  </li>
                </ul>
              </RevealItem>

              {/* Centered Action Button */}
              <RevealItem delay={0.6} className="flex justify-center">
                <button 
                  className="btn-brutalist py-4 px-10 text-center justify-center text-sm uppercase tracking-wider font-bold bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xl transition-transform hover:scale-105"
                  onClick={() => setStep('seatmap')}
                >
                  <RollingText text="SELECT SEATS ON SCREEN 3 MAP →" stagger={true} />
                </button>
              </RevealItem>

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

            {/* Target Seat Count Pre-selector Box */}
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl mb-6 max-w-lg mx-auto flex items-center justify-between shadow-xl">
              <div>
                <div className="font-tech text-xs text-red-500 font-bold uppercase tracking-wider">// NUMBER OF SEATS TO BOOK (MAX 4)</div>
                <div className="font-tech text-[11px] text-gray-400 mt-0.5">Click start & end seat (e.g. D1 then D3) to auto-select consecutive seats</div>
              </div>
              <div className="flex items-center gap-3 bg-black border border-zinc-700 p-1.5 rounded-lg">
                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.max(1, targetSeatCount - 1))}
                  disabled={targetSeatCount <= 1}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-base rounded border border-zinc-700"
                >
                  -
                </button>
                <span className="font-impact text-2xl text-white px-3 min-w-[36px] text-center">
                  {targetSeatCount}
                </span>
                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.min(4, targetSeatCount + 1))}
                  disabled={targetSeatCount >= 4}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-base rounded border border-zinc-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="cinema-screen-wrap">
              <div className="cinema-screen-bar" />
              <span className="cinema-screen-label font-tech text-xs">// SCREEN 3 — VARUN INOX, BEACH ROAD, VIZAG // ALL SIGHTLINES UNBLOCKABLE //</span>
            </div>

            {/* Legend */}
            <div className="seatmap-legend mb-6">
              <div className="legend-item"><div className="legend-box legend-available" /><span>AVAILABLE (₹{event.ticket_price})</span></div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-4xl mx-auto my-6 font-tech">
              
              {/* Left Column: Static UPI QR Code ONLY */}
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl h-full text-center">
                <span className="text-red-500 font-bold text-xs tracking-widest uppercase mb-4">// OFFICIAL SCANNER QR</span>
                <div className="bg-white rounded-xl shadow-2xl border-4 border-zinc-200 p-3 flex items-center justify-center" style={{ width: '220px', height: '220px' }}>
                  <img 
                    src="/guildqr.png" 
                    alt="Official Guild UPI QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs text-gray-400 font-bold mt-4 tracking-wider uppercase">GPay // PhonePe // Paytm // CRED</span>
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
                      onClick={() => {
                        navigator.clipboard.writeText('steveoguri07-2@okicici');
                        alert('UPI ID copied to clipboard!');
                      }} 
                      className="text-red-400 hover:text-red-300 transition-colors bg-zinc-800 p-1.5 rounded text-xs font-tech font-bold"
                    >
                      COPY
                    </button>
                  </div>
                </div>

                {/* 2. Total Amount to be Paid & Coverage Note */}
                <div>
                  <label className="text-[11px] text-gray-400 font-bold uppercase block mb-1 tracking-wider">TOTAL AMOUNT TO BE PAID</label>
                  <div className="bg-zinc-900 border border-zinc-800 py-3 px-4 rounded-lg flex flex-col justify-between">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-300 font-tech">({activeBooking.seats.length} {activeBooking.seats.length === 1 ? 'Seat' : 'Seats'} × ₹{event.ticket_price})</span>
                      <span className="font-impact text-3xl text-emerald-400">₹{activeBooking.total_amount}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1 font-bold tracking-wider uppercase">// INCLUDES: SEATING PRICE + SNACK + BEVERAGE</span>
                  </div>
                </div>

                {/* 3. Mandatory Transaction Screenshot Upload */}
                <div>
                  <label className="text-[11px] text-white font-bold uppercase block mb-1.5 tracking-wider flex items-center justify-between">
                    <span>MANDATORY TRANSACTION SCREENSHOT *</span>
                    <span className="text-[10px] text-red-500 font-mono">[REQUIRED]</span>
                  </label>
                  <div className="bg-black border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-lg p-4 text-center cursor-pointer transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="screenshot-input" 
                      required
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="screenshot-input" className="cursor-pointer block">
                      <Upload size={22} className="mx-auto text-red-500 mb-1.5" />
                      <span className="text-xs text-gray-200 block font-bold truncate">
                        {isCompressing ? 'COMPRESSING & PROCESSING...' : screenshotName ? `ATTACHED: ${screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT ]'}
                      </span>
                    </label>
                    {screenshotUrl && (
                      <div className="mt-3 bg-zinc-900 p-2 rounded border border-zinc-700">
                        <img src={screenshotUrl} alt="Screenshot Preview" className="max-h-24 mx-auto rounded object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation & Submit Button */}
                <div className="pt-2 border-t border-zinc-800">
                  <button 
                    type="submit" 
                    className="btn-brutalist w-full py-3.5 text-center justify-center text-xs bg-red-600 hover:bg-red-500 text-white border-red-500 font-bold tracking-wider uppercase shadow-lg"
                    disabled={isSubmittingPayment || isCompressing || !screenshotUrl}
                  >
                    <RollingText text={isSubmittingPayment ? "SECURING SCREENSHOT & PASS..." : `SUBMIT SCREENSHOT & CONFIRM TICKETS (₹${activeBooking.total_amount}) →`} stagger={true} />
                  </button>
                </div>

              </form>

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
