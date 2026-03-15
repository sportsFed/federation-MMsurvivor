'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminAuthContextType {
  isAuthorized: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthorized: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((res) => {
        if (res.ok) setIsAuthorized(true);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthorized(true);
        return { success: true };
      }
      return { success: false, error: 'Incorrect Commissioner Password' };
    } catch {
      return { success: false, error: 'Network error verifying password.' };
    }
  }, []);

  const logout = useCallback(() => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setIsAuthorized(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAuthorized, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
