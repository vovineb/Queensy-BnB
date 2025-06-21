import React, { useEffect, useState } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);

  const fetchTickets = async () => {
    const snap = await getDocs(collection(db, 'Tickets'));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sorted = data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    setTickets(sorted);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const updateStatus = async (id, status) => {
    const ticketRef = doc(db, 'Tickets', id);
    await updateDoc(ticketRef, { status });
    fetchTickets();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved': return 'bg-lime-100 text-lime-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Pending': default: return 'bg-red-100 text-red-700';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-lime-700 mb-6">Support Tickets</h1>
      <div className="space-y-5">
        {tickets.map(ticket => (
          <div key={ticket.id} className="p-4 bg-white rounded shadow border-l-4 border-yellow-400">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{ticket.issueType}</h2>
                <p className="text-sm text-gray-500">{ticket.name} ({ticket.email})</p>
                <p className="text-sm text-gray-400">
                  {ticket.createdAt?.seconds ? format(new Date(ticket.createdAt.seconds * 1000), 'PPpp') : ''}
                </p>
                <p className="mt-3 text-gray-700">{ticket.description}</p>
                {ticket.imageURL && (
                  <a href={ticket.imageURL} target="_blank" rel="noopener noreferrer">
                    <img src={ticket.imageURL} alt="ticket" className="mt-3 w-40 h-auto rounded shadow border" />
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <div className="space-x-2 mt-2">
                  {['Pending', 'In Progress', 'Resolved'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateStatus(ticket.id, status)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
