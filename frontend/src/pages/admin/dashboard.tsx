import React, { useState } from 'react';

const Dashboard: React.FC = () => {
    const [eventName, setEventName] = useState('');
    const [eventDuration, setEventDuration] = useState(30);
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (eventName) {
            setEventTypes([...eventTypes, eventName]);
            setEventName('');
        }
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <h2>Manage Event Types</h2>
            <ul>
                {eventTypes.map((type, index) => (
                    <li key={index}>{type}</li>
                ))}
            </ul>

            <h2>Create Event</h2>
            <form onSubmit={handleCreateEvent}>
                <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Event Name"
                    required
                />
                <input
                    type="number"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Number(e.target.value))}
                    placeholder="Duration (minutes)"
                    required
                />
                <button type="submit">Create Event</button>
            </form>
        </div>
    );
};

export default Dashboard;