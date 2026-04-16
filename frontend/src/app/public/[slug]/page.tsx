'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Calendar from 'react-calendar';
import type { Value } from 'react-calendar/dist/shared/types.js';
import 'react-calendar/dist/Calendar.css';

interface EventType {
  id: number;
  name: string;
  duration: number;
  slug: string;
}

interface BookingErrorResponse {
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

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
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      return;
    }

    const fetchEventAndSlots = async () => {
      try {
        const eventResponse = await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types');
        const events: EventType[] = await eventResponse.json();
        const matchedEvent = events.find((event) => event.slug === slug);

        if (!matchedEvent) {
          setError('Event not found');
          return;
        }

        setEventType(matchedEvent);

        const slots: string[] = [];
        for (let hour = 9; hour < 17; hour++) {
          for (let min = 0; min < 60; min += 30) {
            slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
          }
        }
        setTimeSlots(slots);
      } catch (err) {
        setError('Failed to load event');
        console.error(err);
      }
    };

    fetchEventAndSlots();
  }, [slug, date]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          date: date.toISOString().split('T')[0],
          time: selectedTime,
        }),
      });

      if (!response.ok) {
        const responseBody: BookingErrorResponse = await response.json();
        throw new Error(responseBody.error || 'Booking failed');
      }

      setBookingSuccess(true);
    } catch (err: unknown) {
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
          <p className="mb-2 text-gray-600">We&apos;ve sent a confirmation email to:</p>
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
            }}
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            Schedule Another
          </button>
        </div>
      </div>
    );
  }

  if (!eventType) {
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">{eventType.name}</h1>
          <p className="text-gray-600">Duration: {eventType.duration} minutes</p>
        </div>

        {error && (
          <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-bold text-gray-800">Select Date</h2>
              <Calendar onChange={handleDateChange} value={date} minDate={new Date()} />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-bold text-gray-800">Available Times</h2>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-lg px-3 py-2 font-semibold transition ${
                      selectedTime === time
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {selectedTime && (
              <form onSubmit={handleBooking} className="rounded-xl bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-bold text-gray-800">Your Details</h2>

                <div className="mb-4">
                  <label className="mb-2 block font-semibold text-gray-700">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-2 block font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="john@example.com"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mb-6 rounded-lg bg-gray-100 p-4">
                  <p className="text-gray-700">
                    <strong>Date:</strong>{' '}
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-700">
                    <strong>Time:</strong> {selectedTime}
                  </p>
                  <p className="text-gray-700">
                    <strong>Duration:</strong> {eventType.duration} minutes
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
                >
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
