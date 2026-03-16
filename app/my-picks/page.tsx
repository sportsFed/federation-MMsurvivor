'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MyPicksPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickMessage, setPickMessage] = useState('');

  const showMessage = (msg: string, ms = 5000) => {
    setPickMessage(msg);
    setTimeout(() => setPickMessage(''), ms);
  };

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

  const alreadyPickedTeams: string[] = userEntry?.survivorPicks?.map((p: any) => p.team) ?? [];

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
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You have already picked ${team} in a previous round.`, 4000);
      return;
    }
    if (userEntry?.currentPick) {
      showMessage('You have already made a pick this round.');
      return;
    }
    try {
      const entryRef = doc(db, 'entries', userId);
      const pickEntry = {
        team,
        round: game.round,
        region: game.region,
        gameId: game.id,
        pickedAt: new Date().toISOString(),
      };
      await updateDoc(entryRef, {
        survivorPicks: arrayUnion(pickEntry),
        currentPick: team,
      });
      setUserEntry((prev: any) => ({
        ...prev,
        survivorPicks: [...(prev?.survivorPicks ?? []), pickEntry],
        currentPick: team,
      }));
      showMessage(`✅ Pick submitted: ${team}`);
    } catch (err: any) {
      showMessage(`Error submitting pick: ${err.message}`);
    }
  };

  // Sort games chronologically, then group by day
  const sortedGames = [...games].sort((a, b) => {
    const aTime = a.gameTime ?? a.tipoff ?? a.scheduledAt ?? null;
    const bTime = b.gameTime ?? b.tipoff ?? b.scheduledAt ?? null;
    if (aTime && bTime) return new Date(aTime).getTime() - new Date(bTime).getTime();
    return (a.homeSeed ?? 99) - (b.homeSeed ?? 99);
  });

  const gamesByDay: Record<string, any[]> = {};
  for (const game of sortedGames) {
    const rawTime = game.gameTime ?? game.tipoff ?? game.scheduledAt ?? null;
    const dayKey = rawTime
      ? new Date(rawTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : 'TBD';
    if (!gamesByDay[dayKey]) gamesByDay[dayKey] = [];
    gamesByDay[dayKey].push(game);
  }

  const formatGameTime = (game: any): string | null => {
    const rawTime = game.gameTime ?? game.tipoff ?? game.scheduledAt ?? null;
    if (!rawTime) return null;
    try {
      return new Date(rawTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short',
      });
    } catch {
      return null;
    }
  };

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

      {/* Current Pick Status */}
      {userEntry?.currentPick && (
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm font-sans flex items-center gap-2">
          <span className="text-green-400">✅</span>
          <span className="text-slate-300">Your pick this round: <strong className="text-white">{userEntry.currentPick}</strong></span>
        </div>
      )}

      {/* Previously Picked */}
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
        Object.entries(gamesByDay).map(([day, dayGames]) => (
          <div key={day}>
            {/* Day divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500 uppercase tracking-widest font-sans">{day}</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            {dayGames.map((game) => {
              const gameTimeLabel = formatGameTime(game);
              return (
                <div key={game.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
                      {game.region} · {game.round || 'Round of 64'}
                    </span>
                    {gameTimeLabel && (
                      <span className="text-[11px] text-slate-400 font-sans">{gameTimeLabel}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { team: game.homeTeam, seed: game.homeSeed },
                      { team: game.awayTeam, seed: game.awaySeed },
                    ].map(({ team, seed }) => {
                      const used = alreadyPickedTeams.includes(team);
                      const isPicked = userEntry?.currentPick === team;
                      const disabled = used || game.isComplete || !!userEntry?.currentPick;
                      return (
                        <button
                          key={team}
                          onClick={() => !disabled && handlePickTeam(team, game)}
                          disabled={disabled}
                          className={`rounded-lg px-3 py-2.5 text-sm font-sans font-semibold transition-all text-left ${
                            isPicked
                              ? 'bg-green-700/40 border border-green-500/60 text-green-300'
                              : used
                              ? 'bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed'
                              : game.isComplete
                              ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-default'
                              : 'bg-slate-700 hover:bg-red-700/60 hover:border-red-500/60 border border-slate-600 text-white cursor-pointer'
                          }`}
                        >
                          <span className="text-[10px] text-slate-500 block mb-0.5">#{seed}</span>
                          <span className="block leading-tight">{team}</span>
                          {isPicked && <span className="text-[10px] text-green-400 mt-0.5 block">✓ Your Pick</span>}
                          {used && !isPicked && <span className="text-[10px] text-slate-600 mt-0.5 block">Used</span>}
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
        ))
      )}

      {/* Summary Section */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 font-sans">My Summary</h3>

        {/* Survivor Pick History */}
        {userEntry?.survivorPicks?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-sans">Survivor Pick History</p>
            <div className="space-y-1">
              {userEntry.survivorPicks.map((pick: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded px-3 py-1.5 text-sm font-sans">
                  <span className="text-slate-400 text-xs">{pick.round} · {pick.region}</span>
                  <span className="text-white font-medium">{pick.team}</span>
                  <span>
                    {pick.result === 'win' ? '✅' : pick.result === 'loss' ? '❌' : <span className="text-slate-600 text-xs">Pending</span>}
                  </span>
                </div>
              ))}
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
    </div>
  );
}
