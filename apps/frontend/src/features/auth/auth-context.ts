import type { CurrentUser, UpdateProfileInput } from '@dracing/contracts';
import { createContext, useContext } from 'react';

export type ViewRole = 'admin' | 'customer';

export interface AuthContextValue {
  isLoading: boolean;
  logout: () => Promise<void>;
  signIn: (params?: {
    email?: string;
    role?: ViewRole;
  }) => Promise<CurrentUser>;
  updateProfile: (input: UpdateProfileInput) => Promise<CurrentUser>;
  user: CurrentUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
