'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

interface Team {
  id: string;
  name: string;
  region: string;
  regionalSeed: number;
  nationalSeed: number;
  isEliminated: boolean;
}

export default function AdminTeams() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Team listing
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [renameStatus, setRenameStatus] = useState('');

  // Add team form
  const [teamName, setTeamName] = useState('');
  const [regSeed, setRegSeed] = useState('');
  const [natSeed, setNatSeed] = useState('');
  const [region, setRegion] = useState('East');
  const [addMessage, setAddMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        setIsAuthorized(true);
      } else {
        alert('Incorrect Commissioner Password');
      }
    } catch {
      alert('Network error verifying password.');
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'teams'), orderBy('nationalSeed', 'asc'));
      const snap = await getDocs(q);
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    } catch {
      setTeams([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) fetchTeams();
  }, [isAuthorized]);

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditName(team.name);
    setRenameStatus('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleRename = async (teamId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch('/api/admin/rename-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, newName: editName.trim(), adminPassword: passwordInput }),
      });
      if (res.ok) {
        setRenameStatus('✅ Team renamed successfully.');
        setEditingId(null);
        fetchTeams();
      } else {
        const data = await res.json();
        setRenameStatus(`❌ ${data.error || 'Error renaming team.'}`);
      }
    } catch {
      setRenameStatus('❌ Network error renaming team.');
    }
    setTimeout(() => setRenameStatus(''), 4000);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        regionalSeed: parseInt(regSeed),
        nationalSeed: parseInt(natSeed),
        region,
        isEliminated: false,
      });
      setTeamName('');
      setRegSeed('');
      setNatSeed('');
      setAddMessage(`✅ Added ${teamName} successfully!`);
      fetchTeams();
    } catch {
      setAddMessage('❌ Error adding team.');
    }
    setTimeout(() => setAddMessage(''), 4000);
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

  const regions = ['East', 'West', 'South', 'Midwest'];

  return (
    <div className="p-8" style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
            <h1 className="font-bebas text-4xl text-white mt-2">Manage Teams</h1>
            {!loading && (
              <p className="text-slate-500 text-sm mt-1">{teams.length} teams loaded</p>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-4 py-2 rounded-lg border border-red-600/50 text-red-400 hover:bg-red-900/20 text-sm font-semibold transition"
          >
            {showAddForm ? 'Hide Add Form' : '+ Add Team'}
          </button>
        </div>

        {renameStatus && (
          <div className="mb-4 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm">
            {renameStatus}
          </div>
        )}

        {/* Add Team Form */}
        {showAddForm && (
          <div className="mb-8 p-6 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <h2 className="font-bebas text-2xl text-white mb-4 tracking-widest">Add New Team</h2>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Team Name</label>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tournament Region</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white">
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Regional Seed (1–16)</label>
                  <input type="number" value={regSeed} onChange={(e) => setRegSeed(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">National Seed (1–68)</label>
                  <input type="number" value={natSeed} onChange={(e) => setNatSeed(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
                </div>
              </div>
              <button type="submit" className="w-full text-white p-2 rounded font-bold" style={{ backgroundColor: '#dc2626' }}>Add Team</button>
            </form>
            {addMessage && <p className="mt-3 text-sm text-slate-300">{addMessage}</p>}
          </div>
        )}

        {/* Teams Table */}
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-xl text-slate-500">
            No teams found. Import teams from the Admin Dashboard first.
          </div>
        ) : (
          <>
            {regions.map(rgn => {
              const regionTeams = teams.filter(t => t.region === rgn).sort((a, b) => a.regionalSeed - b.regionalSeed);
              if (regionTeams.length === 0) return null;
              return (
                <div key={rgn} className="mb-8">
                  <h2 className="font-bebas text-2xl text-red-400 mb-3 tracking-widest">{rgn} Region</h2>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} className="border-b border-white/10">
                          <th className="p-3 text-slate-400 text-xs uppercase tracking-widest w-12">Seed</th>
                          <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Team Name</th>
                          <th className="p-3 text-slate-400 text-xs uppercase tracking-widest w-24 text-center">Nat. Seed</th>
                          <th className="p-3 text-slate-400 text-xs uppercase tracking-widest w-24 text-center">Status</th>
                          <th className="p-3 text-slate-400 text-xs uppercase tracking-widest w-24">Edit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionTeams.map(team => (
                          <tr key={team.id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="p-3 text-center font-mono text-slate-400 text-sm">#{team.regionalSeed}</td>
                            <td className="p-3">
                              {editingId === team.id ? (
                                <input
                                  autoFocus
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(team.id); if (e.key === 'Escape') cancelEdit(); }}
                                  className="bg-slate-900 border border-red-600/50 text-white px-2 py-1 rounded text-sm w-full max-w-xs focus:outline-none focus:border-red-500"
                                />
                              ) : (
                                <span className="font-semibold text-white">{team.name}</span>
                              )}
                            </td>
                            <td className="p-3 text-center text-slate-500 text-sm">{team.nationalSeed}</td>
                            <td className="p-3 text-center">
                              {team.isEliminated ? (
                                <span className="text-red-400 bg-red-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Out</span>
                              ) : (
                                <span className="text-green-400 bg-green-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase">In</span>
                              )}
                            </td>
                            <td className="p-3">
                              {editingId === team.id ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleRename(team.id)}
                                    className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white transition"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(team)}
                                  className="text-xs px-3 py-1 rounded border border-slate-600 text-slate-400 hover:border-red-600/50 hover:text-red-400 transition"
                                >
                                  Rename
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

