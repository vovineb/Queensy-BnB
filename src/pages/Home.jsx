// src/pages/Home.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { FaUmbrellaBeach, FaSwimmer, FaWifi, FaShieldAlt } from 'react-icons/fa';
import heroImg from '../assets/diani-hero.jpg'; // Use your local image here

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div
        className="relative bg-cover bg-center h-[80vh] flex items-center justify-center text-white"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        {/* Content */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1 }}
          className="z-10 text-center px-4"
        >
          <h1 className="text-5xl font-extrabold drop-shadow-xl mb-4">Welcome to Diani BnB</h1>
          <p className="text-xl mb-6 drop-shadow-md">Experience luxury & tranquility near the beach</p>
          <a
            href="/booking"
            className="bg-blue-600 hover:bg-blue-800 text-white py-3 px-6 rounded-full text-lg shadow-lg transition-all duration-300"
          >
            Book Now
          </a>
        </motion.div>
      </div>

      {/* Floating Wave Shape */}
      <div className="wave-shape relative -top-10">
        <svg viewBox="0 0 1440 320" className="w-full">
          <path
            fill="#ffffff"
            fillOpacity="1"
            d="M0,256L60,240C120,224,240,192,360,170.7C480,149,600,139,720,144C840,149,960,171,1080,170.7C1200,171,1320,149,1380,138.7L1440,128L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
          ></path>
        </svg>
      </div>

      {/* Features Section */}
      <section className="bg-white py-16 px-8 text-center">
        <h2 className="text-3xl font-bold mb-12">Why Stay With Us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 max-w-5xl mx-auto">
          <div className="flex flex-col items-center">
            <FaUmbrellaBeach className="text-blue-600 text-4xl mb-4" />
            <h3 className="font-semibold text-lg">10 Min from Beach</h3>
            <p className="text-gray-500 text-sm">Relax in serenity just steps from the sea.</p>
          </div>
          <div className="flex flex-col items-center">
            <FaSwimmer className="text-blue-600 text-4xl mb-4" />
            <h3 className="font-semibold text-lg">Swimming Pool</h3>
            <p className="text-gray-500 text-sm">Enjoy a cool dip any time of day.</p>
          </div>
          <div className="flex flex-col items-center">
            <FaWifi className="text-blue-600 text-4xl mb-4" />
            <h3 className="font-semibold text-lg">Free WiFi</h3>
            <p className="text-gray-500 text-sm">Stay connected while you unwind.</p>
          </div>
          <div className="flex flex-col items-center">
            <FaShieldAlt className="text-blue-600 text-4xl mb-4" />
            <h3 className="font-semibold text-lg">24/7 Security</h3>
            <p className="text-gray-500 text-sm">Feel safe and secure, day or night.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
