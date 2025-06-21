// src/pages/Booking.jsx
import React, { useState } from 'react';
import { db } from '../services/firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { properties } from '../data/properties';

export default function Booking() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    property: properties[0].name,
    checkIn: '',
    checkOut: '',
  });

  const [total, setTotal] = useState(null);
  const [message, setMessage] = useState('');

  const calculateNights = (start, end) => {
    const checkIn = new Date(start);
    const checkOut = new Date(end);
    const diff = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
    return Math.max(diff, 0);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // Recalculate if dates are being changed
    if (form.checkIn && form.checkOut && form.property) {
      const nights = calculateNights(
        e.target.name === 'checkIn' ? e.target.value : form.checkIn,
        e.target.name === 'checkOut' ? e.target.value : form.checkOut
      );
      const pricePerNight = properties.find(p => p.name === form.property)?.price;
      setTotal(nights * pricePerNight);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nights = calculateNights(form.checkIn, form.checkOut);
    const pricePerNight = properties.find(p => p.name === form.property)?.price;
    const amount = nights * pricePerNight;

    if (nights <= 0) {
      setMessage('Check-out date must be after check-in.');
      return;
    }

    const data = {
      ...form,
      totalNights: nights,
      totalAmount: amount,
      createdAt: Timestamp.now(),
    };

    try {
      await addDoc(collection(db, 'Bookings'), data);
      setMessage('Booking successful! A 12-hour timer has started.');
      setForm({
        name: '',
        email: '',
        property: properties[0].name,
        checkIn: '',
        checkOut: '',
      });
      setTotal(null);
    } catch (error) {
      console.error(error);
      setMessage('Error submitting booking. Please try again.');
    }
  };

  return (
    <div className="py-16 px-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Book Your Stay</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-6 space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          className="w-full border rounded px-4 py-2"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          className="w-full border rounded px-4 py-2"
          value={form.email}
          onChange={handleChange}
          required
        />
        <select
          name="property"
          className="w-full border rounded px-4 py-2"
          value={form.property}
          onChange={handleChange}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            name="checkIn"
            className="border rounded px-4 py-2"
            value={form.checkIn}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="checkOut"
            className="border rounded px-4 py-2"
            value={form.checkOut}
            onChange={handleChange}
            required
          />
        </div>
        {total !== null && (
          <div className="text-xl font-semibold text-blue-600">
            Total: Kes {total.toLocaleString()}
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-800 transition"
        >
          Confirm Booking
        </button>
        {message && (
          <p className="text-center text-sm text-green-600 mt-4">{message}</p>
        )}
      </form>
    </div>
  );
}
