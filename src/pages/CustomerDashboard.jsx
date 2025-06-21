import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebaseConfig';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
      } else {
        setUser(currentUser);
        const snap = await getDocs(collection(db, 'Bookings'));
        const data = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(b => b.email === currentUser.email);
        setBookings(data);
      }
    });
    return () => unsub();
  }, [navigate]);

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const totalStays = bookings.length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-yellow-600">Welcome, {user?.displayName || user?.email}</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-lime-100 text-lime-700 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total Bookings</h2>
          <p className="text-3xl">{totalStays}</p>
        </div>
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total Paid</h2>
          <p className="text-3xl">KES {totalAmount}</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Your Booking History</h2>
      {bookings.map(b => (
        <div key={b.id} className="mb-4 p-4 bg-white rounded shadow">
          <div className="flex justify-between">
            <div>
              <p className="font-bold text-lg">{b.property}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(b.checkIn), 'PP')} → {format(new Date(b.checkOut), 'PP')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-600 font-bold">KES {b.totalAmount}</p>
              <button
                onClick={() => navigate('/feedback')}
                className="text-sm mt-2 text-lime-600 hover:underline"
              >
                Leave Feedback
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
