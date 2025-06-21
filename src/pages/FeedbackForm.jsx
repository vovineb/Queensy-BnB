// src/pages/Feedback.jsx
import React, { useState } from 'react';
import { db } from '../services/firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

const Feedback = () => {
  const [form, setForm] = useState({
    name: '',
    property: 'Chameleone 1',
    hostRating: '5',
    amenitiesRating: '5',
    cleanlinessRating: '5',
    neighborhoodRating: '5',
    recommendation: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const recommendations = [
    "I loved the experience!",
    "Very clean and quiet area.",
    "The host was super friendly!",
    "Perfect stay for beach lovers.",
    "Highly recommended!",
  ];

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      createdAt: Timestamp.now(),
    };
    try {
      await addDoc(collection(db, 'Reviews'), data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error submitting feedback.');
    }
  };

  if (submitted) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold text-green-600">Thanks for your feedback!</h1>
        <p className="mt-4 text-gray-600">We appreciate your thoughts and will keep improving.</p>
      </div>
    );
  }

  return (
    <div className="py-16 px-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Leave Your Feedback</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-lg rounded-lg space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          className="w-full border rounded px-4 py-2"
          value={form.name}
          onChange={handleChange}
          required
        />

        <select
          name="property"
          className="w-full border rounded px-4 py-2"
          value={form.property}
          onChange={handleChange}
        >
          <option>Chameleone 1</option>
          <option>Chameleone 2</option>
          <option>Wendy's Penthouse</option>
        </select>

        {["hostRating", "amenitiesRating", "cleanlinessRating", "neighborhoodRating"].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium mb-1 capitalize">
              {field.replace("Rating", "").replace(/([a-z])([A-Z])/g, '$1 $2')} Rating
            </label>
            <select
              name={field}
              className="w-full border rounded px-4 py-2"
              value={form[field]}
              onChange={handleChange}
            >
              {[5, 4, 3, 2, 1].map((v) => (
                <option key={v} value={v}>{v} - {["Excellent", "Good", "Average", "Below Average", "Poor"][5 - v]}</option>
              ))}
            </select>
          </div>
        ))}

        <label className="block text-sm font-medium mt-4 mb-1">Recommendation (Optional)</label>
        <select
          name="recommendation"
          className="w-full border rounded px-4 py-2"
          value={form.recommendation}
          onChange={handleChange}
        >
          <option value="">-- Choose or leave blank --</option>
          {recommendations.map((rec, i) => (
            <option key={i} value={rec}>{rec}</option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default Feedback;
