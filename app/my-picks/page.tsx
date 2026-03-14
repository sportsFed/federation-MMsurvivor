'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// This 'export default' fixes the specific build error you are seeing
export default function MyPicksPage() {
  const [games, setGames] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const entryRef = doc(db, 'entries', user.uid);
        const entrySnap = await getDoc(entryRef);
        if (entrySnap.exists()) setUserEntry(entrySnap.data());

        const gamesSnap = await getDocs(collection(db, 'games'));
        setGames(gamesSnap.docs.map(d => d.data()));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-12 text-center font-bebas text-2xl tracking-widest text-slate-500">Check back soon</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-10 flex justify-between items-end px-2">
        <div>
          <h1 className="font-bebas text-5xl tracking-tighter italic text-white uppercase">My Picks</h1>
          <p className="text-slate-400 font-bebas text-lg tracking-widest uppercase">The Federation</p>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-xs uppercase font-bold tracking-widest block mb-1">Survivor Status</span>
          <span className={`font-bebas text-2xl px-3 py-1 rounded ${userEntry?.isEliminated ? 'bg-red-900/40 text-red-500 border border-red-500/50' : 'bg-green-900/40 text-green-500 border border-green-500/50'}`}>
            {userEntry?.isEliminated ? 'Eliminated' : 'Active'}
          </span>
        </div>
      </header>

      {/* SLEEK PROGRESS CARD (Mirroring Bowl Pick'em Style) */}
      <div className="glass-panel p-6 mb-8 flex justify-between items-center border-t-2 border-fedRed">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div>
            <h3 className="font-bebas text-2xl text-white">Current Standings Rank</h3>
            <p className="text-slate-400 text-sm">Calculated using $Seed \times Round Multiplier$</p>
          </div>
        </div>
        <div className="text-4xl font-bebas text-fedRed">--</div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bebas text-2xl tracking-wide text-slate-300 mb-4 px-2 uppercase">Upcoming Games</h2>
        {games.length === 0 ? (
          <div className="glass-panel p-10 text-center text-slate-500 italic">No live games found. Selections unlock Sunday.</div>
        ) : (
          games.map((game, i) => (
            <div key={i} className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-fedRed transition-all hover:translate-x-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{game.round || 'Tournament Game'}</span>
                <span className="font-bebas text-2xl text-white tracking-wide uppercase">{game.homeTeam} vs {game.awayTeam}</span>
              </div>
              <button className="bg-slate-800 hover:bg-fedRed text-white px-6 py-2 rounded font-bebas text-xl transition-colors uppercase italic">
                Pick Team
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
