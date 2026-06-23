import type {
  Appointment,
  AvailabilitySlot,
  Motorcycle,
  Service,
} from '@dracing/contracts';
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
      currency: 'CLP',
      id: '984a5c7b-2163-47d7-964d-e882388e1a2c',
      name: 'Mantención básica',
      unitPrice: 24990,
    },
  ],
  startsAt: '2099-01-15T13:00:00.000Z',
  status: 'requested',
  total: 24990,
};
const motorcycle: Motorcycle = {
  color: 'Rojo',
  createdAt: '2026-06-01T12:00:00.000Z',
  id: appointment.motorcycle.id,
  licensePlate: 'ABCD12',
  make: 'Honda',
  model: 'NAVI',
  modelYear: 2024,
  nickname: appointment.motorcycle.label,
  notes: null,
  odometerKm: 1200,
  updatedAt: '2026-06-01T12:00:00.000Z',
  vin: null,
};
const service: Service = {
  code: 'DIAGNOSTICO',
  currency: 'CLP',
  description: 'Diagnóstico inicial',
  durationMinutes: 45,
  id: appointment.services[0]!.id,
  name: 'Diagnóstico general',
  price: 15000,
};
const availableSlot: AvailabilitySlot = {
  endsAt: '2026-06-22T14:15:00.000Z',
  startsAt: '2026-06-22T13:30:00.000Z',
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

  it('selects a service, an available 45-minute slot and creates the appointment', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const isCreation =
        input === '/v1/appointments' && init?.method === 'POST';
      const payload = isCreation
        ? {
            ...appointment,
            endsAt: availableSlot.endsAt,
            startsAt: availableSlot.startsAt,
          }
        : input === '/v1/motorcycles'
          ? [motorcycle]
          : input === '/v1/services'
            ? [service]
            : input.startsWith('/v1/availability?')
              ? [availableSlot]
              : [];

      return {
        headers: { get: () => 'application/json' },
        json: async () => payload,
        ok: true,
        status: isCreation ? 201 : 200,
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

    expect(
      screen.queryByRole('combobox', { name: 'Selecciona tu Honda NAVI' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('checkbox', { name: /diagnóstico general/i }),
    );
    const slotButton = await screen.findByRole('button', { name: '09:30' });
    fireEvent.click(slotButton);
    expect(slotButton).toHaveAttribute('aria-pressed', 'true');
    const confirmButton = screen.getByRole('button', {
      name: 'Confirmar cita',
    });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/appointments',
        expect.objectContaining({
          body: JSON.stringify({
            motorcycleId: motorcycle.id,
            serviceIds: [service.id],
            startsAt: availableSlot.startsAt,
          }),
          method: 'POST',
        }),
      ),
    );
    expect(await screen.findByText('Solicitud enviada')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
