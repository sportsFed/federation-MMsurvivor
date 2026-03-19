'use client';

import { useEffect, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const RANK_EMOJI: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };

// March 19, 2026 12:15 PM ET (UTC-4 = 16:15 UTC)
const FINAL_FOUR_DEADLINE = new Date('2026-03-19T16:15:00Z');

function isDeadlinePassed(now: Date): boolean {
  return now >= FINAL_FOUR_DEADLINE;
}

function getEasternDateKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function getPickForDate(entry: any, dateKey: string, games: any[], now: Date): string {
  const picks: any[] = entry.survivorPicks ?? [];
  const pick = picks.find((p: any) => {
    if (p.isProjectionPick) return false;
    if (p.dateKey === dateKey) return true;
    const g = games.find((g: any) => g.id === p.gameId);
    if (!g) return false;
    const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
    return gt ? getEasternDateKey(gt) === dateKey : false;
  });
  if (!pick) return '—';
  const game = games.find((g: any) => g.id === pick.gameId);
  const gameTime = game?.gameTime ?? game?.tipoff ?? game?.scheduledAt;
  const tipped = gameTime ? now >= new Date(gameTime) : (game?.isComplete ?? false);
  return tipped ? pick.team : '🔒';
}

// Final Four column mapping: f1=East, f2=West, f3=South, f4=Midwest
const FF_REGIONS = [
  { key: 'f1', label: 'East' },
  { key: 'f2', label: 'West' },
  { key: 'f3', label: 'South' },
  { key: 'f4', label: 'Midwest' },
] as const;

const STICKY_RANK_CLS = 'py-1.5 px-2 whitespace-nowrap sticky left-0 z-10 bg-[#0b1120]';
const STICKY_NAME_CLS = 'py-1.5 px-2 whitespace-nowrap sticky left-10 z-10 bg-[#0b1120]';

export default function StandingsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
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
      setGamesLoaded(true);
    }).catch((err) => {
      console.error('Failed to load games for standings:', err);
      setGamesLoaded(true); // mark loaded even on error so UI isn't permanently blocked
    });
  }, []);

  useEffect(() => {
    // Remove orderBy to avoid composite index requirement; sort client-side instead
    const q = query(collection(db, 'entries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side by totalPoints descending
      const sorted = [...data].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
      setEntries(sorted);
      setLoading(false);
    }, (error) => {
      console.error('Standings snapshot error:', error);
      setSnapshotError(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Derive sorted unique date keys from real (non-skeleton) games
  const survivorDateKeys: string[] = gamesLoaded
    ? (Array.from(
        new Set(
          games
            .filter((g: any) => !g.isSkeletonGame)
            .map((g: any) => {
              const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
              return gt ? getEasternDateKey(gt) : null;
            })
            .filter(Boolean)
        )
      ).sort() as string[])
    : [];

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

  const deadlinePassed = isDeadlinePassed(now);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="font-sans font-bold text-3xl text-white mb-8 uppercase tracking-wide">Federation Leaderboard</h1>
      {snapshotError ? (
        <div className="glass-panel p-10 text-center border border-white/10">
          <p className="text-slate-400 text-sm">Unable to load standings at this time. Please try again later.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-panel p-10 text-center border border-white/10">
          <h2 className="font-bebas text-3xl text-white tracking-widest mb-2">Standings Coming Soon</h2>
          <p className="text-slate-400 text-sm">The leaderboard will populate once the tournament begins and picks are scored. You&apos;re in — sit tight!</p>
        </div>
      ) : (
        <div className="glass-panel overflow-x-auto">
          <table className="text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700">
                {/* Sticky rank column */}
                <th className={`${STICKY_RANK_CLS} text-[10px] uppercase tracking-widest text-slate-400 font-sans w-10`}>#</th>
                {/* Sticky name column */}
                <th className={`${STICKY_NAME_CLS} text-[10px] uppercase tracking-widest text-slate-400 font-sans`}>Entrant</th>
                <th className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-400 font-sans text-right">Pts</th>
                <th className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-400 font-sans text-center">Status</th>
                {/* Survivor pick columns — one per unique tournament date */}
                {survivorDateKeys.map((dk) => (
                  <th key={dk} className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-400 font-sans text-center">
                    {dk}
                  </th>
                ))}
                {/* Final Four columns — one per region; lock applies to ALL entrants until deadline */}
                {FF_REGIONS.map((r) => (
                  <th key={r.key} className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-400 font-sans text-center">
                    {r.label}
                  </th>
                ))}
                {/* National champion column — same lock rule as Final Four */}
                <th className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-400 font-sans text-center">Natty</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = entry.id === currentUserId;

                return (
                  <tr
                    key={entry.id}
                    ref={isCurrentUser ? currentUserRowRef : undefined}
                    className={`border-b border-slate-800 transition even:bg-slate-800/20 ${
                      isCurrentUser
                        ? 'bg-red-900/10 border-l-2 border-l-fedRed'
                        : ''
                    } ${entry.isEliminated ? 'opacity-60' : ''}`}
                  >
                    {/* Rank — sticky */}
                    <td className={`${STICKY_RANK_CLS} text-slate-400`}>
                      {RANK_EMOJI[rank] ?? rank}
                    </td>
                    {/* Name — sticky */}
                    <td className={`${STICKY_NAME_CLS} text-white`}>
                      <span className="max-w-[120px] truncate inline-block align-bottom font-sans text-xs font-semibold">
                        {entry.displayName || 'Anonymous Entrant'}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-1 text-[10px] text-fedRed font-sans uppercase tracking-widest">You</span>
                      )}
                    </td>
                    {/* Total pts */}
                    <td className="py-1.5 px-2 whitespace-nowrap text-right font-mono text-xs font-bold text-fedRed">
                      {(entry.totalPoints ?? 0).toFixed(1)}
                    </td>
                    {/* Status badge */}
                    <td className="py-1.5 px-2 whitespace-nowrap text-center">
                      {entry.isEliminated ? (
                        <span className="text-red-400 bg-red-900/30 border border-red-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Eliminated</span>
                      ) : (
                        <span className="text-green-400 bg-green-900/30 border border-green-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Active</span>
                      )}
                    </td>
                    {/* Survivor pick columns — revealed per game tip-off time */}
                    {survivorDateKeys.map((dk) => {
                      const cellVal = gamesLoaded ? getPickForDate(entry, dk, games, now) : '🔒';
                      return (
                        <td key={dk} className={`py-1.5 px-2 whitespace-nowrap text-center ${cellVal === '🔒' ? 'text-slate-600 text-xs' : 'text-slate-300'}`}>
                          {cellVal}
                        </td>
                      );
                    })}
                    {/* Final Four columns — lock emoji applies universally to ALL entrants (including current user)
                        until the deadline passes. No exceptions in the standings view. */}
                    {FF_REGIONS.map((r) => (
                      <td key={r.key} className={`py-1.5 px-2 whitespace-nowrap text-center ${deadlinePassed ? 'text-slate-300' : 'text-slate-600 text-xs'}`}>
                        {deadlinePassed
                          ? (entry.finalFourPicks?.[r.key] ?? '—')
                          : '🔒'}
                      </td>
                    ))}
                    {/* Natty — same lock rule as Final Four */}
                    <td className={`py-1.5 px-2 whitespace-nowrap text-center ${deadlinePassed ? 'text-slate-300 font-semibold' : 'text-slate-600 text-xs'}`}>
                      {deadlinePassed
                        ? (entry.finalFourPicks?.champ ?? '—')
                        : '🔒'}
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