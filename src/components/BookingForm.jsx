import React, { useState } from 'react';

export default function BookingForm() {
  const [selectedProperty, setSelectedProperty] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [contact, setContact] = useState('');
  const [total, setTotal] = useState(0);

  const properties = {
    'Chameleone 1': 5500,
    'Chameleone 2': 5500,
    "Wendy's Penthouse": 15500
  };

  const calculateTotal = () => {
    if (checkIn && checkOut && selectedProperty) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const rate = properties[selectedProperty];
      setTotal(diffDays * rate);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you, ${guestName}! Your booking for ${selectedProperty} is confirmed.`);
    // TODO: Save to Firestore here
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-4 text-lime-700">Book Your Stay</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Property</label>
          <select
            className="w-full border p-2 rounded"
            value={selectedProperty}
            onChange={(e) => {
              setSelectedProperty(e.target.value);
              calculateTotal();
            }}
            required
          >
            <option value="">-- Select a Property --</option>
            {Object.keys(properties).map((name) => (
              <option key={name} value={name}>{name} — KES {properties[name]}/night</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Check-In</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                calculateTotal();
              }}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Check-Out</label>
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                calculateTotal();
              }}
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Guest Name</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            placeholder="John Doe"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Contact (Phone or Email)</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            placeholder="0700xxxxxx or john@example.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>

        <div className="mt-4">
          <span className="font-semibold">Total Cost:</span>{' '}
          <span className="text-lime-600 font-bold">KES {total}</span>
        </div>

        <button
          type="submit"
          className="w-full bg-lime-600 text-white py-2 rounded hover:bg-lime-700 transition"
        >
          Confirm Booking
        </button>
      </form>
    </div>
  );
}
