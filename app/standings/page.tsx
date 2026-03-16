'use client';

import { useEffect, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const RANK_EMOJI: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };

// March 19, 2026 12:15 PM ET (UTC-4 = 16:15 UTC)
const FINAL_FOUR_DEADLINE = new Date('2026-03-19T16:15:00Z');

function isDeadlinePassed(now: Date): boolean {
  return now >= FINAL_FOUR_DEADLINE;
}

function isGameLocked(gameId: string | undefined, games: any[], now: Date): boolean {
  if (!gameId) return false;
  const game = games.find((g: any) => g.id === gameId);
  if (!game) return false;
  const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
  if (gameTime) return now >= new Date(gameTime);
  return game.isComplete ?? false;
}

export default function StandingsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const currentUserRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUserId && entries.length > 0) {
      currentUserRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentUserId, entries]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'games')).then((snap) => {
      setGames(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch((err) => {
      console.error('Failed to load games for standings:', err);
    });
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
      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700">
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase w-10">#</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase">Entrant</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase text-right">Score</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase text-center">Status</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase text-center whitespace-nowrap">Today&apos;s Pick</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase text-center whitespace-nowrap">Final Four</th>
              <th className="p-3 font-sans text-slate-400 tracking-widest text-xs uppercase text-center whitespace-nowrap">🏆 Champion</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.id === currentUserId;
              const isPaidPosition = rank <= 5;
              const deadlinePassed = isDeadlinePassed(now);
              const showFinalFourPicks = isCurrentUser || deadlinePassed;

              // Determine survivor pick visibility: only show once the pick's game has tipped off
              const latestSurvivorPick = [...(entry.survivorPicks ?? [])]
                .sort((a: any, b: any) => new Date(b.pickedAt ?? 0).getTime() - new Date(a.pickedAt ?? 0).getTime())[0];
              const survivorPickLocked = isGameLocked(latestSurvivorPick?.gameId, games, now);

              return (
                <tr
                  key={entry.id}
                  ref={isCurrentUser ? currentUserRowRef : undefined}
                  className={`border-b border-slate-800 transition ${
                    isCurrentUser
                      ? 'bg-red-900/10 border-l-2 border-l-fedRed'
                      : isPaidPosition
                      ? 'bg-amber-900/5 border-l-2 border-l-amber-500/50'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="p-3 font-sans text-slate-400 text-sm">
                    <span className={isPaidPosition ? 'text-amber-400 font-bold' : ''}>
                      {RANK_EMOJI[rank] ?? rank}
                    </span>
                    {isPaidPosition && rank > 3 && <span className="ml-1 text-[10px] text-amber-600" aria-label="Paid position">💰</span>}
                  </td>
                  <td className="p-3 font-sans font-semibold text-sm text-white">
                    {entry.displayName || 'Anonymous Entrant'}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-fedRed font-sans uppercase tracking-widest">You</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-sm font-bold text-fedRed">
                    {(entry.totalPoints ?? 0).toFixed(1)}
                  </td>
                  <td className="p-3 text-center">
                    {entry.isEliminated ? (
                      <span className="text-red-400 bg-red-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-red-500/30">Out</span>
                    ) : (
                      <span className="text-green-400 bg-green-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-green-500/30">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-sans text-sm text-slate-300 whitespace-nowrap">
                    {entry.currentPick ? (
                      survivorPickLocked
                        ? entry.currentPick
                        : <span className="text-slate-500 italic text-xs">Pending</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-sans text-xs text-slate-400 whitespace-nowrap">
                    {showFinalFourPicks ? (
                      entry.finalFourPicks ? (
                        <div className="space-y-0.5">
                          {[entry.finalFourPicks.f1, entry.finalFourPicks.f2, entry.finalFourPicks.f3, entry.finalFourPicks.f4]
                            .filter(Boolean)
                            .map((t: string, i: number) => <div key={i} className="text-slate-300">{t}</div>)}
                          {!entry.finalFourPicks.f1 && <span className="text-slate-600">—</span>}
                        </div>
                      ) : <span className="text-slate-600">—</span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">Locked</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-sans text-sm font-semibold text-red-400 whitespace-nowrap">
                    {showFinalFourPicks ? (
                      entry.finalFourPicks?.champ ?? <span className="text-slate-600">—</span>
                    ) : (
                      <span className="text-slate-500 italic text-xs font-normal">Locked</span>
                    )}
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
