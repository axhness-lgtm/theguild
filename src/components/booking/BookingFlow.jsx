import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ShieldCheck, AlertTriangle, QrCode, Upload, RefreshCw, MapPin, Users, Ticket, Award } from 'lucide-react';
import { ticketingService } from '../../services/ticketingService';
import { processAndCompressImage } from '../../utils/imageHelper';
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
  const [userPhone, setUserPhone] = useState('');
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

  // Load ticketing state whenever step changes and sync live from Supabase cloud
  const reloadTicketingData = async () => {
    // Instant synchronous cache load
    const data = ticketingService.getTicketingData();
    setTicketingData(data);
    // Background live cloud synchronization
    const cloudData = await ticketingService.syncWithCloud();
    if (cloudData) setTicketingData(cloudData);
  };

  useEffect(() => {
    reloadTicketingData();
    const interval = setInterval(reloadTicketingData, 2000);
    return () => clearInterval(interval);
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
        if (rangeCount <= targetSeatCount && rangeCount <= 4) {
          const rowRangeSeats = ticketingData.seats.filter(
            s => s.row_label === seat.row_label && s.seat_number >= minNum && s.seat_number <= maxNum
          );
          const allAvailable = rowRangeSeats.every(s => s.status === 'AVAILABLE');
          if (allAvailable && rowRangeSeats.length === rangeCount) {
            const rangeLabels = rowRangeSeats.map(s => s.label);
            setSelectedSeats(rangeLabels);
            return;
          }
        } else {
          setRuleError(`[ RULE VIOLATION ] YOU MAY SELECT UP TO ${targetSeatCount} SEAT${targetSeatCount > 1 ? 'S' : ''} (MAX 4).`);
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

    // If more than targetSeatCount (max 4), reject
    if (updatedSelection.length > targetSeatCount || updatedSelection.length > 4) {
      setRuleError(`[ RULE VIOLATION ] EXACTLY ${targetSeatCount} SEAT${targetSeatCount > 1 ? 'S' : ''} ALLOWED AS SELECTED IN STEP 1.`);
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
              <span>PVR INOX, BEACH ROAD, VIZAG</span>
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
          PAGE 1: OVERVIEW & SCREENING RULES (HIGH-CONTRAST & USER FRIENDLY)
          ========================================================================= */}
      {step === 'overview' && (
        <div className="grid-container py-8 booking-step-transition">
          <div className="max-w-4xl mx-auto bg-zinc-950 border-2 border-zinc-800 p-6 sm:p-10 md:p-14 rounded-3xl shadow-2xl text-center w-full space-y-line">
            
            {/* Top Badge */}
            <div className="inline-block bg-red-600 text-white font-tech font-bold text-xs sm:text-sm px-5 py-2 rounded-full uppercase tracking-widest mb-6 shadow-lg">
              // OFFICIAL SCREENING PASS //
            </div>

            {/* Main Event Heading */}
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-impact text-white uppercase tracking-tight my-4 leading-none">
              FIFA WORLD CUP FINAL 2026
            </h2>

            {/* Prominent Highlights: Venue & Date/Time */}
            <div className="my-8 space-y-4">
              <div className="text-2xl sm:text-4xl font-impact text-yellow-400 uppercase tracking-wide">
                PVR INOX, BEACH ROAD, VIZAG
              </div>
              <div className="text-xl sm:text-3xl font-impact text-emerald-400 uppercase tracking-wider">
                20TH JULY | 00:30 AM ONWARDS
              </div>
            </div>

            {/* Featured Price & Inclusion Centerpiece Card */}
            <div className="bg-black border-2 border-emerald-500/80 p-6 sm:p-8 rounded-3xl max-w-2xl mx-auto shadow-2xl my-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left space-y-4 sm:space-y-0">
              <div>
                <span className="font-tech text-xs text-gray-400 font-bold uppercase tracking-widest block mb-2">
                  OFFICIAL TICKET PRICING
                </span>
                <div className="text-5xl sm:text-6xl font-impact text-emerald-400 tracking-tight">
                  ₹{event.ticket_price}/-
                </div>
              </div>
              <div className="bg-emerald-950/90 border-2 border-emerald-500/60 text-emerald-200 font-tech text-xs sm:text-sm font-bold uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg text-center">
                <span className="text-emerald-400 block text-[11px] mb-1.5">// WHAT IS INCLUDED:</span>
                <span className="text-white text-base sm:text-lg font-black tracking-wide block">
                  SEATING + SNACK + BEVERAGE
                </span>
              </div>
            </div>

            {/* Booking Rules Section */}
            <div className="mt-14 max-w-3xl mx-auto space-y-6">
              <div className="text-2xl sm:text-3xl font-impact text-white uppercase tracking-wider border-b-2 border-zinc-800 pb-5 mb-8 flex items-center justify-center gap-3">
                <ShieldCheck className="text-red-500 shrink-0" size={32} />
                <span>SEAT RESERVATION & BOOKING RULES</span>
              </div>

              <div className="space-y-6 font-tech">
                {/* Rule 1: Red Highlight */}
                <div className="bg-zinc-900 border-2 border-red-500/80 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 text-left shadow-xl transition-all hover:scale-[1.01]">
                  <span className="bg-red-600 text-white font-impact font-bold text-xs uppercase px-3.5 py-2 rounded-lg shrink-0 tracking-wider">
                    MAX 4 SEATS
                  </span>
                  <span className="text-white text-sm sm:text-base font-medium leading-relaxed">
                    You can select between <strong className="text-red-400 underline">1 and 4 seats</strong> per booking. Choose exact ticket quantity on the next screen.
                  </span>
                </div>

                {/* Rule 2: Yellow Highlight */}
                <div className="bg-zinc-900 border-2 border-yellow-500/80 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 text-left shadow-xl transition-all hover:scale-[1.01]">
                  <span className="bg-yellow-500 text-black font-impact font-bold text-xs uppercase px-3.5 py-2 rounded-lg shrink-0 tracking-wider">
                    ADJACENT SEATS
                  </span>
                  <span className="text-white text-sm sm:text-base font-medium leading-relaxed">
                    Multiple seats must be <strong className="text-yellow-400 underline">consecutive and adjacent</strong> within the same row to ensure your group sits together.
                  </span>
                </div>

                {/* Rule 3: Green Highlight */}
                <div className="bg-zinc-900 border-2 border-emerald-500/80 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 text-left shadow-xl transition-all hover:scale-[1.01]">
                  <span className="bg-emerald-600 text-white font-impact font-bold text-xs uppercase px-3.5 py-2 rounded-lg shrink-0 tracking-wider">
                    10-MIN TIMER
                  </span>
                  <span className="text-white text-sm sm:text-base font-medium leading-relaxed">
                    Once seats are locked on the map, complete your UPI payment and <strong className="text-emerald-400 underline">upload the screenshot within 10 minutes</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Centered CTA Button */}
            <div className="mt-14 w-full flex justify-center items-center pt-4">
              <button 
                type="button"
                className="btn-brutalist mx-auto block w-full max-w-xl py-5 px-10 text-center justify-center text-lg sm:text-2xl font-impact tracking-widest uppercase bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xl transition-all hover:scale-105 cursor-pointer rounded-2xl"
                onClick={() => setStep('seatcount')}
              >
                <RollingText text="PROCEED TO SEAT SELECTION →" stagger={true} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 1.5: DEDICATED SEAT COUNT QUANTITY PICKER (BEFORE MAP)
          ========================================================================= */}
      {/* =========================================================================
          PAGE 1.5: BOOKMYSHOW-STYLE SEAT QUANTITY MODAL (WITHOUT ILLUSTRATION)
          ========================================================================= */}
      {step === 'seatcount' && (
        <div className="grid-container py-12 sm:py-20 booking-step-transition flex items-center justify-center min-h-[85vh]">
          <div className="max-w-5xl w-full mx-auto bg-zinc-950 border-4 sm:border-8 border-zinc-800 p-6 sm:p-14 rounded-[3.5rem] shadow-2xl my-6 text-center font-tech relative animate-fade-in">
            
            <h3 className="text-4xl sm:text-7xl font-impact font-bold text-white mb-10 uppercase tracking-tight leading-none">
              HOW MANY SEATS?
            </h3>
            
            {/* Gigantic Stacked Toggle Pill Cards (Inspired by the Tennis Pill/Toggle Design) */}
            <div className="space-y-6 sm:space-y-8 my-12 max-w-4xl mx-auto">
              {[1, 2, 3, 4].map((num, idx) => {
                const isActive = targetSeatCount === num;
                const priceForNum = num * (event.ticket_price || 499);
                const isEven = idx % 2 === 1; // 0 (1 seat) left, 1 (2 seats) right, 2 (3 seats) left, 3 (4 seats) right

                return (
                  <div
                    key={num}
                    onClick={() => setTargetSeatCount(num)}
                    className={`w-full py-5 sm:py-8 px-6 sm:px-10 rounded-full font-impact transition-all duration-300 flex items-center justify-between gap-4 sm:gap-8 cursor-pointer border-4 sm:border-8 shadow-2xl ${
                      isActive
                        ? 'bg-[#DCFF02] border-white text-black font-black shadow-[0_0_50px_rgba(220,255,2,0.7)] scale-105 z-10'
                        : 'bg-zinc-900 border-zinc-700 text-white hover:border-emerald-400 hover:bg-zinc-800/90 hover:scale-[1.02] opacity-90'
                    } ${isEven ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                  >
                    {/* Circle Toggle Ball / Badge */}
                    <div className={`w-20 h-20 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center shrink-0 border-4 sm:border-6 transition-all ${
                      isActive 
                        ? 'bg-black text-[#DCFF02] border-white shadow-2xl scale-110' 
                        : 'bg-zinc-800 text-gray-300 border-zinc-600 group-hover:border-white'
                    }`}>
                      <span className="text-4xl sm:text-7xl font-black leading-none">{num}</span>
                      <span className="text-[10px] sm:text-sm font-tech font-bold uppercase tracking-wider mt-1">
                        {num === 1 ? 'SEAT' : 'SEATS'}
                      </span>
                    </div>

                    {/* Pill Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-3xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none uppercase truncate">
                        {num} {num === 1 ? 'SEAT' : 'SEATS'} PASS
                      </div>
                      <div className={`text-base sm:text-2xl font-tech font-bold tracking-widest uppercase mt-2 ${isActive ? 'text-black/80 font-black' : 'text-emerald-400'}`}>
                        ALL INCLUSIVE // ₹{priceForNum}/-
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Multiplied Price Banner (Huge Font Size) */}
            <div className="mt-12 pt-8 border-t-2 border-zinc-800 space-y-4">
              <span className="text-sm sm:text-xl text-gray-300 font-bold uppercase tracking-widest block">
                EXECUTIVE // EARLY BIRD PASS ({targetSeatCount} {targetSeatCount === 1 ? 'SEAT' : 'SEATS'} × ₹{event.ticket_price || 499})
              </span>
              <div className="font-impact text-6xl sm:text-9xl text-emerald-400 bg-black border-4 sm:border-8 border-emerald-500 py-6 sm:py-8 px-10 sm:px-14 rounded-[3rem] shadow-[0_0_40px_rgba(16,185,129,0.4)] inline-block my-4 tracking-tight">
                ₹{targetSeatCount * (event.ticket_price || 499)}/-
              </div>
              <span className="text-sm sm:text-lg font-bold text-emerald-400 uppercase block tracking-wider">
                🍿 COMPLIMENTARY GOURMET SNACK & BEVERAGE INCLUDED FOR EVERY SEAT!
              </span>
            </div>

            {/* Massive Pill Action CTA Button (+300% Size) */}
            <button 
              type="button"
              onClick={() => {
                setSelectedSeats([]);
                setStep('seatmap');
              }}
              className="w-full py-8 sm:py-12 px-6 sm:px-10 bg-emerald-500 hover:bg-emerald-400 text-black font-impact font-black text-3xl sm:text-6xl rounded-full shadow-[0_0_60px_rgba(16,185,129,0.8)] border-6 sm:border-8 border-white transition-all duration-300 hover:scale-[1.03] cursor-pointer mt-12 uppercase tracking-wider block"
            >
              SELECT SEATS (₹{targetSeatCount * (event.ticket_price || 499)}) →
            </button>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 2: INTERACTIVE BOOKMYSHOW-STYLE CINEMA SEAT MAP (INOX VARUN'S MALL)
          ========================================================================= */}
      {step === 'seatmap' && (
        <div className="grid-container py-6 booking-step-transition">
          <div className="seatmap-container w-full max-w-6xl mx-auto space-y-6">
            
            {ruleError && (
              <div className="rule-warning-banner animate-bounce w-full max-w-4xl mx-auto mb-6">
                <span>{ruleError}</span>
                <button onClick={() => setRuleError(null)} className="underline text-xs shrink-0 ml-4">DISMISS</button>
              </div>
            )}

            {/* Target Seat Count Header Bar (Clean & Spaced) */}
            {/* Minimal Compact Horizontal Legend + Screen Bar (All extra noisy text removed) */}
            <div className="w-full max-w-4xl mx-auto mb-6 bg-zinc-950 border-2 border-zinc-800 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 font-tech shadow-xl text-xs sm:text-sm font-bold">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mx-auto md:mx-0">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-4 h-4 rounded bg-emerald-600 border border-emerald-400 inline-block"></span>
                  AVAILABLE (₹{event.ticket_price || 499})
                </span>
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-4 h-4 rounded bg-white border border-gray-300 inline-block shadow"></span>
                  SELECTED
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <span className="w-4 h-4 rounded bg-yellow-600 border border-yellow-400 inline-block"></span>
                  HELD
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-4 h-4 rounded bg-red-600 border border-red-400 inline-block"></span>
                  BOOKED
                </span>
              </div>
              <div className="mx-auto md:mx-0 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded text-gray-300 text-[11px] sm:text-xs tracking-widest uppercase">
                CINEMA SCREEN ↓
              </div>
            </div>

            {/* Seat Rows Grid (Rows K down to A matching physical diagram exactly) */}
            <div className="seatmap-grid-wrap overflow-hidden sm:overflow-x-auto pb-6 w-full max-w-full">
              <div className="seatmap-inner-track w-full max-w-full sm:min-w-max mx-auto px-0.5 sm:px-8 flex flex-col items-center">
                {['K','J','I','H','G','F','E','D','C','B','A'].map((rowLabel) => {
                  const rowSeats = seats
                    .filter(s => s.row_label === rowLabel)
                    .sort((a, b) => b.seat_number - a.seat_number);

                  return (
                    <div key={rowLabel} className="seatmap-row flex items-center justify-between sm:justify-center gap-[1.5px] sm:gap-2 my-1 sm:my-1.5 w-full sm:w-auto">
                      <span className="row-label-text font-impact text-[9px] sm:text-base w-3.5 sm:w-8 text-center text-red-500 bg-zinc-900 border border-zinc-800 py-0.5 sm:py-1 rounded shrink-0 shadow">{rowLabel}</span>
                      
                      <div className="seats-in-row flex items-center justify-center gap-[1.5px] sm:gap-2 flex-1 sm:flex-initial min-w-0 max-w-full overflow-hidden sm:overflow-visible px-0.5">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.label);
                          const statusClass = isSelected ? 'SELECTED' : seat.status;
                          
                          // Visual gaps corresponding to walkways & stairs
                          const showAisleBreak = seat.seat_number === 13 || seat.seat_number === 7;

                          return (
                            <React.Fragment key={seat.id}>
                              <button
                                type="button"
                                className={`seat-btn seat-${statusClass} flex-1 sm:flex-initial min-w-[14px] max-w-[19px] sm:min-w-[40px] sm:max-w-[40px] h-[21px] sm:h-10 text-[8px] sm:text-sm font-bold rounded-[3px] sm:rounded-md border sm:border-2 transition-all flex items-center justify-center shrink p-0 leading-none ${
                                  isSelected 
                                    ? 'bg-white text-black font-black border-emerald-400 scale-125 shadow-2xl ring-1 sm:ring-2 ring-white z-20' 
                                    : seat.status === 'AVAILABLE' 
                                    ? 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500 hover:scale-110 shadow-sm' 
                                    : seat.status === 'HELD'
                                    ? 'bg-yellow-600 text-white border-yellow-400 cursor-not-allowed opacity-95'
                                    : 'bg-red-600 text-white border-red-500 cursor-not-allowed opacity-90'
                                }`}
                                onClick={() => handleSeatClick(seat)}
                                title={`${seat.label} — ${seat.status === 'AVAILABLE' ? `₹${event.ticket_price || 499}` : seat.status}`}
                              >
                                {seat.seat_number}
                              </button>

                              {showAisleBreak && (
                                <div className="w-[3px] sm:w-4 shrink-0" />
                              )}

                              {/* ENTRY / EXIT block on right side of rows K to F */}
                              {seat.seat_number === 7 && ['K','J','I','H','G','F'].includes(rowLabel) && (
                                <div className="w-[6px] sm:w-[64px] shrink-0" />
                              )}

                              {/* Stairs aisle gap on rows E, D, C, B right where seats 6, 5 would be */}
                              {seat.seat_number === 7 && ['E','D','C','B'].includes(rowLabel) && (
                                <div className="w-[6px] sm:w-8 h-[21px] sm:h-8 flex items-center justify-center text-zinc-600 font-mono text-[7px] sm:text-[10px] shrink-0" title="Stairs / Aisle">
                                  ||
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <span className="row-label-text font-bold text-[9px] sm:text-xs w-3.5 sm:w-6 text-center text-red-500 bg-zinc-900 border border-zinc-800 py-0.5 sm:py-1 shrink-0 rounded">{rowLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Bottom Summary Bar */}
            <div className="seatmap-bottom-bar bg-zinc-900 border-t border-zinc-800 p-4 sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-4 mt-8 w-full max-w-6xl mx-auto rounded-xl shadow-2xl">
              <div className="selection-summary font-tech text-sm text-left">
                <div className="summary-seats text-white">
                  {selectedSeats.length > 0 ? (
                    <span>SELECTED ({selectedSeats.length}/{targetSeatCount}): <strong className="text-red-500 text-base">[{selectedSeats.join(', ')}]</strong></span>
                  ) : (
                    <span className="text-yellow-400 font-bold">// PICK EXACTLY {targetSeatCount} {targetSeatCount === 1 ? 'SEAT' : 'SEATS'} ON MAP TO PROCEED</span>
                  )}
                </div>
                {selectedSeats.length > 0 && (
                  <div className="summary-total text-gray-300 text-xs mt-0.5">
                    TOTAL PAYABLE: <strong className="text-emerald-400 text-base font-impact">₹{selectedSeats.length * event.ticket_price}/-</strong> (ALL INCLUSIVE)
                  </div>
                )}
              </div>

              <div>
                <button 
                  type="button"
                  className={`btn-brutalist py-3.5 px-8 text-xs md:text-sm cursor-pointer transition-all ${selectedSeats.length === targetSeatCount ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 hover:scale-105 shadow-xl' : 'bg-zinc-800 text-gray-400 border-zinc-700 opacity-80'}`}
                  onClick={() => {
                    if (selectedSeats.length !== targetSeatCount) {
                      alert(`Please select exactly ${targetSeatCount} ${targetSeatCount === 1 ? 'seat' : 'seats'} on the map before proceeding! (You currently have ${selectedSeats.length} selected).`);
                      return;
                    }
                    setStep('contact');
                  }}
                >
                  <RollingText 
                    text={
                      selectedSeats.length === targetSeatCount 
                        ? `PROCEED TO ATTENDEE DETAILS (${selectedSeats.length} SEATS) →` 
                        : `SELECT ${targetSeatCount - selectedSeats.length} MORE ${targetSeatCount - selectedSeats.length === 1 ? 'SEAT' : 'SEATS'} →`
                    } 
                    stagger={true} 
                  />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 3: CONTACT DETAILS & ATOMIC RESERVATION LOCK (STREAMLINED)
          ========================================================================= */}
      {step === 'contact' && (
        <div className="grid-container py-8 booking-step-transition">
          <div className="max-w-4xl mx-auto bg-zinc-900 border-2 border-zinc-800 p-8 md:p-12 rounded-2xl shadow-2xl w-full space-y-line">
            <div className="text-center mb-8">
              <span className="font-tech text-red-500 text-xs font-bold tracking-widest uppercase">// 02 — MANDATORY ATTENDEE INFO</span>
              <h2 className="text-3xl md:text-5xl font-impact text-white uppercase tracking-tight mt-1">RESERVE SEATS & START TIMER</h2>
            </div>

            {/* Prominent Highlights for Selected Seats and Total Payable Amount */}
            <div className="bg-zinc-950 border-2 border-red-500/80 p-6 md:p-10 rounded-3xl mb-10 flex flex-col sm:flex-row justify-between items-center gap-8 shadow-2xl text-center sm:text-left">
              <div className="w-full sm:w-auto">
                <span className="text-gray-300 block text-sm font-tech font-bold uppercase tracking-widest mb-2">// SELECTED SEATS HIGHLIGHT</span>
                <div className="text-4xl sm:text-6xl font-impact text-white bg-zinc-900 border-2 border-zinc-600 px-6 py-4 rounded-2xl inline-block shadow-2xl tracking-wider w-full sm:w-auto text-center">
                  [{selectedSeats.join(', ')}]
                </div>
              </div>
              <div className="w-full sm:w-auto text-center sm:text-right">
                <span className="text-gray-300 block text-sm font-tech font-bold uppercase tracking-widest mb-2">// TOTAL PAYABLE AMOUNT (ALL INCLUSIVE)</span>
                <div className="text-5xl sm:text-7xl font-impact text-emerald-400 bg-emerald-950/90 border-2 border-emerald-500 px-6 py-4 rounded-2xl inline-block shadow-2xl tracking-tight w-full sm:w-auto text-center">
                  ₹{selectedSeats.length * event.ticket_price}/-
                </div>
              </div>
            </div>

            {/* Separate Columns for Name, Phone, and Email */}
            <form onSubmit={handleCreateReservation} className="space-y-8 font-tech">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                
                <div>
                  <label className="block text-base sm:text-xl font-impact font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    FULL NAME *
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-4.5 bg-black border-2 border-zinc-700 focus:border-emerald-500 text-white font-mono text-xl rounded-xl shadow-inner outline-none transition-all"
                    placeholder=""
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-xl font-impact font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    10-DIGIT MOBILE NUMBER *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    maxLength="10"
                    pattern="[0-9]{10}"
                    className="w-full p-4.5 bg-black border-2 border-zinc-700 focus:border-emerald-500 text-white font-mono text-xl rounded-xl shadow-inner outline-none transition-all"
                    placeholder=""
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>

                <div>
                  <label className="block text-base sm:text-xl font-impact font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    EMAIL ADDRESS *
                  </label>
                  <input 
                    type="email" 
                    required 
                    className="w-full p-4.5 bg-black border-2 border-zinc-700 focus:border-emerald-500 text-white font-mono text-xl rounded-xl shadow-inner outline-none transition-all"
                    placeholder=""
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
            <div className="max-w-5xl mx-auto bg-zinc-950 border-2 border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl my-8 font-tech w-full booking-step-transition space-y-line">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center w-full">
                
                {/* Left Column: Static UPI QR Code ONLY (Smaller & compact in mobile and PC) */}
                <div className="md:col-span-3 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 p-2.5 sm:p-4 rounded-xl text-center shadow-xl w-full mx-auto max-w-[170px] sm:max-w-[200px] md:max-w-none">
                  <span className="text-red-500 font-bold text-[9px] sm:text-[11px] tracking-widest uppercase mb-1.5 block">
                    // OFFICIAL SCANNER QR
                  </span>
                  
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white p-1 sm:p-1.5 rounded-lg shadow-inner border-2 border-zinc-200 mx-auto flex items-center justify-center">
                    <img 
                      src="/guildqr.png" 
                      alt="Official Guild UPI QR Code" 
                      className="w-full h-full object-contain block mx-auto"
                    />
                  </div>
                  
                  <span className="text-[8.5px] sm:text-[10px] text-gray-400 font-bold mt-1.5 tracking-wider uppercase block">
                    GPay // PhonePe // Paytm // CRED
                  </span>
                </div>

                {/* Right Column: Exactly the required 4 items clearly stated */}
                <form onSubmit={handleSubmitPayment} className="md:col-span-9 flex flex-col justify-between space-y-6 text-left w-full">
                  
                  <div className="bg-red-950/90 border-2 sm:border-4 border-red-500 p-5 sm:p-7 rounded-3xl text-center md:text-left shadow-2xl">
                    <span className="text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-widest mb-1.5 block">
                      // MANDATORY PAYMENT STEP
                    </span>
                    <h3 className="text-3xl sm:text-5xl font-impact text-white uppercase tracking-tight leading-tight">
                      COMPLETE YOUR UPI PAYMENT
                    </h3>
                  </div>

                  {/* 1. Official UPI ID */}
                  <div className="bg-purple-950/80 border-2 sm:border-4 border-purple-500 p-5 sm:p-7 rounded-3xl shadow-2xl">
                    <label className="text-sm sm:text-lg text-purple-300 font-impact tracking-wider uppercase block mb-3">
                      1. OFFICIAL UPI ID (EXACT ADDRESS)
                    </label>
                    <div className="flex items-center justify-between bg-black border-2 border-purple-400 py-5 px-6 rounded-2xl text-xl sm:text-3xl font-mono font-bold text-white shadow-inner">
                      <span className="tracking-wide select-all text-purple-200 truncate">steveoguri07-2@okicici</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText('steveoguri07-2@okicici');
                          alert('UPI ID copied to clipboard!');
                        }} 
                        className="text-white hover:bg-purple-600 transition-all bg-purple-700 border-2 border-purple-400 py-2.5 px-5 rounded-xl text-sm sm:text-base font-impact tracking-wider uppercase cursor-pointer shrink-0 shadow-lg ml-3"
                      >
                        COPY
                      </button>
                    </div>
                  </div>

                  {/* 2. Total Amount to Pay */}
                  <div className="bg-emerald-950/90 border-2 sm:border-4 border-emerald-500 p-5 sm:p-7 rounded-3xl shadow-2xl">
                    <label className="text-sm sm:text-lg text-emerald-300 font-impact tracking-wider uppercase block mb-3">
                      2. ACTUAL TOTAL AMOUNT TO BE PAID
                    </label>
                    <div className="bg-black border-2 border-emerald-400 py-5 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                      <div className="text-center sm:text-left">
                        <span className="text-sm sm:text-base text-gray-200 block font-tech font-bold">({activeBooking.seats.length} {activeBooking.seats.length === 1 ? 'Seat' : 'Seats'} × ₹{event.ticket_price})</span>
                        <span className="text-xs sm:text-sm text-emerald-400 font-impact tracking-wider block mt-1 uppercase">SEATING + SNACK + BEVERAGE INCLUDED</span>
                      </div>
                      <span className="font-impact text-5xl sm:text-7xl text-emerald-300 tracking-tight">₹{activeBooking.total_amount}/-</span>
                    </div>
                  </div>

                  {/* 3. Mandatory Transaction Screenshot Upload (HIGH VISIBILITY & HIGHLIGHTED) */}
                  <div className="bg-yellow-950/90 border-2 sm:border-4 border-yellow-400 p-5 sm:p-8 rounded-3xl shadow-2xl">
                    <label className="text-base sm:text-2xl text-yellow-300 font-impact tracking-wider uppercase block mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                      <span className="flex items-center gap-2">
                        <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm sm:text-base">STEP 3</span>
                        <span>MANDATORY PAYMENT SCREENSHOT UPLOAD *</span>
                      </span>
                      <span className="text-xs sm:text-sm text-red-400 font-mono bg-red-950 border-2 border-red-500 px-3 py-1.5 rounded-lg font-bold animate-pulse tracking-wide shrink-0">[REQUIRED TO UNLOCK TICKETS]</span>
                    </label>
                    
                    <div className={`rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all border-2 border-dashed border-yellow-400/80 bg-black/60 hover:bg-black/80 ${screenshotUrl ? 'screenshot-upload-success border-emerald-500' : 'screenshot-upload-dropzone'}`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="screenshot-input" 
                        required
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="screenshot-input" className="cursor-pointer block w-full">
                        {!screenshotUrl && (
                          <div className="bg-yellow-400 text-black font-impact text-sm sm:text-base px-6 py-3 rounded-full uppercase tracking-widest mb-4 inline-block shadow-xl animate-bounce">
                            CLICK HERE OR DROP PAYMENT SCREENSHOT
                          </div>
                        )}
                        <Upload size={48} className={`mx-auto mb-3 ${screenshotUrl ? 'text-emerald-400' : 'text-yellow-400'}`} />
                        <span className="text-lg sm:text-2xl text-white block font-impact tracking-wide truncate mb-2">
                          {isCompressing ? 'COMPRESSING & PROCESSING...' : screenshotName ? `SUCCESSFULLY ATTACHED: ${screenshotName}` : 'TAP TO SELECT SCREENSHOT FILE'}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-300 font-tech block max-w-lg mx-auto leading-relaxed">
                          {screenshotUrl ? 'Click again if you wish to replace the attached screenshot.' : 'Mandatory verification step — Your official screening pass & QR code will be generated immediately after upload.'}
                        </span>
                      </label>
                      {screenshotUrl && (
                        <div className="mt-5 bg-black/90 p-4 rounded-xl border-2 border-emerald-500 inline-block shadow-2xl">
                          <img src={screenshotUrl} alt="Screenshot Preview" className="max-h-48 mx-auto rounded object-contain block" />
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
