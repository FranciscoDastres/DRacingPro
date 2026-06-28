import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../auth/AuthProvider';
import { AccountPage } from './AccountPage';

const customer = {
  displayName: 'Ana Cliente',
  email: 'ana@example.cl',
  id: 'user-1',
  role: 'customer',
};

function renderAccount(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/app/account']}>
          <Routes>
            <Route element={<AccountPage />} path="/app/account" />
            <Route element={<p>Landing</p>} path="/" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AccountPage account deletion', () => {
  it('deletes the account via DELETE /v1/auth/me only after confirmation', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: string) => {
        if (input.includes('/v1/auth/me')) {
          return {
            headers: { get: () => 'application/json' },
            json: async () => customer,
            ok: true,
            status: 200,
          };
        }
        return {
          headers: { get: () => 'application/json' },
          json: async () => undefined,
          ok: true,
          status: 204,
        };
      });

    renderAccount(fetchMock);

    // Wait for the profile to load.
    expect(await screen.findByText('ana@example.cl')).toBeInTheDocument();

    // Opening the danger flow must not fire the request yet.
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes('/v1/auth/me') &&
          (init as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole('button', { name: 'Eliminar definitivamente' }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/auth/me',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );

    vi.unstubAllGlobals();
  });
});
