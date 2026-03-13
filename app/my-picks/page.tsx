'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MyPicksPage() {
  const [games, setGames] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const entryRef = doc(db, 'entries', user.uid);
        const entrySnap = await getDoc(entryRef);
        if (entrySnap.exists()) setUserEntry(entrySnap.data());

        // Fetch current day's games
        const gamesSnap = await getDocs(collection(db, 'games'));
        setGames(gamesSnap.docs.map(d => d.data()));
      }
      setLoading(false);
    });
  }, []);

  const handlePick = async (teamName: string) => {
    if (!auth.currentUser || userEntry?.isEliminated) return;
    
    // Save pick logic here
    alert(`You picked ${teamName}!`);
  };

  if (loading) return <div className="p-8 text-center">Loading picks...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Daily Survivor Picks</h1>
        {userEntry?.isEliminated && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg font-bold">
            ⚠️ You have been eliminated from Survivor, but your Final Four points still count!
          </div>
        )}
      </header>

      <div className="grid gap-6">
        {games.length === 0 ? (
          <p className="text-gray-500 italic">No games scheduled for today or Selection Sunday hasn't happened yet.</p>
        ) : (
          games.map((game, i) => (
            <div key={i} className="border p-6 rounded-xl bg-white shadow-sm flex justify-between items-center">
              <div className="flex-1 text-center font-bold text-lg">{game.homeTeam}</div>
              <div className="px-4 text-gray-400">vs</div>
              <div className="flex-1 text-center font-bold text-lg">{game.awayTeam}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
