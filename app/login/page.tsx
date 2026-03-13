'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState(''); // 4-digit number
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPass = `${passcode}fed26`; // Meets 6-char minimum

    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, fullPass);
        await setDoc(doc(db, 'entries', res.user.uid), {
          email,
          isAdmin: email === 'thesportsfederation@gmail.com',
          isEliminated: false,
          totalPoints: 0
        });
      } else {
        await signInWithEmailAndPassword(auth, email, fullPass);
      }
      router.push('/my-picks');
    } catch (err) { alert("Check email/passcode or register new entry."); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Federation Entry</h1>
        <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} className="w-full border p-2 mb-4 rounded" required />
        <input type="password" placeholder="4-Digit Passcode" maxLength={4} onChange={e => setPasscode(e.target.value)} className="w-full border p-2 mb-6 rounded" required />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold">
          {isRegistering ? 'Create Entry' : 'Sign In'}
        </button>
        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm mt-4 text-gray-500 underline">
          {isRegistering ? 'Already have an entry? Sign In' : 'New Entrant? Register Here'}
        </button>
      </form>
    </div>
  );
}
