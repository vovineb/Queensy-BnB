import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { db } from '../services/firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import format from 'date-fns/format';

const properties = ['Chameleone 1', 'Chameleone 2', 'Wendy\'s Penthouse'];

export default function CalendarView() {
  const [selectedProperty, setSelectedProperty] = useState(properties[0]);
  const [bookedDates, setBookedDates] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const snap = await getDocs(collection(db, 'Bookings'));
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => b.property === selectedProperty);

      setAllBookings(data);

      const dates = [];
      data.forEach((b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        for (let d = new Date(checkIn); d <= checkOut; d.setDate(d.getDate() + 1)) {
          dates.push(format(new Date(d), 'yyyy-MM-dd'));
        }
      });
      setBookedDates(dates);
    };
    fetchBookings();
  }, [selectedProperty]);

  const isBooked = (date) => {
    return bookedDates.includes(format(date, 'yyyy-MM-dd'));
  };

  const cancelBooking = async (id) => {
    if (window.confirm('Cancel this booking?')) {
      await deleteDoc(doc(db, 'Bookings', id));
      alert('Booking canceled');
      window.location.reload();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-lime-700">Availability Calendar</h1>
      <select
        value={selectedProperty}
        onChange={(e) => setSelectedProperty(e.target.value)}
        className="mb-6 p-2 border rounded"
      >
        {properties.map((p, i) => (
          <option key={i} value={p}>{p}</option>
        ))}
      </select>

      <Calendar
        tileClassName={({ date }) => isBooked(date) ? 'bg-red-200 text-red-800' : 'bg-green-100'}
      />

      <h2 className="text-xl font-semibold mt-8 mb-3">Current Bookings</h2>
      <div className="space-y-3">
        {allBookings.map((b) => (
          <div key={b.id} className="p-3 border rounded bg-white shadow flex justify-between items-center">
            <div>
              <strong>{b.name}</strong> booked from <span className="text-blue-600">{format(new Date(b.checkIn), 'PP')}</span> to <span className="text-blue-600">{format(new Date(b.checkOut), 'PP')}</span>
            </div>
            <button
              onClick={() => cancelBooking(b.id)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
