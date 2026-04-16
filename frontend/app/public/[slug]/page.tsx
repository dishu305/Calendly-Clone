'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Calendar from 'react-calendar';
import type { Value } from 'react-calendar/dist/shared/types.js';
import 'react-calendar/dist/Calendar.css';

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
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  customQuestions: CustomQuestion[];
}

interface AvailabilityResponse {
  eventType: EventType;
  date: string;
  allSlots: string[];
  bookedTimes: string[];
  availableSlots: string[];
}

interface BookingErrorResponse {
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function PublicBooking() {
  const params = useParams();
  const slug = params?.slug as string;

  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    const fetchAvailability = async () => {
      try {
        setLoadingSlots(true);
        setError('');
        const selectedDate = date.toISOString().split('T')[0];
        const response = await fetch(`http://localhost:5000/api/public/${slug}/availability?date=${selectedDate}`);

        if (!response.ok) {
          const body: BookingErrorResponse = await response.json();
          throw new Error(body.error || 'Failed to load availability');
        }

        const data: AvailabilityResponse = await response.json();
        setEventType(data.eventType);
        setTimeSlots(data.availableSlots);

        if (selectedTime && !data.availableSlots.includes(selectedTime)) {
          setSelectedTime('');
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load event'));
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [date, selectedTime, slug]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const customAnswers = (eventType?.customQuestions || []).map((question) => ({
        id: question.id,
        label: question.label,
        answer: answers[question.id] || '',
      }));

      const response = await fetch(`http://localhost:5000/api/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          date: date.toISOString().split('T')[0],
          time: selectedTime,
          customAnswers,
        }),
      });

      if (!response.ok) {
        const body: BookingErrorResponse = await response.json();
        throw new Error(body.error || 'Booking failed');
      }

      setBookingSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Booking failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (value: Value) => {
    if (value instanceof Date) {
      setDate(value);
      return;
    }

    if (Array.isArray(value) && value[0] instanceof Date) {
      setDate(value[0]);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
          <div className="mb-4 text-6xl">Confirmed</div>
          <h1 className="mb-4 text-3xl font-bold text-green-600">Booking Confirmed!</h1>
          <p className="mb-2 text-gray-600">We&apos;ve logged a confirmation email for:</p>
          <p className="mb-6 text-lg font-semibold text-gray-800">{email}</p>
          <p className="mb-8 text-gray-600">
            Meeting scheduled for {date.toLocaleDateString()} at {selectedTime}
          </p>
          <button
            onClick={() => {
              setBookingSuccess(false);
              setName('');
              setEmail('');
              setSelectedTime('');
              setAnswers({});
            }}
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Schedule Another
          </button>
        </div>
      </div>
    );
  }

  if (!eventType && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">{eventType?.name || 'Booking Page'}</h1>
          {eventType && (
            <div className="space-y-1 text-gray-600">
              <p>Duration: {eventType.duration} minutes</p>
              <p>Default hours: {eventType.availabilityStart} - {eventType.availabilityEnd}</p>
              <p>Buffers: {eventType.bufferBeforeMinutes} min before, {eventType.bufferAfterMinutes} min after</p>
            </div>
          )}
        </div>

        {error && <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-bold text-gray-800">Select Date</h2>
              <Calendar onChange={handleDateChange} value={date} minDate={new Date()} />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Available Times</h2>
                {loadingSlots && <span className="text-sm text-gray-500">Refreshing slots...</span>}
              </div>
              {timeSlots.length === 0 ? (
                <p className="text-gray-500">No open time slots for this date. Try another day or check overrides.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-lg px-3 py-2 font-semibold transition ${
                        selectedTime === time ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTime && eventType && (
              <form onSubmit={handleBooking} className="rounded-xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-bold text-gray-800">Your Details</h2>

                <div className="mb-4">
                  <label className="mb-2 block font-semibold text-gray-700">Your Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none" />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block font-semibold text-gray-700">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none" />
                </div>

                {eventType.customQuestions.length > 0 && (
                  <div className="mb-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">Custom Questions</h3>
                    {eventType.customQuestions.map((question) => (
                      <div key={question.id}>
                        <label className="mb-2 block font-semibold text-gray-700">
                          {question.label}
                          {question.required ? ' *' : ''}
                        </label>
                        <textarea
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers((current) => ({ ...current, [question.id]: e.target.value }))}
                          required={question.required}
                          rows={3}
                          className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-6 rounded-lg bg-gray-100 p-4">
                  <p className="text-gray-700"><strong>Date:</strong> {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-gray-700"><strong>Time:</strong> {selectedTime}</p>
                  <p className="text-gray-700"><strong>Duration:</strong> {eventType.duration} minutes</p>
                </div>

                <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400">
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
