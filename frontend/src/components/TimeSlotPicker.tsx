import React, { useState } from 'react';

const TimeSlotPicker = ({ availableSlots, onSelect }) => {
    const [selectedSlot, setSelectedSlot] = useState(null);

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        onSelect(slot);
    };

    return (
        <div>
            <h2>Select a Time Slot</h2>
            <ul>
                {availableSlots.map((slot) => (
                    <li key={slot}>
                        <button 
                            onClick={() => handleSlotSelect(slot)}
                            style={{
                                fontWeight: selectedSlot === slot ? 'bold' : 'normal',
                            }}
                        >
                            {slot}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TimeSlotPicker;