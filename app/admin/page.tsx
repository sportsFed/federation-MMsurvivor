'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, eliminated: 0, teams: 0, games: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [seedStatus, setSeedStatus] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'chone1234') {
      setIsAuthorized(true);
    } else {
      alert('Incorrect Commissioner Password');
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [entriesSnap, teamsSnap, gamesSnap] = await Promise.all([
          getDocs(collection(db, 'entries')),
          getDocs(collection(db, 'teams')),
          getDocs(collection(db, 'games')),
        ]);
        const entries = entriesSnap.docs.map(d => d.data());
        setStats({
          total: entries.length,
          active: entries.filter(e => !e.isEliminated).length,
          eliminated: entries.filter(e => e.isEliminated).length,
          teams: teamsSnap.size,
          games: gamesSnap.size,
        });
      } catch {
        // stats unavailable without Firestore connection
      }
      setLoadingStats(false);
    };
    fetchStats();
  }, [isAuthorized]);

  const handleImportTeams = async () => {
    setImportStatus('Importing teams...');
    try {
      const res = await fetch('/api/admin/import-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: 'chone1234' }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus(`✅ ${data.message}`);
      } else {
        setImportStatus(`❌ Error: ${data.error}`);
      }
    } catch {
      setImportStatus('❌ Network error importing teams.');
    }
  };

  const handleSeedBracket = async () => {
    setSeedStatus('Generating bracket...');
    try {
      const res = await fetch('/api/admin/seed-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: 'chone1234' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSeedStatus(`✅ ${data.message}`);
      } else {
        setSeedStatus(`❌ Error: ${data.error}`);
      }
    } catch {
      setSeedStatus('❌ Network error seeding bracket.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="p-8 w-full max-w-sm border border-white/10 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <img src="/Fed-Logo-Full.png" alt="The Federation" style={{ width: '120px', margin: '0 auto 24px' }} />
          <h2 className="font-bebas text-3xl text-white mb-2 italic tracking-widest">Commissioner Access</h2>
          <p className="text-slate-500 text-sm mb-6">Admin Panel — March Madness Survivor 2026</p>
          <input
            type="password"
            placeholder="Enter Admin Password"
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin/entries', label: 'Manage Entries', icon: '👥', desc: 'View, eliminate, or delete entrants' },
    { href: '/admin/teams', label: 'Manage Teams', icon: '🏀', desc: 'Add individual tournament teams' },
    { href: '/admin/games', label: 'Manage Games', icon: '🎮', desc: 'Set game results & winners' },
    { href: '/admin/users', label: 'User Directory', icon: '📋', desc: 'Browse all registered users' },
  ];

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <img src="/Fed-Logo-Full.png" alt="The Federation" style={{ width: '60px' }} />
          <div>
            <h1 className="font-bebas text-5xl text-white tracking-widest italic">Commissioner Panel</h1>
            <p className="text-slate-400 text-sm">March Madness Survivor 2026 — Admin Dashboard</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'Total Entries', value: loadingStats ? '...' : stats.total, color: 'text-white' },
            { label: 'Active', value: loadingStats ? '...' : stats.active, color: 'text-green-400' },
            { label: 'Eliminated', value: loadingStats ? '...' : stats.eliminated, color: 'text-red-400' },
            { label: 'Teams Loaded', value: loadingStats ? '...' : stats.teams, color: 'text-blue-400' },
            { label: 'Games Created', value: loadingStats ? '...' : stats.games, color: 'text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-white/10 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className={`font-bebas text-4xl ${stat.color}`}>{stat.value}</div>
              <div className="text-slate-500 text-xs uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Nav Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="p-6 rounded-xl border border-white/10 hover:border-red-600/50 transition-all group"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', textDecoration: 'none' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{link.icon}</span>
                <h3 className="font-bebas text-2xl text-white group-hover:text-red-400 transition-colors">{link.label}</h3>
              </div>
              <p className="text-slate-500 text-sm">{link.desc}</p>
            </Link>
          ))}
        </div>

        {/* Selection Sunday Automation */}
        <div className="p-6 rounded-xl border border-white/10 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <h2 className="font-bebas text-2xl text-white mb-1 tracking-widest">Selection Sunday Automation</h2>
          <p className="text-slate-500 text-sm mb-6">Use these tools to populate the bracket after the 68-team field is announced.</p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <button
                onClick={handleImportTeams}
                className="w-full py-3 px-6 rounded-xl font-bebas text-xl text-white transition-all uppercase tracking-widest"
                style={{ backgroundColor: '#dc2626' }}
              >
                🏀 Import All 68 Teams
              </button>
              {importStatus && <p className="mt-2 text-sm text-slate-300">{importStatus}</p>}
              <p className="text-slate-600 text-xs mt-1">Bulk-loads all 68 teams from the built-in Selection Sunday list</p>
            </div>
            <div className="flex-1">
              <button
                onClick={handleSeedBracket}
                className="w-full py-3 px-6 rounded-xl font-bebas text-xl text-white transition-all uppercase tracking-widest border border-white/20 hover:border-white/40"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                🗓️ Generate Round of 64
              </button>
              {seedStatus && <p className="mt-2 text-sm text-slate-300">{seedStatus}</p>}
              <p className="text-slate-600 text-xs mt-1">Auto-creates all 32 first-round matchups from loaded teams</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-white transition">← Back to Home</Link>
          <Link href="/standings" className="hover:text-white transition">View Standings</Link>
          <Link href="/my-picks" className="hover:text-white transition">My Picks</Link>
        </div>
      </div>
    </div>
  );
}
