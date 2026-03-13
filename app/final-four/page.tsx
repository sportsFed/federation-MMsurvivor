'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function FinalFourPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [picks, setPicks] = useState({ f1: '', f2: '', f3: '', f4: '', champ: '' });
  const [user, setUser] = useState<any>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    const fetchTeams = async () => {
      const querySnapshot = await getDocs(collection(db, 'teams'));
      setTeams(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchTeams();
  }, []);

  const savePicks = async () => {
    if (!user || locked) return;
    await setDoc(doc(db, 'entries', user.uid), { finalFourPicks: picks }, { merge: true });
    alert('Picks Saved!');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Pre-Tournament Picks</h1>
      <p className="text-gray-600 mb-8">Select your Final Four and National Champion. These lock at tip-off.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['f1', 'f2', 'f3', 'f4'].map((slot, i) => (
          <div key={slot} className="border p-4 rounded bg-white shadow-sm">
            <label className="block font-bold mb-2">Final Four Team #{i + 1}</label>
            <select 
              value={(picks as any)[slot]} 
              onChange={(e) => setPicks({...picks, [slot]: e.target.value})}
              className="w-full border p-2 rounded"
            >
              <option value="">Select a Team...</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({t.regionalSeed})</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-8 text-center">
        <h2 className="text-xl font-bold mb-4">National Champion</h2>
        <select 
          value={picks.champ} 
          onChange={(e) => setPicks({...picks, champ: e.target.value})}
          className="max-w-md border p-2 rounded mb-6"
        >
          <option value="">Select Champion...</option>
          {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <br />
        <button 
          onClick={savePicks}
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition"
        >
          Save All Picks
        </button>
      </div>
    </div>
  );
}
