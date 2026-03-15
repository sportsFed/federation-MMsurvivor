'use client';

import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminLoginForm from './AdminLoginForm';

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <div className="text-slate-400 font-bebas text-2xl tracking-widest">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <AdminLoginForm />;
  }

  return <>{children}</>;
}
