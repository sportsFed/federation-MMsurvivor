'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/firebase/auth';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const validate = (): string | null => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return 'All fields are required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await registerUser(firstName, lastName, email, password);
    setLoading(false);

    if (result.success) {
      router.push('/auth/login');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120] px-4">
      <div className="max-w-md w-full p-8 shadow-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-2xl">
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-bebas text-4xl tracking-tight uppercase italic text-white text-center">
            Create Account
          </h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
            The Federation
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-600/50 text-red-300 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
              required
            />
          </div>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bebas text-2xl py-4 rounded-xl shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-red-500 hover:text-red-400 transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
