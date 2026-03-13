'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MyBracketPage() {
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'entries', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setEntry(docSnap.data());
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">Loading your bracket...</div>;
  if (!entry) return <div className="p-8 text-center">No picks found. Go to "My Picks" to start!</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Federation Journey</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-xl font-bold mb-4 text-blue-900">Survivor History</h2>
          <ul className="space-y-2">
            {entry.survivorPicks?.map((pick: any, i: number) => (
              <li key={i} className="flex justify-between border-b pb-2">
                <span>{pick.round}</span>
                <span className="font-semibold text-blue-700">{pick.teamName}</span>
              </li>
            )) || <p>No survivor picks made yet.</p>}
          </ul>
        </div>

        <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
          <h2 className="text-xl font-bold mb-4 text-orange-900">Pre-Tournament Picks</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-orange-700">National Champion</p>
              <p className="text-lg font-bold">{entry.finalFourPicks?.champ || 'Not Selected'}</p>
            </div>
            <div>
              <p className="text-sm text-orange-700">Final Four</p>
              <p className="font-medium">
                {entry.finalFourPicks?.f1}, {entry.finalFourPicks?.f2}, {entry.finalFourPicks?.f3}, {entry.finalFourPicks?.f4}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
