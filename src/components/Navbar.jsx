// Navbar component
// src/components/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Properties' },
  { to: '/booking', label: 'Book Now' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-md px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-blue-700">Diani BnB</h1>
      <ul className="flex space-x-6">
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className={`text-md font-medium hover:text-blue-600 transition duration-200 ${
                location.pathname === to ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
