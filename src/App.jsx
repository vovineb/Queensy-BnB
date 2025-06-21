
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Properties from './pages/Properties';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminListings from './pages/AdminListings';
import AdminExport from './pages/AdminExport';
import AdminFeedback from './pages/AdminFeedback';
import CalendarView from './pages/CalendarView';
import CustomerDashboard from './pages/CustomerDashboard';
import GuestLogin from './pages/GuestLogin';
import SupportCenter from './pages/SupportCenter';
import FaqPage from './pages/FaqPage';
import AdminTickets from './pages/AdminTickets';
import PerformanceDashboard from './pages/PerformanceDashboard';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="bg-white text-gray-800 min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/listings" element={<AdminListings />} />
            <Route path="/admin/export" element={<AdminExport />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/login" element={<GuestLogin />} />
            <Route path="/support" element={<SupportCenter />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/admin/tickets" element={<AdminTickets />} />
            <Route path="/admin/performance" element={<PerformanceDashboard />} />

          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
