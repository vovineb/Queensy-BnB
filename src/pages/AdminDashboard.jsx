// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { auth } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { logoutAdmin } from '../services/auth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setAdmin(user);
      else navigate('/admin-login');
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
      <p className="mb-6 text-sm text-gray-600">Welcome, {admin?.email}</p>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <a href="/admin/bookings" className="bg-blue-600 text-white p-6 rounded-xl hover:bg-blue-700 transition text-center font-semibold">
          View Bookings
        </a>
        <a href="/admin/listings" className="bg-green-600 text-white p-6 rounded-xl hover:bg-green-700 transition text-center font-semibold">
          Manage Listings
        </a>
        <a href="/admin/feedback" className="bg-yellow-500 text-white p-6 rounded-xl hover:bg-yellow-600 transition text-center font-semibold">
          View Feedback
        </a>
        <a href="/admin/export" className="bg-purple-600 text-white p-6 rounded-xl hover:bg-purple-700 transition text-center font-semibold">
          Export to Excel
        </a>
        <button onClick={handleLogout} className="bg-red-600 text-white p-6 rounded-xl hover:bg-red-700 transition font-semibold">
          Logout
        </button>
      </div>
    </div>
  );
}
