import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AdminAppointmentsPage } from './AdminAppointmentsPage';

describe('AdminAppointmentsPage', () => {
  it('navigates daily and weekly workshop ranges', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));
    const fetchMock = vi.fn(async () => ({
      headers: { get: () => 'application/json' },
      json: async () => [],
      ok: true,
      status: 200,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminAppointmentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/admin/appointments?from=2026-06-20&to=2026-06-21',
        expect.any(Object),
      ),
    );
    expect(
      await screen.findByText('No hay citas en este periodo'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/admin/appointments?from=2026-06-15&to=2026-06-22',
        expect.any(Object),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/admin/appointments?from=2026-06-22&to=2026-06-29',
        expect.any(Object),
      ),
    );

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
