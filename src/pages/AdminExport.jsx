// src/pages/AdminExport.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { unparse } from 'papaparse';


export default function AdminExport() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, 'Bookings'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    };
    fetchData();
  }, []);

  const exportCSV = () => {
    const fields = [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Property', value: 'property' },
      { label: 'Check-In', value: (row) => format(new Date(row.checkIn), 'yyyy-MM-dd') },
      { label: 'Check-Out', value: (row) => format(new Date(row.checkOut), 'yyyy-MM-dd') },
      { label: 'Nights', value: 'totalNights' },
      { label: 'Total Amount (KES)', value: 'totalAmount' },
      { label: 'Created At', value: (row) => format(row.createdAt.toDate(), 'yyyy-MM-dd HH:mm') }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(bookings);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    const url = URL.createObjectURL(blob);

    downloadLink.setAttribute('href', url);
    downloadLink.setAttribute('download', 'bnb_bookings.csv');
    downloadLink.style.visibility = 'hidden';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Export Bookings</h1>
      <p className="text-gray-500 mb-4">You can download all bookings as a CSV file for record-keeping or accounting.</p>
      <button
        onClick={exportCSV}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
      >
        Download CSV
      </button>
    </div>
  );
}
