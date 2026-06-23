import type { AdminAppointment, ServiceBay } from '@dracing/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AdminAppointmentsPage } from './AdminAppointmentsPage';

const primaryServiceBay: ServiceBay = {
  description: 'Bahía principal',
  id: '439afc20-8e91-4196-9043-10a3eaf9f3b2',
  name: 'Bahía 1',
};
const secondaryServiceBay: ServiceBay = {
  description: 'Bahía secundaria',
  id: '8cb0a35b-819b-488d-84ec-98f0536cb9ec',
  name: 'Bahía 2',
};
const appointment: AdminAppointment = {
  customer: {
    displayName: 'Cliente Agenda',
    email: 'cliente@example.com',
    id: '9d8ce4e1-1e2b-4a98-beb6-c96e8d5e63f2',
  },
  endsAt: '2026-06-20T14:00:00.000Z',
  id: '78c865ca-8224-4e9e-a2e2-a9eddf4fb844',
  motorcycle: {
    id: '0ed4fc0c-ea93-4dc7-9af0-cba493e67491',
    label: 'La Roja',
  },
  serviceBay: primaryServiceBay,
  services: [
    {
      currency: 'CLP',
      id: '984a5c7b-2163-47d7-964d-e882388e1a2c',
      name: 'Mantención básica',
      unitPrice: 24990,
    },
  ],
  startsAt: '2026-06-20T13:00:00.000Z',
  status: 'requested',
  total: 24990,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
  });

  it('reassigns an active appointment to another service bay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));
    let wasReassigned = false;
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      let payload: unknown = [];
      if (input === '/v1/admin/service-bays') {
        payload = [primaryServiceBay, secondaryServiceBay];
      } else if (init?.method === 'PATCH') {
        wasReassigned = true;
        payload = { ...appointment, serviceBay: secondaryServiceBay };
      } else if (input.startsWith('/v1/admin/appointments?')) {
        payload = [
          wasReassigned
            ? { ...appointment, serviceBay: secondaryServiceBay }
            : appointment,
        ];
      }
      return {
        headers: { get: () => 'application/json' },
        json: async () => payload,
        ok: true,
        status: 200,
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AdminAppointmentsPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Bahía asignada: Bahía 1'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reasignar bahía de La Roja' }),
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Nueva bahía para La Roja' }),
      { target: { value: secondaryServiceBay.id } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar bahía' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/v1/admin/appointments/${appointment.id}/service-bay`,
        expect.objectContaining({
          body: JSON.stringify({ serviceBayId: secondaryServiceBay.id }),
          method: 'PATCH',
        }),
      ),
    );
    expect(
      await screen.findByText('Bahía asignada: Bahía 2'),
    ).toBeInTheDocument();
  });
});
