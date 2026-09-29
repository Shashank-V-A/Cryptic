import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { BrandMark } from '../../components/brand/BrandMark.jsx';
import { BotanicalLeaves } from '../../components/landing/CollageAccents.jsx';

export function SignupPage() {
  const { signup, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup({ fullName, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--vda-cream)] paper-texture paper-crease px-4">
      <BotanicalLeaves width={170} className="absolute -right-10 top-6 rotate-6 opacity-90" />
      <BotanicalLeaves width={120} className="absolute -left-6 bottom-8 -scale-x-100 opacity-75" />

      <div className="scrapbook-panel relative z-10 w-full max-w-md p-8 shadow-[var(--vda-shadow-photo)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-[15px] font-semibold tracking-tight">VDA Ledger</span>
        </Link>
        <h1 className="font-[family-name:var(--vda-font-display)] text-2xl">Create account</h1>
        <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">
          Your crypto portfolio and tax ledger, one source of truth.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--vda-ink-soft)]">Full name</span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
              autoComplete="name"
            />
          </label>
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[var(--vda-radius)] border border-[var(--vda-border)] bg-[var(--vda-paper)] px-3 py-2"
              autoComplete="new-password"
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
            className="w-full rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Get Started Free'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--vda-ink-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--vda-green)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
