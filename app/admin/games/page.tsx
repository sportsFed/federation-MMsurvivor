'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs } from 'firebase/firestore';

function formatEasternDateLabel(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getAdminDateKey(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [winnerInputs, setWinnerInputs] = useState<Record<string, string>>({});
  const [editTimeInputs, setEditTimeInputs] = useState<Record<string, string>>({});
  const [editingTime, setEditingTime] = useState<string | null>(null);

  function isoToDatetimeLocal(iso: string): string {
    return iso.slice(0, 16);
  }

  const fetchGames = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'games'));
      const allGames: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort chronologically: games with gameTime first (ascending), then games without
      allGames.sort((a, b) => {
        const aTime = a.gameTime ? new Date(a.gameTime).getTime() : Infinity;
        const bTime = b.gameTime ? new Date(b.gameTime).getTime() : Infinity;
        return aTime - bTime;
      });
      setGames(allGames);
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

  // Group games by calendar date for dividers
  function groupByDate(gameList: any[]): Array<{ dateKey: string; label: string; games: any[] }> {
    const groups: Record<string, { label: string; games: any[] }> = {};
    const order: string[] = [];
    for (const g of gameList) {
      const key = g.gameTime ? getAdminDateKey(g.gameTime) : 'No Date';
      const label = g.gameTime ? formatEasternDateLabel(g.gameTime) : 'No Date Set';
      if (!groups[key]) {
        groups[key] = { label, games: [] };
        order.push(key);
      }
      groups[key].games.push(g);
    }
    return order.map(k => ({ dateKey: k, ...groups[k] }));
  }

  const pendingByDate = groupByDate(pendingGames);
  const completedByDate = groupByDate(completedGames);

  function renderGameCard(game: any, isPending: boolean) {
    return (
      <div
        key={game.id}
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-4 ${
          isPending
            ? 'border-yellow-500/20'
            : 'border-green-500/20'
        }`}
        style={{ backgroundColor: isPending ? 'rgba(255,255,0,0.03)' : 'rgba(0,255,0,0.03)' }}
      >
        <div className="flex-1">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{game.region} — {game.round}</div>
          <div className="font-bebas text-xl text-white">
            #{game.homeSeed} {game.homeTeam} <span className="text-slate-500">vs</span> #{game.awaySeed} {game.awayTeam}
          </div>
          {isPending ? (
            editingTime === game.id ? (
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="datetime-local"
                  value={editTimeInputs[game.id] ?? isoToDatetimeLocal(game.gameTime ?? '')}
                  onChange={(e) => setEditTimeInputs(prev => ({ ...prev, [game.id]: e.target.value }))}
                  className="bg-slate-900 border border-slate-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-red-600"
                />
                <button
                  onClick={async () => {
                    const newTime = editTimeInputs[game.id];
                    if (!newTime) return;
                    await fetch('/api/admin/update-game-time', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ gameId: game.id, gameTime: new Date(newTime).toISOString() }),
                    });
                    setEditingTime(null);
                    fetchGames();
                  }}
                  className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition"
                >Save</button>
                <button onClick={() => setEditingTime(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingTime(game.id)}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1 underline"
              >
                {game.gameTime
                  ? `⏱ ${new Date(game.gameTime).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET`
                  : 'Set time'}
              </button>
            )
          ) : (
            <div className="text-green-400 text-sm mt-1">✓ Winner: <strong>{game.winner}</strong></div>
          )}
        </div>
        {isPending ? (
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
        ) : (
          <button
            onClick={() => handleReopenGame(game.id)}
            className="px-4 py-2 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 text-sm transition-all"
          >
            Reopen Game
          </button>
        )}
      </div>
    );
  }

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
                {pendingByDate.map(({ dateKey, label, games: dayGames }) => (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-yellow-500/20" />
                      <span className="text-xs text-yellow-500/70 uppercase tracking-widest font-sans font-semibold">{label}</span>
                      <div className="flex-1 h-px bg-yellow-500/20" />
                    </div>
                    <div className="space-y-3">
                      {dayGames.map(game => renderGameCard(game, true))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completedGames.length > 0 && (
              <div>
                <h2 className="font-bebas text-2xl text-green-400 mb-4 tracking-widest">Completed Games</h2>
                {completedByDate.map(({ dateKey, label, games: dayGames }) => (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-px bg-green-500/20" />
                      <span className="text-xs text-green-500/70 uppercase tracking-widest font-sans font-semibold">{label}</span>
                      <div className="flex-1 h-px bg-green-500/20" />
                    </div>
                    <div className="space-y-3">
                      {dayGames.map(game => renderGameCard(game, false))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
