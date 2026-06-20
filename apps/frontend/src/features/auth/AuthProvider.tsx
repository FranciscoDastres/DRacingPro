import type { CurrentUser } from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type PropsWithChildren, useMemo } from 'react';

import { apiClient, ApiError } from '../../lib/api-client';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryFn: async () => {
      try {
        return await apiClient.get<CurrentUser>('/v1/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    queryKey: ['current-user'],
    retry: false,
    staleTime: 60_000,
  });
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post<void>('/v1/auth/logout'),
    onSuccess: () => queryClient.setQueryData(['current-user'], null),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: userQuery.isLoading,
      logout: async () => logoutMutation.mutateAsync(),
      user: userQuery.data ?? null,
    }),
    [logoutMutation, userQuery.data, userQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
