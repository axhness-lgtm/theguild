import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Clock, ShieldCheck, 
  AlertTriangle, QrCode, Upload, Copy, Check, MapPin, 
  Users, Ticket, Award, ChevronDown, ChevronUp, Sparkles, ShieldAlert 
} from 'lucide-react';
import { ticketingService } from '../../services/ticketingService';
import { processAndCompressImage } from '../../utils/imageHelper';
import RollingText from '../RollingText';
import LineReveal, { RevealItem } from '../LineReveal';
import './BookingFlow.css';

/**
 * BookingFlow — Master Controller for the INOX 147-seat FIFA World Cup Final Booking Experience.
 * Redesigned according to The Guild 8-Point Global Design System & Wizard Flow Specification.
 */
export default function BookingFlow({ onReturnHome }) {
  const [step, setStep] = useState('overview'); // 'overview' | 'seatmap' | 'contact' | 'payment' | 'confirmation'
  const [ticketingData, setTicketingData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [targetSeatCount, setTargetSeatCount] = useState(2);
  const [ruleError, setRuleError] = useState(null);
  const [showRulesAccordion, setShowRulesAccordion] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  
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

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('steveoguri07-2@okicici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
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
          setRuleError('Maximum 4 seats allowed per booking.');
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
      setRuleError('Maximum 4 seats allowed per booking.');
      return;
    }

    // Validate consecutive rule on current selection
    if (updatedSelection.length > 1) {
      const check = ticketingService.validateConsecutiveSelection(updatedSelection);
      if (!check.valid) {
        setRuleError(check.error);
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

  if (!ticketingData) {
    return (
      <div className="booking-root flex items-center justify-center font-tech text-zinc-400">
        INITIALIZING INOX SEAT MATRIX...
      </div>
    );
  }

  const { event, seats } = ticketingData;
  const seatsAvailableCount = seats.filter(s => s.status === 'AVAILABLE').length;
  const totalPayable = (selectedSeats.length > 0 ? selectedSeats.length : targetSeatCount) * (event.ticket_price || 459);

  return (
    <div className="booking-root">
      
      {/* =========================================================================
          WIZARD HEADER & PROGRESS BAR (GLOBAL DESIGN SYSTEM)
          ========================================================================= */}
      <div className="wizard-header-bar">
        <div className="wizard-logo-area">
          <span className="font-impact text-2xl tracking-widest text-white">THE GUILD</span>
          <span className="text-zinc-600 font-tech">//</span>
          <span className="font-tech text-xs text-red-500 font-bold tracking-wider">BOX OFFICE</span>
        </div>

        {/* Center Progress Indicator */}
        <div className="wizard-steps-indicator">
          <div className={`wizard-step-item ${step === 'overview' ? 'active' : ''}`}>
            <span>Event</span>
            <span className="wizard-step-bullet">•</span>
          </div>
          <div className={`wizard-step-item ${step === 'seatmap' ? 'active' : ''}`}>
            <span>Seats</span>
            <span className="wizard-step-bullet">•</span>
          </div>
          <div className={`wizard-step-item ${step === 'contact' ? 'active' : ''}`}>
            <span>Details</span>
            <span className="wizard-step-bullet">•</span>
          </div>
          <div className={`wizard-step-item ${step === 'payment' ? 'active' : ''}`}>
            <span>Payment</span>
            <span className="wizard-step-bullet">•</span>
          </div>
          <div className={`wizard-step-item ${step === 'confirmation' ? 'active' : ''}`}>
            <span>Confirmation</span>
          </div>
        </div>

        {/* Right Actions / Back / Timer */}
        <div className="flex items-center gap-4">
          {activeBooking && ['HELD', 'PENDING_PAYMENT'].includes(activeBooking.status) && countdown > 0 && (
            <div className={`wizard-timer-pill ${countdown < 180 ? 'urgent' : ''}`}>
              <Clock size={16} />
              <span>HELD: {formatCountdown(countdown)}</span>
            </div>
          )}
          <button 
            onClick={onReturnHome}
            className="bg-transparent border border-zinc-700 hover:border-zinc-500 text-white py-2 px-4 rounded-lg text-xs font-tech flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={14} />
            <span>RETURN TO PUBLIC SITE</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PAGE 1: EVENT INFORMATION (OVERVIEW)
          ========================================================================= */}
      {step === 'overview' && (
        <div className="max-w-[1100px] mx-auto py-4 text-center animate-fade-in">
          
          {/* Top Hero Section */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/40 border border-red-500/40 text-red-500 font-tech text-xs font-bold rounded-full mb-3">
              <Ticket size={14} />
              <span>VARUN INOX, BEACH ROAD, VIZAG</span>
            </div>

            <h1 className="overview-hero-title">FIFA WORLD CUP FINAL</h1>

            <p className="font-tech text-emerald-400 text-lg md:text-xl font-bold tracking-wider my-3">
              20TH JULY | 00:30 AM ONWARDS — ₹{event.ticket_price || 459}/- ALL INCLUSIVE
            </p>

            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-lg text-xs font-tech text-zinc-300 mt-2">
              <Users size={14} className="text-emerald-400" />
              <span>AUDITORIUM SCREEN 3 CAPACITY: 147 SEATS</span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400 font-bold">{seatsAvailableCount} / 147 OPEN NOW</span>
            </div>
          </div>

          {/* Two-Column Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1100px] mx-auto my-8 text-left">
            
            {/* Left Card: Event Specs & Inclusions */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="font-tech text-xs text-zinc-400 uppercase tracking-widest block mb-2">// OFFICIAL SCREENING PACKAGE</span>
                <h2 className="text-2xl font-impact text-white mb-4">INCLUSIONS & SCHEDULE</h2>
                
                <div className="space-y-4 font-tech text-sm text-zinc-300">
                  <div className="flex items-center gap-3 bg-[#080808] border border-zinc-800 p-3.5 rounded-xl">
                    <MapPin size={18} className="text-red-500 shrink-0" />
                    <div>
                      <div className="text-xs text-zinc-400">VENUE LOCATION</div>
                      <div className="font-bold text-white">VARUN INOX, BEACH ROAD, VISAKHAPATNAM</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-[#080808] border border-zinc-800 p-3.5 rounded-xl">
                    <Clock size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs text-zinc-400">GATES OPEN & KICKOFF</div>
                      <div className="font-bold text-white">20TH JULY | 00:30 AM ONWARDS</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs font-tech text-zinc-400 font-bold mb-3 uppercase tracking-wider">ALL-INCLUSIVE TICKET BENEFITS</div>
                  <div className="flex flex-wrap gap-2 font-tech text-xs font-bold">
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> ₹{event.ticket_price || 459} SEATING PRICE
                    </span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> COMPLIMENTARY SNACK
                    </span>
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> COMPLIMENTARY BEVERAGE
                    </span>
                    <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Sparkles size={14} className="text-yellow-400" /> LASER PROJECTION + ATMOSPHERE
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-800 font-tech text-xs text-zinc-500">
                OFFICIAL BOOKING CHANNEL BY THE GUILD VZAG
              </div>
            </div>

            {/* Right Card: Important Booking Information */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="font-tech text-xs text-red-500 uppercase tracking-widest font-bold block mb-2">// QUICK CHECKOUT SUMMARY</span>
                <h2 className="text-2xl font-impact text-white mb-4">IMPORTANT INFORMATION</h2>

                <ul className="space-y-4 font-tech text-sm text-zinc-300">
                  <li className="flex items-start gap-3 bg-[#080808] border border-zinc-800 p-3.5 rounded-xl">
                    <span className="text-red-500 font-bold text-lg leading-none shrink-0">•</span>
                    <span><strong className="text-white">MAXIMUM 4 SEATS:</strong> You can select and book up to 4 consecutive seats per transaction.</span>
                  </li>
                  <li className="flex items-start gap-3 bg-[#080808] border border-zinc-800 p-3.5 rounded-xl">
                    <span className="text-amber-500 font-bold text-lg leading-none shrink-0">•</span>
                    <span><strong className="text-white">10-MINUTE HOLD WINDOW:</strong> Once picked, your seats are reserved strictly for 10 minutes to complete UPI transfer.</span>
                  </li>
                  <li className="flex items-start gap-3 bg-[#080808] border border-zinc-800 p-3.5 rounded-xl">
                    <span className="text-emerald-500 font-bold text-lg leading-none shrink-0">•</span>
                    <span><strong className="text-white">INSTANT UPI QR PAYMENT:</strong> Pay exactly ₹{event.ticket_price || 459}/- per ticket and attach screenshot for instant digital pass issuance.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 text-center sm:text-left">
                <button 
                  onClick={() => setStep('seatmap')}
                  className="bg-white hover:bg-zinc-200 text-black font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-xl w-full flex items-center justify-center gap-3 font-tech uppercase tracking-wider"
                >
                  <span>SELECT SEATS ON SCREEN 3 MAP →</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

          </div>

          {/* Booking Rules Accordion (Does not dominate the page) */}
          <div className="max-w-[1100px] mx-auto mt-6 text-left">
            <div className="accordion-box">
              <button 
                type="button"
                onClick={() => setShowRulesAccordion(!showRulesAccordion)}
                className="w-full py-4 px-6 flex items-center justify-between text-zinc-400 hover:text-white font-tech text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-red-500" />
                  <span>{showRulesAccordion ? '[ - Hide Complete Booking & Screening Rules ]' : '[ + View Complete Booking & Screening Rules Accordion ]'}</span>
                </span>
                {showRulesAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showRulesAccordion && (
                <div className="p-6 border-t border-zinc-800 font-tech text-xs text-zinc-300 space-y-3 bg-[#080808]">
                  <p>1. <strong className="text-white">Consecutive Enforcement:</strong> Single seat gaps between booked seats are not permitted to optimize auditorium sightlines and group seating.</p>
                  <p>2. <strong className="text-white">Verification Queue:</strong> Attached UPI screenshots are verified by our automated/human queue. Any mismatch in UTR or amount results in instant seat release without refund.</p>
                  <p>3. <strong className="text-white">Venue Check-in:</strong> Present your booking confirmation ID or WhatsApp verified phone number at the INOX Screen 3 entrance.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          PAGE 2: SEAT SELECTION (SEATMAP)
          ========================================================================= */}
      {step === 'seatmap' && (
        <div className="animate-fade-in">
          
          {ruleError && (
            <div className="max-w-[1200px] mx-auto mb-6 bg-red-950/80 border border-red-500 text-red-200 p-4 rounded-xl flex items-center justify-between font-tech text-sm shadow-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500 shrink-0" />
                <span>{ruleError}</span>
              </div>
              <button onClick={() => setRuleError(null)} className="underline text-xs text-white">DISMISS</button>
            </div>
          )}

          <div className="seatmap-layout-grid">
            
            {/* Left 70%: Cinema Screen & Interactive Matrix */}
            <div className="seatmap-matrix-panel">
              
              {/* Large Pre-selection Counter (Global Design System Spec) */}
              <div className="bg-[#080808] border border-zinc-800 p-4 sm:p-6 rounded-2xl w-full max-w-[620px] mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="text-center sm:text-left">
                  <div className="font-tech text-xs text-red-500 font-bold uppercase tracking-widest">NUMBER OF SEATS TO BOOK (MAX 4)</div>
                  <div className="font-tech text-[12px] text-zinc-400 mt-1">Select counter below, or click start & end seat directly on map</div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 p-2 rounded-xl">
                  <button 
                    type="button" 
                    onClick={() => {
                      const next = Math.max(1, targetSeatCount - 1);
                      setTargetSeatCount(next);
                      if (selectedSeats.length > next) setSelectedSeats(selectedSeats.slice(0, next));
                    }}
                    disabled={targetSeatCount <= 1}
                    className="w-12 h-12 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-2xl rounded-lg border border-zinc-700 transition-all"
                  >
                    −
                  </button>
                  <span className="font-impact text-3xl text-white px-5 min-w-[64px] text-center">
                    {targetSeatCount}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setTargetSeatCount(Math.min(4, targetSeatCount + 1))}
                    disabled={targetSeatCount >= 4}
                    className="w-12 h-12 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold text-2xl rounded-lg border border-zinc-700 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Cinema Screen Representation */}
              <div className="w-full max-w-[620px] mx-auto mb-8 text-center">
                <div className="cinema-screen-bar" />
                <span className="font-tech text-xs text-zinc-400 tracking-[0.25em] uppercase">
                  // SCREEN 3 — VARUN INOX, BEACH ROAD, VIZAG // ALL SIGHTLINES UNBLOCKABLE //
                </span>
              </div>

              {/* Compact Single-Row Legend */}
              <div className="seatmap-compact-legend">
                <div className="legend-badge"><div className="legend-box bg-zinc-800 border border-zinc-700" /><span>Available (₹{event.ticket_price || 459})</span></div>
                <div className="legend-badge"><div className="legend-box bg-white border border-white" /><span>Selected</span></div>
                <div className="legend-badge"><div className="legend-box bg-amber-500/20 border border-amber-500" /><span>Held</span></div>
                <div className="legend-badge"><div className="legend-box bg-zinc-900 border border-zinc-800" /><span>Booked</span></div>
              </div>

              {/* Instruction Banner */}
              <div className="text-xs font-tech text-zinc-400 mb-6 font-bold bg-[#080808] px-4 py-2 rounded-lg border border-zinc-800">
                Select up to 4 adjacent seats. (Physical row layout exactly matches Screen 3)
              </div>

              {/* Seat Rows Grid (Rows K down to A) */}
              <div className="seatmap-grid-wrap overflow-x-auto pb-4">
                {['K','J','I','H','G','F','E','D','C','B','A'].map((rowLabel) => {
                  const rowSeats = seats
                    .filter(s => s.row_label === rowLabel)
                    .sort((a, b) => b.seat_number - a.seat_number);

                  return (
                    <div key={rowLabel} className="seatmap-row">
                      <span className="row-label-text">{rowLabel}</span>
                      
                      <div className="seats-in-row flex-wrap">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.label);
                          const statusClass = isSelected ? 'SELECTED' : seat.status;
                          const showAisleBreak = seat.seat_number === 13 || seat.seat_number === 7;

                          return (
                            <React.Fragment key={seat.id}>
                              <button
                                type="button"
                                className={`seat-btn seat-${statusClass}`}
                                onClick={() => handleSeatClick(seat)}
                                title={`${seat.label} — ${seat.status === 'AVAILABLE' ? `₹${event.ticket_price || 459}` : seat.status}`}
                              >
                                {seat.seat_number}
                              </button>

                              {showAisleBreak && <div className="w-4 shrink-0" />}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      <span className="row-label-text">{rowLabel}</span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Sidebar 30% on Desktop: Sticky Booking Summary Card */}
            <div className="hidden lg:block sticky top-8">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h3 className="text-xl font-impact text-white uppercase tracking-wider">BOOKING SUMMARY</h3>
                  <span className="text-[11px] font-tech font-bold bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded">
                    LIVE
                  </span>
                </div>

                <div className="space-y-4 font-tech text-sm">
                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">EVENT</span>
                    <strong className="text-white text-base">FIFA WORLD CUP FINAL</strong>
                  </div>

                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">VENUE</span>
                    <strong className="text-zinc-300 text-xs">VARUN INOX, BEACH ROAD, VIZAG</strong>
                  </div>

                  <div className="pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-400 block mb-1">SELECTED SEATS</span>
                    {selectedSeats.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedSeats.map(s => (
                          <span key={s} className="bg-white text-black font-bold text-xs px-2.5 py-1 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic text-xs">No seats selected yet</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                    <span className="text-xs text-zinc-400">TICKETS ({selectedSeats.length || targetSeatCount})</span>
                    <span className="font-bold text-white">₹{event.ticket_price || 459} × {selectedSeats.length || targetSeatCount}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-sm font-bold text-zinc-300">TOTAL PAYABLE</span>
                    <span className="font-impact text-3xl text-emerald-400">₹{totalPayable}</span>
                  </div>
                </div>

                <button 
                  type="button"
                  disabled={selectedSeats.length === 0}
                  onClick={() => setStep('contact')}
                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl text-base transition-all shadow-xl w-full mt-6 flex items-center justify-center gap-2 font-tech uppercase tracking-wider"
                >
                  <span>CONTINUE TO DETAILS →</span>
                </button>

                <div className="text-[11px] font-tech text-zinc-500 text-center mt-3">
                  10-minute reservation lock begins upon proceeding.
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Bottom Bar for Mobile (Visible only on screens < lg) */}
          <div className="lg:hidden mobile-sticky-footer">
            <div className="font-tech">
              <div className="text-xs text-zinc-400 uppercase">
                {selectedSeats.length > 0 ? `Selected: ${selectedSeats.join(', ')}` : `${targetSeatCount} Seats Targeted`}
              </div>
              <div className="text-xl font-impact text-emerald-400">₹{totalPayable}</div>
            </div>
            <button 
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={() => setStep('contact')}
              className="bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3 px-6 rounded-xl text-sm font-tech uppercase tracking-wider shadow-lg flex items-center gap-2"
            >
              <span>CONTINUE →</span>
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
          PAGE 3: ATTENDEE DETAILS (CONTACT)
          ========================================================================= */}
      {step === 'contact' && (
        <div className="animate-fade-in">
          <div className="wizard-card-centered">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div>
                <span className="font-tech text-xs text-red-500 font-bold tracking-widest uppercase block mb-1">// STEP 03 OF 05</span>
                <h2 className="text-3xl font-impact text-white">ATTENDEE DETAILS</h2>
              </div>
              <span className="font-tech text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                RESERVING {selectedSeats.length} SEATS
              </span>
            </div>

            {/* Persistent Summary Banner Inside Card */}
            <div className="bg-[#080808] border border-zinc-800 p-4 rounded-xl mb-8 flex flex-wrap items-center justify-between gap-4 font-tech text-sm">
              <div>
                <span className="text-xs text-zinc-400 block">SELECTED SEATS</span>
                <strong className="text-white text-base">{selectedSeats.join(', ')}</strong>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">TOTAL PAYABLE</span>
                <strong className="text-emerald-400 font-impact text-xl">₹{totalPayable}</strong>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">HOLD WINDOW</span>
                <strong className="text-amber-400 font-mono text-sm">Starts upon submission</strong>
              </div>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-6 text-left">
              <div>
                <label className="text-[13px] text-zinc-400 font-bold uppercase block mb-2 font-tech tracking-wider">
                  FULL NAME * <span className="text-zinc-600 text-xs">(Must match photo ID at entry)</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Arjun Raju"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-700 text-white rounded-lg p-3.5 text-base outline-none focus:border-white transition-all font-tech"
                />
              </div>

              <div>
                <label className="text-[13px] text-zinc-400 font-bold uppercase block mb-2 font-tech tracking-wider">
                  WHATSAPP PHONE NUMBER * <span className="text-zinc-600 text-xs">(For instant ticket QR delivery)</span>
                </label>
                <input 
                  type="tel" 
                  required
                  placeholder="+91 98480 XXXXX"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-700 text-white rounded-lg p-3.5 text-base outline-none focus:border-white transition-all font-tech"
                />
              </div>

              <div>
                <label className="text-[13px] text-zinc-400 font-bold uppercase block mb-2 font-tech tracking-wider">
                  EMAIL ADDRESS * <span className="text-zinc-600 text-xs">(Backup confirmation receipt)</span>
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="arjun.raju@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-[#080808] border border-zinc-700 text-white rounded-lg p-3.5 text-base outline-none focus:border-white transition-all font-tech"
                />
              </div>

              {/* Buttons Bottom */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-8 border-t border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setStep('seatmap')}
                  className="bg-transparent border border-zinc-700 hover:border-zinc-500 text-white py-3.5 px-6 rounded-lg text-sm font-tech uppercase tracking-wider transition-all w-full sm:w-auto"
                >
                  ← BACK TO SEAT MAP
                </button>

                <button 
                  type="submit"
                  disabled={isReserving}
                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-bold py-3.5 px-8 rounded-lg text-base font-tech uppercase tracking-wider transition-all shadow-xl w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <span>{isReserving ? 'RESERVING SEATS...' : 'LOCK SEATS & CONTINUE →'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 4: PAYMENT (UPI QR & SCREENSHOT UPLOAD) — REDESIGNED SPLIT LAYOUT
          ========================================================================= */}
      {step === 'payment' && (
        <div className="animate-fade-in">
          <div className="payment-split-grid">
            
            {/* Left Column (55%): Payment Instructions & Summary Card */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl space-y-6 text-left">
              <div>
                <span className="font-tech text-xs text-red-500 font-bold uppercase tracking-widest block mb-1">// STEP 04 OF 05</span>
                <h2 className="text-3xl font-impact text-white">PAYMENT & VERIFICATION</h2>
              </div>

              {/* Persistent Summary Box */}
              <div className="bg-[#080808] border border-zinc-800 p-4 rounded-xl flex items-center justify-between font-tech">
                <div>
                  <div className="text-xs text-zinc-400">RESERVED SEATS</div>
                  <div className="font-bold text-white text-base">{activeBooking?.seats.join(', ') || selectedSeats.join(', ')}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">TOTAL PAYABLE</div>
                  <div className="font-impact text-2xl text-emerald-400">₹{activeBooking?.total_amount || totalPayable}</div>
                </div>
              </div>

              {/* Timer Alert */}
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl font-tech text-sm text-amber-400">
                <div className="flex items-center gap-2 font-bold">
                  <Clock size={18} />
                  <span>TIME REMAINING TO COMPLETE UPI TRANSFER:</span>
                </div>
                <span className="font-mono text-base font-bold text-white">{formatCountdown(countdown)}</span>
              </div>

              {/* Numbered Steps */}
              <div className="space-y-4 pt-2 font-tech text-sm text-zinc-300">
                <div className="numbered-step-item">
                  <div className="step-circle">1</div>
                  <div>
                    <strong className="text-white block mb-0.5">Scan QR or Copy Official UPI ID</strong>
                    <span className="text-zinc-400 text-xs">Use any UPI app (GPay, PhonePe, Paytm, CRED) to make exact payment.</span>
                  </div>
                </div>

                <div className="numbered-step-item">
                  <div className="step-circle">2</div>
                  <div className="w-full">
                    <strong className="text-white block mb-1">Copy Official UPI ID</strong>
                    <div className="flex items-center justify-between bg-[#080808] border border-zinc-700 py-2.5 px-3.5 rounded-lg text-sm font-mono text-white">
                      <span className="font-bold">steveoguri07-2@okicici</span>
                      <button 
                        type="button" 
                        onClick={handleCopyUpi}
                        className="bg-zinc-800 hover:bg-zinc-700 text-red-400 px-3 py-1 rounded text-xs font-tech flex items-center gap-1.5 transition-colors"
                      >
                        {copiedUpi ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedUpi ? 'COPIED' : 'COPY ID'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="numbered-step-item">
                  <div className="step-circle">3</div>
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <strong className="text-white block">Upload Payment Screenshot *</strong>
                      <span className="text-xs text-red-500 font-mono font-bold">[MANDATORY]</span>
                    </div>
                    
                    <div className="bg-[#080808] border-2 border-dashed border-zinc-700 hover:border-red-500 rounded-xl p-5 text-center cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="master-screenshot-upload" 
                        required 
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="master-screenshot-upload" className="cursor-pointer block">
                        <Upload size={24} className="mx-auto text-red-500 mb-2" />
                        <span className="text-xs text-zinc-300 block font-bold truncate">
                          {isCompressing ? 'COMPRESSING RECEIPT...' : screenshotName ? `ATTACHED: ${screenshotName}` : '[ CLICK OR DROP PAYMENT SCREENSHOT HERE ]'}
                        </span>
                      </label>

                      {screenshotUrl && (
                        <div className="mt-3 bg-zinc-900 p-2 rounded-lg border border-zinc-800 max-w-[200px] mx-auto">
                          <img src={screenshotUrl} alt="Payment Receipt Preview" className="max-h-24 mx-auto rounded object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-zinc-800">
                <button 
                  type="button"
                  disabled={isSubmittingPayment || isCompressing || !screenshotUrl}
                  onClick={handleSubmitPayment}
                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl w-full text-base font-tech uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <span>{isSubmittingPayment ? 'VERIFYING RECEIPT...' : `SUBMIT SCREENSHOT & CONFIRM (₹${activeBooking?.total_amount || totalPayable}) →`}</span>
                </button>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  type="button"
                  onClick={() => setStep('contact')}
                  className="text-xs font-tech text-zinc-400 hover:text-white underline"
                >
                  ← Back to Attendee Details
                </button>
                <span className="text-xs font-tech text-emerald-400">🔒 Encrypted Verification Queue</span>
              </div>
            </div>

            {/* Right Column (45%): Large Controlled QR Card */}
            <div className="flex flex-col items-center justify-center sticky top-8">
              <div className="qr-white-card">
                <div className="font-tech text-xs font-bold text-zinc-500 tracking-widest uppercase mb-4">
                  // OFFICIAL GUILD UPI SCANNER //
                </div>

                <div className="w-[280px] h-[280px] mx-auto flex items-center justify-center my-4">
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
                  Supported: GPay • PhonePe • Paytm • CRED • Amazon Pay
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 5: CONFIRMATION (DIGITAL PASS & TIMELINE)
          ========================================================================= */}
      {step === 'confirmation' && (
        <div className="animate-fade-in">
          <div className="wizard-card-centered text-center">
            
            <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />

            <h2 className="text-4xl font-impact text-white uppercase tracking-tight mb-2">
              BOOKING SECURED & UNDER REVIEW!
            </h2>

            <p className="text-zinc-400 text-sm md:text-base font-tech max-w-lg mx-auto mb-6">
              Thank you, <strong className="text-white">{activeBooking?.user_name || userName}</strong>. Your payment receipt has been received and your seats are locked.
            </p>

            <div className="bg-[#080808] border border-zinc-800 px-6 py-3 rounded-xl inline-block font-mono font-bold text-emerald-400 text-lg mb-8 shadow-inner">
              #GLD-{activeBooking?.utr?.slice(0, 8) || Math.floor(100000 + Math.random() * 900000)}
            </div>

            {/* Grid Summary Box */}
            <div className="bg-[#080808] border border-zinc-800 p-6 rounded-xl text-left grid grid-cols-1 sm:grid-cols-2 gap-5 font-tech text-sm my-6 shadow-xl">
              <div>
                <span className="text-xs text-zinc-400 block mb-1">ATTENDEE NAME</span>
                <strong className="text-white text-base">{activeBooking?.user_name || userName}</strong>
              </div>

              <div>
                <span className="text-xs text-zinc-400 block mb-1">RESERVED SEATS</span>
                <strong className="text-emerald-400 font-bold text-base">{activeBooking?.seats?.join(', ') || selectedSeats.join(', ')}</strong>
              </div>

              <div>
                <span className="text-xs text-zinc-400 block mb-1">VENUE LOCATION</span>
                <strong className="text-red-500 text-xs font-bold">VARUN INOX, BEACH ROAD, VIZAG</strong>
              </div>

              <div>
                <span className="text-xs text-zinc-400 block mb-1">DATE & SCHEDULE</span>
                <strong className="text-white text-xs">20th July | 00:30 AM Onwards</strong>
              </div>

              <div>
                <span className="text-xs text-zinc-400 block mb-1">PASS TIER</span>
                <strong className="text-white text-xs">ALL-INCLUSIVE SCREENING PASS</strong>
              </div>

              <div>
                <span className="text-xs text-zinc-400 block mb-1">TOTAL AMOUNT VERIFIED</span>
                <strong className="text-emerald-400 font-bold text-base">₹{activeBooking?.total_amount || totalPayable}</strong>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 font-tech text-xs my-6 text-left flex items-center gap-3">
              <Sparkles size={20} className="shrink-0" />
              <span>
                <strong>IMPORTANT:</strong> Keep this confirmation or your verified WhatsApp number ({activeBooking?.user_phone || userPhone}) ready at the Screen 3 entrance for wristband verification.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 pt-6 border-t border-zinc-800">
              <button 
                type="button"
                onClick={() => window.print()}
                className="bg-white hover:bg-zinc-200 text-black font-bold py-3.5 px-8 rounded-lg text-sm font-tech uppercase tracking-wider shadow-xl transition-all"
              >
                DOWNLOAD / PRINT PASS →
              </button>

              <button 
                type="button"
                onClick={onReturnHome}
                className="bg-transparent border border-zinc-700 hover:border-zinc-500 text-white py-3.5 px-6 rounded-lg text-sm font-tech uppercase tracking-wider transition-all"
              >
                RETURN TO HOME DASHBOARD
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
