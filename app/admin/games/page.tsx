'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';

const COMMISSIONER_EMAIL = 'thesportsfederation@gmail.com';

const ROUNDS = [
  'Round of 64',
  'Round of 32',
  'Sweet Sixteen',
  'Elite Eight',
  'Final Four',
  'Championship',
];

const REGIONS = ['East', 'West', 'South', 'Midwest'];

const STATUSES = ['scheduled', 'in_progress', 'final'];

type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamSeed?: number;
  awayTeamSeed?: number;
  region: string;
  round: string;
  gameDate: string;
  gameTime: string;
  location: string;
  status: string;
  winner?: string;
};

const emptyForm = {
  homeTeam: '',
  awayTeam: '',
  homeTeamSeed: '',
  awayTeamSeed: '',
  region: 'East',
  round: 'Round of 64',
  gameDate: '',
  gameTime: '',
  location: '',
  status: 'scheduled',
};

export default function AdminGamesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.email === COMMISSIONER_EMAIL) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'games'), orderBy('gameDate', 'asc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
      setGames(data);
    } catch {
      // orderBy may fail if index not set up yet; fall back without ordering
      const snap = await getDocs(collection(db, 'games'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
      setGames(data);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setLoginError('Invalid credentials. Commissioner login only.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'games'), {
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        homeTeamSeed: form.homeTeamSeed ? (parseInt(form.homeTeamSeed) || null) : null,
        awayTeamSeed: form.awayTeamSeed ? (parseInt(form.awayTeamSeed) || null) : null,
        region: form.region,
        round: form.round,
        gameDate: form.gameDate,
        gameTime: form.gameTime,
        location: form.location,
        status: form.status,
        winner: null,
      });
      setMessage(`Game added: ${form.awayTeam} vs ${form.homeTeam}`);
      setMessageType('success');
      setForm(emptyForm);
      loadGames();
    } catch {
      setMessage('Error adding game.');
      setMessageType('error');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'games', id));
      setGames(prev => prev.filter(g => g.id !== id));
      setDeleteConfirm(null);
    } catch {
      alert('Delete failed. Please try again.');
    }
    setDeleting(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <p className="text-slate-400 font-bebas text-2xl tracking-widest">Loading...</p>
      </div>
    );
  }

  if (!user || user.email !== COMMISSIONER_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="glass-panel p-8 w-full max-w-sm border border-white/10 text-center">
          <h2 className="font-bebas text-3xl text-white mb-2 italic">Commissioner Access</h2>
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-6">Admin Portal</p>
          {loginError && (
            <div className="mb-4 bg-red-900/40 border border-red-600/50 text-red-300 p-3 rounded-lg text-sm">
              {loginError}
            </div>
          )}
          <input
            type="email"
            placeholder="Commissioner Email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-3 focus:border-red-600 outline-none text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none text-sm"
            required
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-4xl text-white italic tracking-tight">Game Schedule</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Manage Tournament Games</p>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-sm block">{user.email}</span>
            <button
              onClick={() => auth.signOut()}
              className="text-slate-500 hover:text-red-500 text-xs uppercase tracking-widest transition mt-1"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Add Game Form */}
        <div className="glass-panel p-6 mb-8">
          <h2 className="font-bebas text-2xl text-white mb-5 tracking-wide">Add New Game</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Away Team</label>
                <input
                  name="awayTeam"
                  value={form.awayTeam}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  placeholder="e.g. Duke"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Home Team</label>
                <input
                  name="homeTeam"
                  value={form.homeTeam}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  placeholder="e.g. Kentucky"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Away Team Seed</label>
                <input
                  type="number"
                  name="awayTeamSeed"
                  min={1}
                  max={16}
                  value={form.awayTeamSeed}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Home Team Seed</label>
                <input
                  type="number"
                  name="homeTeamSeed"
                  min={1}
                  max={16}
                  value={form.homeTeamSeed}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  placeholder="16"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Region</label>
                <select
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Round</label>
                <select
                  name="round"
                  value={form.round}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                >
                  {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Game Date</label>
                <input
                  type="date"
                  name="gameDate"
                  value={form.gameDate}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Game Time</label>
                <input
                  type="time"
                  name="gameTime"
                  value={form.gameTime}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Location / Venue</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                  placeholder="e.g. Madison Square Garden"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest"
            >
              {submitting ? 'Adding...' : 'Add Game'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm text-center ${messageType === 'success' ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/40 border border-red-600/50 text-red-300'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Games List */}
        <div className="glass-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="font-bebas text-2xl text-white tracking-wide">
              Scheduled Games <span className="text-slate-500 text-lg ml-2">({games.length})</span>
            </h2>
            <button
              onClick={loadGames}
              className="text-slate-500 hover:text-white text-xs uppercase tracking-widest transition"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 font-bebas text-2xl tracking-widest">Loading Games...</div>
          ) : games.length === 0 ? (
            <div className="text-center py-16 text-slate-600 italic text-sm">No games scheduled yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {games.map(game => (
                <div key={game.id} className="px-6 py-4 hover:bg-slate-800/20 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-red-400 font-bold">{game.round}</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500">{game.region}</span>
                      </div>
                      <p className="text-white font-bebas text-xl tracking-wide">
                        {game.awayTeam}{game.awayTeamSeed ? ` (${game.awayTeamSeed})` : ''} vs {game.homeTeam}{game.homeTeamSeed ? ` (${game.homeTeamSeed})` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {game.gameDate && <span>📅 {game.gameDate}</span>}
                        {game.gameTime && <span>🕐 {game.gameTime}</span>}
                        {game.location && <span>📍 {game.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                        game.status === 'final' ? 'bg-slate-700 text-slate-400' :
                        game.status === 'in_progress' ? 'bg-green-900/40 text-green-400' :
                        'bg-blue-900/40 text-blue-400'
                      }`}>
                        {game.status}
                      </span>
                      {deleteConfirm === game.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(game.id)}
                            disabled={deleting === game.id}
                            className="bg-red-700 hover:bg-red-800 text-white text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {deleting === game.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(game.id)}
                          className="bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition border border-red-700/30"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
