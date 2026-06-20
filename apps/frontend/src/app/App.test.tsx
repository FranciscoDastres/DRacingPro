import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the product proposition', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ service: 'dracing-api', status: 'ok' }),
        ok: true,
      }),
    );

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /tu navi lista para/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Sistema operativo')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
