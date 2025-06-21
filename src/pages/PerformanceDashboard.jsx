import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function PerformanceDashboard() {
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState({
    totalGuests: 0,
    totalRevenue: 0,
    bookingsPerWeek: [],
    revenueByProperty: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, 'Bookings'));
      const raw = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(raw);

      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      // Grouped by day
      const bookingsByDay = {};
      const revenueByProperty = {};
      let totalRevenue = 0;
      let totalGuests = 0;

      raw.forEach(b => {
        const date = new Date(b.createdAt?.seconds * 1000 || b.createdAt);
        if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
          const day = format(date, 'EEE');
          bookingsByDay[day] = (bookingsByDay[day] || 0) + 1;
        }

        totalRevenue += Number(b.totalAmount || 0);
        totalGuests += Number(b.guestCount || 1); // fallback 1 guest

        revenueByProperty[b.property] = (revenueByProperty[b.property] || 0) + Number(b.totalAmount || 0);
      });

      const bookingsPerWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        bookings: bookingsByDay[day] || 0,
      }));

      const revenueArray = Object.entries(revenueByProperty).map(([property, revenue]) => ({
        property,
        revenue,
      }));

      setMetrics({
        totalRevenue,
        totalGuests,
        bookingsPerWeek,
        revenueByProperty: revenueArray,
      });
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-lime-700 mb-6">Performance Overview</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-lime-100 text-lime-700 p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Total Revenue</h2>
          <p className="text-2xl">KES {metrics.totalRevenue}</p>
        </div>
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Total Guests</h2>
          <p className="text-2xl">{metrics.totalGuests}</p>
        </div>
        <div className="bg-gray-100 text-gray-700 p-4 rounded shadow">
          <h2 className="text-lg font-semibold">Total Bookings</h2>
          <p className="text-2xl">{bookings.length}</p>
        </div>
      </div>

      {/* Bookings Per Day Chart */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">📈 Bookings This Week</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.bookingsPerWeek}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="bookings" stroke="#82ca9d" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Property Chart */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-gray-800">💰 Revenue by Property</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.revenueByProperty}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="property" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#facc15" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
