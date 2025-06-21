import React, { useState } from 'react';

const faqList = [
  {
    question: 'How do I make a booking?',
    answer: 'Click on any property listed on the home page, select your desired dates, and confirm the booking using your email and preferred payment method.',
  },
  {
    question: 'How can I cancel my booking?',
    answer: 'You can cancel your booking from your customer dashboard or by contacting support through the support page.',
  },
  {
    question: 'Do I get a refund if I cancel?',
    answer: 'Refunds depend on the cancellation window. If you cancel at least 24 hours before check-in, you will receive a full refund.',
  },
  {
    question: 'Is there a discount for long stays?',
    answer: 'Yes! Bookings over 7 nights automatically qualify for discounted rates on eligible properties.',
  },
  {
    question: 'How can I contact the host?',
    answer: 'Once your booking is confirmed, you’ll be able to chat with your host directly from your dashboard or support panel.',
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-lime-700 mb-6 text-center">Frequently Asked Questions</h1>
      {faqList.map((faq, i) => (
        <div key={i} className="mb-4 border rounded shadow">
          <button
            onClick={() => toggle(i)}
            className="w-full text-left px-4 py-3 bg-yellow-100 hover:bg-yellow-200 transition font-medium text-gray-800"
          >
            {faq.question}
          </button>
          {openIndex === i && (
            <div className="px-4 py-3 text-gray-700 bg-white border-t animate-fadeIn">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
