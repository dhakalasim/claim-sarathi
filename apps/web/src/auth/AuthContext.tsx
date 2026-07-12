import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse } from "@claimsarathi/shared";
import { apiClient, clearToken, getToken, setToken } from "../api/client";
import { setLocale } from "../i18n";

type CurrentUser = AuthResponse["user"];

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiClient
      .get<{ id: string; fullName: string; role: CurrentUser["role"]; locale: CurrentUser["locale"] }>("/auth/me")
      .then((me) => {
        setUser({ id: me.id, fullName: me.fullName, role: me.role, locale: me.locale });
        setLocale(me.locale);
      })
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (identifier: string, password: string) => {
        const response = await apiClient.post<AuthResponse>("/auth/login", { identifier, password });
        setToken(response.token);
        setUser(response.user);
        setLocale(response.user.locale);
      },
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
