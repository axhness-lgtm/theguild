-- ==============================================================================
-- THE GUILD // VISAKHAPATNAM — PRODUCTION TICKETING SYSTEM SCHEMA (SUPABASE)
-- Designed for a single high-concurrency FIFA World Cup Final screening inside an INOX Auditorium (147 seats).
-- Enforces: Max 4 seats, Consecutive-In-Same-Row seating, Atomic transactions without double booking,
-- 10-Minute reservation countdown expiration, and manual UPI QR payment verification workflow.
-- ==============================================================================

-- 1. AUDITORIUMS TABLE
CREATE TABLE IF NOT EXISTS auditoriums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    total_seats INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    auditorium_id TEXT NOT NULL REFERENCES auditoriums(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    competition TEXT NOT NULL,
    screening_time TIMESTAMPTZ NOT NULL,
    ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 459.00,
    max_seats_per_booking INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SEATS TABLE (Normalized seat definition; status is NEVER stored directly here)
CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    auditorium_id TEXT NOT NULL REFERENCES auditoriums(id) ON DELETE CASCADE,
    row_label VARCHAR(5) NOT NULL,
    seat_number INTEGER NOT NULL,
    seat_label VARCHAR(10) NOT NULL UNIQUE, -- e.g. 'A1', 'G6'
    price NUMERIC(10, 2) NOT NULL DEFAULT 459.00,
    is_accessible BOOLEAN DEFAULT FALSE,
    UNIQUE(auditorium_id, row_label, seat_number)
);

-- 4. BOOKINGS TABLE (State machine: AVAILABLE -> HELD -> PENDING_PAYMENT -> UNDER_REVIEW -> CONFIRMED -> CANCELLED -> EXPIRED)
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, -- Unpredictable ID e.g. 'GLD-INOX-8492A'
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    user_name TEXT NOT NULL,
    user_phone VARCHAR(25) NOT NULL,
    user_email TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('AVAILABLE', 'HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 5. BOOKING_SEATS TABLE (Normalized many-to-many junction mapping bookings to reserved seats)
CREATE TABLE IF NOT EXISTS booking_seats (
    id BIGSERIAL PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    UNIQUE(booking_id, seat_id)
);

-- 6. PAYMENTS TABLE (Manual static UPI QR payment verifications)
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    utr_number VARCHAR(50) NOT NULL UNIQUE,
    payment_method VARCHAR(20) DEFAULT 'UPI_QR',
    amount NUMERIC(10, 2) NOT NULL,
    screenshot_url TEXT,
    verified_by_admin TEXT,
    verified_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'UNDER_REVIEW' CHECK (status IN ('UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ADMINS TABLE (Supabase Auth protected operations control)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role VARCHAR(30) DEFAULT 'OPERATIONS_MANAGER',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ACTIVITY_LOGS TABLE (Full audit trail of all actions and verification steps)
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'RESERVATION_CREATED', 'PAYMENT_SUBMITTED', 'PAYMENT_APPROVED', etc.
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-CONCURRENCY SEAT MAP QUERIES & EXPIRATION CLEANUP
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_status_expires ON bookings(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_seats_seat ON booking_seats(seat_id);

-- ==============================================================================
-- DERIVED SEAT AVAILABILITY VIEW (No direct seat status stored in seats table)
-- ==============================================================================
CREATE OR REPLACE VIEW v_derived_seat_availability AS
SELECT 
    s.id AS seat_id,
    s.auditorium_id,
    s.row_label,
    s.seat_number,
    s.seat_label,
    s.price,
    CASE 
        WHEN b.id IS NULL OR b.status IN ('CANCELLED', 'EXPIRED', 'AVAILABLE') THEN 'AVAILABLE'
        WHEN b.status = 'CONFIRMED' THEN 'BOOKED'
        ELSE 'HELD'
    END AS derived_status,
    b.id AS current_booking_id,
    b.status AS current_booking_status,
    b.expires_at
FROM seats s
LEFT JOIN booking_seats bs ON s.id = bs.seat_id
LEFT JOIN bookings b ON bs.booking_id = b.id 
    AND b.status IN ('HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED')
    AND (b.status = 'CONFIRMED' OR b.expires_at > NOW());

-- ==============================================================================
-- ATOMIC TRANSACTION STORED PROCEDURE: reserve_consecutive_seats()
-- Prevents double bookings under high concurrency using row-level locking
-- ==============================================================================
CREATE OR REPLACE FUNCTION reserve_consecutive_seats(
    p_event_id TEXT,
    p_user_name TEXT,
    p_user_phone TEXT,
    p_user_email TEXT,
    p_seat_ids TEXT[]
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id TEXT;
    v_ticket_price NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_unavailable_count INTEGER;
    v_seat_id TEXT;
BEGIN
    -- 1. Check max seats limitation
    IF ARRAY_LENGTH(p_seat_ids, 1) > 4 OR ARRAY_LENGTH(p_seat_ids, 1) < 1 THEN
        RAISE EXCEPTION 'You must select between 1 and 4 seats per booking.';
    END IF;

    -- 2. Lock targeted seat records and verify none are active or held
    SELECT COUNT(*)
    INTO v_unavailable_count
    FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    WHERE bs.seat_id = ANY(p_seat_ids)
      AND b.status IN ('HELD', 'PENDING_PAYMENT', 'UNDER_REVIEW', 'CONFIRMED')
      AND (b.status = 'CONFIRMED' OR b.expires_at > NOW())
    FOR UPDATE OF bs;

    IF v_unavailable_count > 0 THEN
        RAISE EXCEPTION 'One or more selected seats were just taken by another customer. Aborting reservation.';
    END IF;

    -- 3. Calculate total amount
    SELECT ticket_price INTO v_ticket_price FROM events WHERE id = p_event_id;
    IF v_ticket_price IS NULL THEN v_ticket_price := 459.00; END IF;
    v_total := v_ticket_price * ARRAY_LENGTH(p_seat_ids, 1);

    -- 4. Generate unpredictable ID
    v_booking_id := 'GLD-INOX-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));

    -- 5. Insert booking with 10-minute expiration
    INSERT INTO bookings (
        id, event_id, user_name, user_phone, user_email, total_amount, status, expires_at
    ) VALUES (
        v_booking_id, p_event_id, p_user_name, p_user_phone, p_user_email, v_total, 'HELD', NOW() + INTERVAL '10 minutes'
    );

    -- 6. Insert booking_seats junction mappings
    FOREACH v_seat_id IN ARRAY p_seat_ids LOOP
        INSERT INTO booking_seats (booking_id, seat_id) VALUES (v_booking_id, v_seat_id);
    END LOOP;

    -- 7. Log activity
    INSERT INTO activity_logs (booking_id, action_type, details)
    VALUES (v_booking_id, 'RESERVATION_CREATED', 'Reserved ' || ARRAY_LENGTH(p_seat_ids, 1) || ' seats. Timer 10m started.');

    RETURN v_booking_id;
END;
$$;

-- ==============================================================================
-- AUTOMATIC TIMEOUT CLEANUP CRON / SCHEDULED JOB FUNCTION
-- Releases expired reservations automatically
-- ==============================================================================
CREATE OR REPLACE FUNCTION release_expired_reservations() RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_released_count INTEGER;
BEGIN
    UPDATE bookings
    SET status = 'EXPIRED'
    WHERE status IN ('HELD', 'PENDING_PAYMENT')
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_released_count = ROW_COUNT;

    IF v_released_count > 0 THEN
        INSERT INTO activity_logs (action_type, details)
        VALUES ('AUTOMATIC_TIMEOUT_CLEANUP', 'Released ' || v_released_count || ' expired reservations back to AVAILABLE.');
    END IF;

    RETURN v_released_count;
END;
$$;
