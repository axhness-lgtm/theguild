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
        if (rangeCount <= targetSeatCount && rangeCount <= 5) {
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
          setRuleError(`[ RULE VIOLATION ] YOU MAY SELECT UP TO ${targetSeatCount} SEAT${targetSeatCount > 1 ? 'S' : ''} (MAX 5).`);
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
      {step === 'seatcount' && (
        <div className="grid-container py-8 booking-step-transition">
          <div className="max-w-4xl mx-auto bg-zinc-950 border-2 border-zinc-800 p-6 sm:p-10 md:p-14 rounded-3xl shadow-2xl my-6 text-center w-full space-y-line">
            
            <div className="inline-block bg-red-600 text-white font-tech font-bold text-xs sm:text-sm px-5 py-2 rounded-full uppercase tracking-widest mb-6 shadow">
              // STEP 01 — SELECT TICKET QUANTITY //
            </div>
            
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-impact text-white uppercase tracking-tight my-4 leading-none">
              HOW MANY SEATS DO YOU WANT TO BOOK?
            </h2>
            
            <p className="text-gray-300 font-tech text-sm sm:text-base max-w-xl mx-auto mb-8">
              Choose between 1 and 4 seats for the FIFA World Cup Final screening at PVR INOX, Beach Road, Vizag.
            </p>

            {/* Quick-Pick Direct Number Buttons (1, 2, 3, 4) */}
            <div className="my-10 space-y-4">
              <span className="text-gray-400 font-tech font-bold text-xs sm:text-sm tracking-widest uppercase mb-4 block">
                // TAP TO QUICK-SELECT QUANTITY (MAX 4 SEATS):
              </span>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {[1, 2, 3, 4].map((num) => {
                  const isActive = targetSeatCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetSeatCount(num)}
                      className={`w-18 h-18 sm:w-24 sm:h-24 md:w-28 md:h-28 font-impact text-4xl sm:text-5xl md:text-6xl rounded-2xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-red-600 text-white border-white scale-110 shadow-2xl shadow-red-500/50 ring-2 sm:ring-4 ring-white z-10'
                          : 'bg-zinc-900 text-gray-400 border-zinc-700 hover:border-red-500 hover:text-white hover:scale-105'
                      }`}
                    >
                      <span>{num}</span>
                      <span className="text-[11px] sm:text-xs font-tech font-bold uppercase mt-0.5 tracking-wider">
                        {num === 1 ? 'Seat' : 'Seats'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Massive Quantity Selector Box with + / - */}
            <div className="bg-black border-2 border-zinc-800 p-6 sm:p-8 rounded-2xl max-w-xl mx-auto shadow-2xl flex flex-col items-center justify-center my-8 space-y-6">
              <span className="text-red-400 font-tech font-bold text-xs sm:text-sm tracking-widest uppercase mb-4 block">
                // OR USE STEPPER CONTROLS (MAX 4 SEATS)
              </span>

              <div className="flex items-center justify-center gap-6 sm:gap-10">
                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.max(1, targetSeatCount - 1))}
                  disabled={targetSeatCount <= 1}
                  className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-zinc-800 hover:bg-red-600 disabled:opacity-20 text-white font-bold text-3xl sm:text-4xl rounded-2xl border-2 border-zinc-600 transition-all cursor-pointer shadow-xl select-none"
                >
                  -
                </button>

                <div className="w-32 sm:w-44 py-4 bg-zinc-950 border-2 border-red-500 rounded-2xl text-center shadow-inner">
                  <span className="font-impact text-5xl sm:text-6xl text-white block leading-none">
                    {targetSeatCount}
                  </span>
                  <span className="font-tech text-xs text-emerald-400 font-bold uppercase block mt-1.5">
                    {targetSeatCount === 1 ? '1 SEAT' : `${targetSeatCount} SEATS`} SELECTED
                  </span>
                </div>

                <button 
                  type="button" 
                  onClick={() => setTargetSeatCount(Math.min(4, targetSeatCount + 1))}
                  disabled={targetSeatCount >= 4}
                  className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-zinc-800 hover:bg-red-600 disabled:opacity-20 text-white font-bold text-3xl sm:text-4xl rounded-2xl border-2 border-zinc-600 transition-all cursor-pointer shadow-xl select-none"
                >
                  +
                </button>
              </div>

              {/* Highlighted Total Payable Banner inside counter box */}
              <div className="mt-6 pt-5 border-t border-zinc-800 w-full text-center space-y-2">
                <span className="text-xs text-gray-400 font-tech block uppercase tracking-wider">// ESTIMATED TOTAL PAYABLE</span>
                <div className="font-impact text-4xl sm:text-5xl text-emerald-400 block mt-1 tracking-tight">
                  ₹{targetSeatCount * event.ticket_price}/-
                </div>
                <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-tech text-xs px-3 py-1 rounded-md inline-block mt-2 font-bold tracking-wider uppercase">
                  INCLUDES: SEATING + SNACK + BEVERAGE
                </span>
              </div>
            </div>

            {/* Centered Transition CTA Button to Seat Map */}
            <div className="mt-12 w-full flex flex-col items-center justify-center gap-5 pt-4">
              <button 
                type="button"
                onClick={() => {
                  setSelectedSeats([]);
                  setStep('seatmap');
                }}
                className="btn-brutalist mx-auto block w-full max-w-xl py-5 px-10 text-center justify-center text-lg sm:text-2xl font-impact tracking-widest uppercase bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xl transition-all hover:scale-105 cursor-pointer rounded-2xl"
              >
                <RollingText text={`CONTINUE TO PICK ${targetSeatCount} ${targetSeatCount === 1 ? 'SEAT' : 'SEATS'} ON MAP →`} stagger={true} />
              </button>

              <button 
                type="button"
                onClick={() => setStep('overview')}
                className="text-xs sm:text-sm text-gray-400 hover:text-white underline font-tech inline-block cursor-pointer py-2"
              >
                ← BACK TO OVERVIEW & RULES
              </button>
            </div>

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
            <div className="w-full max-w-4xl mx-auto mb-6 sm:mb-8 bg-zinc-950 border-2 border-zinc-800 py-3.5 px-3 sm:px-6 md:px-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 font-tech shadow-xl">
              <div className="text-center sm:text-left">
                <span className="text-[11px] sm:text-xs text-red-400 font-bold block uppercase tracking-wider">// STEP 02 — PICK EXACT SEATS ON MAP</span>
                <span className="text-sm sm:text-base md:text-lg text-white font-impact tracking-wide block mt-0.5">
                  PLEASE SELECT EXACTLY {targetSeatCount} {targetSeatCount === 1 ? 'SEAT' : 'SEATS'} ({selectedSeats.length} / {targetSeatCount} SELECTED)
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setStep('seatcount')} 
                className="btn-brutalist-outline py-2 px-4 sm:py-2.5 sm:px-5 text-[11px] sm:text-xs bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white border-zinc-700 font-bold tracking-wider uppercase cursor-pointer shrink-0"
              >
                CHANGE COUNT ({targetSeatCount})
              </button>
            </div>

            {/* Cinema Screen Bar with ALL EYES THIS WAY */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="font-impact text-lg sm:text-xl md:text-3xl text-yellow-400 tracking-[0.2em] sm:tracking-[0.3em] uppercase font-bold animate-pulse mb-3">
                // ALL EYES THIS WAY ↓ //
              </div>
              <div className="cinema-screen-wrap">
                <div className="cinema-screen-bar" />
                <span className="cinema-screen-label font-tech text-[10px] sm:text-xs text-gray-400 block px-2">// PVR INOX, BEACH ROAD, VIZAG // ALL SIGHTLINES UNBLOCKABLE //</span>
              </div>
            </div>

            {/* High-Contrast Interactive Legend with Replica Seat Illustrations */}
            <div className="bg-zinc-950 border-2 border-zinc-800 p-3 sm:p-5 rounded-xl sm:rounded-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 shadow-2xl mx-auto mb-6 sm:mb-8 font-tech text-xs sm:text-sm font-bold w-full max-w-4xl">
              
              {/* Available */}
              <div className="flex items-center gap-1.5 sm:gap-3 bg-black/80 border border-zinc-800 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shrink-0 whitespace-nowrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-zinc-800 border-2 border-zinc-500 text-white font-bold flex items-center justify-center text-[11px] sm:text-xs shrink-0 shadow">
                  A1
                </div>
                <span className="text-gray-200 tracking-wide font-impact text-xs sm:text-sm">AVAILABLE (₹{event.ticket_price})</span>
              </div>

              {/* Selected */}
              <div className="flex items-center gap-1.5 sm:gap-3 bg-red-950/40 border border-red-600/60 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shrink-0 whitespace-nowrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-red-600 border-2 border-white text-white font-black flex items-center justify-center text-[11px] sm:text-xs shrink-0 shadow-lg shadow-red-500/80 ring-1 ring-white">
                  ✓
                </div>
                <span className="text-white font-impact tracking-wide text-xs sm:text-sm">SELECTED</span>
              </div>

              {/* Held / Reserved */}
              <div className="flex items-center gap-1.5 sm:gap-3 bg-amber-950/40 border border-amber-600/50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shrink-0 whitespace-nowrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-amber-500/20 border-2 border-amber-500 text-amber-400 font-bold flex items-center justify-center text-[11px] sm:text-xs shrink-0">
                  🔒
                </div>
                <span className="text-amber-300 font-impact tracking-wide text-xs sm:text-sm">HELD / RESERVED</span>
              </div>

              {/* Booked / Sold */}
              <div className="flex items-center gap-1.5 sm:gap-3 bg-zinc-900/60 border border-zinc-800 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shrink-0 whitespace-nowrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-500 font-bold flex items-center justify-center text-[11px] sm:text-xs shrink-0 opacity-60">
                  ✕
                </div>
                <span className="text-zinc-500 font-impact tracking-wide text-xs sm:text-sm">BOOKED / SOLD</span>
              </div>

            </div>

            {/* Mobile Swipe Guide Banner */}
            <div className="w-full max-w-4xl mx-auto bg-yellow-400 text-black font-impact text-xs sm:text-sm md:text-base text-center py-2.5 px-3 rounded-xl mb-4 shadow-lg flex items-center justify-center gap-2 animate-pulse tracking-wide border-2 border-yellow-500">
              <span>⬅️ SWIPE / SCROLL HORIZONTALLY TO VIEW & SELECT ALL SEATS (1 TO 16) ➡️</span>
            </div>

            {/* Seat Rows Grid (Rows K down to A matching physical diagram exactly) */}
            <div className="seatmap-grid-wrap overflow-x-auto pb-6 w-full">
              <div className="seatmap-inner-track min-w-max mx-auto px-2 sm:px-8 flex flex-col items-start md:items-center">
                {['K','J','I','H','G','F','E','D','C','B','A'].map((rowLabel) => {
                  const rowSeats = seats
                    .filter(s => s.row_label === rowLabel)
                    .sort((a, b) => b.seat_number - a.seat_number);

                  return (
                    <div key={rowLabel} className="seatmap-row flex items-center justify-start gap-1.5 sm:gap-2 my-1.5 min-w-max">
                      <span className="row-label-text font-impact text-xs sm:text-base w-6 sm:w-8 text-center text-red-500 bg-zinc-900 border-2 border-zinc-800 py-1 rounded shrink-0 shadow sticky left-0 z-20">{rowLabel}</span>
                      
                      <div className="seats-in-row flex items-center gap-1 sm:gap-2 flex-nowrap justify-start">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.label);
                          const statusClass = isSelected ? 'SELECTED' : seat.status;
                          
                          // Visual gaps corresponding to walkways & stairs
                          const showAisleBreak = seat.seat_number === 13 || seat.seat_number === 7;

                          return (
                            <React.Fragment key={seat.id}>
                              <button
                                type="button"
                                className={`seat-btn seat-${statusClass} w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold rounded-md border-2 transition-all flex items-center justify-center shrink-0 ${
                                  isSelected 
                                    ? 'bg-red-600 text-white font-black border-white scale-125 shadow-xl shadow-red-500/80 ring-2 ring-white z-10' 
                                    : seat.status === 'AVAILABLE' 
                                    ? 'bg-zinc-800 text-gray-200 border-zinc-600 hover:border-red-500 hover:bg-zinc-700 hover:text-white hover:scale-105 shadow-sm' 
                                    : 'bg-zinc-950 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-40'
                                }`}
                                onClick={() => handleSeatClick(seat)}
                                title={`${seat.label} — ${seat.status === 'AVAILABLE' ? `₹${event.ticket_price || 1}` : seat.status}`}
                              >
                                {seat.seat_number}
                              </button>

                              {showAisleBreak && (
                                <div className="w-3 sm:w-4 shrink-0" />
                              )}

                              {/* ENTRY / EXIT block on right side of rows K to F */}
                              {seat.seat_number === 7 && ['K','J','I','H','G','F'].includes(rowLabel) && (
                                <div className="seat-gap gap-[48px] sm:gap-[64px]" />
                              )}

                              {/* Stairs aisle gap on rows E, D, C, B right where seats 6, 5 would be */}
                              {seat.seat_number === 7 && ['E','D','C','B'].includes(rowLabel) && (
                                <div className="w-6 sm:w-8 h-8 flex items-center justify-center text-zinc-600 font-mono text-[10px] shrink-0" title="Stairs / Aisle">
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
            <div className="max-w-5xl mx-auto bg-zinc-950 border-2 border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl my-8 font-tech w-full booking-step-transition space-y-line">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center w-full">
                
                {/* Left Column: Static UPI QR Code ONLY (Reduced by 70%) */}
                <div className="md:col-span-4 flex flex-col items-center justify-center bg-zinc-900 border-2 border-zinc-800 p-6 rounded-2xl text-center shadow-xl w-full">
                  <span className="text-red-500 font-bold text-xs tracking-widest uppercase mb-4 block">
                    // OFFICIAL SCANNER QR
                  </span>
                  
                  <div className="w-36 h-36 bg-white p-3 rounded-2xl shadow-inner border-4 border-zinc-200 mx-auto flex items-center justify-center">
                    <img 
                      src="/guildqr.png" 
                      alt="Official Guild UPI QR Code" 
                      className="w-full h-full object-contain block mx-auto"
                    />
                  </div>
                  
                  <span className="text-[11px] text-gray-400 font-bold mt-4 tracking-wider uppercase block">
                    GPay // PhonePe // Paytm // CRED
                  </span>
                </div>

                {/* Right Column: Exactly the required 4 items clearly stated */}
                <form onSubmit={handleSubmitPayment} className="md:col-span-8 flex flex-col justify-between space-y-6 text-left w-full">
                  
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
                        className="text-purple-300 hover:text-white transition-colors bg-purple-950/80 border border-purple-500/50 py-1.5 px-3 rounded-lg text-xs font-tech font-bold uppercase cursor-pointer"
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

                  {/* 3. Mandatory Transaction Screenshot Upload (HIGH VISIBILITY) */}
                  <div className="pt-2">
                    <label className="text-sm text-yellow-400 font-impact tracking-wider uppercase block mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="bg-red-600 text-white px-2.5 py-0.5 rounded text-xs">STEP 3</span>
                        <span>MANDATORY PAYMENT SCREENSHOT UPLOAD *</span>
                      </span>
                      <span className="text-xs text-red-400 font-mono bg-red-950 border border-red-500 px-2.5 py-1 rounded font-bold animate-pulse">[REQUIRED TO UNLOCK TICKETS]</span>
                    </label>
                    
                    <div className={`rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${screenshotUrl ? 'screenshot-upload-success' : 'screenshot-upload-dropzone'}`}>
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
                          <div className="bg-yellow-400 text-black font-impact text-xs sm:text-sm px-5 py-2 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg animate-bounce">
                            CLICK HERE OR DROP PAYMENT SCREENSHOT
                          </div>
                        )}
                        <Upload size={38} className={`mx-auto mb-3 ${screenshotUrl ? 'text-emerald-400' : 'text-yellow-400'}`} />
                        <span className="text-base sm:text-lg text-white block font-impact tracking-wide truncate mb-1">
                          {isCompressing ? 'COMPRESSING & PROCESSING...' : screenshotName ? `SUCCESSFULLY ATTACHED: ${screenshotName}` : 'TAP TO SELECT SCREENSHOT FILE'}
                        </span>
                        <span className="text-xs text-gray-300 font-tech block max-w-md mx-auto">
                          {screenshotUrl ? 'Click again if you wish to replace the attached screenshot.' : 'Mandatory verification step — Your official screening pass & QR code will be generated immediately after upload.'}
                        </span>
                      </label>
                      {screenshotUrl && (
                        <div className="mt-4 bg-black/80 p-3 rounded-xl border-2 border-emerald-500 inline-block shadow-2xl">
                          <img src={screenshotUrl} alt="Screenshot Preview" className="max-h-36 mx-auto rounded object-contain block" />
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
