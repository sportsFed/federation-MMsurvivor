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

// Inside your return() form:
<div>
  <label className="block text-sm font-medium">Tournament Region</label>
  <select 
    value={region} 
    onChange={(e) => setRegion(e.target.value)}
    className="w-full border p-2 rounded"
  >
    <option value="East">East</option>
    <option value="West">West</option>
    <option value="South">South</option>
    <option value="Midwest">Midwest</option>
  </select>
</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        regionalSeed: parseInt(regSeed),
        nationalSeed: parseInt(natSeed),
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
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Tournament Teams</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-6 rounded border">
        <div>
          <label className="block text-sm font-medium">Team Name</label>
          <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full border p-2 rounded" required />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium">Regional Seed (1-16)</label>
            <input type="number" value={regSeed} onChange={(e) => setRegSeed(e.target.value)} className="w-full border p-2 rounded" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium">National Seed (1-68)</label>
            <input type="number" value={natSeed} onChange={(e) => setNatSeed(e.target.value)} className="w-full border p-2 rounded" required />
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Team</button>
      </form>
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
}

