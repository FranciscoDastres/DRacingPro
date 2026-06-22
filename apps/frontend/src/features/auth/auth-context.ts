import type { CurrentUser } from '@dracing/contracts';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  devLogin: () => Promise<void>;
  isLoading: boolean;
  logout: () => Promise<void>;
  user: CurrentUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
