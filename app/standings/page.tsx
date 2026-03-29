'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs } from 'firebase/firestore';
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

// E8 spans two days; both dates are always treated as primary (never historical).
const E8_DATE_KEYS = ['3/28/2026', '3/29/2026'];

function getSurvivorColHeader(dk: string): string {
  if (dk === '3/28/2026') return 'E8 Sat';
  if (dk === '3/29/2026') return 'E8 Sun';
  return dk;
}

interface PickCellData {
  team: string;
  result: 'win' | 'loss' | undefined;
}

function getPickForDate(
  entry: any,
  dateKey: string,
  games: any[],
  now: Date
): PickCellData | '🔒' | '—' {
  const picks: any[] = entry.survivorPicks ?? [];
  const pick = picks.find((p: any) => {
    if (p.isProjectionPick === true) return false;
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
  if (!tipped) return '🔒';
  // For eliminated entrants on non-E8 dates, hide unscored picks — they will never be scored.
  // E8 picks are scored independently so we show them even for eliminated entries.
  const isE8Date = E8_DATE_KEYS.includes(dateKey);
  if (entry.isEliminated && !isE8Date && pick.result !== 'win' && pick.result !== 'loss') {
    return '—';
  }
  return { team: pick.team, result: pick.result as 'win' | 'loss' | undefined };
}

// Final Four column mapping: f1=East, f2=West, f3=South, f4=Midwest
const FF_REGIONS = [
  { key: 'f1', label: 'East' },
  { key: 'f2', label: 'West' },
  { key: 'f3', label: 'South' },
  { key: 'f4', label: 'Midwest' },
] as const;

const TEAM_LOGOS: Record<string, string> = {
  'Alabama':         '/logos/alabama.png',
  'Arizona':         '/logos/arizona.png',
  'Arkansas':        '/logos/arkansas.png',
  'Duke':            '/logos/duke.png',
  'Florida':         '/logos/florida.png',
  'Gonzaga':         '/logos/gonzaga.png',
  'Houston':         '/logos/houston.png',
  'Illinois':        '/logos/illinois.png',
  'Iowa St.':        '/logos/iowa-state.png',
  'Kansas':          '/logos/kansas.png',
  'Louisville':      '/logos/louisville.png',
  'Miami (FL)':      '/logos/miami-fl.png',
  'Michigan St.':    '/logos/michigan-state.png',
  'Michigan':        '/logos/michigan.png',
  'Nebraska':        '/logos/nebraska.png',
  'Purdue':          '/logos/purdue.png',
  "St. John's (NY)": '/logos/st-johns.png',
  'TCU':             '/logos/tcu.png',
  'Tennessee':       '/logos/tennessee.png',
  'Texas Tech':      '/logos/texas-tech.png',
  'UCLA':            '/logos/ucla.png',
  'UConn':           '/logos/uconn.png',
  'Vanderbilt':      '/logos/vanderbilt.png',
  'Virginia':        '/logos/virginia.png',
  'Wisconsin':       '/logos/wisconsin.png',
};

const STICKY_RANK_CLS = 'py-1.5 px-2 whitespace-nowrap sticky left-0 z-10 bg-[#0b1120]';
const STICKY_NAME_CLS = 'py-1.5 px-2 whitespace-nowrap sticky left-10 z-10 bg-[#0b1120]';

export default function StandingsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [eliminatedTeamSet, setEliminatedTeamSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  // Single onAuthStateChanged listener — sets the current user ID for row highlighting.
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

    getDocs(collection(db, 'teams')).then((snap) => {
      const eliminated = new Set<string>();
      snap.docs.forEach((d) => {
        const t = d.data();
        if (t.isEliminated === true && t.name) eliminated.add(t.name);
      });
      setEliminatedTeamSet(eliminated);
    }).catch((err) => {
      console.error('Failed to load teams for standings:', err);
    });
  }, []);

  const fetchEntries = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'entries'));
      const data: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = [...data].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
      setEntries(sorted);
      setLoadError(false);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Standings load error:', err.code ?? err.message, err);
      setLoadError(true);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 60_000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

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

  const nowDateKey = getEasternDateKey(now.toISOString());

  const todayDateKey: string | null = gamesLoaded
    ? (survivorDateKeys.find(dk => {
        if (dk === nowDateKey) return true;
        const gamesForDate = games.filter((g: any) => {
          const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt ?? null;
          return gt && getEasternDateKey(gt) === dk && !g.isComplete;
        });
        return gamesForDate.length > 0;
      }) ?? nowDateKey)
    : null;

  const historicalDateKeys = survivorDateKeys.filter(dk => {
    if (E8_DATE_KEYS.includes(dk)) return false; // E8 dates never go historical
    return dk !== todayDateKey;
  });

  // E8 dates that exist in data but are not today — rendered at full brightness alongside today
  const pinnedDateKeys = E8_DATE_KEYS.filter(
    dk => survivorDateKeys.includes(dk) && dk !== todayDateKey
  );

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-sans font-bold text-3xl text-white uppercase tracking-wide">Federation Leaderboard</h1>
        <button
          onClick={fetchEntries}
          disabled={refreshing}
          className="text-xs text-slate-400 hover:text-white font-sans border border-slate-700 hover:border-slate-500 rounded px-2.5 py-1 transition disabled:opacity-40"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>
      {loadError ? (
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
                {/* Today's survivor pick column */}
                {todayDateKey !== null && (
                  <th className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-300 font-sans text-center">
                    {getSurvivorColHeader(todayDateKey)}
                  </th>
                )}
                {/* Pinned E8 columns — E8 dates that are not today, rendered at full brightness */}
                {pinnedDateKeys.map((dk) => (
                  <th key={dk} className="py-1.5 px-2 whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-300 font-sans text-center">
                    {getSurvivorColHeader(dk)}
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
                {/* Historical survivor pick columns — de-emphasized */}
                {historicalDateKeys.map((dk) => (
                  <th key={dk} className="py-1.5 px-2 whitespace-nowrap text-[9px] uppercase tracking-widest text-slate-600 font-sans text-center">
                    {getSurvivorColHeader(dk)}
                  </th>
                ))}
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
                      {(entry.totalPoints ?? 0).toFixed(2)}
                    </td>
                    {/* Status badge */}
                    <td className="py-1.5 px-2 whitespace-nowrap text-center">
                      {entry.isEliminated ? (
                        <span className="text-red-400 bg-red-900/30 border border-red-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Eliminated</span>
                      ) : (
                        <span className="text-green-400 bg-green-900/30 border border-green-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Active</span>
                      )}
                    </td>
                    {/* Today's survivor pick cell */}
                    {todayDateKey !== null && (() => {
                      const cellVal = gamesLoaded ? getPickForDate(entry, todayDateKey, games, now) : '🔒';
                      if (cellVal === '🔒') {
                        return (
                          <td className="py-1.5 px-2 whitespace-nowrap text-center text-slate-600 text-xs">
                            🔒
                          </td>
                        );
                      }
                      if (cellVal === '—') {
                        return (
                          <td className="py-1.5 px-2 whitespace-nowrap text-center text-slate-600">
                            —
                          </td>
                        );
                      }
                      const { team, result } = cellVal;
                      const cellClass = result === 'win'
                        ? 'text-green-400 bg-green-900/20'
                        : result === 'loss'
                        ? 'text-red-400 bg-red-900/20'
                        : 'text-slate-300 bg-slate-700/20';
                      const textClass = result === 'loss' ? 'line-through' : '';
                      return (
                        <td className={`py-1.5 px-2 whitespace-nowrap text-center ${cellClass}`}>
                          <span className={textClass}>{team}</span>
                        </td>
                      );
                    })()}
                    {/* Pinned E8 pick cells — E8 dates that are not today, rendered at full brightness */}
                    {pinnedDateKeys.map((dk) => {
                      const cellVal = gamesLoaded ? getPickForDate(entry, dk, games, now) : '🔒';
                      if (cellVal === '🔒') {
                        return (
                          <td key={dk} className="py-1.5 px-2 whitespace-nowrap text-center text-slate-600 text-xs">
                            🔒
                          </td>
                        );
                      }
                      if (cellVal === '—') {
                        return (
                          <td key={dk} className="py-1.5 px-2 whitespace-nowrap text-center text-slate-600">
                            —
                          </td>
                        );
                      }
                      const { team, result } = cellVal;
                      const cellClass = result === 'win'
                        ? 'text-green-400 bg-green-900/20'
                        : result === 'loss'
                        ? 'text-red-400 bg-red-900/20'
                        : 'text-slate-300 bg-slate-700/20';
                      const textClass = result === 'loss' ? 'line-through' : '';
                      return (
                        <td key={dk} className={`py-1.5 px-2 whitespace-nowrap text-center ${cellClass}`}>
                          <span className={textClass}>{team}</span>
                        </td>
                      );
                    })}
                    {/* Final Four columns — lock emoji applies universally to ALL entrants (including current user)
                        until the deadline passes. No exceptions in the standings view. */}
                    {FF_REGIONS.map((r) => {
                      const teamName = entry.finalFourPicks?.[r.key];
                      const isTeamEliminated = deadlinePassed && teamName && eliminatedTeamSet.has(teamName);
                      const isScored = deadlinePassed && entry.finalFourResults?.[r.key]?.scored === true;
                      const cellBg = isScored
                        ? 'rgba(34, 197, 94, 0.15)'
                        : isTeamEliminated
                        ? 'rgba(239, 68, 68, 0.15)'
                        : undefined;
                      return (
                        <td
                          key={r.key}
                          className={`py-1.5 px-2 whitespace-nowrap text-center ${!deadlinePassed ? 'text-slate-600 text-xs' : ''}`}
                          style={cellBg ? { backgroundColor: cellBg } : undefined}
                        >
                          {!deadlinePassed
                            ? '🔒'
                            : !teamName
                            ? '—'
                            : TEAM_LOGOS[teamName]
                            ? (
                              <img
                                src={TEAM_LOGOS[teamName]}
                                alt={teamName}
                                title={teamName}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  display: 'inline-block',
                                  ...(isTeamEliminated ? { opacity: 0.4, filter: 'grayscale(60%)' } : {}),
                                }}
                              />
                            )
                            : (isTeamEliminated
                              ? <span style={{ textDecoration: 'line-through' }}>{teamName}</span>
                              : teamName)}
                        </td>
                      );
                    })}
                    {/* Natty — same lock rule as Final Four */}
                    {(() => {
                      const champTeamName = entry.finalFourPicks?.champ;
                      const isChampTeamEliminated = deadlinePassed && champTeamName && eliminatedTeamSet.has(champTeamName);
                      const isChampScored = deadlinePassed && entry.finalFourResults?.champ?.scored === true;
                      const champBg = isChampScored
                        ? 'rgba(34, 197, 94, 0.15)'
                        : isChampTeamEliminated
                        ? 'rgba(239, 68, 68, 0.15)'
                        : undefined;
                      return (
                        <td
                          className={`py-1.5 px-2 whitespace-nowrap text-center font-semibold ${!deadlinePassed ? 'text-slate-600 text-xs' : ''}`}
                          style={champBg ? { backgroundColor: champBg } : undefined}
                        >
                          {!deadlinePassed
                            ? '🔒'
                            : !champTeamName
                            ? '—'
                            : TEAM_LOGOS[champTeamName]
                            ? (
                              <img
                                src={TEAM_LOGOS[champTeamName]}
                                alt={champTeamName}
                                title={champTeamName}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  display: 'inline-block',
                                  ...(isChampTeamEliminated ? { opacity: 0.4, filter: 'grayscale(60%)' } : {}),
                                }}
                              />
                            )
                            : (isChampTeamEliminated
                              ? <span style={{ textDecoration: 'line-through' }}>{champTeamName}</span>
                              : champTeamName)}
                        </td>
                      );
                    })()}
                    {/* Historical survivor pick columns — de-emphasized */}
                    {historicalDateKeys.map((dk) => {
                      const cellVal = gamesLoaded ? getPickForDate(entry, dk, games, now) : '🔒';
                      if (cellVal === '🔒') {
                        return (
                          <td key={dk} className="py-1.5 px-2 whitespace-nowrap text-center text-slate-700 text-[10px]">
                            🔒
                          </td>
                        );
                      }
                      if (cellVal === '—') {
                        return (
                          <td key={dk} className="py-1.5 px-2 whitespace-nowrap text-center text-slate-700 text-[10px]">
                            —
                          </td>
                        );
                      }
                      const { team, result } = cellVal;
                      const cellClass = result === 'win'
                        ? 'text-green-600'
                        : result === 'loss'
                        ? 'text-red-600'
                        : 'text-slate-500';
                      const textClass = result === 'loss' ? 'line-through' : '';
                      return (
                        <td key={dk} className={`py-1.5 px-2 whitespace-nowrap text-center text-[10px] ${cellClass}`}>
                          <span className={textClass}>{team}</span>
                        </td>
                      );
                    })}
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