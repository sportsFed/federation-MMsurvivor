'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/clientApp';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import Link from 'next/link';

const COMMISSIONER_EMAIL = 'thesportsfederation@gmail.com';

const ADMIN_LINKS = [
  {
    href: '/admin/bulk-teams',
    label: 'Bulk Team Import',
    description: 'Paste & import all 68 teams at once — ideal for Selection Sunday',
    icon: '⚡',
    accent: 'border-red-600/50 hover:border-red-500',
  },
  {
    href: '/admin/teams',
    label: 'Single Team Entry',
    description: 'Add one team at a time with name, seeds, and region',
    icon: '🏀',
    accent: 'border-slate-700/50 hover:border-slate-500',
  },
  {
    href: '/admin/games',
    label: 'Game Schedule',
    description: 'Create and manage the tournament game schedule with dates and times',
    icon: '📅',
    accent: 'border-slate-700/50 hover:border-slate-500',
  },
  {
    href: '/admin/entries',
    label: 'Entrant Management',
    description: 'View, search, and manage all pool entries and survivor picks',
    icon: '👥',
    accent: 'border-slate-700/50 hover:border-slate-500',
  },
];

export default function AdminHubPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-bebas text-5xl text-white italic tracking-tight">Admin Hub</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Commissioner Dashboard</p>
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

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`glass-panel p-6 border ${link.accent} transition-all duration-200 group block`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{link.icon}</span>
                <div>
                  <h2 className="font-bebas text-2xl text-white tracking-wide group-hover:text-red-400 transition-colors">
                    {link.label}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
