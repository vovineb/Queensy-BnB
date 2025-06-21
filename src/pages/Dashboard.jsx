// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const snapshot = await getDocs(collection(db, 'Bookings'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    };
    fetchBookings();
  }, []);

  const calculateTimeLeft = (createdAt) => {
    const created = createdAt.toDate();
    const now = new Date();
    const diff = 12 * 60 * 60 * 1000 - (now - created); // 12hrs - elapsed

    if (diff <= 0) return 'Expired';

    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m left`;
  };

  return (
    <div className="py-16 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-10">Booking Dashboard</h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-blue-50 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Property</th>
              <th className="px-4 py-3 text-left">Check-In</th>
              <th className="px-4 py-3 text-left">Check-Out</th>
              <th className="px-4 py-3 text-left">Total (Kes)</th>
              <th className="px-4 py-3 text-left">Timer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}

            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-blue-50 transition">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3">{b.property}</td>
                <td className="px-4 py-3">{format(new Date(b.checkIn), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3">{format(new Date(b.checkOut), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">
                  {b.totalAmount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-red-600">
                  {calculateTimeLeft(b.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 text-center mt-4">
        {bookings.length} bookings displayed • Updated in real-time
      </p>
    </div>
  );
}
