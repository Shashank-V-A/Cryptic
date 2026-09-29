import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { BrandMark } from '../../components/brand/BrandMark.jsx';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('demo@vdaledger.in');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--vda-cream)] paper-texture px-4">
      <div className="w-full max-w-md rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-8 shadow-[var(--vda-shadow-md)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-[family-name:var(--vda-font-display)] text-lg">VDA Ledger</span>
        </Link>
        <h1 className="font-[family-name:var(--vda-font-display)] text-2xl">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">Secure session cookie — not localStorage.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--vda-ink-soft)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--vda-ink-soft)]">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-[var(--vda-negative)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-4 py-2.5 text-sm font-semibold text-[var(--vda-cream)] disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--vda-ink-muted)]">
          No account?{' '}
          <Link to="/signup" className="font-medium text-[var(--vda-green)]">
            Create one
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-[var(--vda-ink-faint)]">
          Demo: demo@vdaledger.in / DemoPass123!
        </p>
      </div>
    </div>
  );
}
