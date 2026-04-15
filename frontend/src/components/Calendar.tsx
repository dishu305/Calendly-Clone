import React, { useState } from 'react';
import { Calendar } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css'; // Import custom styles if needed

const CalendarComponent = () => {
  const [date, setDate] = useState(new Date());

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Calendar
        onChange={handleDateChange}
        value={date}
        className="border-2 border-gray-300 rounded-lg"
      />
      <div className="mt-4 text-center">
        <p className="text-lg">Selected Date:</p>
        <p className="text-xl font-semibold">{date.toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default CalendarComponent;