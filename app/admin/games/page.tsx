'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function AdminGamesPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [winnerInputs, setWinnerInputs] = useState<Record<string, string>>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'chone1234') {
      setIsAuthorized(true);
    } else {
      alert('Incorrect Commissioner Password');
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'games'), orderBy('region', 'asc'));
      const snap = await getDocs(q);
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      setGames([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) fetchGames();
  }, [isAuthorized]);

  const handleSetWinner = async (gameId: string) => {
    const winner = winnerInputs[gameId];
    if (!winner) {
      setActionMessage('Please select a winner first.');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    try {
      await updateDoc(doc(db, 'games', gameId), {
        winner,
        isComplete: true,
      });
      setActionMessage(`Game updated — winner: ${winner}`);
      setWinnerInputs(prev => ({ ...prev, [gameId]: '' }));
      fetchGames();
    } catch {
      setActionMessage('Error updating game.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleReopenGame = async (gameId: string) => {
    try {
      await updateDoc(doc(db, 'games', gameId), {
        winner: null,
        isComplete: false,
      });
      setActionMessage('Game reopened.');
      fetchGames();
    } catch {
      setActionMessage('Error reopening game.');
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="p-8 w-full max-w-sm border border-white/10 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <h2 className="font-bebas text-3xl text-white mb-6 italic">Commissioner Access</h2>
          <input
            type="password"
            placeholder="Enter Admin Password"
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  const completedGames = games.filter(g => g.isComplete);
  const pendingGames = games.filter(g => !g.isComplete);

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
          <h1 className="font-bebas text-4xl text-white mt-2">Manage Games</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pendingGames.length} pending &middot; {completedGames.length} completed
          </p>
        </div>

        {actionMessage && (
          <div className="mb-4 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-xl text-slate-500">
            No games found. Generate the bracket from the Admin Dashboard first.
          </div>
        ) : (
          <>
            {/* Pending Games */}
            {pendingGames.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bebas text-2xl text-yellow-400 mb-4 tracking-widest">Pending Games</h2>
                <div className="space-y-3">
                  {pendingGames.map(game => (
                    <div key={game.id} className="p-4 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{game.region} — {game.round}</div>
                        <div className="font-bebas text-xl text-white">
                          #{game.homeSeed} {game.homeTeam} <span className="text-slate-500">vs</span> #{game.awaySeed} {game.awayTeam}
                        </div>
                        {game.gameDate && <div className="text-slate-500 text-xs mt-1">{game.gameDate}</div>}
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={winnerInputs[game.id] || ''}
                          onChange={(e) => setWinnerInputs(prev => ({ ...prev, [game.id]: e.target.value }))}
                          className="bg-slate-900 border border-slate-700 text-white text-sm p-2 rounded"
                        >
                          <option value="">Select Winner</option>
                          <option value={game.homeTeam}>{game.homeTeam}</option>
                          <option value={game.awayTeam}>{game.awayTeam}</option>
                        </select>
                        <button
                          onClick={() => handleSetWinner(game.id)}
                          className="px-4 py-2 rounded text-white text-sm font-bold transition-all"
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Set Winner
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Games */}
            {completedGames.length > 0 && (
              <div>
                <h2 className="font-bebas text-2xl text-green-400 mb-4 tracking-widest">Completed Games</h2>
                <div className="space-y-3">
                  {completedGames.map(game => (
                    <div key={game.id} className="p-4 rounded-xl border border-green-500/20 flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: 'rgba(0,255,0,0.03)' }}>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{game.region} — {game.round}</div>
                        <div className="font-bebas text-xl text-white">
                          #{game.homeSeed} {game.homeTeam} <span className="text-slate-500">vs</span> #{game.awaySeed} {game.awayTeam}
                        </div>
                        <div className="text-green-400 text-sm mt-1">✓ Winner: <strong>{game.winner}</strong></div>
                      </div>
                      <button
                        onClick={() => handleReopenGame(game.id)}
                        className="px-4 py-2 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 text-sm transition-all"
                      >
                        Reopen Game
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
