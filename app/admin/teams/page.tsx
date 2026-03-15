'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';

const COMMISSIONER_EMAIL = 'thesportsfederation@gmail.com';

export default function AdminTeams() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [teamName, setTeamName] = useState('');
  const [regSeed, setRegSeed] = useState('');
  const [natSeed, setNatSeed] = useState('');
  const [region, setRegion] = useState('East');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setLoginError('Invalid credentials. Commissioner login only.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        regionalSeed: parseInt(regSeed),
        nationalSeed: parseInt(natSeed),
        region,
      });
      setTeamName('');
      setRegSeed('');
      setNatSeed('');
      setMessage(`Added ${teamName} successfully!`);
      setMessageType('success');
    } catch {
      setMessage('Error adding team.');
      setMessageType('error');
    }
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
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-4xl text-white italic tracking-tight">Add Tournament Team</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Single Team Entry</p>
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

        <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
              placeholder="e.g. Duke"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Tournament Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
            >
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="South">South</option>
              <option value="Midwest">Midwest</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">Regional Seed (1–16)</label>
              <input
                type="number"
                min={1}
                max={16}
                value={regSeed}
                onChange={(e) => setRegSeed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                placeholder="1"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">National Seed (1–68)</label>
              <input
                type="number"
                min={1}
                max={68}
                value={natSeed}
                onChange={(e) => setNatSeed(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                placeholder="1"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest"
          >
            Add Team
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm text-center ${messageType === 'success' ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/40 border border-red-600/50 text-red-300'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

