'use client';

import React, { useEffect, useState } from 'react';

interface WeekdaySchedule {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
}

interface DateOverride {
  id: string;
  date: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface CustomQuestion {
  id: string;
  label: string;
  required: boolean;
}

interface EventType {
  id: number;
  name: string;
  duration: number;
  slug: string;
  availabilityStart: string;
  availabilityEnd: string;
  weekdaySchedules: WeekdaySchedule[];
  dateOverrides: DateOverride[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  customQuestions: CustomQuestion[];
  createdAt: string;
}

interface BookingAnswer {
  id: string;
  label: string;
  answer: string;
}

interface Booking {
  id: number;
  eventTypeId: number;
  eventTypeName: string;
  name: string;
  email: string;
  date: string;
  time: string;
  customAnswers: BookingAnswer[];
  status: 'upcoming' | 'past';
}

interface NotificationEntry {
  id: number;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  createdAt: string;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const defaultSchedules: WeekdaySchedule[] = [
  { day: 0, enabled: false, start: '09:00', end: '17:00' },
  { day: 1, enabled: true, start: '09:00', end: '17:00' },
  { day: 2, enabled: true, start: '09:00', end: '17:00' },
  { day: 3, enabled: true, start: '09:00', end: '17:00' },
  { day: 4, enabled: true, start: '09:00', end: '17:00' },
  { day: 5, enabled: true, start: '09:00', end: '17:00' },
  { day: 6, enabled: false, start: '09:00', end: '17:00' },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function formatBookingDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminDashboard() {
  const [eventName, setEventName] = useState('');
  const [eventDuration, setEventDuration] = useState(30);
  const [availabilityStart, setAvailabilityStart] = useState('09:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('17:00');
  const [weekdaySchedules, setWeekdaySchedules] = useState<WeekdaySchedule[]>(defaultSchedules);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(0);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(0);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsRes, bookingsRes, notificationsRes] = await Promise.all([
          fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types'),
          fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/bookings'),
          fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications'),
        ]);
        setEventTypes((await eventsRes.json()) as EventType[]);
        setBookings((await bookingsRes.json()) as Booking[]);
        setNotifications((await notificationsRes.json()) as NotificationEntry[]);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load dashboard data'));
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setEventName('');
    setEventDuration(30);
    setAvailabilityStart('09:00');
    setAvailabilityEnd('17:00');
    setWeekdaySchedules(defaultSchedules);
    setDateOverrides([]);
    setCustomQuestions([]);
    setBufferBeforeMinutes(0);
    setBufferAfterMinutes(0);
    setEditingEventId(null);
  };

  const reloadNotifications = async () => {
    const response = await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications');
    setNotifications((await response.json()) as NotificationEntry[]);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isEditing = editingEventId !== null;
      const response = await fetch(
        isEditing
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types/${editingEventId}`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: eventName,
            duration: eventDuration,
            availabilityStart,
            availabilityEnd,
            weekdaySchedules,
            dateOverrides: dateOverrides.filter((item) => item.date),
            customQuestions: customQuestions.filter((item) => item.label.trim()),
            bufferBeforeMinutes,
            bufferAfterMinutes,
          }),
        }
      );

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to save event');
      }

      const saved = (await response.json()) as EventType;
      setEventTypes((current) =>
        isEditing
          ? current.map((event) => (event.id === saved.id ? saved : event))
          : [...current, saved]
      );
      setBookings((current) =>
        current.map((booking) =>
          booking.eventTypeId === saved.id ? { ...booking, eventTypeName: saved.name } : booking
        )
      );
      resetForm();
      alert(isEditing ? 'Event updated successfully!' : 'Event created successfully!');
    } catch (err) {
      const message = getErrorMessage(err, 'Error saving event');
      setError(message);
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: EventType) => {
    setEditingEventId(event.id);
    setEventName(event.name);
    setEventDuration(event.duration);
    setAvailabilityStart(event.availabilityStart);
    setAvailabilityEnd(event.availabilityEnd);
    setWeekdaySchedules(event.weekdaySchedules);
    setDateOverrides(event.dateOverrides);
    setCustomQuestions(event.customQuestions);
    setBufferBeforeMinutes(event.bufferBeforeMinutes);
    setBufferAfterMinutes(event.bufferAfterMinutes);
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types/${id}`, { method: 'DELETE' });
    setEventTypes((current) => current.filter((event) => event.id !== id));
    setBookings((current) => current.filter((booking) => booking.eventTypeId !== id));
    if (editingEventId === id) resetForm();
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Cancel this meeting?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/bookings/${bookingId}`, { method: 'DELETE' });
    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    await reloadNotifications();
  };

  const updateSchedule = (day: number, patch: Partial<WeekdaySchedule>) => {
    setWeekdaySchedules((current) =>
      current.map((item) => (item.day === day ? { ...item, ...patch } : item))
    );
  };

  const updateOverride = (id: string, patch: Partial<DateOverride>) => {
    setDateOverrides((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateQuestion = (id: string, patch: Partial<CustomQuestion>) => {
    setCustomQuestions((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const upcomingBookings = bookings.filter((booking) => booking.status === 'upcoming');
  const pastBookings = bookings.filter((booking) => booking.status === 'past');
  const isEditing = editingEventId !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="mb-2 text-5xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-lg text-gray-600">Configure advanced scheduling, bonuses, and booking activity.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[430px_minmax(0,1fr)]">
          <section className="space-y-8">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Event' : 'Create Event'}</h2>
                {isEditing && (
                  <button type="button" onClick={resetForm} className="text-sm font-semibold text-gray-500 underline">
                    Clear
                  </button>
                )}
              </div>
              {error && <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{error}</div>}

              <form onSubmit={handleSaveEvent} className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Event name"
                    required
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Buffers</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={bufferBeforeMinutes}
                      onChange={(e) => setBufferBeforeMinutes(Number(e.target.value))}
                      placeholder="Before"
                      className="rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={bufferAfterMinutes}
                      onChange={(e) => setBufferAfterMinutes(Number(e.target.value))}
                      placeholder="After"
                      className="rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Base Window</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" step={1800} value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} className="rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none" />
                    <input type="time" step={1800} value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} className="rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Weekly Schedules</p>
                  <div className="space-y-2">
                    {weekdaySchedules.map((schedule) => (
                      <div key={schedule.day} className="grid grid-cols-[60px_1fr_1fr] items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <input type="checkbox" checked={schedule.enabled} onChange={(e) => updateSchedule(schedule.day, { enabled: e.target.checked })} />
                          {weekdayLabels[schedule.day]}
                        </label>
                        <input type="time" step={1800} value={schedule.start} disabled={!schedule.enabled} onChange={(e) => updateSchedule(schedule.day, { start: e.target.value })} className="rounded-lg border-2 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100" />
                        <input type="time" step={1800} value={schedule.end} disabled={!schedule.enabled} onChange={(e) => updateSchedule(schedule.day, { end: e.target.value })} className="rounded-lg border-2 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Date Overrides</p>
                    <button type="button" onClick={() => setDateOverrides((current) => [...current, { id: makeId('override'), date: '', enabled: true, start: '09:00', end: '17:00' }])} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dateOverrides.length === 0 && <p className="text-sm text-slate-500">No overrides yet.</p>}
                    {dateOverrides.map((override) => (
                      <div key={override.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                          <input type="date" value={override.date} onChange={(e) => updateOverride(override.id, { date: e.target.value })} className="rounded-lg border-2 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none" />
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <input type="checkbox" checked={override.enabled} onChange={(e) => updateOverride(override.id, { enabled: e.target.checked })} />
                            Open
                          </label>
                          <input type="time" step={1800} value={override.start} disabled={!override.enabled} onChange={(e) => updateOverride(override.id, { start: e.target.value })} className="rounded-lg border-2 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100" />
                          <input type="time" step={1800} value={override.end} disabled={!override.enabled} onChange={(e) => updateOverride(override.id, { end: e.target.value })} className="rounded-lg border-2 border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-100" />
                        </div>
                        <button type="button" onClick={() => setDateOverrides((current) => current.filter((item) => item.id !== override.id))} className="mt-3 text-sm font-semibold text-red-600">
                          Remove override
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Custom Questions</p>
                    <button type="button" onClick={() => setCustomQuestions((current) => [...current, { id: makeId('question'), label: '', required: true }])} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {customQuestions.length === 0 && <p className="text-sm text-slate-500">No custom questions yet.</p>}
                    {customQuestions.map((question) => (
                      <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                          <input type="text" value={question.label} onChange={(e) => updateQuestion(question.id, { label: e.target.value })} placeholder="Question prompt" className="rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none" />
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <input type="checkbox" checked={question.required} onChange={(e) => updateQuestion(question.id, { required: e.target.checked })} />
                            Required
                          </label>
                        </div>
                        <button type="button" onClick={() => setCustomQuestions((current) => current.filter((item) => item.id !== question.id))} className="mt-3 text-sm font-semibold text-red-600">
                          Remove question
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Event' : 'Create Event'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Notification Log</h2>
                <span className="text-sm text-gray-500">{notifications.length}</span>
              </div>
              <div className="space-y-3">
                {notifications.length === 0 && <p className="text-sm text-gray-500">No notifications yet.</p>}
                {notifications.slice(0, 8).map((notification) => (
                  <article key={notification.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{notification.type.replaceAll('_', ' ')}</p>
                    <h3 className="mt-2 font-bold text-gray-800">{notification.subject}</h3>
                    <p className="mt-1 text-sm text-gray-600">To: {notification.recipient}</p>
                    <p className="mt-2 text-sm text-gray-700">{notification.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-2xl font-bold text-gray-800">Your Events ({eventTypes.length})</h2>
              <div className="space-y-4">
                {eventTypes.length === 0 && <p className="text-gray-500">No events created yet.</p>}
                {eventTypes.map((event) => (
                  <article key={event.id} className="rounded-xl border border-gray-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{event.name}</h3>
                          <p className="text-gray-600">{event.duration} min · buffer {event.bufferBeforeMinutes} / {event.bufferAfterMinutes}</p>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-700">Public link:</span>{' '}
                          <a href={`http://localhost:3000/public/${event.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline hover:text-blue-800">
                            {event.slug}
                          </a>
                        </p>
                        <div className="rounded-xl bg-white p-3 text-sm text-gray-600">
                          <p className="mb-2 font-semibold text-gray-700">Weekly schedule</p>
                          <div className="grid gap-1 md:grid-cols-2">
                            {event.weekdaySchedules.map((schedule) => (
                              <p key={schedule.day}>
                                {weekdayLabels[schedule.day]}: {schedule.enabled ? `${schedule.start} - ${schedule.end}` : 'Closed'}
                              </p>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-700">Overrides:</span> {event.dateOverrides.length} · <span className="font-semibold text-gray-700">Questions:</span> {event.customQuestions.length}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditEvent(event)} className="rounded bg-amber-500 px-3 py-2 font-semibold text-white transition hover:bg-amber-600">Edit</button>
                        <button onClick={() => handleDeleteEvent(event.id)} className="rounded bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700">Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <section className="rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Upcoming Meetings ({upcomingBookings.length})</h2>
                <div className="space-y-4">
                  {upcomingBookings.length === 0 && <p className="text-gray-500">No upcoming meetings yet.</p>}
                  {upcomingBookings.map((booking) => (
                    <article key={booking.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-gray-800">{booking.eventTypeName}</h3>
                          <p className="mt-1 text-gray-600">{formatBookingDate(booking.date, booking.time)}</p>
                          <p className="mt-3 text-sm text-gray-700">{booking.name} | {booking.email}</p>
                          {booking.customAnswers.length > 0 && (
                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                              {booking.customAnswers.map((answer) => (
                                <p key={answer.id}><span className="font-semibold text-gray-700">{answer.label}:</span> {answer.answer}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleCancelBooking(booking.id)} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700">Cancel</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-white p-6 shadow-lg">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Past Meetings ({pastBookings.length})</h2>
                <div className="space-y-4">
                  {pastBookings.length === 0 && <p className="text-gray-500">No past meetings yet.</p>}
                  {pastBookings.map((booking) => (
                    <article key={booking.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="font-bold text-gray-800">{booking.eventTypeName}</h3>
                      <p className="mt-1 text-gray-600">{formatBookingDate(booking.date, booking.time)}</p>
                      <p className="mt-3 text-sm text-gray-700">{booking.name} | {booking.email}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
