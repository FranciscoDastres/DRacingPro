import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MotorcyclesPage } from './MotorcyclesPage';

describe('MotorcyclesPage', () => {
  it('submits a new motorcycle and refreshes the garage', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (_input, init?: RequestInit) => ({
        headers: { get: () => 'application/json' },
        json: async () => (init?.method === 'POST' ? createdMotorcycle : []),
        ok: true,
        status: init?.method === 'POST' ? 201 : 200,
      }));
    vi.stubGlobal('fetch', fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MotorcyclesPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Aún no tienes motos registradas'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar NAVI' }));
    fireEvent.change(screen.getByLabelText('Apodo'), {
      target: { value: 'La Roja' },
    });
    fireEvent.change(screen.getByLabelText('Año'), {
      target: { value: '2024' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar NAVI' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/motorcycles',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    vi.unstubAllGlobals();
  });
});

const createdMotorcycle = {
  color: null,
  createdAt: '2026-06-20T00:00:00.000Z',
  id: '0ed4fc0c-ea93-4dc7-9af0-cba493e67491',
  licensePlate: null,
  make: 'Honda',
  model: 'NAVI',
  modelYear: 2024,
  nickname: 'La Roja',
  notes: null,
  odometerKm: null,
  updatedAt: '2026-06-20T00:00:00.000Z',
  vin: null,
};
