'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fullPass = `${passcode}fed26`;
    try {
      const res = await createUserWithEmailAndPassword(auth, email, fullPass);
      const uid = res.user.uid;

      const apiRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pin: passcode,
          displayName: `${firstName} ${lastName}`,
          uid
        })
      });

      if (!apiRes.ok) {
        let errorMessage = 'Failed to save registration data';
        try {
          const errData = await apiRes.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // Response was not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      router.push('/my-picks');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please check your information and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120] px-4">
      <div className="glass-panel max-w-md w-full p-8 shadow-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src="/Fed-Logo.png" alt="The Federation" className="w-16 h-16 mb-4 object-contain" />
          <h1 className="font-bebas text-4xl tracking-tight uppercase italic text-white text-center">
            New Entry
          </h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">The Federation</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-600/50 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="First Name" onChange={e => setFirstName(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
            <input type="text" placeholder="Last Name" onChange={e => setLastName(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
          </div>
          <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
          <input type="password" placeholder="4-Digit PIN" maxLength={4} onChange={e => setPasscode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-lg text-center tracking-[1em] font-mono text-xl text-white focus:border-red-600 outline-none" required />
          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bebas text-2xl py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider">
            {loading ? 'Creating Entry...' : 'Create My Entry'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Already registered?{' '}
            <Link href="/login" className="text-red-500 hover:text-red-400 transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}