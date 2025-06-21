// src/components/PropertyCard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function PropertyCard({ property }) {
  const [mainImg, setMainImg] = useState(property.images[0]);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden p-4 hover:shadow-2xl transition-all duration-300"
    >
      <div className="relative mb-4">
        <motion.img
          src={mainImg}
          alt={property.name}
          className="w-full h-60 object-cover rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          Kes {property.price}/night
        </div>
      </div>

      <h2 className="text-xl font-bold mb-1">{property.name}</h2>
      <p className="text-gray-600 mb-2">{property.description}</p>
      <div className="flex gap-2 flex-wrap text-sm mb-4">
        {property.amenities.map((a, i) => (
          <span
            key={i}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {property.images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`${property.name} ${index}`}
            onClick={() => setMainImg(img)}
            className="w-16 h-12 object-cover rounded-md cursor-pointer hover:scale-110 transition-all duration-200 border-2 border-transparent hover:border-blue-500"
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-4 flex justify-between">
        <a
          href="/booking"
          className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition"
        >
          Book Now
        </a>
        <a
          href="#"
          className="text-blue-600 hover:underline text-sm self-center"
        >
          View Details
        </a>
      </div>
    </motion.div>
  );
}
