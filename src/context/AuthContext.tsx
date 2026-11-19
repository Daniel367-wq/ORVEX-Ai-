import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { AuthSessionData } from '../types/orvex.ts';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  session: AuthSessionData | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<AuthSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const apiFetch = useCallback(
    async <T = any,>(path: string, options: RequestInit = {}): Promise<T> => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Utilizador não autenticado.');
      }
      const token = await currentUser.getIdToken();
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(path, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Erro na requisição (${response.status})`);
      }
      return data as T;
    },
    []
  );

  const loadSession = useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      setAuthError(null);
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível validar a sessão.');
      }
      setSession(data as AuthSessionData);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao carregar sessão.');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(true);
      loadSession(user);
    });
    return () => unsubscribe();
  }, [loadSession]);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Erro ao autenticar com Google.');
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setSession(null);
    setFirebaseUser(null);
  };

  const refreshSession = useCallback(async () => {
    await loadSession(auth.currentUser);
  }, [loadSession]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        session,
        loading,
        authError,
        signInWithGoogle,
        logout,
        refreshSession,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
