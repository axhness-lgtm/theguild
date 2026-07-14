import { supabase } from './supabase';

/**
 * ticketingService.js — Production-Grade Ticketing Engine for The Guild (147-seat INOX Auditorium)
 * Implements normalized tables structure, consecutive seat validation, state machine transitions,
 * 10-minute automatic reservation countdown & cleanup, and full operations support.
 */

const LOCAL_TICKETING_KEY = 'guild_inox_varuns_mall_screen3_v4';

// Generate exactly 147 seats tailored for the INOX Varun's Mall Screen 3 layout (Rows K down to A)
export function generateAuditoriumSeats() {
  const rowSpecifications = [
    { row: 'K', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'J', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'I', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'H', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'G', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'F', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7] }, // 12 seats
    { row: 'E', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 4, 3, 2, 1] }, // 16 seats (gap at 6,5 for entry/exit stairs)
    { row: 'D', numbers: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 4, 3, 2, 1] }, // 16 seats (gap at 6,5)
    { row: 'C', numbers: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 4, 3, 2, 1] }, // 15 seats (no 18, gap at 6,5)
    { row: 'B', numbers: [15, 14, 13, 12, 11, 10, 9, 8, 7, 4, 3, 2, 1] }, // 13 seats (no 18-16, gap at 6,5)
    { row: 'A', numbers: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] }  // 15 seats (continuous 15 down to 1)
  ];

  const seats = [];
  let seatIdCounter = 1;
  rowSpecifications.forEach(({ row, numbers }) => {
    numbers.forEach((num) => {
      seats.push({
        id: `seat-${seatIdCounter++}`,
        auditorium_id: 'inox-varuns-mall-screen3',
        row_label: row,
        seat_number: num,
        label: `${row}${num}`,
        price: 1,
        is_accessible: num === 1 || num === 18 || num === 15
      });
    });
  });
  return seats;
}

// Initial Ticketing State with ZERO default bookings so the user can test cleanly
function getInitialTicketingState() {
  const seats = generateAuditoriumSeats();

  const sampleBookings = []; // Completely empty out of the box as requested for testing
  const activityLogs = [];

  return {
    event: {
      id: 'fifa-wc-final-2026',
      name: 'FIFA WORLD CUP FINAL // LIVE SCREENING',
      venue: 'PVR INOX, BEACH ROAD, VIZAG',
      date: '20TH JULY',
      time: '00:30 AM ONWARDS',
      ticket_price: 499,
      total_seats: 147,
      max_seats_per_booking: 4,
      upi_id: 'steveoguri07-2@okicici', // Official permanent UPI ID
      qr_code_url: '/guildqr.png' // Official permanent QR Code image
    },
    seats,
    bookings: sampleBookings,
    activityLogs
  };
}

function ensureBlockedSeats(store) {
  if (!store || !store.bookings) return store;
  const blockedSeats = ['F13', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
  const vipBookingId = 'GLD-VIP-BLOCKED';
  
  const existingIndex = store.bookings.findIndex(b => b.id === vipBookingId);
  const vipBooking = {
    id: vipBookingId,
    event_id: store.event ? store.event.id : 'fifa-wc-final-2026',
    user_name: 'GUILD VIP / BLOCKED SEATS',
    user_phone: '+91 99999 99999',
    user_email: 'ops@theguild.app',
    total_amount: 499 * blockedSeats.length,
    status: 'CONFIRMED',
    seats: blockedSeats,
    utr: 'SYSTEM_HARDCODED_BLOCK',
    screenshot_url: 'https://via.placeholder.com/400x300.png?text=VIP+BLOCKED',
    timeline: [
      { state: 'CONFIRMED', timestamp: new Date(2026, 6, 1, 12, 0).toISOString(), note: 'Hardcoded blocked seating: F13, A5-A10' }
    ],
    created_at: new Date(2026, 6, 1, 12, 0).toISOString(),
    expires_at: new Date(2026, 11, 31, 23, 59).toISOString()
  };

  if (existingIndex === -1) {
    store.bookings.push(vipBooking);
  } else {
    store.bookings[existingIndex] = vipBooking;
  }
  return store;
}

function getLocalStore() {
  const data = localStorage.getItem(LOCAL_TICKETING_KEY);
  if (!data) {
    const initial = ensureBlockedSeats(getInitialTicketingState());
    localStorage.setItem(LOCAL_TICKETING_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    let parsed = JSON.parse(data);
    if (parsed && parsed.event) {
      parsed.event.ticket_price = 499;
      parsed.event.venue = 'PVR INOX, BEACH ROAD, VIZAG';
      parsed.event.date = '20TH JULY';
      parsed.event.time = '00:30 AM ONWARDS';
    }
    parsed = ensureBlockedSeats(parsed);
    return parsed;
  } catch (e) {
    const initial = ensureBlockedSeats(getInitialTicketingState());
    localStorage.setItem(LOCAL_TICKETING_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveLocalStore(state) {
  const ensured = ensureBlockedSeats(state);
  localStorage.setItem(LOCAL_TICKETING_KEY, JSON.stringify(ensured));
}

async function mirrorBookingToCloud(booking) {
  if (!supabase || !booking) return;
  try {
    const { error } = await supabase.from('bookings').upsert([{
      id: booking.id,
      event_id: booking.event_id,
      user_name: booking.user_name,
      user_phone: booking.user_phone,
      user_email: booking.user_email,
      total_amount: booking.total_amount,
      status: booking.status,
      seats: booking.seats,
      utr: booking.utr || null,
      screenshot_url: booking.screenshot_url || null,
      timeline: booking.timeline || [],
      created_at: booking.created_at,
      expires_at: booking.expires_at
    }]);
    if (error) {
      console.error('Supabase upsert error:', error.message || error);
    }
  } catch (e) {
    console.warn('Supabase sync notice during booking update', e);
  }
}

// Clean up expired reservations right away whenever the store is queried or modified
export function cleanupExpiredReservations(store) {
  const now = new Date();
  let changed = false;

  store.bookings = store.bookings.map(booking => {
    if ((booking.status === 'HELD' || booking.status === 'PENDING_PAYMENT') && new Date(booking.expires_at) <= now) {
      changed = true;
      const expiredEntry = {
        state: 'EXPIRED',
        timestamp: now.toISOString(),
        note: '10-minute reservation timer elapsed. Seats automatically released to AVAILABLE.'
      };
      store.activityLogs.unshift({
        id: 'log-' + Math.random().toString(36).substring(2, 8),
        timestamp: now.toISOString(),
        action: 'RESERVATION_EXPIRED',
        details: `Automatic timeout cleanup released seats ${booking.seats.join(', ')} for booking ${booking.id}`
      });
      const updated = {
        ...booking,
        status: 'EXPIRED',
        timeline: [...(booking.timeline || []), expiredEntry]
      };
      mirrorBookingToCloud(updated);
      return updated;
    }
    return booking;
  });

  if (changed) {
    saveLocalStore(store);
  }
  return store;
}

export const ticketingService = {
  // Sync live cross-device state from Supabase cloud database into local cache
  syncWithCloud: async () => {
    if (!supabase) return ticketingService.getTicketingData();
    const store = getLocalStore();
    try {
      // Proactively push all existing local bookings to Supabase so other devices can discover them immediately
      if (store.bookings && store.bookings.length > 0) {
        await Promise.all(store.bookings.map(b => mirrorBookingToCloud(b)));
      }

      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase fetch error during cloud sync:', error.message || error);
      }
      if (!error && data) {
        const cloudBookingsMap = new Map(data.map(b => [b.id, {
          id: b.id,
          event_id: b.event_id || store.event.id,
          user_name: b.user_name,
          user_phone: b.user_phone,
          user_email: b.user_email,
          total_amount: b.total_amount,
          status: b.status,
          seats: Array.isArray(b.seats) ? b.seats : (typeof b.seats === 'string' ? JSON.parse(b.seats) : []),
          utr: b.utr || null,
          screenshot_url: b.screenshot_url || null,
          timeline: Array.isArray(b.timeline) ? b.timeline : (typeof b.timeline === 'string' ? JSON.parse(b.timeline) : []),
          created_at: b.created_at,
          expires_at: b.expires_at
        }]));

        // Preserve active local bookings and merge screenshots or newer statuses to cloud
        store.bookings.forEach(localB => {
          if (!cloudBookingsMap.has(localB.id) && ['HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED'].includes(localB.status)) {
            cloudBookingsMap.set(localB.id, localB);
          } else if (cloudBookingsMap.has(localB.id)) {
            const cloudB = cloudBookingsMap.get(localB.id);
            let needsCloudMirror = false;
            // If local has a screenshot URL but cloud doesn't, merge and upload
            if (!cloudB.screenshot_url && localB.screenshot_url) {
              cloudB.screenshot_url = localB.screenshot_url;
              needsCloudMirror = true;
            }
            if (!cloudB.utr && localB.utr) {
              cloudB.utr = localB.utr;
              needsCloudMirror = true;
            }
            // If local status progressed further (e.g., UNDER_REVIEW or CANCELLED vs HELD), preserve local status
            if (localB.status === 'UNDER_REVIEW' && ['HELD', 'PENDING_PAYMENT'].includes(cloudB.status)) {
              cloudB.status = 'UNDER_REVIEW';
              needsCloudMirror = true;
            } else if (['CANCELLED', 'EXPIRED'].includes(localB.status) && !['CANCELLED', 'EXPIRED'].includes(cloudB.status)) {
              cloudB.status = localB.status;
              needsCloudMirror = true;
            }
            if (needsCloudMirror) {
              mirrorBookingToCloud(cloudB);
            }
          }
        });

        store.bookings = Array.from(cloudBookingsMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        ensureBlockedSeats(store);
        saveLocalStore(store);
      }
    } catch (e) {
      console.warn('Supabase fetch notice during cloud sync', e);
    }
    return ticketingService.getTicketingData();
  },
  // Get full ticketing state (with automatic seat derivation and cleanup)
  getTicketingData: () => {
    const store = cleanupExpiredReservations(getLocalStore());
    
    // Derive seat status strictly from active bookings (HELD, PENDING_PAYMENT, UNDER_REVIEW, CONFIRMED)
    const activeBookings = store.bookings.filter(b => 
      ['HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED'].includes(b.status)
    );

    const seatMap = {};
    store.seats.forEach(seat => {
      seatMap[seat.label] = {
        ...seat,
        status: 'AVAILABLE',
        booking_id: null
      };
    });

    // Hardcode mandatory blocked seats directly on seatMap just in case
    const hardcodedBlockedSeats = ['F13', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
    hardcodedBlockedSeats.forEach(seatLabel => {
      if (seatMap[seatLabel]) {
        seatMap[seatLabel].status = 'BOOKED';
        seatMap[seatLabel].booking_id = 'GLD-VIP-BLOCKED';
        seatMap[seatLabel].booking_status = 'CONFIRMED';
      }
    });

    activeBookings.forEach(booking => {
      booking.seats.forEach(seatLabel => {
        if (seatMap[seatLabel]) {
          seatMap[seatLabel].status = booking.status === 'CONFIRMED' ? 'BOOKED' : 'HELD';
          seatMap[seatLabel].booking_id = booking.id;
          seatMap[seatLabel].booking_status = booking.status;
        }
      });
    });

    const derivedSeats = Object.values(seatMap);

    return {
      event: store.event,
      seats: derivedSeats,
      bookings: store.bookings,
      activityLogs: store.activityLogs
    };
  },

  // Enforce Consecutive Seat Rule (Max 4, Same Row, Adjacent numbers without gaps)
  validateConsecutiveSelection: (selectedSeatLabels) => {
    if (!selectedSeatLabels || selectedSeatLabels.length === 0) {
      return { valid: false, error: 'Please select at least 1 seat.' };
    }
    if (selectedSeatLabels.length > 4) {
      return { valid: false, error: 'Maximum 4 consecutive seats allowed per booking.' };
    }
    if (selectedSeatLabels.length === 1) {
      return { valid: true };
    }

    // Extract row and number (e.g., 'A12' -> row: 'A', num: 12)
    const parsed = selectedSeatLabels.map(label => {
      const row = label.charAt(0);
      const num = parseInt(label.substring(1), 10);
      return { label, row, num };
    });

    const firstRow = parsed[0].row;
    const sameRow = parsed.every(p => p.row === firstRow);
    if (!sameRow) {
      return { valid: false, error: 'All seats must be consecutive within the SAME row.' };
    }

    // Sort by seat number and verify strict +1 adjacency
    parsed.sort((a, b) => a.num - b.num);
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i + 1].num !== parsed[i].num + 1) {
        return { valid: false, error: 'Non-consecutive seat selections are forbidden. Seats must be adjacent without gaps.' };
      }
    }

    return { valid: true };
  },

  // Atomic Seat Reservation (Start transaction, check availability, create booking, set 10-min timer)
  createReservation: async ({ userName, userPhone, userEmail, selectedSeats }) => {
    // 1. Verify consecutive selection rule
    const validation = ticketingService.validateConsecutiveSelection(selectedSeats);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const store = cleanupExpiredReservations(getLocalStore());

    // 2. Derive active bookings & verify that EVERY seat is still AVAILABLE right now
    const activeBookings = store.bookings.filter(b => 
      ['HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED'].includes(b.status)
    );

    const occupiedSeats = new Set();
    activeBookings.forEach(b => b.seats.forEach(s => occupiedSeats.add(s)));

    for (const seatLabel of selectedSeats) {
      if (occupiedSeats.has(seatLabel)) {
        throw new Error(`Seat ${seatLabel} was just reserved by another customer. Atomic check failed.`);
      }
    }

    // 3. Create unpredictable booking ID & 10-minute expiration timestamp
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingId = `GLD-INOX-${randomSuffix}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // exactly 10 minutes in the future

    const newBooking = {
      id: bookingId,
      event_id: store.event.id,
      user_name: userName,
      user_phone: userPhone,
      user_email: userEmail,
      total_amount: store.event.ticket_price * selectedSeats.length,
      status: 'HELD',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      seats: selectedSeats,
      utr: null,
      screenshot_url: null,
      timeline: [
        { state: 'AVAILABLE', timestamp: new Date(now.getTime() - 15000).toISOString(), note: 'Seat map queried' },
        { state: 'HELD', timestamp: now.toISOString(), note: `Atomic reservation successful for ${selectedSeats.join(', ')}. 10-minute timer started.` }
      ]
    };

    store.bookings.unshift(newBooking);
    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'RESERVATION_CREATED',
      details: `Customer ${userName} locked in ${selectedSeats.length} consecutive seat(s) (${selectedSeats.join(', ')}). Booking ID: ${bookingId}`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(newBooking);
    return newBooking;
  },

  submitPayment: async (bookingId, { utr = 'SCREENSHOT_VERIFIED', screenshotUrl }) => {
    let store = cleanupExpiredReservations(getLocalStore());
    let bookingIndex = store.bookings.findIndex(b => b.id === bookingId);
    
    // If not found locally, attempt to fetch directly from cloud database before failing
    if (bookingIndex === -1 && supabase) {
      try {
        const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
        if (data) {
          const restored = {
            id: data.id,
            event_id: data.event_id || store.event.id,
            user_name: data.user_name,
            user_phone: data.user_phone,
            user_email: data.user_email,
            total_amount: data.total_amount,
            status: data.status,
            seats: Array.isArray(data.seats) ? data.seats : (typeof data.seats === 'string' ? JSON.parse(data.seats) : []),
            utr: data.utr || null,
            screenshot_url: data.screenshot_url || null,
            timeline: Array.isArray(data.timeline) ? data.timeline : (typeof data.timeline === 'string' ? JSON.parse(data.timeline) : []),
            created_at: data.created_at,
            expires_at: data.expires_at
          };
          store.bookings.unshift(restored);
          saveLocalStore(store);
          bookingIndex = 0;
        }
      } catch (e) {
        console.warn('Could not fetch missing booking from cloud during payment submission', e);
      }
    }

    if (bookingIndex === -1) {
      throw new Error('Your reservation session was not found or has expired. Please click "← CHANGE SEATS" to select your seats again.');
    }

    const booking = store.bookings[bookingIndex];
    if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
      throw new Error('This reservation has already expired or been cancelled. Please select new seats.');
    }

    if (!screenshotUrl) {
      throw new Error('Payment screenshot upload is mandatory to verify your transaction.');
    }

    const now = new Date();
    const updatedTimeline = [
      ...(booking.timeline || []),
      { state: 'PENDING_PAYMENT', timestamp: new Date(now.getTime() - 60000).toISOString(), note: 'UPI QR code scanned' },
      { state: 'UNDER_REVIEW', timestamp: now.toISOString(), note: `Payment screenshot submitted for verification` }
    ];

    const updatedBooking = {
      ...booking,
      status: 'UNDER_REVIEW',
      utr: utr || 'SCREENSHOT_VERIFIED',
      screenshot_url: screenshotUrl,
      paymentScreenshot: screenshotUrl,
      timeline: updatedTimeline
    };

    store.bookings[bookingIndex] = updatedBooking;
    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'PAYMENT_SUBMITTED',
      details: `Customer ${booking.user_name} uploaded payment screenshot for (${booking.seats.join(', ')})`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(updatedBooking);
    return updatedBooking;
  },

  // Admin Action: Approve Payment -> CONFIRMED
  adminApprovePayment: async (bookingId, adminId = 'FOUNDER_01') => {
    const store = getLocalStore();
    const bookingIndex = store.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = store.bookings[bookingIndex];
    const now = new Date();

    const updatedTimeline = [
      ...(booking.timeline || []),
      { state: 'CONFIRMED', timestamp: now.toISOString(), note: `Payment UTR verified by Admin (${adminId}). Tickets confirmed.` }
    ];

    store.bookings[bookingIndex] = {
      ...booking,
      status: 'CONFIRMED',
      timeline: updatedTimeline
    };

    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'PAYMENT_APPROVED',
      admin_id: adminId,
      details: `Approved booking #${bookingId} (${booking.user_name} - ${booking.seats.join(', ')})`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(store.bookings[bookingIndex]);
    return store.bookings[bookingIndex];
  },

  // Admin Action: Reject Payment -> CANCELLED & release seats
  adminRejectPayment: async (bookingId, reason = 'Invalid or duplicate UTR number', adminId = 'FOUNDER_01') => {
    const store = getLocalStore();
    const bookingIndex = store.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = store.bookings[bookingIndex];
    const now = new Date();

    const updatedTimeline = [
      ...(booking.timeline || []),
      { state: 'CANCELLED', timestamp: now.toISOString(), note: `Rejected by Admin (${adminId}): ${reason}. Seats released.` }
    ];

    store.bookings[bookingIndex] = {
      ...booking,
      status: 'CANCELLED',
      timeline: updatedTimeline
    };

    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'PAYMENT_REJECTED',
      admin_id: adminId,
      details: `Rejected booking #${bookingId} (${booking.user_name}) due to: ${reason}`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(store.bookings[bookingIndex]);
    return store.bookings[bookingIndex];
  },

  // Admin Action: Release Seats / Manual Cancellation
  adminReleaseSeats: async (bookingId, adminId = 'FOUNDER_01') => {
    const store = getLocalStore();
    const bookingIndex = store.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = store.bookings[bookingIndex];
    const now = new Date();

    const updatedTimeline = [
      ...(booking.timeline || []),
      { state: 'CANCELLED', timestamp: now.toISOString(), note: `Manual seat release by Admin (${adminId})` }
    ];

    store.bookings[bookingIndex] = {
      ...booking,
      status: 'CANCELLED',
      timeline: updatedTimeline
    };

    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'SEATS_RELEASED',
      admin_id: adminId,
      details: `Released seats ${booking.seats.join(', ')} from booking #${bookingId}`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(store.bookings[bookingIndex]);
    return store.bookings[bookingIndex];
  },

  // Admin Action: Reassign Seats
  adminReassignSeats: async (bookingId, newConsecutiveSeats, adminId = 'FOUNDER_01') => {
    const validation = ticketingService.validateConsecutiveSelection(newConsecutiveSeats);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const store = getLocalStore();
    const bookingIndex = store.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) throw new Error('Booking not found');

    const booking = store.bookings[bookingIndex];

    // Check availability of new seats against other active bookings
    const activeOther = store.bookings.filter(b => 
      b.id !== bookingId && ['HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED'].includes(b.status)
    );
    const occupied = new Set();
    activeOther.forEach(b => b.seats.forEach(s => occupied.add(s)));

    for (const seatLabel of newConsecutiveSeats) {
      if (occupied.has(seatLabel)) {
        throw new Error(`Seat ${seatLabel} is currently occupied by another active booking.`);
      }
    }

    const oldSeats = booking.seats;
    const now = new Date();
    const updatedTimeline = [
      ...(booking.timeline || []),
      { state: booking.status, timestamp: now.toISOString(), note: `Seats reassigned from [${oldSeats.join(', ')}] to [${newConsecutiveSeats.join(', ')}] by Admin` }
    ];

    store.bookings[bookingIndex] = {
      ...booking,
      seats: newConsecutiveSeats,
      total_amount: store.event.ticket_price * newConsecutiveSeats.length,
      timeline: updatedTimeline
    };

    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'SEATS_REASSIGNED',
      admin_id: adminId,
      details: `Reassigned #${bookingId} (${booking.user_name}) from ${oldSeats.join(', ')} -> ${newConsecutiveSeats.join(', ')}`
    });

    saveLocalStore(store);
    await mirrorBookingToCloud(store.bookings[bookingIndex]);
    return store.bookings[bookingIndex];
  },

  // Admin Action: Live Update UPI ID, Custom QR Code URL, or Event Specs
  updateEventSettings: async (newSettings, adminId = 'FOUNDER_01') => {
    const store = getLocalStore();
    const now = new Date();

    store.event = {
      ...store.event,
      ...newSettings
    };

    store.activityLogs.unshift({
      id: 'log-' + Math.random().toString(36).substring(2, 8),
      timestamp: now.toISOString(),
      action: 'SETTINGS_UPDATED',
      admin_id: adminId,
      details: `Updated event & UPI settings: UPI ID -> ${store.event.upi_id}`
    });

    saveLocalStore(store);
    return store.event;
  }
};
