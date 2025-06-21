// src/pages/Properties.jsx
import React from 'react';
import { properties } from '../data/properties';
import PropertyCard from '../components/PropertyCard';

export default function Properties() {
  return (
    <div className="py-16 px-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-center mb-10">Our Properties</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}
