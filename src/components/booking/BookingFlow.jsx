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
          <div className="max-w-6xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-left">
              
              {/* Left Column: Venue, Title, Date/Time, and Pricing/Includes in distinct colored boxes */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                
                {/* Venue & Title Box */}
                <div className="bg-zinc-950 border-2 border-zinc-800 p-6 md:p-8 rounded-2xl shadow-xl is-revealed reveal-active animate-fade-in">
                  <div className="inline-block bg-red-950/80 border border-red-500/60 text-red-400 font-tech font-bold text-sm md:text-base px-4 py-2 rounded-lg uppercase tracking-wider mb-4 shadow">
                    VARUN INOX, BEACH ROAD, VIZAG
                  </div>
                  <h2 className="text-4xl md:text-6xl font-impact text-white uppercase tracking-tight leading-none my-2">
                    FIFA WORLD CUP FINAL
                  </h2>
                </div>

                {/* Date & Timing Box */}
                <div className="bg-emerald-950/30 border-2 border-emerald-500/60 p-6 rounded-2xl shadow-xl">
                  <div className="font-tech text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">// EVENT DATE & TIMING</div>
                  <div className="text-2xl md:text-4xl font-impact text-white tracking-wide">
                    20TH JULY | 00:30 AM ONWARDS
                  </div>
                </div>

                {/* Pricing & Includes Box */}
                <div className="bg-purple-950/30 border-2 border-purple-500/60 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <div className="font-tech text-xs text-purple-300 font-bold uppercase tracking-widest mb-1">// OFFICIAL PASS PRICING</div>
                    <div className="text-5xl md:text-6xl font-impact text-white tracking-tight">₹{event.ticket_price}/-</div>
                  </div>
                  <div className="bg-purple-900/70 border-2 border-purple-400/80 text-purple-200 font-tech text-xs md:text-sm font-bold uppercase tracking-wider py-3.5 px-5 rounded-xl shadow-lg text-left">
                    <span className="text-purple-300 block text-[11px] mb-1">// COVERAGE INCLUDED:</span>
                    <span className="text-white text-base md:text-lg font-black tracking-wide block">SEATING PRICE + SNACK + BEVERAGE</span>
                  </div>
                </div>

              </div>

              {/* Right Column: Booking Rules in distinct box with larger heading */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="bg-zinc-900 border-2 border-red-500/60 p-6 md:p-8 rounded-2xl shadow-2xl flex-1 flex flex-col justify-center">
                  
                  <div className="text-xl md:text-2xl font-impact text-red-400 uppercase tracking-wide border-b-2 border-zinc-800 pb-4 mb-6 flex items-center gap-3">
                    <ShieldCheck className="text-red-500 shrink-0" size={28} />
                    <span>SEAT RESERVATION & BOOKING RULES</span>
                  </div>

                  <ul className="space-y-5 font-tech">
                    <li className="flex items-start gap-3.5 text-sm md:text-base text-gray-200 leading-relaxed">
                      <span className="text-red-500 font-black text-xl leading-none mt-0.5">●</span>
                      <span>
                        <strong className="text-white font-bold uppercase">MAX 4 SEATS:</strong> Select up to 4 seats per booking. Use our pre-select counter before or during seat map selection.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5 text-sm md:text-base text-gray-200 leading-relaxed">
                      <span className="text-yellow-500 font-black text-xl leading-none mt-0.5">●</span>
                      <span>
                        <strong className="text-white font-bold uppercase">CONSECUTIVE ADJACENT:</strong> Multiple seats must be consecutive within the same row (e.g. D1 to D3 automatically picks D2).
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5 text-sm md:text-base text-gray-200 leading-relaxed">
                      <span className="text-emerald-500 font-black text-xl leading-none mt-0.5">●</span>
                      <span>
                        <strong className="text-white font-bold uppercase">10-MIN UPI TIMER:</strong> Complete your UPI transaction and attach screenshot within 10 minutes once seats are locked.
                      </span>
                    </li>
                  </ul>

                </div>
              </div>

            </div>

            {/* Bottom Centered CTA Button: BOOK YOUR SEATS */}
            <div className="mt-10 flex justify-center">
              <button 
                className="btn-brutalist w-full max-w-xl py-5 px-12 text-center justify-center text-lg md:text-xl font-impact tracking-widest uppercase bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xl transition-all hover:scale-105"
                onClick={() => setStep('seatmap')}
              >
                <RollingText text="BOOK YOUR SEATS →" stagger={true} />
              </button>
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
            <div className="bg-zinc-950 border-2 border-red-500/50 p-6 md:p-8 rounded-2xl mb-8 max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="text-left">
                <div className="font-tech text-base md:text-lg text-red-400 font-bold uppercase tracking-wider">// NUMBER OF SEATS TO BOOK (MAX 5)</div>
                <div className="font-tech text-xs text-gray-300 mt-1">Select your exact seat count using the +/- buttons below before picking on the map</div>
              </div>
              <div className="flex items-center gap-4 bg-black border-2 border-zinc-700 p-2 rounded-xl shadow-inner">
                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.max(1, targetSeatCount - 1))}
                  disabled={targetSeatCount <= 1}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-3xl rounded-lg border border-zinc-600 transition-all cursor-pointer"
                >
                  -
                </button>
                <span className="font-impact text-4xl md:text-5xl text-white px-5 min-w-[64px] text-center">
                  {targetSeatCount}
                </span>
                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.min(5, targetSeatCount + 1))}
                  disabled={targetSeatCount >= 5}
                  className="w-14 h-14 flex items-center justify-center bg-zinc-800 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-3xl rounded-lg border border-zinc-600 transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cinema Screen Bar with ALL EYES THIS WAY */}
            <div className="text-center mb-8">
              <div className="font-impact text-xl md:text-3xl text-yellow-400 tracking-[0.3em] uppercase font-bold animate-pulse mb-3">
                // ALL EYES THIS WAY ↓ //
              </div>
              <div className="cinema-screen-wrap">
                <div className="cinema-screen-bar" />
                <span className="cinema-screen-label font-tech text-xs text-gray-400">// VARUN INOX, BEACH ROAD, VIZAG // ALL SIGHTLINES UNBLOCKABLE //</span>
              </div>
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
                              <div className="seat-gap gap-[64px]" />
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
                    <span className="text-gray-500">// SELECT YOUR SEATS TO PROCEED</span>
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
        <div className="grid-container py-8">
          <div className="max-w-4xl mx-auto bg-zinc-900 border-2 border-zinc-800 p-8 md:p-12 rounded-2xl shadow-2xl">
            <div className="text-center mb-8">
              <span className="font-tech text-red-500 text-xs font-bold tracking-widest uppercase">// 02 — MANDATORY ATTENDEE INFO</span>
              <h2 className="text-3xl md:text-5xl font-impact text-white uppercase tracking-tight mt-1">RESERVE SEATS & START TIMER</h2>
            </div>

            {/* Prominent Highlights for Selected Seats and Total Payable Amount */}
            <div className="bg-zinc-950 border-2 border-red-500/60 p-6 md:p-8 rounded-2xl mb-10 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl text-center sm:text-left">
              <div>
                <span className="text-gray-400 block text-xs font-tech font-bold uppercase tracking-widest mb-1">// SELECTED SEATS HIGHLIGHT</span>
                <div className="text-2xl md:text-4xl font-impact text-red-400 bg-red-950/60 border border-red-500/40 px-5 py-2.5 rounded-xl inline-block shadow tracking-wider">
                  [{selectedSeats.join(', ')}]
                </div>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-gray-400 block text-xs font-tech font-bold uppercase tracking-widest mb-1">// TOTAL PAYABLE AMOUNT (ALL INCLUSIVE)</span>
                <div className="text-4xl md:text-5xl font-impact text-emerald-400 tracking-tight">
                  ₹{selectedSeats.length * event.ticket_price}/-
                </div>
              </div>
            </div>

            {/* Separate Columns for Name, Phone, and Email */}
            <form onSubmit={handleCreateReservation} className="space-y-8 font-tech">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                
                <div>
                  <label className="block text-xs md:text-sm font-tech font-bold text-red-400 uppercase tracking-widest mb-2.5">
                    FULL NAME *
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-4 bg-black border-2 border-zinc-700 focus:border-red-500 text-white font-mono text-lg rounded-xl shadow-inner outline-none transition-all placeholder:text-zinc-600"
                    placeholder="e.g. Arjun Raju"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-tech font-bold text-red-400 uppercase tracking-widest mb-2.5">
                    10-DIGIT MOBILE NUMBER *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10"
                    pattern="[0-9]{10}"
                    className="w-full p-4 bg-black border-2 border-zinc-700 focus:border-red-500 text-white font-mono text-lg rounded-xl shadow-inner outline-none transition-all placeholder:text-zinc-600"
                    placeholder="9848012345"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-tech font-bold text-red-400 uppercase tracking-widest mb-2.5">
                    EMAIL ADDRESS *
                  </label>
                  <input 
                    type="email" 
                    required 
                    className="w-full p-4 bg-black border-2 border-zinc-700 focus:border-red-500 text-white font-mono text-lg rounded-xl shadow-inner outline-none transition-all placeholder:text-zinc-600"
                    placeholder="arjun.raju@gmail.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>

              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-zinc-800">
                <button 
                  type="button"
                  className="text-xs md:text-sm font-bold text-gray-400 hover:text-white underline cursor-pointer"
                  onClick={() => setStep('seatmap')}
                >
                  ← BACK TO SEAT MAP
                </button>
                <button 
                  type="submit" 
                  className="btn-brutalist py-4 px-8 text-sm md:text-base font-impact tracking-wider uppercase bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xl transition-all hover:scale-105 cursor-pointer"
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
            <div className="max-w-5xl mx-auto bg-zinc-950 border-2 border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl my-8 font-tech">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                
                {/* Left Column: Static UPI QR Code ONLY */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-2xl text-center shadow-xl w-full">
                  <span className="text-red-500 font-bold text-xs md:text-sm tracking-widest uppercase mb-6 block">
                    // OFFICIAL SCANNER QR
                  </span>
                  
                  <div className="w-64 h-64 bg-white p-4 rounded-2xl shadow-inner border-4 border-zinc-200 mx-auto flex items-center justify-center">
                    <img 
                      src="/guildqr.png" 
                      alt="Official Guild UPI QR Code" 
                      className="w-full h-full object-contain block mx-auto"
                    />
                  </div>
                  
                  <span className="text-xs text-gray-400 font-bold mt-6 tracking-wider uppercase block">
                    GPay // PhonePe // Paytm // CRED
                  </span>
                </div>

                {/* Right Column: Exactly the required 4 items clearly stated */}
                <form onSubmit={handleSubmitPayment} className="md:col-span-7 flex flex-col justify-between space-y-6 text-left w-full">
                  
                  <div>
                    <span className="text-red-400 font-bold text-xs uppercase tracking-widest mb-1 block">
                      // MANDATORY PAYMENT STEP
                    </span>
                    <h3 className="text-2xl md:text-3xl font-impact text-white uppercase tracking-tight">
                      COMPLETE YOUR UPI PAYMENT
                    </h3>
                  </div>

                  {/* 1. Official UPI ID */}
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase block mb-2 tracking-wider">
                      1. OFFICIAL UPI ID
                    </label>
                    <div className="flex items-center justify-between bg-black border-2 border-purple-500/50 py-4 px-5 rounded-xl text-base md:text-lg font-mono text-white shadow">
                      <span className="font-bold tracking-wide select-all">steveoguri07-2@okicici</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText('steveoguri07-2@okicici');
                          alert('UPI ID copied to clipboard!');
                        }} 
                        className="text-purple-300 hover:text-white transition-colors bg-purple-950/80 border border-purple-500/50 py-1.5 px-3 rounded.lg text-xs font-tech font-bold uppercase cursor-pointer"
                      >
                        COPY
                      </button>
                    </div>
                  </div>

                  {/* 2. Total Amount to Pay */}
                  <div>
                    <label className="text-xs text-gray-400 font-bold uppercase block mb-2 tracking-wider">
                      2. TOTAL AMOUNT TO BE PAID
                    </label>
                    <div className="bg-black border-2 border-emerald-500/50 py-4 px-5 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-300 block font-tech">({activeBooking.seats.length} {activeBooking.seats.length === 1 ? 'Seat' : 'Seats'} × ₹{event.ticket_price})</span>
                        <span className="text-xs text-emerald-400 font-bold tracking-wider block mt-0.5 uppercase">SEATING + SNACK + BEVERAGE</span>
                      </div>
                      <span className="font-impact text-4xl md:text-5xl text-emerald-400">₹{activeBooking.total_amount}/-</span>
                    </div>
                  </div>

                  {/* 3. Mandatory Transaction Screenshot Upload */}
                  <div>
                    <label className="text-xs text-white font-bold uppercase block mb-2 tracking-wider flex items-center justify-between">
                      <span>3. MANDATORY TRANSACTION SCREENSHOT *</span>
                      <span className="text-xs text-red-500 font-mono bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded">[REQUIRED]</span>
                    </label>
                    <div className="bg-black border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-xl p-6 text-center cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="screenshot-input" 
                        required
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="screenshot-input" className="cursor-pointer block">
                        <Upload size={28} className="mx-auto text-red-500 mb-2" />
                        <span className="text-sm text-gray-200 block font-bold truncate">
                          {isCompressing ? 'COMPRESSING & PROCESSING...' : screenshotName ? `ATTACHED: ${screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT TO UPLOAD ]'}
                        </span>
                      </label>
                      {screenshotUrl && (
                        <div className="mt-4 bg-zinc-900 p-2 rounded-lg border border-zinc-700 inline-block">
                          <img src={screenshotUrl} alt="Screenshot Preview" className="max-h-32 mx-auto rounded object-contain block" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Confirm / Submit Button */}
                  <div className="pt-2 border-t border-zinc-800">
                    <button 
                      type="submit" 
                      className="btn-brutalist w-full py-5 text-center justify-center text-sm md:text-base bg-red-600 hover:bg-red-500 text-white border-red-500 font-impact tracking-widest uppercase shadow-2xl transition-all hover:scale-105 cursor-pointer mt-2"
                      disabled={isSubmittingPayment || isCompressing || !screenshotUrl}
                    >
                      <RollingText text={isSubmittingPayment ? "SECURING SCREENSHOT & PASS..." : `SUBMIT SCREENSHOT & CONFIRM TICKETS (₹${activeBooking.total_amount}) →`} stagger={true} />
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
