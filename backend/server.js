require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { DEFAULT_WEEKDAY_SCHEDULES, createStorage } = require('./storage');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

function validateEventTypeInput(name, duration) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Event name is required';
  }

  if (!Number.isInteger(duration) || duration <= 0) {
    return 'Duration must be a positive integer';
  }

  return null;
}

function validateAvailabilityInput(availabilityStart, availabilityEnd) {
  const timePattern = /^\d{2}:\d{2}$/;

  if (!timePattern.test(availabilityStart) || !timePattern.test(availabilityEnd)) {
    return 'Availability start and end must use HH:MM format';
  }

  if (availabilityStart >= availabilityEnd) {
    return 'Availability end must be later than availability start';
  }

  return null;
}

function sanitizeWeekdaySchedules(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_WEEKDAY_SCHEDULES;
  }

  return DEFAULT_WEEKDAY_SCHEDULES.map((defaultEntry) => {
    const incoming = value.find((entry) => Number(entry.day) === defaultEntry.day);
    return {
      day: defaultEntry.day,
      enabled: incoming ? Boolean(incoming.enabled) : defaultEntry.enabled,
      start: incoming?.start || defaultEntry.start,
      end: incoming?.end || defaultEntry.end,
    };
  });
}

function sanitizeDateOverrides(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry.date === 'string' && entry.date.trim())
    .map((entry, index) => ({
      id: entry.id || `override-${index + 1}`,
      date: entry.date,
      enabled: entry.enabled !== false,
      start: entry.start || '09:00',
      end: entry.end || '17:00',
    }));
}

function sanitizeCustomQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry.label === 'string' && entry.label.trim())
    .map((entry, index) => ({
      id: entry.id || `question-${index + 1}`,
      label: entry.label.trim(),
      required: entry.required !== false,
    }));
}

function validateWeeklySchedules(weekdaySchedules) {
  for (const schedule of weekdaySchedules) {
    if (!schedule.enabled) {
      continue;
    }

    const error = validateAvailabilityInput(schedule.start, schedule.end);
    if (error) {
      return `Weekday schedule for day ${schedule.day} is invalid: ${error}`;
    }
  }

  return null;
}

function validateDateOverrides(dateOverrides) {
  for (const override of dateOverrides) {
    if (!override.enabled) {
      continue;
    }

    const error = validateAvailabilityInput(override.start, override.end);
    if (error) {
      return `Date override for ${override.date} is invalid: ${error}`;
    }
  }

  return null;
}

function buildEventPayload(body) {
  const availabilityStart = body.availabilityStart || '09:00';
  const availabilityEnd = body.availabilityEnd || '17:00';
  const weekdaySchedules = sanitizeWeekdaySchedules(body.weekdaySchedules);
  const dateOverrides = sanitizeDateOverrides(body.dateOverrides);
  const customQuestions = sanitizeCustomQuestions(body.customQuestions);

  return {
    name: body.name?.trim(),
    duration: Number(body.duration),
    availabilityStart,
    availabilityEnd,
    weekdaySchedules,
    dateOverrides,
    bufferBeforeMinutes: Number(body.bufferBeforeMinutes || 0),
    bufferAfterMinutes: Number(body.bufferAfterMinutes || 0),
    customQuestions,
  };
}

function validateEventPayload(payload) {
  const inputError = validateEventTypeInput(payload.name, payload.duration);
  if (inputError) {
    return inputError;
  }

  const availabilityError = validateAvailabilityInput(
    payload.availabilityStart,
    payload.availabilityEnd
  );
  if (availabilityError) {
    return availabilityError;
  }

  const weekdayError = validateWeeklySchedules(payload.weekdaySchedules);
  if (weekdayError) {
    return weekdayError;
  }

  const overrideError = validateDateOverrides(payload.dateOverrides);
  if (overrideError) {
    return overrideError;
  }

  if (payload.bufferBeforeMinutes < 0 || payload.bufferAfterMinutes < 0) {
    return 'Buffers must be zero or greater';
  }

  return null;
}

const storage = createStorage();

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!', storageMode: storage.mode });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, storageMode: storage.mode });
});

app.get('/api/event-types', async (_req, res) => {
  res.json(await storage.listEventTypes());
});

app.post('/api/event-types', async (req, res) => {
  const payload = buildEventPayload(req.body);
  const error = validateEventPayload(payload);

  if (error) {
    return res.status(400).json({ error });
  }

  const eventType = await storage.createEventType(payload);
  return res.status(201).json(eventType);
});

app.put('/api/event-types/:id', async (req, res) => {
  const eventTypeId = Number(req.params.id);

  if (!Number.isInteger(eventTypeId)) {
    return res.status(400).json({ error: 'Invalid event type id' });
  }

  const payload = buildEventPayload(req.body);
  const error = validateEventPayload(payload);

  if (error) {
    return res.status(400).json({ error });
  }

  const updated = await storage.updateEventType(eventTypeId, payload);

  if (!updated) {
    return res.status(404).json({ error: 'Event type not found' });
  }

  return res.json(updated);
});

app.delete('/api/event-types/:id', async (req, res) => {
  const eventTypeId = Number(req.params.id);

  if (!Number.isInteger(eventTypeId)) {
    return res.status(400).json({ error: 'Invalid event type id' });
  }

  const deleted = await storage.deleteEventType(eventTypeId);

  if (!deleted) {
    return res.status(404).json({ error: 'Event type not found' });
  }

  return res.status(204).send();
});

app.get('/api/bookings', async (_req, res) => {
  res.json(await storage.listBookings());
});

app.delete('/api/bookings/:id', async (req, res) => {
  const bookingId = Number(req.params.id);

  if (!Number.isInteger(bookingId)) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }

  const deleted = await storage.deleteBooking(bookingId);

  if (!deleted) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  return res.status(204).send();
});

app.get('/api/notifications', async (_req, res) => {
  res.json(await storage.listNotifications());
});

app.get('/api/public/:slug/availability', async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query;

  if (typeof date !== 'string' || !date.trim()) {
    return res.status(400).json({ error: 'A date query parameter is required' });
  }

  const availability = await storage.getAvailability(slug, date);

  if (!availability) {
    return res.status(404).json({ error: 'Event type not found' });
  }

  return res.json(availability);
});

app.post('/api/public/:slug/book', async (req, res) => {
  const { slug } = req.params;
  const { name, email, date, time, customAnswers = [] } = req.body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof date !== 'string' ||
    !date.trim() ||
    typeof time !== 'string' ||
    !time.trim()
  ) {
    return res.status(400).json({ error: 'Name, email, date, and time are required' });
  }

  const result = await storage.createBooking({
    slug,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    date,
    time,
    customAnswers: Array.isArray(customAnswers) ? customAnswers : [],
  });

  if (result.error === 'event_not_found') {
    return res.status(404).json({ error: 'Event type not found' });
  }

  if (result.error === 'slot_taken') {
    return res.status(409).json({ error: 'This time slot is no longer available' });
  }

  return res.status(201).json({
    message: 'Booking confirmed',
    booking: result.booking,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

async function start() {
  await storage.initialize();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} using ${storage.mode} storage`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
