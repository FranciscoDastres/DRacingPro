import { afterEach, vi } from 'vitest';

import {
  FlowClient,
  isPaidFlowStatus,
  signFlowParams,
} from '../src/modules/payments/infrastructure/flow-client.js';

describe('signFlowParams', () => {
  it('signs parameters sorted by name with HMAC-SHA256', () => {
    const signature = signFlowParams(
      { commerceOrder: 'ORD-1', apiKey: 'my-api-key', amount: '10000' },
      'test-secret',
    );
    // Reference HMAC over the string "amount10000apiKeymy-api-keycommerceOrderORD-1".
    expect(signature).toBe(
      'd02c0a25d3d580cf6f0ec6aef5b8fccd71379b055d71baacf079287e4207c3b7',
    );
  });

  it('is independent of the input key order', () => {
    const a = signFlowParams({ b: '2', a: '1' }, 'k');
    const b = signFlowParams({ a: '1', b: '2' }, 'k');
    expect(a).toBe(b);
  });
});

describe('FlowClient.getStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('issues a GET with signed query params (Flow getStatus is GET, not POST)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 10000,
        commerceOrder: 'ORD-1',
        flowOrder: 999,
        status: 2,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new FlowClient({
      apiBase: 'https://sandbox.flow.cl/api',
      apiKey: 'my-api-key',
      secretKey: 'test-secret',
    });

    const result = await client.getStatus('tok-123');
    expect(result.status).toBe(2);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/payment/getStatus');
    expect(parsed.searchParams.get('apiKey')).toBe('my-api-key');
    expect(parsed.searchParams.get('token')).toBe('tok-123');
    expect(parsed.searchParams.get('s')).toBe(
      signFlowParams({ apiKey: 'my-api-key', token: 'tok-123' }, 'test-secret'),
    );
  });
});

describe('isPaidFlowStatus', () => {
  it('treats Flow status code 2 as paid', () => {
    expect(isPaidFlowStatus(2)).toBe(true);
  });

  it('treats pending/rejected/canceled codes as not paid', () => {
    expect(isPaidFlowStatus(1)).toBe(false);
    expect(isPaidFlowStatus(3)).toBe(false);
    expect(isPaidFlowStatus(4)).toBe(false);
  });
});
