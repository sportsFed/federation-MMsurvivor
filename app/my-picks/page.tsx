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
  const [pickModal, setPickModal] = useState<{ game: any } | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const handlePickTeam = async (team: string, game: any) => {
    if (!userId || !userEntry) {
      showMessage('You must be logged in to submit a pick.');
      return;
    }
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You have already picked ${team} in a previous round.`, 4000);
      setPickModal(null);
      return;
    }
    setSubmitting(true);
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
      setPickModal(null);
    } catch (err: any) {
      showMessage(`Error submitting pick: ${err.message}`);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-pulse">
        <div className="mb-10 px-2">
          <div className="h-12 bg-slate-700/50 rounded w-48 mb-2" />
          <div className="h-5 bg-slate-700/50 rounded w-32" />
        </div>
        <div className="glass-panel p-6 mb-8 h-24 bg-slate-700/50" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 h-20 bg-slate-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-10 flex justify-between items-end px-2">
        <div>
          <h1 className="font-bebas text-5xl tracking-tighter italic text-white uppercase">My Picks</h1>
          {userEntry?.displayName && (
            <p className="text-fedRed font-bebas text-xl tracking-widest uppercase">
              Welcome, {userEntry.displayName}
            </p>
          )}
          <p className="text-slate-400 font-bebas text-lg tracking-widest uppercase">The Federation</p>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-xs uppercase font-bold tracking-widest block mb-1">Survivor Status</span>
          <span className={`font-bebas text-2xl px-3 py-1 rounded ${userEntry?.isEliminated ? 'bg-red-900/40 text-red-500 border border-red-500/50' : 'bg-green-900/40 text-green-500 border border-green-500/50'}`}>
            {userEntry?.isEliminated ? 'Eliminated' : 'Active'}
          </span>
        </div>
      </header>

      {pickMessage && (
        <div className="mb-4 mx-2 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm">
          {pickMessage}
        </div>
      )}

      {/* Progress Card */}
      <div className="glass-panel p-6 mb-8 flex justify-between items-center border-t-2 border-fedRed">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div>
            <h3 className="font-bebas text-2xl text-white">Current Pick</h3>
            <p className="text-slate-400 text-sm">{userEntry?.currentPick ?? 'No pick yet this round'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Teams Picked</div>
          <div className="text-2xl font-bebas text-fedRed">{alreadyPickedTeams.length}</div>
        </div>
      </div>

      {/* Previously picked teams */}
      {alreadyPickedTeams.length > 0 && (
        <div className="mb-6 px-2">
          <h2 className="font-bebas text-xl tracking-wide text-slate-400 mb-2 uppercase">Previously Picked (cannot reuse)</h2>
          <div className="flex flex-wrap gap-2">
            {alreadyPickedTeams.map((team: string) => (
              <span key={team} className="text-xs px-3 py-1 rounded border border-red-500/30 text-red-400 bg-red-900/20">
                {team}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-bebas text-2xl tracking-wide text-slate-300 mb-4 px-2 uppercase">Upcoming Games</h2>
        {games.length === 0 ? (
          <div className="glass-panel p-10 text-center border border-white/10">
            <div className="text-5xl mb-4">🏀</div>
            <h3 className="font-bebas text-3xl text-white tracking-widest mb-2">You're Registered!</h3>
            <p className="text-slate-400 text-sm mb-3">
              The bracket hasn't been set yet. Once the tournament field is announced and the bracket is seeded, your matchups and pick options will appear here automatically.
            </p>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Check back after Selection Sunday!</p>
          </div>
        ) : (
          games.map((game) => (
            <div key={game.id} className="glass-panel p-5 flex items-center justify-between border-l-4 border-l-fedRed transition-all active:scale-[0.98]">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{game.region} — {game.round || 'Tournament Game'}</span>
                <span className="font-bebas text-2xl text-white tracking-wide uppercase">
                  #{game.homeSeed} {game.homeTeam} vs #{game.awaySeed} {game.awayTeam}
                </span>
                {game.isComplete && game.winner && (
                  <span className="text-green-400 text-xs mt-1">✓ Final: {game.winner} won</span>
                )}
              </div>
              {!game.isComplete && (
                <button
                  onClick={() => setPickModal({ game })}
                  className="bg-slate-800 hover:bg-fedRed text-white px-6 py-2 rounded font-bebas text-xl transition-colors uppercase italic"
                >
                  Pick Team
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pick Modal */}
      {pickModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-midnight border border-white/20 rounded-2xl p-8 w-full max-w-sm sm:max-w-md text-center">
            <h3 className="font-bebas text-3xl text-white mb-2 tracking-widest">Make Your Pick</h3>
            <p className="text-slate-500 text-sm mb-6">{pickModal.game.region} — {pickModal.game.round}</p>
            <div className="flex flex-col gap-4">
              {[
                { team: pickModal.game.homeTeam, seed: pickModal.game.homeSeed },
                { team: pickModal.game.awayTeam, seed: pickModal.game.awaySeed },
              ].map(({ team, seed }) => {
                const alreadyPicked = alreadyPickedTeams.includes(team);
                return (
                  <button
                    key={team}
                    onClick={() => !alreadyPicked && !submitting && handlePickTeam(team, pickModal.game)}
                    disabled={alreadyPicked || submitting}
                    className={`w-full py-4 px-6 rounded-xl font-bebas text-2xl tracking-widest transition-all ${
                      alreadyPicked
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                        : 'bg-red-700 hover:bg-red-600 text-white border border-red-500'
                    }`}
                  >
                    #{seed} {team}
                    {alreadyPicked && <span className="block text-xs text-slate-500 font-sans normal-case">Already used</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPickModal(null)}
              className="mt-6 text-slate-500 hover:text-white text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
