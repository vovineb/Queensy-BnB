// src/pages/AdminListings.jsx
import React, { useEffect, useState } from 'react';
import { db, storage } from '../services/firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AdminListings() {
  const [form, setForm] = useState({
    name: '',
    beds: 1,
    price: '',
    description: '',
    amenities: '',
    images: [],
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = async () => {
    const snap = await getDocs(collection(db, 'Properties'));
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProperties(data);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setImageFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Upload images to Firebase Storage
    const urls = [];
    for (const file of imageFiles) {
      const storageRef = ref(storage, `properties/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      urls.push(downloadURL);
    }

    const data = {
      ...form,
      images: urls,
      amenities: form.amenities.split(',').map((a) => a.trim()),
      available: true,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'Properties'), data);
    setForm({ name: '', beds: 1, price: '', description: '', amenities: '', images: [] });
    setImageFiles([]);
    setLoading(false);
    fetchListings();
  };

  const deleteListing = async (id) => {
    if (window.confirm('Delete this listing?')) {
      await deleteDoc(doc(db, 'Properties', id));
      fetchListings();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Listings</h1>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        <input
          name="name"
          placeholder="Property Name"
          value={form.name}
          onChange={handleInput}
          className="border rounded px-3 py-2"
          required
        />
        <input
          name="beds"
          type="number"
          placeholder="Number of Beds"
          value={form.beds}
          onChange={handleInput}
          className="border rounded px-3 py-2"
          required
        />
        <input
          name="price"
          type="number"
          placeholder="Price per night (KES)"
          value={form.price}
          onChange={handleInput}
          className="border rounded px-3 py-2"
          required
        />
        <input
          name="amenities"
          placeholder="Amenities (comma-separated)"
          value={form.amenities}
          onChange={handleInput}
          className="border rounded px-3 py-2"
        />
        <textarea
          name="description"
          placeholder="Property Description"
          value={form.description}
          onChange={handleInput}
          className="border rounded px-3 py-2 col-span-2"
        ></textarea>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="col-span-2"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white px-4 py-2 rounded col-span-2 hover:bg-blue-800"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Add Property'}
        </button>
      </form>

      {/* List of properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((p) => (
          <div key={p.id} className="bg-white rounded shadow p-4">
            <img
              src={p.images[0]}
              alt={p.name}
              className="w-full h-48 object-cover rounded mb-3"
            />
            <h2 className="font-bold text-xl mb-1">{p.name}</h2>
            <p className="text-sm text-gray-500 mb-2">{p.description}</p>
            <p className="text-blue-600 font-bold">KES {p.price}/night</p>
            <p className="text-sm mt-1">
              Beds: {p.beds} | Amenities: {p.amenities?.join(', ')}
            </p>
            <button
              onClick={() => deleteListing(p.id)}
              className="mt-4 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
