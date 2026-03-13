'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  // Toggle between 'login' and 'register'
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPass = `${passcode}fed26`;
    try {
      if (view === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email, fullPass);
        await setDoc(doc(db, 'entries', res.user.uid), {
          displayName: `${firstName} ${lastName}`,
          email,
          pin: passcode, // Add this line so the commissioner can see the PIN in the admin table
          isAdmin: email === 'thesportsfederation@gmail.com',
          isEliminated: false,
          totalPoints: 0
        });
      } else {
        await signInWithEmailAndPassword(auth, email, fullPass);
      }
      router.push('/my-picks');
    } catch (err) {
      alert("Error: Please check your email and 4-digit PIN.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120] px-4">
      {/* Glass Panel - Standardized to Midnight Navy */}
      <div className="glass-panel max-w-md w-full p-8 shadow-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-2xl">
        
        {/* Fixed Logo Path - Ensure file is in /public/Fed-Logo.png */}
        <div className="flex flex-col items-center mb-8">
          <img src="/Fed-Logo.png" alt="The Federation" className="w-16 h-16 mb-4 object-contain" />
          <h1 className="font-bebas text-4xl tracking-tight uppercase italic text-white text-center">
            {view === 'login' ? 'Returning User' : 'New Entry'}
          </h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">The Federation</p>
        </div>

        {/* View Switcher / Proper Links */}
        <div className="flex border-b border-slate-800 mb-8">
          <button 
            type="button"
            className={`flex-1 pb-3 font-bebas text-xl transition-all ${view === 'register' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setView('register')}
          >Register</button>
          <button 
            type="button"
            className={`flex-1 pb-3 font-bebas text-xl transition-all ${view === 'login' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setView('login')}
          >Sign In</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {view === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" onChange={e => setFirstName(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
              <input type="text" placeholder="Last Name" onChange={e => setLastName(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
            </div>
          )}
          
          <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none" required />
          
          <div className="relative">
            <input type="password" placeholder="4-Digit PIN" maxLength={4} onChange={e => setPasscode(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-lg text-center tracking-[1em] font-mono text-xl text-white focus:border-red-600 outline-none" required />
          </div>
          
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-2xl py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider">
            {view === 'register' ? 'Create My Entry' : 'Enter Tournament'}
          </button>
        </form>

         <div className="mt-8 text-center">
          <Link 
            href="/admin/entries" 
            className="text-[10px] uppercase font-bold text-slate-600 hover:text-red-600 tracking-widest transition"
          >
            Commissioner Login
          </Link>
        </div>
  );
}
