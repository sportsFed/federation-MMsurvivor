'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPass = `${passcode}fed26`;
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, fullPass);
        await setDoc(doc(db, 'entries', res.user.uid), {
          displayName: `${firstName} ${lastName}`,
          email,
          isAdmin: email === 'thesportsfederation@gmail.com',
          isEliminated: false,
          totalPoints: 0
        });
      } else {
        await signInWithEmailAndPassword(auth, email, fullPass);
      }
      router.push('/my-picks');
    } catch (err) {
      alert("Error: Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 font-sans">
      <div className="glass-panel max-w-md w-full p-8 shadow-2xl border border-white/10 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/Fed-Logo.png" alt="Logo" className="w-16 h-16 mb-4" />
          <h1 className="font-bebas text-4xl tracking-tight uppercase italic text-white">MM Survivor 25-26</h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">The Federation</p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-8">
          <button 
            type="button"
            className={`flex-1 pb-3 font-bebas text-xl transition-all ${isRegistering ? 'text-fedRed border-b-2 border-fedRed' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsRegistering(true)}
          >New Entry</button>
          <button 
            type="button"
            className={`flex-1 pb-3 font-bebas text-xl transition-all ${!isRegistering ? 'text-fedRed border-b-2 border-fedRed' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsRegistering(false)}
          >Returning User</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" onChange={e => setFirstName(e.target.value)} className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg focus:outline-none focus:border-fedRed text-white text-sm" required />
              <input type="text" placeholder="Last Name" onChange={e => setLastName(e.target.value)} className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg focus:outline-none focus:border-fedRed text-white text-sm" required />
            </div>
          )}
          <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 p-3 rounded-lg focus:outline-none focus:border-fedRed text-white text-sm" required />
          <div className="relative">
            <input type="password" placeholder="Create 4-Digit PIN" maxLength={4} onChange={e => setPasscode(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 p-4 rounded-lg text-center tracking-[1em] font-mono text-xl focus:border-fedRed focus:outline-none" required />
          </div>
          
          <button type="submit" className="w-full bg-fedRed hover:bg-red-700 text-white font-bebas text-2xl py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider">
            {isRegistering ? 'Create Entry' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button className="text-[10px] uppercase font-bold text-slate-600 hover:text-fedRed tracking-widest transition">Commissioner Login</button>
        </div>
      </div>
    </div>
  );
}
