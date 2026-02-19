import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import axios from 'axios';

const authApi = axios.create({ baseURL: '/api', timeout: 15000 });

interface User {
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'esquenta_chip_token';
const USER_KEY = 'esquenta_chip_user';

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const [token, setToken] = useState<string | null>(readToken);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef<() => void>();

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  logoutRef.current = logout;

  // Listen for auth-expired from useApi interceptor
  useEffect(() => {
    const handler = () => logoutRef.current?.();
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, []);

  // Validate token on mount
  useEffect(() => {
    const currentToken = readToken();
    const savedUser = readUser();

    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    authApi
      .get('/auth/me', { headers: { Authorization: `Bearer ${currentToken}` } })
      .then((res) => {
        if (cancelled) return;
        const u = res.data.user;
        setUser(u);
        setToken(currentToken);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        } else if (savedUser) {
          setUser(savedUser);
          setToken(currentToken);
        } else {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.post('/auth/login', { email, password });

    if (res.data.error) {
      throw new Error(res.data.error);
    }

    const jwt = res.data.token;
    const u = res.data.user;

    localStorage.setItem(TOKEN_KEY, jwt);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(jwt);
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
