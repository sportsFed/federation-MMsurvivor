'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AdminEntriesPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "chone1234") {
      setIsAuthorized(true);
    } else {
      alert("Incorrect Commissioner Password");
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      const fetchEntries = async () => {
        const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEntries(data);
        setLoading(false);
      };
      fetchEntries();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="glass-panel p-8 w-full max-w-sm border border-white/10 text-center">
          <h2 className="font-bebas text-3xl text-white mb-6 italic">Commissioner Access</h2>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  // ... (The rest of your existing table code goes here)
}
