import React, { useState, useEffect } from 'react';
import { IndianRupee, Users, Ticket, CheckCircle, AlertCircle, Search, Filter, Download, FileSpreadsheet, Share2, Eye, X, Check, RefreshCw, RefreshCcw, ShieldAlert } from 'lucide-react';
import { ticketingService } from '../../services/ticketingService';
import RollingText from '../RollingText';
import LineReveal from '../LineReveal';
import './AdminTicketingPortal.css';

/**
 * AdminTicketingPortal — Production-Grade Operations Control Room for 147-seat INOX Screening.
 * Provides Metrics, Live Seat Matrix, Verification Queue, CSV/Excel/WhatsApp exports, and Timeline audits.
 */
export default function AdminTicketingPortal({ onSwitchToSignups }) {
  const [ticketingData, setTicketingData] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'seatmap' | 'logs'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal inspection states
  const [selectedScreenshotBooking, setSelectedScreenshotBooking] = useState(null);
  const [selectedSeatBooking, setSelectedSeatBooking] = useState(null);
  const [reassigningBooking, setReassigningBooking] = useState(null);
  const [reassignSeatsInput, setReassignSeatsInput] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  const reloadData = async () => {
    // Instant synchronous cache load
    setTicketingData(ticketingService.getTicketingData());
    // Background cloud database synchronization
    setIsSyncing(true);
    try {
      const cloudData = await ticketingService.syncWithCloud();
      if (cloudData) setTicketingData(cloudData);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    reloadData();
    const interval = setInterval(() => {
      ticketingService.syncWithCloud().then(data => {
        if (data) setTicketingData(data);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!ticketingData) return <div className="ticketing-portal-wrap text-center py-12 font-tech">LOADING INOX CONTROL MATRIX...</div>;

  const { event, seats, bookings, activityLogs } = ticketingData;

  // Derive Metrics
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const seatsSold = seats.filter(s => ['HELD', 'BOOKED'].includes(s.status)).length;
  const confirmedSeatsSold = seats.filter(s => s.status === 'BOOKED').length;
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const occupancyRate = ((seatsSold / 147) * 100).toFixed(1);
  const remainingSeats = 147 - seatsSold;
  const pendingVerificationCount = bookings.filter(b => b.status === 'UNDER_REVIEW').length;

  // Filter Bookings Queue
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.user_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.utr && b.utr.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Admin Actions
  const handleApprove = async (bookingId) => {
    if (window.confirm(`Confirm UPI payment verification for Booking #${bookingId}? This issues official tickets.`)) {
      await ticketingService.adminApprovePayment(bookingId);
      reloadData();
    }
  };

  const handleReject = async (bookingId) => {
    const reason = window.prompt('Enter rejection reason (e.g. Duplicate UTR / Incorrect payment screenshot):', 'Invalid UTR reference number');
    if (reason) {
      await ticketingService.adminRejectPayment(bookingId, reason);
      reloadData();
    }
  };

  const handleReleaseSeats = async (bookingId) => {
    if (window.confirm(`Are you sure you want to release seats for #${bookingId}? Seats will instantly become AVAILABLE.`)) {
      await ticketingService.adminReleaseSeats(bookingId);
      reloadData();
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    const parsedSeats = reassignSeatsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    try {
      await ticketingService.adminReassignSeats(reassigningBooking.id, parsedSeats);
      setReassigningBooking(null);
      setReassignSeatsInput('');
      reloadData();
      alert('Seats successfully reassigned!');
    } catch (err) {
      alert(`Reassignment Error: ${err.message}`);
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Booking ID', 'Full Name', 'Phone', 'Email', 'Seats', 'Total Amount', 'Status', 'UTR Number', 'Created At'];
    const rows = bookings.map(b => [
      b.id,
      `"${b.user_name}"`,
      `"${b.user_phone}"`,
      b.user_email,
      `"${b.seats.join(', ')}"`,
      b.total_amount,
      b.status,
      b.utr || 'N/A',
      b.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `theguild_inox_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Operational Roster Export (CSV formatted specifically for gate entry & seat verification)
  const exportExcelRoster = () => {
    const headers = ['Row', 'Seat Label', 'Status', 'Attendee Name', 'Phone Number', 'Booking ID', 'Verified UTR'];
    const rows = seats.map(s => {
      const b = bookings.find(book => book.id === s.booking_id);
      return [
        s.row_label,
        s.label,
        s.status,
        b ? `"${b.user_name}"` : 'AVAILABLE',
        b ? `"${b.user_phone}"` : 'N/A',
        b ? b.id : 'N/A',
        b && b.utr ? b.utr : 'N/A'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `theguild_inox_operational_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Attendee List Copy
  const copyWhatsAppList = () => {
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
    if (confirmed.length === 0) {
      alert('No confirmed bookings yet to format for WhatsApp.');
      return;
    }

    let text = `*THE GUILD // FIFA WORLD CUP FINAL SCREENING*\n*INOX AUDITORIUM 03 — ATTENDEE ROSTER*\n----------------------------------------\n\n`;
    confirmed.forEach((b, idx) => {
      text += `${idx + 1}. *${b.user_name}* (${b.user_phone})\n   SEATS: [ ${b.seats.join(', ')} ] | UTR: #${b.utr}\n\n`;
    });
    text += `----------------------------------------\nTotal Confirmed Attendees: ${confirmed.reduce((acc, b) => acc + b.seats.length, 0)} / 147 seats`;

    navigator.clipboard.writeText(text);
    alert('WhatsApp-ready attendee roster copied to your clipboard!');
  };

  return (
    <div className="ticketing-portal-wrap">
      <div className="grid-container">
        
        {/* Top Switcher & Header */}
        <div className="tp-header">
          <div>
            <span className="font-tech text-xs text-red-500">// FOUNDER // OPERATIONS DASHBOARD</span>
            <h1 className="text-2xl font-impact tracking-wide mt-1">INOX TICKETING CONTROL ROOM (147 SEATS)</h1>
          </div>
          
          <div className="flex gap-4">
            <button 
              className="btn-brutalist-outline text-xs py-2 px-4"
              onClick={onSwitchToSignups}
            >
              ← SWITCH TO GENERAL INTEREST SIGNUPS
            </button>
            <button 
              className="btn-brutalist text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer bg-red-600 hover:bg-red-500 text-white border-red-500"
              onClick={reloadData}
              disabled={isSyncing}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'SYNCING CLOUD...' : 'SYNC CLOUD MATRIX'}</span>
            </button>
          </div>
        </div>

        {/* 5 Key Metrics Cards */}
        <div className="metrics-grid-5">
          <div className="metric-card-inox">
            <div className="metric-label-inox"><IndianRupee size={14} className="text-emerald-500" /> CONFIRMED REVENUE</div>
            <div className="metric-value-inox text-emerald-400">₹{totalRevenue.toLocaleString()}</div>
            <span className="text-xs text-gray-400 font-tech mt-2 block">// TICKET PRICE: ₹{event.ticket_price || 1}</span>
          </div>

          <div className="metric-card-inox">
            <div className="metric-label-inox"><Ticket size={14} className="text-blue-400" /> SEATS SOLD / HELD</div>
            <div className="metric-value-inox">{seatsSold} <span className="text-base text-gray-500">/ 147</span></div>
            <span className="text-xs text-gray-400 font-tech mt-2 block">// ({confirmedSeatsSold} CONFIRMED)</span>
          </div>

          <div className="metric-card-inox">
            <div className="metric-label-inox"><Users size={14} className="text-yellow-400" /> OCCUPANCY RATE</div>
            <div className="metric-value-inox">{occupancyRate}%</div>
            <div className="w-full bg-zinc-800 h-1.5 mt-2 overflow-hidden">
              <div className="bg-yellow-400 h-full" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>

          <div className="metric-card-inox">
            <div className="metric-label-inox"><CheckCircle size={14} className="text-purple-400" /> REMAINING SEATS</div>
            <div className="metric-value-inox text-purple-400">{remainingSeats}</div>
            <span className="text-xs text-gray-400 font-tech mt-2 block">// AVAILABLE TO BOOK</span>
          </div>

          <div className="metric-card-inox border-red-500/50 bg-red-950/20">
            <div className="metric-label-inox text-red-400"><AlertCircle size={14} /> PENDING VERIFICATIONS</div>
            <div className="metric-value-inox text-red-500">{pendingVerificationCount}</div>
            <span className="text-xs text-gray-400 font-tech mt-2 block">// REQUIRES ACTION</span>
          </div>
        </div>

        {/* Exports & Operational Tools Toolbar */}
        <div className="export-toolbar font-tech">
          <div>
            <span className="text-sm text-gray-300">// OPERATIONAL DATA EXPORTS & GATE ROSTER TOOLS</span>
          </div>
          <div className="export-btn-group">
            <button onClick={exportCSV} className="action-btn-mini py-2 px-3 flex items-center gap-1.5">
              <Download size={13} />
              <span>EXPORT CSV</span>
            </button>
            <button onClick={exportExcelRoster} className="action-btn-mini py-2 px-3 flex items-center gap-1.5">
              <FileSpreadsheet size={13} />
              <span>EXCEL GATE ROSTER</span>
            </button>
            <button onClick={copyWhatsAppList} className="action-btn-mini py-2 px-3 flex items-center gap-1.5 text-emerald-400 border-emerald-500/40">
              <Share2 size={13} />
              <span>WHATSAPP ATTENDEE LIST</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="tp-subnav">
          <button 
            className={`tp-subnav-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            VERIFICATION QUEUE & BOOKINGS ({bookings.length})
          </button>
          <button 
            className={`tp-subnav-btn ${activeTab === 'seatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('seatmap')}
          >
            LIVE INTERACTIVE SEAT MAP ({seatsSold}/147)
          </button>
          <button 
            className={`tp-subnav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            SYSTEM AUDIT & ACTIVITY LOG ({activityLogs.length})
          </button>
        </div>

        {/* =========================================================================
            TAB 1: BOOKINGS QUEUE & MANUAL UPI VERIFICATION TABLE
            ========================================================================= */}
        {activeTab === 'bookings' && (
          <div>
            <div className="search-filter-row">
              <div className="search-input-box">
                <Search size={16} className="search-icon-abs" />
                <input 
                  type="text"
                  placeholder="Search Booking ID, Attendee Name, Phone number, or 12-digit UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                className="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ALL STATUSES ({bookings.length})</option>
                <option value="UNDER_REVIEW">UNDER REVIEW ({pendingVerificationCount})</option>
                <option value="CONFIRMED">CONFIRMED ({confirmedBookings.length})</option>
                <option value="HELD">HELD / TIMING ({bookings.filter(b=>b.status==='HELD').length})</option>
                <option value="CANCELLED">CANCELLED / EXPIRED</option>
              </select>
            </div>

            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead>
                  <tr>
                    <th>BOOKING ID</th>
                    <th>ATTENDEE DETAILS</th>
                    <th>SEATS</th>
                    <th>TOTAL</th>
                    <th>UTR & SCREENSHOT</th>
                    <th>STATUS</th>
                    <th className="text-right">ADMIN ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500 font-tech">NO BOOKINGS FOUND MATCHING CRITERIA</td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="font-bold text-white tracking-wider">{b.id}</td>
                        <td>
                          <div className="text-white font-bold">{b.user_name}</div>
                          <div className="text-xs text-gray-400">{b.user_phone}</div>
                          <div className="text-xs text-gray-500">{b.user_email}</div>
                        </td>
                        <td>
                          <span className="font-bold text-white">[{b.seats.join(', ')}]</span>
                          <div className="text-xs text-gray-400">({b.seats.length} seats)</div>
                        </td>
                        <td className="font-bold text-white">₹{b.total_amount}</td>
                        <td>
                          {b.utr ? (
                            <div>
                              <div className="text-emerald-400 font-mono text-xs">#{b.utr}</div>
                              {b.screenshot_url && (
                                <button 
                                  onClick={() => setSelectedScreenshotBooking(b)}
                                  className="text-xs text-blue-400 underline flex items-center gap-1 mt-1"
                                >
                                  <Eye size={12} /> View Screenshot
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">PENDING SUBMISSION</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-admin status-${b.status}`}>
                            {b.status}
                          </span>
                          {b.status === 'HELD' && (
                            <div className="text-xs text-gray-400 mt-1">10-min active</div>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            {b.status === 'UNDER_REVIEW' && (
                              <>
                                <button 
                                  onClick={() => handleApprove(b.id)}
                                  className="action-btn-mini action-approve"
                                  title="Approve UTR and confirm tickets"
                                >
                                  APPROVE
                                </button>
                                <button 
                                  onClick={() => handleReject(b.id)}
                                  className="action-btn-mini action-reject"
                                  title="Reject payment and release seats"
                                >
                                  REJECT
                                </button>
                              </>
                            )}

                            {['HELD', 'PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
                              <button 
                                onClick={() => handleReleaseSeats(b.id)}
                                className="action-btn-mini text-red-400 border-red-500/40"
                                title="Release seats / Cancel booking"
                              >
                                RELEASE
                              </button>
                            )}

                            {['HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED'].includes(b.status) && (
                              <button 
                                onClick={() => {
                                  setReassigningBooking(b);
                                  setReassignSeatsInput(b.seats.join(', '));
                                }}
                                className="action-btn-mini text-blue-400 border-blue-500/40"
                                title="Reassign seats to another consecutive row"
                              >
                                REASSIGN
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: LIVE INTERACTIVE ADMIN SEAT MAP (CLICK SEAT TO INSPECT)
            ========================================================================= */}
        {activeTab === 'seatmap' && (
          <div className="admin-seatmap-panel">
            <div className="text-center mb-8">
              <span className="font-tech text-xs text-gray-400">// LIVE INOX AUDITORIUM 03 OCCUPANCY MATRIX // CLICK ANY OCCUPIED SEAT TO INSPECT BOOKING</span>
            </div>

            <div className="seatmap-legend mb-6">
              <div className="legend-item"><div className="legend-box legend-available" /><span>AVAILABLE</span></div>
              <div className="legend-item"><div className="legend-box legend-held" /><span>HELD / UNDER REVIEW</span></div>
              <div className="legend-item"><div className="legend-box legend-booked" /><span>BOOKED / CONFIRMED</span></div>
            </div>

            <div className="seatmap-grid-wrap max-w-4xl mx-auto overflow-x-auto pb-6">
              {['K','J','I','H','G','F','E','D','C','B','A'].map((rowLabel) => {
                const rowSeats = seats
                  .filter(s => s.row_label === rowLabel)
                  .sort((a, b) => b.seat_number - a.seat_number);

                return (
                  <div key={rowLabel} className="seatmap-row flex items-center justify-center gap-2 my-1">
                    <span className="row-label-text font-bold text-xs w-6 text-center text-red-500 bg-zinc-900 border border-zinc-800 py-1 shrink-0">{rowLabel}</span>
                    <div className="seats-in-row flex items-center gap-1.5 flex-wrap justify-center">
                      {rowSeats.map((seat) => {
                        const showAisleBreak = seat.seat_number === 13 || seat.seat_number === 7;

                        return (
                          <React.Fragment key={seat.id}>
                            <button
                              type="button"
                              className={`seat-btn seat-${seat.status} w-8 h-8 text-[11px] font-bold rounded-sm border transition-all flex items-center justify-center shrink-0 ${seat.status === 'AVAILABLE' ? 'bg-zinc-800 text-gray-300 border-zinc-700 hover:border-red-500 hover:text-white' : 'bg-zinc-950 text-zinc-600 border-zinc-900 cursor-pointer opacity-80'}`}
                              onClick={() => {
                                if (seat.booking_id) {
                                  const b = bookings.find(book => book.id === seat.booking_id);
                                  if (b) setSelectedSeatBooking(b);
                                } else {
                                  alert(`Seat ${seat.label} is currently AVAILABLE (₹${event.ticket_price || 1}).`);
                                }
                              }}
                              title={`${seat.label} — ${seat.status} ${seat.booking_id ? `(#${seat.booking_id})` : ''}`}
                            >
                              {seat.seat_number}
                            </button>

                            {showAisleBreak && (
                              <div className="w-4 shrink-0" />
                            )}

                            {seat.seat_number === 7 && ['K','J','I','H','G','F'].includes(rowLabel) && (
                              <div className="flex items-center ml-4 px-3 py-1 bg-orange-950/40 border border-orange-500/50 text-orange-400 font-tech text-[10px] rounded shrink-0">
                                {rowLabel === 'I' ? 'ENTRY / EXIT →' : '▪ ▪ ▪'}
                              </div>
                            )}

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
          </div>
        )}

        {/* =========================================================================
            TAB 3: ACTIVITY LOGS & AUDIT TRAIL
            ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>ACTION TYPE</th>
                  <th>ADMIN / SOURCE</th>
                  <th>DETAILS & SEATS AFFECTED</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td><span className="font-bold text-white">{log.action || log.action_type}</span></td>
                    <td className="text-gray-400">{log.admin_id || 'SYSTEM / CUSTOMER'}</td>
                    <td className="text-gray-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* =========================================================================
          MODALS: PAYMENT SCREENSHOT PREVIEW, SEAT INSPECTION, SEAT REASSIGNMENT
          ========================================================================= */}
      {selectedScreenshotBooking && (
        <div className="screenshot-modal-overlay" onClick={() => setSelectedScreenshotBooking(null)}>
          <div className="screenshot-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <h4 className="font-impact text-lg">PAYMENT SCREENSHOT // #{selectedScreenshotBooking.id}</h4>
              <button onClick={() => setSelectedScreenshotBooking(null)}><X size={20} /></button>
            </div>
            
            <div className="font-tech text-xs text-gray-300 text-left mb-2">
              <div>ATTENDEE: <strong>{selectedScreenshotBooking.user_name}</strong> ({selectedScreenshotBooking.user_phone})</div>
              <div>SEATS: <strong>{selectedScreenshotBooking.seats.join(', ')}</strong> | UTR: <strong>{selectedScreenshotBooking.utr}</strong></div>
              <div>AMOUNT: <strong>₹{selectedScreenshotBooking.total_amount}</strong></div>
            </div>

            <img 
              src={selectedScreenshotBooking.screenshot_url} 
              alt="Payment Screenshot" 
              className="modal-img-preview" 
            />

            <div className="flex justify-between gap-4 mt-6">
              {selectedScreenshotBooking.status === 'UNDER_REVIEW' && (
                <>
                  <button 
                    onClick={() => {
                      handleApprove(selectedScreenshotBooking.id);
                      setSelectedScreenshotBooking(null);
                    }}
                    className="btn-brutalist flex-1 py-3 text-center justify-center bg-emerald-600 border-emerald-500"
                  >
                    APPROVE PAYMENT & CONFIRM
                  </button>
                  <button 
                    onClick={() => {
                      handleReject(selectedScreenshotBooking.id);
                      setSelectedScreenshotBooking(null);
                    }}
                    className="btn-brutalist-outline flex-1 py-3 text-center justify-center text-red-500 border-red-500"
                  >
                    REJECT & RELEASE SEATS
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedScreenshotBooking(null)}
                className="btn-brutalist-outline py-3 px-6 ml-auto"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSeatBooking && (
        <div className="screenshot-modal-overlay" onClick={() => setSelectedSeatBooking(null)}>
          <div className="screenshot-modal-card text-left font-tech" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <h4 className="font-impact text-lg">SEAT INSPECTION // BOOKING #{selectedSeatBooking.id}</h4>
              <button onClick={() => setSelectedSeatBooking(null)}><X size={20} /></button>
            </div>

            <div className="space-y-3 text-sm">
              <div><span className="text-gray-400">STATUS: </span><span className={`badge-admin status-${selectedSeatBooking.status}`}>{selectedSeatBooking.status}</span></div>
              <div><span className="text-gray-400">ATTENDEE NAME: </span><strong className="text-white">{selectedSeatBooking.user_name}</strong></div>
              <div><span className="text-gray-400">PHONE NUMBER: </span><strong className="text-white">{selectedSeatBooking.user_phone}</strong></div>
              <div><span className="text-gray-400">EMAIL ADDRESS: </span><span className="text-white">{selectedSeatBooking.user_email}</span></div>
              <div><span className="text-gray-400">SEATS RESERVED: </span><strong className="text-white text-base">[{selectedSeatBooking.seats.join(', ')}]</strong></div>
              <div><span className="text-gray-400">TOTAL AMOUNT: </span><strong className="text-white">₹{selectedSeatBooking.total_amount}</strong></div>
              <div><span className="text-gray-400">UTR / REFERENCE: </span><span className="text-emerald-400">#{selectedSeatBooking.utr || 'N/A (HELD STATE)'}</span></div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-end gap-3">
              {selectedSeatBooking.screenshot_url && (
                <button 
                  onClick={() => {
                    const b = selectedSeatBooking;
                    setSelectedSeatBooking(null);
                    setSelectedScreenshotBooking(b);
                  }}
                  className="action-btn-mini py-2 px-4"
                >
                  VIEW SCREENSHOT
                </button>
              )}
              <button onClick={() => setSelectedSeatBooking(null)} className="btn-brutalist py-2 px-6">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {reassigningBooking && (
        <div className="screenshot-modal-overlay" onClick={() => setReassigningBooking(null)}>
          <div className="screenshot-modal-card text-left font-tech" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <h4 className="font-impact text-lg">REASSIGN SEATS // #{reassigningBooking.id}</h4>
              <button onClick={() => setReassigningBooking(null)}><X size={20} /></button>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Currently assigned to: <strong>[{reassigningBooking.seats.join(', ')}]</strong> ({reassigningBooking.seats.length} seats).
              New seat assignments must be consecutive within the same row and equal in quantity or within max 4.
            </p>

            <form onSubmit={handleReassignSubmit}>
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2">NEW CONSECUTIVE SEAT LABELS (COMMA SEPARATED)</label>
                <input 
                  type="text"
                  required
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 text-white font-tech"
                  placeholder="e.g. A4, A5, A6"
                  value={reassignSeatsInput}
                  onChange={(e) => setReassignSeatsInput(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setReassigningBooking(null)} className="btn-brutalist-outline py-2 px-6 text-xs">
                  CANCEL
                </button>
                <button type="submit" className="btn-brutalist py-2 px-6 text-xs">
                  CONFIRM REASSIGNMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
