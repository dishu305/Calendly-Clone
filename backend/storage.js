const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const DEFAULT_WEEKDAY_SCHEDULES = [
  { day: 0, enabled: false, start: '09:00', end: '17:00' },
  { day: 1, enabled: true, start: '09:00', end: '17:00' },
  { day: 2, enabled: true, start: '09:00', end: '17:00' },
  { day: 3, enabled: true, start: '09:00', end: '17:00' },
  { day: 4, enabled: true, start: '09:00', end: '17:00' },
  { day: 5, enabled: true, start: '09:00', end: '17:00' },
  { day: 6, enabled: false, start: '09:00', end: '17:00' },
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTimeToMinutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function formatMinutes(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function withBookingStatus(booking) {
  return {
    ...booking,
    status: new Date(`${booking.date}T${booking.time}:00`).getTime() >= Date.now() ? 'upcoming' : 'past',
  };
}

function normalizeWeekdaySchedules(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_WEEKDAY_SCHEDULES;
  }

  return DEFAULT_WEEKDAY_SCHEDULES.map((defaultSchedule) => {
    const provided = value.find((item) => Number(item.day) === defaultSchedule.day);
    return {
      day: defaultSchedule.day,
      enabled: provided ? Boolean(provided.enabled) : defaultSchedule.enabled,
      start: provided?.start || defaultSchedule.start,
      end: provided?.end || defaultSchedule.end,
    };
  });
}

function normalizeDateOverrides(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((override, index) => ({
    id: override.id || `override-${index + 1}`,
    date: override.date,
    enabled: override.enabled !== false,
    start: override.start || '09:00',
    end: override.end || '17:00',
  }));
}

function normalizeCustomQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((question) => typeof question.label === 'string' && question.label.trim())
    .map((question, index) => ({
      id: question.id || `question-${index + 1}`,
      label: question.label.trim(),
      required: question.required !== false,
    }));
}

function normalizeEventType(eventType) {
  return {
    ...eventType,
    availabilityStart: eventType.availabilityStart || '09:00',
    availabilityEnd: eventType.availabilityEnd || '17:00',
    weekdaySchedules: normalizeWeekdaySchedules(eventType.weekdaySchedules),
    dateOverrides: normalizeDateOverrides(eventType.dateOverrides),
    bufferBeforeMinutes: Number(eventType.bufferBeforeMinutes || 0),
    bufferAfterMinutes: Number(eventType.bufferAfterMinutes || 0),
    customQuestions: normalizeCustomQuestions(eventType.customQuestions),
  };
}

function normalizeEventTypeRow(row) {
  return normalizeEventType({
    id: Number(row.id),
    name: row.name,
    duration: Number(row.duration),
    slug: row.slug,
    availabilityStart: row.availability_start || row.availabilityStart,
    availabilityEnd: row.availability_end || row.availabilityEnd,
    weekdaySchedules: row.weekday_schedules || row.weekdaySchedules,
    dateOverrides: row.date_overrides || row.dateOverrides,
    bufferBeforeMinutes: row.buffer_before_minutes ?? row.bufferBeforeMinutes,
    bufferAfterMinutes: row.buffer_after_minutes ?? row.bufferAfterMinutes,
    customQuestions: row.custom_questions || row.customQuestions,
    createdAt: row.created_at || row.createdAt,
  });
}

function normalizeBookingRow(row) {
  return withBookingStatus({
    id: Number(row.id),
    eventTypeId: Number(row.event_type_id ?? row.eventTypeId),
    eventTypeName: row.event_type_name ?? row.eventTypeName,
    name: row.name,
    email: row.email,
    date: row.booking_date ?? row.date,
    time: row.booking_time ?? row.time,
    customAnswers: Array.isArray(row.custom_answers ?? row.customAnswers)
      ? row.custom_answers ?? row.customAnswers
      : [],
    createdAt: row.created_at || row.createdAt,
  });
}

function normalizeNotificationRow(row) {
  return {
    id: Number(row.id),
    type: row.type,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at || row.createdAt,
  };
}

function buildTimeSlots(startTime, endTime, durationMinutes = 30) {
  const slots = [];
  const startTotal = parseTimeToMinutes(startTime);
  const endTotal = parseTimeToMinutes(endTime);

  for (let total = startTotal; total + durationMinutes <= endTotal; total += 30) {
    slots.push(formatMinutes(total));
  }

  return slots;
}

function buildBookingWindows(eventType, date, time) {
  const startMinutes = parseTimeToMinutes(time);
  const start = new Date(`${date}T${time}:00`).getTime();
  const meetingEndMinutes = startMinutes + Number(eventType.duration);
  const expandedStartMinutes = startMinutes - Number(eventType.bufferBeforeMinutes || 0);
  const expandedEndMinutes =
    meetingEndMinutes + Number(eventType.bufferAfterMinutes || 0);

  return {
    rawStart: startMinutes,
    rawEnd: meetingEndMinutes,
    expandedStart: expandedStartMinutes,
    expandedEnd: expandedEndMinutes,
    startTime: start,
  };
}

function slotsOverlap(left, right) {
  return left.expandedStart < right.expandedEnd && right.expandedStart < left.expandedEnd;
}

function findScheduleForDate(eventType, date) {
  const override = eventType.dateOverrides.find((entry) => entry.date === date);

  if (override) {
    if (!override.enabled) {
      return null;
    }

    return { start: override.start, end: override.end };
  }

  const weekday = new Date(`${date}T00:00:00`).getDay();
  const weekdaySchedule = eventType.weekdaySchedules.find((entry) => entry.day === weekday);

  if (!weekdaySchedule || !weekdaySchedule.enabled) {
    return null;
  }

  return { start: weekdaySchedule.start, end: weekdaySchedule.end };
}

class JsonStorage {
  constructor() {
    this.mode = 'json';
  }

  async initialize() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          {
            eventTypes: [],
            bookings: [],
            notifications: [],
            counters: {
              eventType: 1,
              booking: 1,
              notification: 1,
            },
          },
          null,
          2
        )
      );
    }

    const store = this.readStore();
    let changed = false;

    if (!Array.isArray(store.notifications)) {
      store.notifications = [];
      changed = true;
    }

    if (!store.counters.notification) {
      store.counters.notification = 1;
      changed = true;
    }

    store.eventTypes = store.eventTypes.map((eventType) => {
      const normalized = normalizeEventType(eventType);
      if (JSON.stringify(normalized) !== JSON.stringify(eventType)) {
        changed = true;
      }
      return normalized;
    });

    store.bookings = store.bookings.map((booking) => {
      if (Array.isArray(booking.customAnswers)) {
        return booking;
      }

      changed = true;
      return {
        ...booking,
        customAnswers: [],
      };
    });

    if (changed) {
      this.writeStore(store);
    }
  }

  readStore() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }

  writeStore(store) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  }

  buildUniqueSlug(name, eventTypes, excludeId) {
    const baseSlug = slugify(name) || 'event';
    let candidate = baseSlug;
    let suffix = 2;

    while (
      eventTypes.some(
        (eventType) => eventType.slug === candidate && eventType.id !== excludeId
      )
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  addNotification(store, { type, recipient, subject, body }) {
    const notification = {
      id: store.counters.notification++,
      type,
      recipient,
      subject,
      body,
      createdAt: new Date().toISOString(),
    };

    store.notifications.push(notification);
  }

  async listEventTypes() {
    const store = this.readStore();
    return store.eventTypes.map(normalizeEventType);
  }

  async createEventType(payload) {
    const store = this.readStore();
    const eventType = normalizeEventType({
      id: store.counters.eventType++,
      slug: this.buildUniqueSlug(payload.name, store.eventTypes),
      createdAt: new Date().toISOString(),
      ...payload,
    });

    store.eventTypes.push(eventType);
    this.writeStore(store);

    return eventType;
  }

  async updateEventType(eventTypeId, payload) {
    const store = this.readStore();
    const existing = store.eventTypes.find((eventType) => eventType.id === eventTypeId);

    if (!existing) {
      return null;
    }

    const updated = normalizeEventType({
      ...existing,
      ...payload,
      slug: this.buildUniqueSlug(payload.name, store.eventTypes, eventTypeId),
    });

    store.eventTypes = store.eventTypes.map((eventType) =>
      eventType.id === eventTypeId ? updated : eventType
    );
    store.bookings = store.bookings.map((booking) =>
      booking.eventTypeId === eventTypeId
        ? {
            ...booking,
            eventTypeName: updated.name,
          }
        : booking
    );
    this.writeStore(store);

    return updated;
  }

  async deleteEventType(eventTypeId) {
    const store = this.readStore();
    const existing = store.eventTypes.find((eventType) => eventType.id === eventTypeId);

    if (!existing) {
      return false;
    }

    store.eventTypes = store.eventTypes.filter((eventType) => eventType.id !== eventTypeId);
    store.bookings = store.bookings.filter((booking) => booking.eventTypeId !== eventTypeId);
    this.writeStore(store);
    return true;
  }

  async listBookings() {
    const store = this.readStore();
    return store.bookings
      .map(normalizeBookingRow)
      .sort(
        (left, right) =>
          new Date(`${left.date}T${left.time}:00`).getTime() -
          new Date(`${right.date}T${right.time}:00`).getTime()
      );
  }

  async deleteBooking(bookingId) {
    const store = this.readStore();
    const existing = store.bookings.find((booking) => booking.id === bookingId);

    if (!existing) {
      return false;
    }

    store.bookings = store.bookings.filter((booking) => booking.id !== bookingId);
    this.addNotification(store, {
      type: 'cancellation',
      recipient: existing.email,
      subject: `Your ${existing.eventTypeName} meeting has been cancelled`,
      body: `The meeting scheduled for ${existing.date} at ${existing.time} has been cancelled.`,
    });
    this.writeStore(store);
    return true;
  }

  async listNotifications() {
    const store = this.readStore();
    return store.notifications
      .map(normalizeNotificationRow)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  async getAvailability(slug, date) {
    const store = this.readStore();
    const eventType = store.eventTypes.map(normalizeEventType).find((entry) => entry.slug === slug);

    if (!eventType) {
      return null;
    }

    const schedule = findScheduleForDate(eventType, date);

    if (!schedule) {
      return {
        eventType,
        date,
        allSlots: [],
        bookedTimes: [],
        availableSlots: [],
      };
    }

    const allSlots = buildTimeSlots(schedule.start, schedule.end, eventType.duration);
    const relatedBookings = store.bookings.filter((booking) => booking.eventTypeId === eventType.id && booking.date === date);

    const availableSlots = allSlots.filter((slot) => {
      const candidateWindow = buildBookingWindows(eventType, date, slot);
      return !relatedBookings.some((booking) =>
        slotsOverlap(candidateWindow, buildBookingWindows(eventType, booking.date, booking.time))
      );
    });

    return {
      eventType,
      date,
      allSlots,
      bookedTimes: relatedBookings.map((booking) => booking.time),
      availableSlots,
    };
  }

  async createBooking({ slug, name, email, date, time, customAnswers }) {
    const store = this.readStore();
    const eventType = store.eventTypes.map(normalizeEventType).find((entry) => entry.slug === slug);

    if (!eventType) {
      return { error: 'event_not_found' };
    }

    const availability = await this.getAvailability(slug, date);

    if (!availability.availableSlots.includes(time)) {
      return { error: 'slot_taken' };
    }

    const booking = {
      id: store.counters.booking++,
      eventTypeId: eventType.id,
      eventTypeName: eventType.name,
      name,
      email,
      date,
      time,
      customAnswers,
      createdAt: new Date().toISOString(),
    };

    store.bookings.push(booking);
    this.addNotification(store, {
      type: 'booking_confirmation',
      recipient: email,
      subject: `Booking confirmed for ${eventType.name}`,
      body: `Your meeting is booked for ${date} at ${time}.`,
    });
    this.writeStore(store);

    return { booking: normalizeBookingRow(booking) };
  }
}

class PostgresStorage {
  constructor(databaseUrl) {
    this.mode = 'postgres';
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
    });
  }

  async initialize() {
    await this.pool.query(`
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
      )
    `);

    await this.pool.query(`
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
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS weekday_schedules JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await this.pool.query(`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS date_overrides JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await this.pool.query(`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS buffer_before_minutes INT NOT NULL DEFAULT 0`);
    await this.pool.query(`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS buffer_after_minutes INT NOT NULL DEFAULT 0`);
    await this.pool.query(`ALTER TABLE event_types ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await this.pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '[]'::jsonb`);
  }

  async buildUniqueSlug(name, excludeId) {
    const baseSlug = slugify(name) || 'event';
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const result = await this.pool.query(
        `
          SELECT id FROM event_types
          WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)
        `,
        [candidate, excludeId ?? null]
      );

      if (result.rows.length === 0) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async listEventTypes() {
    const result = await this.pool.query(`
      SELECT *
      FROM event_types
      ORDER BY id ASC
    `);

    return result.rows.map(normalizeEventTypeRow);
  }

  async createEventType(payload) {
    const slug = await this.buildUniqueSlug(payload.name);
    const result = await this.pool.query(
      `
        INSERT INTO event_types (
          name, duration, slug, availability_start, availability_end,
          weekday_schedules, date_overrides, buffer_before_minutes, buffer_after_minutes, custom_questions
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `,
      [
        payload.name,
        payload.duration,
        slug,
        payload.availabilityStart,
        payload.availabilityEnd,
        JSON.stringify(normalizeWeekdaySchedules(payload.weekdaySchedules)),
        JSON.stringify(normalizeDateOverrides(payload.dateOverrides)),
        payload.bufferBeforeMinutes || 0,
        payload.bufferAfterMinutes || 0,
        JSON.stringify(normalizeCustomQuestions(payload.customQuestions)),
      ]
    );

    return normalizeEventTypeRow(result.rows[0]);
  }

  async updateEventType(eventTypeId, payload) {
    const slug = await this.buildUniqueSlug(payload.name, eventTypeId);
    const result = await this.pool.query(
      `
        UPDATE event_types
        SET
          name = $2,
          duration = $3,
          slug = $4,
          availability_start = $5,
          availability_end = $6,
          weekday_schedules = $7,
          date_overrides = $8,
          buffer_before_minutes = $9,
          buffer_after_minutes = $10,
          custom_questions = $11
        WHERE id = $1
        RETURNING *
      `,
      [
        eventTypeId,
        payload.name,
        payload.duration,
        slug,
        payload.availabilityStart,
        payload.availabilityEnd,
        JSON.stringify(normalizeWeekdaySchedules(payload.weekdaySchedules)),
        JSON.stringify(normalizeDateOverrides(payload.dateOverrides)),
        payload.bufferBeforeMinutes || 0,
        payload.bufferAfterMinutes || 0,
        JSON.stringify(normalizeCustomQuestions(payload.customQuestions)),
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    await this.pool.query(`UPDATE bookings SET event_type_name = $2 WHERE event_type_id = $1`, [
      eventTypeId,
      payload.name,
    ]);

    return normalizeEventTypeRow(result.rows[0]);
  }

  async deleteEventType(eventTypeId) {
    const result = await this.pool.query(`DELETE FROM event_types WHERE id = $1`, [eventTypeId]);
    return result.rowCount > 0;
  }

  async listBookings() {
    const result = await this.pool.query(`SELECT * FROM bookings ORDER BY booking_date ASC, booking_time ASC, id ASC`);
    return result.rows.map(normalizeBookingRow);
  }

  async deleteBooking(bookingId) {
    const bookingResult = await this.pool.query(`DELETE FROM bookings WHERE id = $1 RETURNING *`, [bookingId]);
    if (bookingResult.rowCount === 0) {
      return false;
    }

    const booking = normalizeBookingRow(bookingResult.rows[0]);
    await this.pool.query(
      `INSERT INTO notifications (type, recipient, subject, body) VALUES ($1,$2,$3,$4)`,
      [
        'cancellation',
        booking.email,
        `Your ${booking.eventTypeName} meeting has been cancelled`,
        `The meeting scheduled for ${booking.date} at ${booking.time} has been cancelled.`,
      ]
    );

    return true;
  }

  async listNotifications() {
    const result = await this.pool.query(`SELECT * FROM notifications ORDER BY created_at DESC, id DESC`);
    return result.rows.map(normalizeNotificationRow);
  }

  async getAvailability(slug, date) {
    const eventResult = await this.pool.query(`SELECT * FROM event_types WHERE slug = $1`, [slug]);
    if (eventResult.rows.length === 0) {
      return null;
    }

    const eventType = normalizeEventTypeRow(eventResult.rows[0]);
    const schedule = findScheduleForDate(eventType, date);

    if (!schedule) {
      return { eventType, date, allSlots: [], bookedTimes: [], availableSlots: [] };
    }

    const allSlots = buildTimeSlots(schedule.start, schedule.end, eventType.duration);
    const bookingResult = await this.pool.query(
      `SELECT * FROM bookings WHERE event_type_id = $1 AND booking_date = $2 ORDER BY booking_time ASC`,
      [eventType.id, date]
    );
    const relatedBookings = bookingResult.rows.map(normalizeBookingRow);

    const availableSlots = allSlots.filter((slot) => {
      const candidateWindow = buildBookingWindows(eventType, date, slot);
      return !relatedBookings.some((booking) =>
        slotsOverlap(candidateWindow, buildBookingWindows(eventType, booking.date, booking.time))
      );
    });

    return {
      eventType,
      date,
      allSlots,
      bookedTimes: relatedBookings.map((booking) => booking.time),
      availableSlots,
    };
  }

  async createBooking({ slug, name, email, date, time, customAnswers }) {
    const eventResult = await this.pool.query(`SELECT * FROM event_types WHERE slug = $1`, [slug]);
    if (eventResult.rows.length === 0) {
      return { error: 'event_not_found' };
    }

    const eventType = normalizeEventTypeRow(eventResult.rows[0]);
    const availability = await this.getAvailability(slug, date);

    if (!availability.availableSlots.includes(time)) {
      return { error: 'slot_taken' };
    }

    const result = await this.pool.query(
      `
        INSERT INTO bookings (
          event_type_id, event_type_name, name, email, booking_date, booking_time, custom_answers
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `,
      [eventType.id, eventType.name, name, email, date, time, JSON.stringify(customAnswers || [])]
    );

    await this.pool.query(
      `INSERT INTO notifications (type, recipient, subject, body) VALUES ($1,$2,$3,$4)`,
      [
        'booking_confirmation',
        email,
        `Booking confirmed for ${eventType.name}`,
        `Your meeting is booked for ${date} at ${time}.`,
      ]
    );

    return { booking: normalizeBookingRow(result.rows[0]) };
  }
}

function hasRealDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  return Boolean(databaseUrl && !databaseUrl.includes('your_database_url_here'));
}

function createStorage() {
  if (hasRealDatabaseUrl()) {
    return new PostgresStorage(process.env.DATABASE_URL);
  }
  return new JsonStorage();
}

module.exports = {
  DEFAULT_WEEKDAY_SCHEDULES,
  createStorage,
};
