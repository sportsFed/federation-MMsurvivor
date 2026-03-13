'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase/clientApp';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPass = `${passcode}fed26`; // Meets Firebase 6-char minimum

    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, fullPass);
        // Create the official entry with the First and Last name
        await setDoc(doc(db, 'entries', res.user.uid), {
          displayName: `${firstName} ${lastName}`,
          email,
          isAdmin: email === 'thesportsfederation@gmail.com',
          isEliminated: false,
          totalPoints: 0,
          survivorPicks: [],
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, fullPass);
      }
      router.push('/my-picks');
    } catch (err) { 
      alert("Error: Check your credentials or ensure the passcode is 4 digits."); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">Federation Entry</h1>
        
        {isRegistering && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input type="text" placeholder="First Name" onChange={e => setFirstName(e.target.value)} className="border p-2 rounded" required />
            <input type="text" placeholder="Last Name" onChange={e => setLastName(e.target.value)} className="border p-2 rounded" required />
          </div>
        )}

        <input type="email" placeholder="Email Address" onChange={e => setEmail(e.target.value)} className="w-full border p-2 mb-4 rounded" required />
        <input type="password" placeholder="4-Digit Passcode" maxLength={4} onChange={e => setPasscode(e.target.value)} className="w-full border p-2 mb-6 rounded" required />
        
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 transition">
          {isRegistering ? 'Register & Enter League' : 'Sign In'}
        </button>
        
        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-auto mx-auto block text-xs mt-6 text-gray-500 hover:text-blue-600">
          {isRegistering ? 'Already have an entry? Sign In' : 'New Entrant? Register Here'}
        </button>
      </form>
    </div>
  );
}
