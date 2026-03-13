'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

// The "export default" is what fixes the specific build error you see
export default function StandingsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'entries'), orderBy('totalPoints', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Standings...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-blue-900">Federation Leaderboard</h1>
      <div className="overflow-x-auto bg-white rounded-xl shadow border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 font-bold">Entrant</th>
              <th className="p-4 font-bold text-center">Survivor Status</th>
              <th className="p-4 font-bold text-right">Total Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-4 font-semibold text-slate-700">
                  {entry.displayName || 'Anonymous Entrant'}
                </td>
                <td className="p-4 text-center">
                  {entry.isEliminated ? (
                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Eliminated</span>
                  ) : (
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Active</span>
                  )}
                </td>
                <td className="p-4 text-right font-mono text-lg font-bold text-blue-800">
                  {entry.totalPoints.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
