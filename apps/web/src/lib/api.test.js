import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { apiUrl, apiFetch, setUnauthorizedHandler } from './api.js';

describe('apiUrl', () => {
  it('prefixes paths for split API deployments', () => {
    expect(apiUrl('/api/portfolio')).toMatch(/\/api\/portfolio$/);
  });
});

describe('apiFetch unauthorized', () => {
  beforeEach(() => {
    setUnauthorizedHandler(null);
  });
  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('invokes unauthorized handler on 401 for protected routes', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: { message: 'Session expired', code: 'SESSION_EXPIRED' } }),
      }),
    );

    await expect(apiFetch('/api/portfolio')).rejects.toThrow(/Session expired/);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not redirect on /api/me 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: { message: 'Unauthenticated' } }),
      }),
    );

    await expect(apiFetch('/api/me')).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
