'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import {
  collection,
  getDocs,
  writeBatch,
  deleteDoc,
  doc,
  query,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';

const COMMISSIONER_EMAIL = 'thesportsfederation@gmail.com';

const REGIONS = ['East', 'West', 'South', 'Midwest'];

type ParsedTeam = {
  name: string;
  regionalSeed: number;
  nationalSeed: number;
  region: string;
  error?: string;
};

function parseLine(line: string, index: number): ParsedTeam | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts.length < 4) {
    return { name: trimmed, regionalSeed: 0, nationalSeed: 0, region: '', error: `Line ${index + 1}: Expected format "TeamName, RegionalSeed, NationalSeed, Region"` };
  }
  const [name, regStr, natStr, region] = parts;
  const regionalSeed = parseInt(regStr);
  const nationalSeed = parseInt(natStr);
  if (!name) return { name: '', regionalSeed: 0, nationalSeed: 0, region: '', error: `Line ${index + 1}: Team name is required` };
  if (isNaN(regionalSeed) || regionalSeed < 1 || regionalSeed > 16) return { name, regionalSeed: 0, nationalSeed: 0, region, error: `Line ${index + 1}: Regional seed must be 1–16` };
  if (isNaN(nationalSeed) || nationalSeed < 1 || nationalSeed > 68) return { name, regionalSeed, nationalSeed: 0, region, error: `Line ${index + 1}: National seed must be 1–68` };
  if (!REGIONS.includes(region)) return { name, regionalSeed, nationalSeed, region, error: `Line ${index + 1}: Region must be East, West, South, or Midwest` };
  return { name, regionalSeed, nationalSeed, region };
}

export default function BulkTeamsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedTeam[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
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

  const handlePreview = () => {
    const lines = rawText.split('\n');
    const parsed = lines
      .map((line, i) => parseLine(line, i))
      .filter((t): t is ParsedTeam => t !== null);
    setPreview(parsed);
    setIsPreviewing(true);
    setMessage('');
  };

  const handleImport = async () => {
    const validTeams = preview.filter(t => !t.error);
    const skippedCount = preview.filter(t => !!t.error).length;
    if (validTeams.length === 0) {
      setMessage('No valid teams to import.');
      setMessageType('error');
      return;
    }
    setImporting(true);
    setImportProgress('');
    try {
      // Firestore writeBatch supports up to 500 ops; chunk if needed
      const CHUNK = 400;
      let count = 0;
      for (let i = 0; i < validTeams.length; i += CHUNK) {
        const chunk = validTeams.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        chunk.forEach(team => {
          const ref = doc(collection(db, 'teams'));
          batch.set(ref, {
            name: team.name,
            regionalSeed: team.regionalSeed,
            nationalSeed: team.nationalSeed,
            region: team.region,
          });
        });
        await batch.commit();
        count += chunk.length;
        setImportProgress(`Imported ${count} / ${validTeams.length} teams...`);
      }
      setMessage(`Successfully imported ${validTeams.length} team${validTeams.length !== 1 ? 's' : ''}!${skippedCount > 0 ? ` (${skippedCount} line${skippedCount !== 1 ? 's' : ''} skipped due to errors)` : ''}`);
      setMessageType('success');
      setRawText('');
      setPreview([]);
      setIsPreviewing(false);
      setImportProgress('');
    } catch {
      setMessage('Import failed. Please try again.');
      setMessageType('error');
    }
    setImporting(false);
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const snap = await getDocs(query(collection(db, 'teams')));
      const CHUNK = 400;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += CHUNK) {
        const batch = writeBatch(db);
        docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      setMessage(`Cleared ${docs.length} teams from the database.`);
      setMessageType('success');
      setClearConfirm(false);
    } catch {
      setMessage('Clear failed. Please try again.');
      setMessageType('error');
    }
    setClearing(false);
  };

  const validCount = preview.filter(t => !t.error).length;
  const errorCount = preview.filter(t => !!t.error).length;

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-4xl text-white italic tracking-tight">Bulk Team Import</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Selection Sunday Fast Entry</p>
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

        {/* Instructions */}
        <div className="glass-panel p-5 mb-6 border border-slate-700/50">
          <h2 className="font-bebas text-xl text-white mb-2 tracking-wide">Format Instructions</h2>
          <p className="text-slate-400 text-sm mb-3">One team per line. Format: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-300 text-xs">TeamName, RegionalSeed, NationalSeed, Region</code></p>
          <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-400 space-y-0.5">
            <p>Duke, 1, 1, East</p>
            <p>Kentucky, 2, 5, East</p>
            <p>Kansas, 1, 2, West</p>
            <p>UConn, 1, 3, South</p>
          </div>
          <p className="text-slate-600 text-xs mt-2">Region must be: East, West, South, or Midwest. Regional seed: 1–16. National seed: 1–68.</p>
        </div>

        {/* Paste Area */}
        {!isPreviewing && (
          <div className="glass-panel p-6 mb-6">
            <label className="block text-xs uppercase tracking-widest text-slate-400 mb-3">Paste Teams Here</label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 p-4 rounded-lg text-white focus:border-red-600 outline-none text-sm font-mono resize-y"
              placeholder="Duke, 1, 1, East&#10;Kentucky, 2, 5, East&#10;Kansas, 1, 2, West&#10;..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handlePreview}
                disabled={!rawText.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest"
              >
                Preview Import
              </button>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {isPreviewing && (
          <div className="glass-panel overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="font-bebas text-2xl text-white tracking-wide">Preview</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-green-400">{validCount} valid</span>
                  {errorCount > 0 && <span className="text-red-400 ml-2">{errorCount} errors</span>}
                </p>
              </div>
              <button
                onClick={() => { setIsPreviewing(false); setMessage(''); }}
                className="text-slate-500 hover:text-white text-xs uppercase tracking-widest transition"
              >
                ← Edit
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">#</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">Team Name</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">Region</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">Reg. Seed</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">Nat. Seed</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {preview.map((team, i) => (
                    <tr key={i} className={team.error ? 'bg-red-900/10' : 'hover:bg-slate-800/20'}>
                      <td className="px-6 py-3 text-slate-500 text-xs">{i + 1}</td>
                      <td className="px-6 py-3 text-white font-bebas text-lg tracking-wide">{team.name || '—'}</td>
                      <td className="px-6 py-3 text-slate-300 text-xs">{team.region || '—'}</td>
                      <td className="px-6 py-3 text-slate-300 text-xs">{team.regionalSeed || '—'}</td>
                      <td className="px-6 py-3 text-slate-300 text-xs">{team.nationalSeed || '—'}</td>
                      <td className="px-6 py-3">
                        {team.error ? (
                          <span className="text-red-400 text-xs">{team.error}</span>
                        ) : (
                          <span className="text-green-400 text-xs">✓ Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest"
              >
                {importing ? (importProgress || 'Importing...') : `Import ${validCount} Teams`}
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm text-center ${messageType === 'success' ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/40 border border-red-600/50 text-red-300'}`}>
            {message}
          </div>
        )}

        {/* Clear All Teams */}
        <div className="glass-panel p-6 border border-red-900/30">
          <h2 className="font-bebas text-xl text-red-400 mb-2 tracking-wide">Danger Zone</h2>
          <p className="text-slate-500 text-sm mb-4">Clear all teams from the database before a fresh import. This cannot be undone.</p>
          {clearConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bebas text-lg px-6 py-2.5 rounded-xl transition-all uppercase"
              >
                {clearing ? 'Clearing...' : 'Yes, Clear All Teams'}
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bebas text-lg px-6 py-2.5 rounded-xl transition-all uppercase"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setClearConfirm(true)}
              className="bg-red-900/40 hover:bg-red-700 text-red-400 hover:text-white font-bebas text-lg px-6 py-2.5 rounded-xl transition-all uppercase border border-red-700/30"
            >
              Clear All Teams
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
