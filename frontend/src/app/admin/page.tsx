'use client';

import React, { useEffect, useState } from 'react';

interface EventType {
  id: number;
  name: string;
  duration: number;
  slug: string;
  createdAt: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function AdminDashboard() {
  const [eventName, setEventName] = useState('');
  const [eventDuration, setEventDuration] = useState(30);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types');
        const data: EventType[] = await response.json();
        setEventTypes(data);
      } catch (err) {
        setError('Failed to load events');
        console.error(err);
      }
    };

    fetchEventTypes();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName,
          duration: Number(eventDuration),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const newEvent: EventType = await response.json();
      setEventTypes((current) => [...current, newEvent]);
      setEventName('');
      setEventDuration(30);
      alert('Event created successfully!');
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error creating event');
      setError(message);
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/event-types/${id}`, {
        method: 'DELETE',
      });
      setEventTypes((current) => current.filter((event) => event.id !== id));
      alert('Event deleted successfully!');
    } catch (err) {
      alert('Failed to delete event');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <h1 className="mb-2 text-5xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-lg text-gray-600">Manage your scheduling events</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-2xl font-bold text-gray-800">Create Event</h2>

              {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="mb-2 block font-semibold text-gray-700">Event Name</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    placeholder="e.g., 30-Minute Call"
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 transition focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-semibold text-gray-700">
                    Duration (minutes)
                  </label>
                  <select
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 transition focus:border-blue-500 focus:outline-none"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition duration-200 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-2xl font-bold text-gray-800">
                Your Events ({eventTypes.length})
              </h2>

              {eventTypes.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-lg text-gray-500">No events created yet</p>
                  <p className="text-gray-400">Create your first event using the form</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-gray-300 bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Event Name
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Booking Link
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventTypes.map((event) => (
                        <tr key={event.id} className="border-b transition hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">{event.name}</td>
                          <td className="px-4 py-3 text-gray-600">{event.duration} min</td>
                          <td className="px-4 py-3">
                            <a
                              href={`http://localhost:3000/public/${event.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 underline hover:text-blue-800"
                            >
                              {event.slug}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="rounded bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
