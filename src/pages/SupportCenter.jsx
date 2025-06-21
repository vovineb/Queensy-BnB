// src/pages/SupportCenter.jsx
import React, { useState } from 'react';
import { db, storage, auth } from '../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function SupportCenter() {
  const [form, setForm] = useState({
    issueType: '',
    description: '',
    image: null,
  });
  const [message, setMessage] = useState('');
  const user = auth.currentUser;

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setForm(prev => ({ ...prev, image: files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageURL = '';
    if (form.image) {
      const imgRef = ref(storage, `tickets/${form.image.name}_${Date.now()}`);
      await uploadBytes(imgRef, form.image);
      imageURL = await getDownloadURL(imgRef);
    }

    const ticketData = {
      name: user?.displayName || 'Guest',
      email: user?.email || 'unknown',
      issueType: form.issueType,
      description: form.description,
      imageURL,
      status: 'Pending',
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'Tickets'), ticketData);
    setMessage('Your support request has been submitted!');
    setForm({ issueType: '', description: '', image: null });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-lime-700 mb-4">Need Help?</h1>
      {message && <p className="text-green-600 font-semibold mb-4">{message}</p>}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded shadow-lg space-y-4">
        <label className="block">
          <span className="text-gray-700 font-medium">Issue Type</span>
          <select
            name="issueType"
            value={form.issueType}
            onChange={handleChange}
            className="w-full mt-1 p-2 border rounded"
            required
          >
            <option value="">-- Select Issue --</option>
            <option value="Booking">Booking</option>
            <option value="Payment">Payment</option>
            <option value="Property Issue">Property Issue</option>
            <option value="Account">Account</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="text-gray-700 font-medium">Description</span>
          <textarea
            name="description"
            rows="5"
            value={form.description}
            onChange={handleChange}
            placeholder="Please describe your issue clearly..."
            className="w-full mt-1 p-2 border rounded"
            required
          ></textarea>
        </label>

        <label className="block">
          <span className="text-gray-700 font-medium">Attach Image (optional)</span>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="mt-1"
          />
        </label>

        <button
          type="submit"
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded"
        >
          Submit Ticket
        </button>
      </form>
    </div>
  );
}
