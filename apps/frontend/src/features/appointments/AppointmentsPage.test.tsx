import type { Appointment } from '@dracing/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppointmentsPage } from './AppointmentsPage';

const appointment: Appointment = {
  endsAt: '2099-01-15T14:00:00.000Z',
  id: '78c865ca-8224-4e9e-a2e2-a9eddf4fb844',
  motorcycle: {
    id: '0ed4fc0c-ea93-4dc7-9af0-cba493e67491',
    label: 'La Roja',
  },
  services: [
    {
      id: '984a5c7b-2163-47d7-964d-e882388e1a2c',
      name: 'Mantención básica',
    },
  ],
  startsAt: '2099-01-15T13:00:00.000Z',
  status: 'requested',
};

describe('AppointmentsPage', () => {
  it('confirms cancellation of a future customer appointment', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const isCancellation =
        input === `/v1/appointments/${appointment.id}/cancel` &&
        init?.method === 'PATCH';
      const payload = isCancellation
        ? { ...appointment, status: 'cancelled' }
        : input === '/v1/appointments'
          ? [appointment]
          : [];

      return {
        headers: { get: () => 'application/json' },
        json: async () => payload,
        ok: true,
        status: isCancellation ? 200 : 200,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AppointmentsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Cancelar cita de La Roja',
      }),
    );
    fireEvent.change(
      screen.getByLabelText('Motivo de cancelación (opcional)'),
      { target: { value: 'Cambio de planes' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar cancelación' }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/v1/appointments/${appointment.id}/cancel`,
        expect.objectContaining({
          body: JSON.stringify({ reason: 'Cambio de planes' }),
          method: 'PATCH',
        }),
      ),
    );

    vi.unstubAllGlobals();
  });
});
