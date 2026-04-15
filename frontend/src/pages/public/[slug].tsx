import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const PublicBookingPage = () => {
    const [date, setDate] = useState(new Date());
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedTime, setSelectedTime] = useState('');

    useEffect(() => {
        // Logic to fetch available time slots based on selected date
        const fetchTimeSlots = async () => {
            // Simulating a fetch request
            const slots = await new Promise((resolve) => setTimeout(() => resolve(['10:00 AM', '11:00 AM', '2:00 PM']), 1000));
            setTimeSlots(slots);
        };
        fetchTimeSlots();
    }, [date]);

    const handleBooking = () => {
        // Logic to handle booking with date and selected time
        alert(`Booking made for ${date.toDateString()} at ${selectedTime}`);
    };

    return (
        <div>
            <h1>Public Booking Page</h1>
            <Calendar
                onChange={setDate}
                value={date}
            />
            <h2>Available Time Slots</h2>
            <ul>
                {timeSlots.map((time) => (
                    <li key={time}">
                        <button onClick={() => setSelectedTime(time)}>{time}</button>
                    </li>
                ))}
            </ul>
            {selectedTime && <button onClick={handleBooking}>Book Appointment</button>}
        </div>
    );
};

export default PublicBookingPage;