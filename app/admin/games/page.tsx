'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [winnerInputs, setWinnerInputs] = useState<Record<string, string>>({});

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
    fetchGames();
  }, []);

  const handleSetWinner = async (gameId: string) => {
    const winner = winnerInputs[gameId];
    if (!winner) {
      setActionMessage('Please select a winner first.');
      setTimeout(() => setActionMessage(''), 3000);
      return;
    }
    try {
      const res = await fetch('/api/admin/set-game-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, winner }),
      });
      if (res.ok) {
        setActionMessage(`Game updated — winner: ${winner}`);
        setWinnerInputs(prev => ({ ...prev, [gameId]: '' }));
        fetchGames();
      } else {
        setActionMessage('Error updating game.');
      }
    } catch {
      setActionMessage('Error updating game.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleReopenGame = async (gameId: string) => {
    try {
      const res = await fetch('/api/admin/reopen-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        setActionMessage('Game reopened.');
        fetchGames();
      } else {
        setActionMessage('Error reopening game.');
      }
    } catch {
      setActionMessage('Error reopening game.');
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const pendingGames = games.filter(g => !g.isComplete);
  const completedGames = games.filter(g => g.isComplete);

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
          <h1 className="font-bebas text-4xl text-white mt-2">Manage Games</h1>
          {!loading && (
            <p className="text-slate-500 text-sm mt-1">
              {pendingGames.length} pending · {completedGames.length} completed
            </p>
          )}
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
            {pendingGames.length > 0 && (
              <div className="mb-10">
                <h2 className="font-bebas text-2xl text-yellow-400 mb-4 tracking-widest">Pending Games</h2>
                <div className="space-y-3">
                  {pendingGames.map(game => (
                    <div key={game.id} className="p-4 rounded-xl border border-yellow-500/20 flex flex-col md:flex-row md:items-center gap-4" style={{ backgroundColor: 'rgba(255,255,0,0.03)' }}>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{game.region} — {game.round}</div>
                        <div className="font-bebas text-xl text-white">
                          #{game.homeSeed} {game.homeTeam} <span className="text-slate-500">vs</span> #{game.awaySeed} {game.awayTeam}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={winnerInputs[game.id] || ''}
                          onChange={(e) => setWinnerInputs(prev => ({ ...prev, [game.id]: e.target.value }))}
                          className="bg-slate-900 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
                        >
                          <option value="">Select winner…</option>
                          <option value={game.homeTeam}>#{game.homeSeed} {game.homeTeam}</option>
                          <option value={game.awayTeam}>#{game.awaySeed} {game.awayTeam}</option>
                        </select>
                        <button
                          onClick={() => handleSetWinner(game.id)}
                          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
                        >
                          Set Winner
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
