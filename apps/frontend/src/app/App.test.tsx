import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the product proposition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string) => {
        if (input.includes('/v1/auth/me')) {
          return {
            headers: { get: () => 'application/json' },
            json: async () => ({ error: 'unauthorized' }),
            ok: false,
            status: 401,
          };
        }

        return {
          headers: { get: () => 'application/json' },
          json: async () => ({ service: 'dracing-api', status: 'ok' }),
          ok: true,
          status: 200,
        };
      }),
    );

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /tu navi lista para/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ingresar con Google' }),
    ).toHaveAttribute('href', '/v1/auth/google?returnTo=/app');
    expect(await screen.findByText('Sistema operativo')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
