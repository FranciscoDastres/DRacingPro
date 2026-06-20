export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? ((await response.json()) as unknown)
    : null;

  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

export const apiClient = {
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  get: <T>(path: string) => request<T>(path),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { body: JSON.stringify(body), method: 'PATCH' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      ...(body !== undefined && { body: JSON.stringify(body) }),
      method: 'POST',
    }),
};
