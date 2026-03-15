'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, addDoc } from 'firebase/firestore';

export default function AdminTeams() {
  const [teamName, setTeamName] = useState('');
  const [regSeed, setRegSeed] = useState('');
  const [natSeed, setNatSeed] = useState('');
  const [message, setMessage] = useState('');
  const [region, setRegion] = useState('East');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        regionalSeed: parseInt(regSeed),
        nationalSeed: parseInt(natSeed),
        region: region,
        isEliminated: false,
      });
      setTeamName('');
      setRegSeed('');
      setNatSeed('');
      setMessage(`Added ${teamName} successfully!`);
    } catch (err) {
      setMessage('Error adding team.');
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto" style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }}>
      <div className="mb-6 flex gap-4">
        <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
      </div>
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-bebas)', color: 'white' }}>Add Tournament Teams</h1>
      <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Team Name</label>
          <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tournament Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white"
          >
            <option value="East">East</option>
            <option value="West">West</option>
            <option value="South">South</option>
            <option value="Midwest">Midwest</option>
          </select>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-1">Regional Seed (1-16)</label>
            <input type="number" value={regSeed} onChange={(e) => setRegSeed(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-1">National Seed (1-68)</label>
            <input type="number" value={natSeed} onChange={(e) => setNatSeed(e.target.value)} className="w-full border border-slate-700 p-2 rounded bg-slate-900 text-white" required />
          </div>
        </div>
        <button type="submit" className="w-full text-white p-2 rounded font-bold" style={{ backgroundColor: '#dc2626' }}>Add Team</button>
      </form>
      {message && <p className="mt-4 text-green-400">{message}</p>}
    </div>
  );
}

