import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthProvider';
import { AppShell } from './AppShell';

const customer = {
  displayName: 'Ana Cliente',
  email: 'ana@example.cl',
  id: 'user-1',
  role: 'customer',
};

function renderShell(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route element={<AppShell />} path="/app" />
            <Route element={<p>Landing</p>} path="/" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AppShell logout-all', () => {
  it('confirms before closing every session via /v1/auth/logout-all', async () => {
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

    renderShell(fetchMock);

    // Wait until the authenticated header is rendered.
    expect(await screen.findByText('ana@example.cl')).toBeInTheDocument();

    // The destructive action requires confirmation before firing the request.
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar sesión en todos los dispositivos',
      }),
    );
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/v1/auth/logout-all'),
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar todas' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/auth/logout-all',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    vi.unstubAllGlobals();
  });
});
