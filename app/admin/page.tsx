'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs } from 'firebase/firestore';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const [stats, setStats] = useState({ total: 0, active: 0, eliminated: 0, teams: 0, games: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [importStatus, setImportStatus] = useState('');
  const [seedStatus, setSeedStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  useEffect(() => {
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
  }, []);

  const handleImportTeams = async () => {
    setImportStatus('Importing teams...');
    try {
      const res = await fetch('/api/admin/import-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
        body: JSON.stringify({}),
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

  const handleExportTeams = async () => {
  setExportStatus('Exporting teams...');
  try {
    const snap = await getDocs(collection(db, 'teams'));
    const teams = snap.docs.map((d) => d.data());

    // Sort for readability/continuity
    const regionOrder: Record<string, number> = { East: 1, West: 2, South: 3, Midwest: 4 };

    teams.sort((a: any, b: any) => {
      const ra = regionOrder[a.region] ?? 99;
      const rb = regionOrder[b.region] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.seed ?? 99) - (b.seed ?? 99);
    });

    // Export ONLY the canonical fields your app expects
    const payload = {
      teams: teams.map((t: any) => ({
        name: t.name ?? '',
        seed: t.seed ?? null,
        regionalSeed: t.regionalSeed ?? t.seed ?? null,
        region: t.region ?? '',
        nationalSeed: t.nationalSeed ?? null,
        isEliminated: Boolean(t.isEliminated),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams-export-2026.json';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setExportStatus(`✅ Exported ${payload.teams.length} teams.`);
  } catch {
    setExportStatus('❌ Error exporting teams.');
  }
};

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus('');
    if (newPassword !== confirmPassword) {
      setPasswordStatus('❌ New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus('❌ New password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus('✅ Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus(`❌ ${data.error || 'Error updating password.'}`);
      }
    } catch {
      setPasswordStatus('❌ Network error updating password.');
    }
  };

  const navLinks = [
    { href: '/admin/entries', label: 'Manage Entries', icon: '👥', desc: 'View, eliminate, or delete entrants' },
    { href: '/admin/teams', label: 'Manage Teams', icon: '🏀', desc: 'Add individual tournament teams' },
    { href: '/admin/games', label: 'Manage Games', icon: '🎮', desc: 'Set game results & winners' },
    { href: '/admin/users', label: 'User Directory', icon: '📋', desc: 'Browse all registered users' },
    { href: '/admin/activity', label: 'Activity Log', icon: '📝', desc: 'Full audit trail of all pick submissions and changes' },
  ];

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <img src="/Fed-Logo-Full.png" alt="The Federation" style={{ width: '60px' }} />
            <div>
              <h1 className="font-bebas text-5xl text-white tracking-widest italic">Commissioner Panel</h1>
              <p className="text-slate-400 text-sm">March Madness Survivor 2026 — Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition"
          >
            Log Out
          </button>
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
                📥 Import All 68 Teams
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

        <div className="flex-1">
  <button
    onClick={handleExportTeams}
    className="w-full py-3 px-6 rounded-xl font-bebas text-xl text-white transition-all uppercase tracking-widest border border-white/20 hover:border-white/40"
    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
  >
    ⬇️ Export Teams JSON
  </button>
  {exportStatus && <p className="mt-2 text-sm text-slate-300">{exportStatus}</p>}
  <p className="text-slate-600 text-xs mt-1">Downloads a JSON snapshot of the current teams collection</p>
</div>

        {/* Change Password */}
        <div className="p-6 rounded-xl border border-white/10 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <h2 className="font-bebas text-2xl text-white mb-1 tracking-widest">Change Commissioner Password</h2>
          <p className="text-slate-500 text-sm mb-6">Update the commissioner password. The new password is stored securely and takes effect immediately.</p>
          <form onSubmit={handleChangePassword} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                placeholder="Current password"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                placeholder="New password (min 8 chars)"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white focus:border-red-600 outline-none text-sm"
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-bebas text-lg text-white uppercase tracking-widest transition-all"
              style={{ backgroundColor: '#dc2626' }}
            >
              Update
            </button>
          </form>
          {passwordStatus && (
            <p className="mt-3 text-sm text-slate-300">{passwordStatus}</p>
          )}
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
