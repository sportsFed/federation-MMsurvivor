'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="glass-panel max-w-md w-full p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src="/Fed-Logo.png" alt="Logo" className="w-16 h-16 mb-4" />
          <h1 className="font-bebas text-4xl tracking-tight uppercase italic">MM Survivor 25-26</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest">The Federation</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-700 mb-6">
          <button 
            className={`flex-1 pb-2 font-bebas text-lg ${isRegistering ? 'text-fedRed border-b-2 border-fedRed' : 'text-slate-500'}`}
            onClick={() => setIsRegistering(true)}
          >New Entry</button>
          <button 
            className={`flex-1 pb-2 font-bebas text-lg ${!isRegistering ? 'text-fedRed border-b-2 border-fedRed' : 'text-slate-500'}`}
            onClick={() => setIsRegistering(false)}
          >Returning User</button>
        </div>

        <form className="space-y-4">
          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="First Name" className="bg-slate-900/50 border border-slate-700 p-3 rounded focus:outline-none focus:border-fedRed" />
              <input type="text" placeholder="Last Name" className="bg-slate-900/50 border border-slate-700 p-3 rounded focus:outline-none focus:border-fedRed" />
            </div>
          )}
          <input type="email" placeholder="Email Address" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded focus:outline-none focus:border-fedRed" />
          <input type="password" placeholder="Create 4-Digit PIN" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded text-center tracking-[1em] font-mono" maxLength={4} />
          
          <button className="w-full bg-fedRed hover:bg-red-700 text-white font-bebas text-2xl py-3 rounded-lg shadow-lg shadow-red-900/20 transition-all uppercase">
            {isRegistering ? 'Create Entry' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
