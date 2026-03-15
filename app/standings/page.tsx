'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function calcStreak(survivorPicks: any[]): number {
  if (!survivorPicks || survivorPicks.length === 0) return 0;
  let streak = 0;
  for (let i = survivorPicks.length - 1; i >= 0; i--) {
    if (survivorPicks[i].result === 'win') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const RANK_EMOJI: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };

export default function StandingsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'entries'), orderBy('totalPoints', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error('Standings snapshot error:', error);
      setSnapshotError(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-pulse">
        <div className="h-10 bg-slate-700/50 rounded w-64 mb-8" />
        <div className="glass-panel overflow-hidden">
          <div className="h-12 bg-slate-700/50 mb-1" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-slate-700/30 mb-1 mx-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="font-bebas text-5xl text-white tracking-widest italic mb-8 uppercase">Federation Leaderboard</h1>
      {snapshotError ? (
        <div className="glass-panel p-10 text-center border border-white/10">
          <p className="text-slate-400 text-sm">Unable to load standings at this time. Please try again later.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel p-10 text-center border border-white/10">
          <h2 className="font-bebas text-3xl text-white tracking-widest mb-2">Standings Coming Soon</h2>
          <p className="text-slate-400 text-sm">The leaderboard will populate once the tournament begins and picks are scored. You're in — sit tight!</p>
        </div>
      ) : (
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700">
              <th className="p-4 font-bebas text-slate-400 tracking-widest text-sm uppercase w-12">#</th>
              <th className="p-4 font-bebas text-slate-400 tracking-widest text-sm uppercase">Entrant</th>
              <th className="p-4 font-bebas text-slate-400 tracking-widest text-sm uppercase text-center">Status</th>
              <th className="p-4 font-bebas text-slate-400 tracking-widest text-sm uppercase text-center">Streak</th>
              <th className="p-4 font-bebas text-slate-400 tracking-widest text-sm uppercase text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.id === currentUserId;
              const streak = calcStreak(entry.survivorPicks);
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-slate-800 transition ${
                    isCurrentUser
                      ? 'border border-fedRed/50 bg-red-900/10'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="p-4 font-bebas text-2xl text-slate-400">
                    {RANK_EMOJI[rank] ?? rank}
                  </td>
                  <td className="p-4 font-semibold text-white">
                    {entry.displayName || 'Anonymous Entrant'}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-fedRed font-sans uppercase tracking-widest">You</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {entry.isEliminated ? (
                      <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-red-500/30">Eliminated</span>
                    ) : (
                      <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-green-500/30">Active</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {streak > 1 ? (
                      <span className="text-orange-400 font-bebas text-lg">🔥 {streak}</span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-lg font-bold text-fedRed">
                    {(entry.totalPoints ?? 0).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
