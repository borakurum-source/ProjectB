"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginWithGoogle: () => window.location.reload(),
      logout: () => {
        setUser(null);
        window.location.assign("/api/auth/sign-out");
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
