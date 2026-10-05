export const API_BASE = import.meta.env.VITE_API_URL || '';

/** Optional hook for session expiry — registered by AuthProvider. */
let unauthorizedHandler = null;

let csrfToken = null;

export function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)vda_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export async function ensureCsrfToken() {
  const fromCookie = getCsrfTokenFromCookie();
  if (fromCookie) {
    csrfToken = fromCookie;
    return fromCookie;
  }
  if (csrfToken) return csrfToken;
  try {
    const data = await fetch(apiUrl('/api/auth/csrf'), { credentials: 'include' }).then((r) =>
      r.ok ? r.json() : null,
    );
    if (data?.csrfToken) {
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch {
    // CSRF may be disabled in dev
  }
  return getCsrfTokenFromCookie();
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

/** Download a protected file (PDF/JSON) with session cookie — works cross-origin when API_BASE is set. */
export async function downloadApiFile(path, filename) {
  const res = await fetch(apiUrl(path), { credentials: 'include' });
  if (res.status === 401) {
    unauthorizedHandler?.();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error?.message || message;
    } catch {
      // non-JSON body
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const mutating = method !== 'GET' && method !== 'HEAD';
  let csrfHeader = {};
  if (mutating) {
    const token = (await ensureCsrfToken()) || csrfToken || getCsrfTokenFromCookie();
    if (token) csrfHeader = { 'x-csrf-token': token };
  }

  const res = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...csrfHeader,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.error?.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;

    const isAuthProbe = path === '/api/me' || path.startsWith('/api/auth/');
    if (res.status === 401 && !isAuthProbe) {
      unauthorizedHandler?.();
    }
    throw error;
  }

  return data;
}
