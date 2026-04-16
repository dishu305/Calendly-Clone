-- PostgreSQL schema for Calendly Clone
-- Matches the current application feature set, including bonus features.

CREATE TABLE IF NOT EXISTS event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    availability_start VARCHAR(5) NOT NULL DEFAULT '09:00',
    availability_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    weekday_schedules JSONB NOT NULL DEFAULT '[]'::jsonb,
    date_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
    buffer_before_minutes INT NOT NULL DEFAULT 0,
    buffer_after_minutes INT NOT NULL DEFAULT 0,
    custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    event_type_id INT NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    event_type_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    booking_date DATE NOT NULL,
    booking_time VARCHAR(5) NOT NULL,
    custom_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_type_id, booking_date, booking_time)
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
