'use client';

import { useState } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminLoginForm() {
  const { login } = useAdminAuth();
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(passwordInput);
    if (!result.success) {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
      <form
        onSubmit={handleLogin}
        className="p-8 w-full max-w-sm border border-white/10 rounded-2xl text-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <img src="/Fed-Logo-Full.png" alt="The Federation" style={{ width: '120px', margin: '0 auto 24px' }} />
        <h2 className="font-bebas text-3xl text-white mb-2 italic tracking-widest">Commissioner Access</h2>
        <p className="text-slate-500 text-sm mb-6">Admin Panel — March Madness Survivor 2026</p>
        <input
          type="password"
          placeholder="Enter Admin Password"
          className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase tracking-widest"
        >
          Verify Identity
        </button>
      </form>
    </div>
  );
}
