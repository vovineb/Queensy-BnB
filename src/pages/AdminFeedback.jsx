// src/pages/AdminFeedback.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';

export default function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState([]);

  useEffect(() => {
    const fetchFeedback = async () => {
      const snap = await getDocs(collection(db, 'Reviews'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbackList(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    };
    fetchFeedback();
  }, []);

  const getColor = (rating) => {
    if (rating >= 4) return 'bg-lime-100 text-lime-700';
    if (rating === 3) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-lime-700">Guest Feedback</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbackList.map((f, i) => (
          <div key={i} className="bg-white shadow-lg rounded-xl p-4 border-l-8 border-lime-500">
            <div className="mb-2">
              <h2 className="font-semibold text-xl text-gray-700">{f.name}</h2>
              <p className="text-sm text-gray-500">{f.property}</p>
              <p className="text-xs text-gray-400">{format(f.createdAt.toDate(), 'PPpp')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className={`${getColor(f.hostRating)} px-3 py-1 rounded`}>
                Host: {f.hostRating} ⭐
              </div>
              <div className={`${getColor(f.amenitiesRating)} px-3 py-1 rounded`}>
                Amenities: {f.amenitiesRating} ⭐
              </div>
              <div className={`${getColor(f.cleanlinessRating)} px-3 py-1 rounded`}>
                Cleanliness: {f.cleanlinessRating} ⭐
              </div>
              <div className={`${getColor(f.neighborhoodRating)} px-3 py-1 rounded`}>
                Neighborhood: {f.neighborhoodRating} ⭐
              </div>
            </div>

            {f.recommendation && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
                <p className="italic">“{f.recommendation}”</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 text-center mt-6">
        {feedbackList.length} feedback entries • {new Date().toDateString()}
      </p>
    </div>
  );
}
