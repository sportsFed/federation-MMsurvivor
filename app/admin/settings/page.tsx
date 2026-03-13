'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function AdminSettings() {
  const [status, setStatus] = useState('Open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStatus(docSnap.data().registrationStatus);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const toggleStatus = async () => {
    const newStatus = status === 'Open' ? 'Closed' : 'Open';
    await updateDoc(doc(db, 'settings', 'global'), { registrationStatus: newStatus });
    setStatus(newStatus);
  };

  if (loading) return <div className="p-8">Loading Settings...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">League Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">Registration Control</h2>
        <p className="mb-4">Current Status: <strong>{status}</strong></p>
        <button 
          onClick={toggleStatus}
          className={`px-4 py-2 rounded text-white ${status === 'Open' ? 'bg-red-600' : 'bg-green-600'}`}
        >
          {status === 'Open' ? 'Close Registration' : 'Open Registration'}
        </button>
      </div>
    </div>
  );
}
