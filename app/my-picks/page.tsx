'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function formatEasternTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getEasternGameDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getEasternDateKey(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function getDaySectionId(dateKey: string): string {
  return `day-${dateKey.replace(/\//g, '-')}`;
}

const ELITE_EIGHT_REQUIRED_PICKS = 2;

function formatCountdown(isoString: string, now: Date): string | null {
  const target = new Date(isoString);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 24) return null;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function MyPicksPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickMessage, setPickMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [confirmPick, setConfirmPick] = useState<{ team: string; seed: number; game: any } | null>(null);

  const showMessage = (msg: string, ms = 5000) => {
    setPickMessage(msg);
    setTimeout(() => setPickMessage(''), ms);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const entryRef = doc(db, 'entries', user.uid);
          const entrySnap = await getDoc(entryRef);
          if (entrySnap.exists()) setUserEntry(entrySnap.data());

          const gamesSnap = await getDocs(collection(db, 'games'));
          setGames(gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err: any) {
          showMessage(`Error loading data: ${err.message}`);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Only count teams from rounds that have already been scored as "used"
  const alreadyPickedTeams: string[] = (userEntry?.survivorPicks ?? [])
    .filter((p: any) => p.result === 'win' || p.result === 'loss')
    .map((p: any) => p.team);

  // Helper: derive effective dateKey for a pick (backward compat for picks without dateKey)
  const getEffectivePickDateKey = (pick: any): string | null => {
    if (pick.dateKey) return pick.dateKey;
    if (pick.gameId) {
      const g = games.find((g: any) => g.id === pick.gameId);
      if (g) {
        const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
        return gt ? getEasternDateKey(gt) : null;
      }
    }
    return null;
  };

  const hasIncompleteFinalFourPicks = (entry: any) =>
    !entry?.finalFourPicks?.champ ||
    !entry?.finalFourPicks?.f1 ||
    !entry?.finalFourPicks?.f2 ||
    !entry?.finalFourPicks?.f3 ||
    !entry?.finalFourPicks?.f4;

  const handlePickTeam = async (team: string, game: any) => {
    if (!userId || !userEntry) {
      showMessage('You must be logged in to submit a pick.');
      return;
    }
    // Check game hasn't started
    const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
    if (gameTime && new Date() >= new Date(gameTime)) {
      showMessage('This game has already started — pick is locked.');
      return;
    }
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You already used ${team} in a previous round.`, 4000);
      return;
    }

    const gameDateKey = getEasternDateKey(game.gameTime ?? game.tipoff ?? game.scheduledAt ?? new Date().toISOString());
    const isEliteEightGame = game.round === 'Elite Eight';

    try {
      const entryRef = doc(db, 'entries', userId);
      const newPickEntry = {
        team,
        round: game.round,
        region: game.region,
        gameId: game.id,
        dateKey: gameDateKey,
        pickedAt: new Date().toISOString(),
      };

      const existingPicks: any[] = userEntry?.survivorPicks ?? [];
      let updatedPicks: any[];
      let action: string;
      let previousTeam: string | null;

      if (isEliteEightGame) {
        // Elite Eight: key by gameId, allow up to 2 total EE picks across the weekend
        const hasPickForThisGame = existingPicks.some((p: any) => p.gameId === game.id);
        const existingEEPicks = existingPicks.filter((p: any) => p.round === 'Elite Eight');
        if (hasPickForThisGame) {
          previousTeam = existingPicks.find((p: any) => p.gameId === game.id)?.team ?? null;
          updatedPicks = existingPicks.map((p: any) => p.gameId === game.id ? newPickEntry : p);
          action = 'changed';
        } else if (existingEEPicks.length >= ELITE_EIGHT_REQUIRED_PICKS) {
          showMessage('You already have 2 Elite Eight picks. Change one of your existing picks instead.');
          return;
        } else {
          updatedPicks = [...existingPicks, newPickEntry];
          previousTeam = null;
          action = 'submitted';
        }
      } else {
        // Standard round: one pick per calendar day, keyed by dateKey
        // Backward compat: also resolve picks without dateKey via gameId lookup
        const existingForDay = existingPicks.find(
          (p: any) => getEffectivePickDateKey(p) === gameDateKey && p.round !== 'Elite Eight'
        );
        if (existingForDay) {
          previousTeam = existingForDay.team ?? null;
          updatedPicks = existingPicks.map((p: any) =>
            getEffectivePickDateKey(p) === gameDateKey && p.round !== 'Elite Eight' ? newPickEntry : p
          );
          action = 'changed';
        } else {
          updatedPicks = [...existingPicks, newPickEntry];
          previousTeam = null;
          action = 'submitted';
        }
      }

      await updateDoc(entryRef, {
        survivorPicks: updatedPicks,
        currentPick: team,
      });
      // Write audit log entry
      try {
        await addDoc(collection(db, 'pickLog'), {
          userId,
          displayName: userEntry?.displayName ?? '',
          team,
          round: game.round,
          region: game.region,
          gameId: game.id,
          dateKey: gameDateKey,
          action,
          previousTeam,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Non-fatal: log failure doesn't block pick submission
      }
      setUserEntry((prev: any) => ({
        ...prev,
        survivorPicks: updatedPicks,
        currentPick: team,
      }));
      showMessage(`✅ Pick updated: ${team}`);
    } catch (err: any) {
      showMessage(`Error: ${err.message}`);
    }
  };

  // Sort games chronologically
  const sortedGames = [...games].sort((a, b) => {
    const aTime = new Date(a.gameTime ?? a.tipoff ?? 0).getTime();
    const bTime = new Date(b.gameTime ?? b.tipoff ?? 0).getTime();
    return aTime - bTime;
  });

  // Group by calendar date (in Eastern Time)
  const gamesByDay = sortedGames.reduce((acc: Record<string, any[]>, game) => {
    const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
    const dateKey = gameTime ? getEasternDateKey(gameTime) : 'Unknown';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(game);
    return acc;
  }, {});

  // Pending picks (not yet scored)
  const pendingPicks = (userEntry?.survivorPicks ?? []).filter(
    (p: any) => p.result !== 'win' && p.result !== 'loss'
  );

  // Elite Eight picks (all, including scored and pending)
  const eliteEightPicks = (userEntry?.survivorPicks ?? []).filter(
    (p: any) => p.round === 'Elite Eight'
  );

  // Per-day missing pick alerts for upcoming unlocked days (non-Elite Eight)
  const missingPickDayAlerts: Array<{ dateKey: string; dayLabel: string; anchor: string }> = [];
  Object.entries(gamesByDay).forEach(([dateKey, dayGames]) => {
    const isEliteEightDay = (dayGames as any[]).some((g: any) => g.round === 'Elite Eight');
    if (isEliteEightDay) return; // handled separately
    const hasUnlockedGames = (dayGames as any[]).some((g: any) => {
      const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
      return gt && now < new Date(gt);
    });
    if (!hasUnlockedGames) return;
    const hasPick = pendingPicks.some((p: any) => getEffectivePickDateKey(p) === dateKey);
    if (!hasPick) {
      const firstGame = (dayGames as any[])[0];
      const gameTimeStr = firstGame.gameTime ?? firstGame.tipoff ?? '';
      const dayLabel = gameTimeStr ? getEasternGameDate(gameTimeStr) : dateKey;
      missingPickDayAlerts.push({ dateKey, dayLabel, anchor: getDaySectionId(dateKey) });
    }
  });

  // Elite Eight alert: need 2 total picks across Sat/Sun window
  const upcomingEliteEightGames = sortedGames.filter((g: any) => {
    const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
    return g.round === 'Elite Eight' && gt && now < new Date(gt);
  });
  const showEliteEightAlert = upcomingEliteEightGames.length > 0 && eliteEightPicks.length < ELITE_EIGHT_REQUIRED_PICKS;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-20 animate-pulse">
        <div className="h-24 bg-slate-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-slate-800/50 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      {/* Identity Card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-0.5">Your Entry</p>
          <p className="text-white font-bold text-lg font-sans">{userEntry?.displayName ?? '—'}</p>
          <p className="text-xs text-slate-400 font-sans">The Federation · March Madness Survivor 2026</p>
        </div>
        <div className="text-right">
          <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            userEntry?.isEliminated
              ? 'bg-red-900/50 text-red-400 border border-red-500/40'
              : 'bg-green-900/50 text-green-400 border border-green-500/40'
          }`}>
            {userEntry?.isEliminated ? '❌ Eliminated' : '✅ Active'}
          </span>
          <p className="text-xs text-slate-500 mt-1">{alreadyPickedTeams.length} pick{alreadyPickedTeams.length !== 1 ? 's' : ''} used</p>
        </div>
      </div>

      {/* Pick feedback message */}
      {pickMessage && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/40 border border-green-500/50 text-green-400 text-sm font-sans">
          {pickMessage}
        </div>
      )}

      {/* Pre-Tournament Picks incomplete alert */}
      {userEntry && hasIncompleteFinalFourPicks(userEntry) && (
        <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-600/40 text-amber-300 text-sm font-sans flex items-center justify-between">
          <span>⚠️ Pre-Tournament Picks not complete</span>
          <a href="/final-four" className="text-red-400 underline hover:text-red-300 text-xs font-semibold">Complete Now →</a>
        </div>
      )}

      {/* Missing pick alerts for upcoming days */}
      {missingPickDayAlerts.map(({ dateKey, dayLabel, anchor }) => (
        <div key={dateKey} className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-600/40 text-blue-300 text-sm font-sans flex items-center justify-between">
          <span>🗓️ No pick yet for <strong>{dayLabel}</strong></span>
          <a href={`#${anchor}`} className="text-blue-400 underline hover:text-blue-300 text-xs font-semibold">
            See Games →
          </a>
        </div>
      ))}

      {/* Elite Eight alert: need 2 total picks */}
      {showEliteEightAlert && (
        <div className="mb-4 p-3 rounded-lg bg-purple-900/20 border border-purple-600/40 text-purple-300 text-sm font-sans flex items-center justify-between">
          <span>🏀 Elite Eight requires {ELITE_EIGHT_REQUIRED_PICKS} picks — {eliteEightPicks.length} of {ELITE_EIGHT_REQUIRED_PICKS} submitted</span>
          <a href="#elite-eight-games" className="text-purple-400 underline hover:text-purple-300 text-xs font-semibold">
            See Elite Eight →
          </a>
        </div>
      )}

      {/* Current Pick Status — one banner per pending pick */}
      {pendingPicks.length > 0 && (
        <div className="mb-4 space-y-1">
          {pendingPicks.map((pick: any, i: number) => {
            const pickGame = games.find((g: any) => g.id === pick.gameId);
            const gt = pickGame?.gameTime ?? pickGame?.tipoff ?? pickGame?.scheduledAt ?? '';
            const dayLabel = gt ? getEasternGameDate(gt) : pick.round;
            return (
              <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm font-sans flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span className="text-slate-300">{dayLabel}: <strong className="text-white">{pick.team}</strong></span>
                <span className="text-slate-500 text-xs ml-auto">Change before tip-off</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Previously Picked (scored rounds only) */}
      {alreadyPickedTeams.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-2">Used Picks</p>
          <div className="flex flex-wrap gap-1.5">
            {alreadyPickedTeams.map((team: string) => (
              <span key={team} className="text-xs px-2.5 py-1 rounded-full border border-red-500/30 text-red-400 bg-red-900/20 font-sans">
                {team}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Games List */}
      {games.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-4">🏀</div>
          <h3 className="font-bebas text-3xl text-white tracking-widest mb-2">You&apos;re Registered!</h3>
          <p className="text-slate-400 text-sm font-sans mb-3">
            The bracket hasn&apos;t been set yet. Once the tournament field is announced and the bracket is seeded, your matchups and pick options will appear here automatically.
          </p>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-sans font-bold">Check back after Selection Sunday!</p>
        </div>
      ) : (
        Object.entries(gamesByDay).map(([dateKey, dayGames]) => {
          const gameTimeStr = dayGames[0].gameTime ?? dayGames[0].tipoff ?? '';
          const dayLabel = gameTimeStr ? getEasternGameDate(gameTimeStr) : dateKey;
          const isEliteEightDay = (dayGames as any[]).some((g: any) => g.round === 'Elite Eight');
          const sectionId = isEliteEightDay ? 'elite-eight-games' : getDaySectionId(dateKey);
          return (
            <div id={sectionId} key={dateKey}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-400 uppercase tracking-widest font-sans font-semibold">{dayLabel}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              {dayGames.map((game) => {
                const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
                const isLocked = gameTime ? now >= new Date(gameTime) : game.isComplete;
                const easternTime = gameTime ? formatEasternTime(gameTime) : null;
                const countdown = (!isLocked && gameTime) ? formatCountdown(gameTime, now) : null;
                const gamePickEntry = (userEntry?.survivorPicks ?? []).find((p: any) => p.gameId === game.id);
                const thisGamePickTeam = gamePickEntry?.team;

                return (
                  <div
                    key={game.id}
                    className={`bg-slate-800/40 border rounded-xl p-3 mb-2 transition-all ${
                      isLocked ? 'border-slate-700/50 opacity-70' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
                        {game.region} · {game.round || 'Round of 64'}
                      </span>
                      <div className="flex items-center gap-2">
                        {game.network && (
                          <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-sans">{game.network}</span>
                        )}
                        {easternTime && (
                          <span className="text-[11px] text-slate-400 font-sans">{easternTime} ET</span>
                        )}
                        {isLocked ? (
                          game.isComplete && game.winner ? null : <span className="text-[11px] text-slate-500">🔒</span>
                        ) : countdown ? (
                          <span className="text-[11px] text-amber-400 font-mono font-semibold">⏱ {countdown}</span>
                        ) : null}
                      </div>
                    </div>
                    {game.round === 'Elite Eight' && (
                      <div className="mb-2 text-[10px] text-purple-400 font-sans">
                        Elite Eight — pick {ELITE_EIGHT_REQUIRED_PICKS} teams this weekend · {eliteEightPicks.length} of {ELITE_EIGHT_REQUIRED_PICKS} submitted
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { team: game.homeTeam, seed: game.homeSeed },
                        { team: game.awayTeam, seed: game.awaySeed },
                      ].map(({ team, seed }) => {
                        const isThisRoundPick = thisGamePickTeam === team;
                        const isUsedInPrevRound = alreadyPickedTeams.includes(team);
                        const canPick = !isLocked && !game.isComplete && !isUsedInPrevRound;
                        return (
                          <button
                            key={team}
                            onClick={() => canPick && setConfirmPick({ team, seed, game })}
                            disabled={!canPick}
                            className={`rounded-lg px-3 py-2.5 text-sm font-sans font-semibold transition-all text-left ${
                              isThisRoundPick
                                ? 'bg-green-700/40 border border-green-500/60 text-green-300 cursor-pointer hover:bg-green-700/60'
                                : isUsedInPrevRound
                                ? 'bg-slate-800 border border-slate-700/50 text-slate-600 cursor-not-allowed'
                                : isLocked || game.isComplete
                                ? 'bg-slate-800/60 border border-slate-700/40 text-slate-500 cursor-default'
                                : 'bg-slate-700/60 hover:bg-red-700/50 hover:border-red-500/50 border border-slate-600 text-white cursor-pointer'
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 block mb-0.5">#{seed}</span>
                            <span className="block leading-tight text-xs">{team}</span>
                            {isThisRoundPick && <span className="text-[10px] text-green-400 mt-0.5 block">✓ Your Pick</span>}
                            {isUsedInPrevRound && <span className="text-[10px] text-slate-600 mt-0.5 block">Used</span>}
                            {isLocked && !isThisRoundPick && !isUsedInPrevRound && (
                              <span className="text-[10px] text-slate-600 mt-0.5 block">Locked</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {game.isComplete && game.winner && (
                      <p className="text-xs text-green-400 mt-2 font-sans">✓ Final: {game.winner} won</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Summary Section */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 font-sans">My Summary</h3>

        {/* Survivor Pick History */}
        {userEntry?.survivorPicks?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-sans">Survivor Pick History</p>
            <div className="space-y-1">
              {userEntry.survivorPicks.map((pick: any, i: number) => {
                const pickGame = games.find((g: any) => g.id === pick.gameId);
                const gt = pickGame?.gameTime ?? pickGame?.tipoff ?? pickGame?.scheduledAt ?? '';
                const dayLabel = gt ? getEasternGameDate(gt) : (pick.dateKey ?? pick.round);
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded px-3 py-1.5 text-sm font-sans">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs">{pick.round} · {pick.region}</span>
                      <span className="text-slate-500 text-[10px]">{dayLabel}</span>
                    </div>
                    <span className="text-white font-medium">{pick.team}</span>
                    <span>
                      {pick.result === 'win' ? '✅' : pick.result === 'loss' ? '❌' : <span className="text-slate-600 text-xs">Pending</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Final Four Summary */}
        {userEntry?.finalFourPicks && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-sans">Pre-Tournament Picks</p>
            <div className="grid grid-cols-2 gap-2">
              {(['f1', 'f2', 'f3', 'f4'] as const).map((slot, i) => {
                const regions = ['East', 'West', 'South', 'Midwest'];
                return (
                  <div key={slot} className="bg-slate-800/30 rounded px-3 py-2 text-xs font-sans">
                    <span className="text-slate-500 block">{regions[i]} Final Four</span>
                    <span className="text-white font-medium">{userEntry.finalFourPicks[slot] || '—'}</span>
                  </div>
                );
              })}
              <div className="col-span-2 bg-slate-800/30 rounded px-3 py-2 text-xs font-sans border border-red-500/20">
                <span className="text-slate-500 block">National Champion 🏆</span>
                <span className="text-red-400 font-bold">{userEntry.finalFourPicks.champ || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA if picks incomplete */}
        {(!userEntry?.finalFourPicks || hasIncompleteFinalFourPicks(userEntry)) && (
          <a href="/final-four" className="mt-3 block text-center text-xs text-red-400 underline font-sans">
            Complete Pre-Tournament Picks →
          </a>
        )}
      </div>

      {/* Pick Confirmation Modal */}
      {confirmPick && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-3">🏀</div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">Confirm Your Pick</h3>
            <p className="text-slate-400 text-sm mb-1 font-sans">{confirmPick.game.region} · {confirmPick.game.round}</p>
            <div className="my-4 py-3 px-4 bg-slate-800 rounded-xl border border-slate-600">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-sans">You are picking</p>
              <p className="font-bebas text-3xl text-white tracking-wide">#{confirmPick.seed} {confirmPick.team}</p>
            </div>
            <p className="text-xs text-slate-500 font-sans mb-5">Once confirmed, you can change this pick until tip-off.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPick(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 font-sans text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const pick = confirmPick;
                  setConfirmPick(null);
                  await handlePickTeam(pick.team, pick.game);
                }}
                className="flex-1 py-2.5 rounded-xl bg-fedRed hover:bg-red-700 text-white font-sans text-sm font-semibold transition"
              >
                Confirm Pick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
