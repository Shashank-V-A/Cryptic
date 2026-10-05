import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge, LoadingState, ErrorState } from '@vda-ledger/ui';
import { apiFetch } from '../../lib/api.js';
import { useAuth } from '../../features/auth/AuthProvider.jsx';

export function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  const sessionsQuery = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: () => apiFetch('/api/auth/sessions'),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: passwordForm,
      }),
    onSuccess: () => {
      setPasswordMsg('Password updated.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    },
    onError: (err) => setPasswordMsg(err.message),
  });

  const revokeSession = useMutation({
    mutationFn: (id) => apiFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      if (data.revokedCurrent) logout();
    },
  });

  const requestReset = useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/password-reset/request', {
        method: 'POST',
        body: { email: resetEmail || user?.email },
      }),
    onSuccess: (data) => {
      setResetMsg(
        data.devResetToken
          ? `Reset token (dev only): ${data.devResetToken}`
          : 'If that email exists, a reset link was sent.',
      );
    },
    onError: (err) => setResetMsg(err.message),
  });

  const setupTotp = useMutation({
    mutationFn: () => apiFetch('/api/auth/totp/setup', { method: 'POST', body: {} }),
    onSuccess: (data) => setTotpSetup(data),
  });

  const enableTotp = useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/totp/enable', { method: 'POST', body: { code: totpCode } }),
    onSuccess: () => {
      setTotpSetup(null);
      setTotpCode('');
    },
  });

  const disableTotp = useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/totp/disable', { method: 'POST', body: { password: disablePassword } }),
    onSuccess: () => setDisablePassword(''),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--vda-font-display)] text-3xl">Security</h1>
        <StatusBadge tone="success">Session cookies</StatusBadge>
        {user?.totpEnabled ? <StatusBadge tone="success">2FA on</StatusBadge> : null}
      </div>

      <section className="scrapbook-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Change password
        </h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--vda-ink-muted)]">Current password</span>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--vda-ink-muted)]">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="sm:col-span-2 rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2 text-sm font-medium text-[var(--vda-cream)] disabled:opacity-60"
          >
            Update password
          </button>
        </form>
        {passwordMsg ? <p className="text-sm text-[var(--vda-ink-soft)]">{passwordMsg}</p> : null}
      </section>

      <section className="scrapbook-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Active sessions
        </h2>
        {sessionsQuery.isLoading ? <LoadingState label="Loading sessions…" /> : null}
        {sessionsQuery.error ? (
          <ErrorState
            title="Sessions unavailable"
            description={sessionsQuery.error.message}
            onRetry={sessionsQuery.refetch}
          />
        ) : null}
        <ul className="space-y-2 text-sm">
          {(sessionsQuery.data?.items || []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {s.current ? 'This device' : 'Other session'}
                  {s.current ? (
                    <span className="ml-2 text-xs text-[var(--vda-green)]">current</span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--vda-ink-muted)]">
                  {s.userAgent || 'Unknown agent'} · {s.ipAddress || '—'} ·{' '}
                  {new Date(s.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              {!s.current ? (
                <button
                  type="button"
                  onClick={() => revokeSession.mutate(s.id)}
                  className="text-xs text-[var(--vda-negative)] hover:underline"
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="scrapbook-panel space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Two-factor authentication
        </h2>
        {user?.totpEnabled ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              disableTotp.mutate();
            }}
          >
            <input
              type="password"
              required
              placeholder="Password to disable 2FA"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="min-w-[200px] flex-1 rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] px-3 py-2 text-sm"
            >
              Disable 2FA
            </button>
          </form>
        ) : (
          <>
            {!totpSetup ? (
              <button
                type="button"
                onClick={() => setupTotp.mutate()}
                className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2 text-sm font-medium text-[var(--vda-cream)]"
              >
                Set up authenticator
              </button>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-[var(--vda-ink-soft)]">
                  Add this secret to your authenticator app, then enter the 6-digit code.
                </p>
                <p className="break-all font-mono text-xs">{totpSetup.secret}</p>
                <a
                  href={totpSetup.otpauthUrl}
                  className="text-[var(--vda-green)] underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open otpauth link
                </a>
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enableTotp.mutate();
                  }}
                >
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-32 rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2 text-sm text-[var(--vda-cream)]"
                  >
                    Enable 2FA
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </section>

      <section className="scrapbook-panel space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--vda-ink-muted)]">
          Password reset
        </h2>
        <p className="text-sm text-[var(--vda-ink-soft)]">
          Request a reset link by email. In development, the API may return a token in the response.
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            requestReset.mutate();
          }}
        >
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder={user?.email || 'you@example.com'}
            className="min-w-[200px] flex-1 rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-[var(--vda-radius)] border border-[var(--vda-border)] px-4 py-2 text-sm"
          >
            Send reset
          </button>
        </form>
        {resetMsg ? <p className="text-sm text-[var(--vda-ink-muted)]">{resetMsg}</p> : null}
      </section>

      <ul className="space-y-3 text-sm text-[var(--vda-ink-soft)]">
        <li className="scrapbook-panel p-4">
          Authentication uses httpOnly session cookies — tokens are not stored in localStorage.
        </li>
        <li className="scrapbook-panel p-4">
          Exchange API secrets are encrypted with AES-256-GCM using ENCRYPTION_KEY.
        </li>
      </ul>
    </div>
  );
}
