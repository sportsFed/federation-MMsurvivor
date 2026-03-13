'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function StandingsPage() {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sort by total points descending
    const q = query(collection(db, 'standings'), orderBy('totalPoints', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStandings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const aliveCount = standings.filter(s => !s.isEliminated).length;

  if (loading) return <div className="p-8 text-center">Loading Standings...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Standings</h1>
          <p className="text-gray-500 font-medium">Federation League Survivor 2026</p>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-blue-600">{aliveCount} / {standings.length}</span>
          <span className="text-xs font-bold uppercase text-gray-400">Still Alive</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-bold text-gray-600 uppercase text-xs">Rank</th>
              <th className="p-4 font-bold text-gray-600 uppercase text-xs">Entrant</th>
              <th className="p-4 font-bold text-gray-600 uppercase text-xs text-center">Status</th>
              <th className="p-4 font-bold text-gray-600 uppercase text-xs text-right">Survivor</th>
              <th className="p-4 font-bold text-gray-600 uppercase text-xs text-right">FF+Champ</th>
              <th className="p-4 font-bold text-blue-600 uppercase text-xs text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((user, index) => (
              <tr 
                key={user.id} 
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${user.isEliminated ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                <td className="p-4 font-mono font-bold text-gray-400">#{index + 1}</td>
                <td className="p-4 font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                  {user.isEliminated && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">Out</span>}
                </td>
                <td className="p-4 text-center">
                   <div className={`h-2.5 w-2.5 rounded-full mx-auto ${user.isEliminated ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                </td>
                <td className="p-4 text-right font-medium">{user.survivorPoints.toFixed(1)}</td>
                <td className="p-4 text-right font-medium">{user.ffChampPoints.toFixed(1)}</td>
                <td className="p-4 text-right font-black text-blue-600">{user.totalPoints.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}