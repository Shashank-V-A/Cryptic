import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileCheck2,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark.jsx';
import { useState } from 'react';

const FEATURES = [
  {
    title: 'Unified ledger',
    body: 'Every buy, sell, transfer, fee, reward, and swap — normalized and auditable.',
  },
  {
    title: 'Acquisition lots',
    body: 'Lot-level cost basis so sales map back to the purchases that funded them.',
  },
  {
    title: 'India VDA tax',
    body: 'Versioned tax rules by financial year — not hard-coded rates in the UI.',
  },
  {
    title: 'TDS reconciliation',
    body: 'Match exchange TDS to ledger sales. Surface gaps instead of hiding them.',
  },
  {
    title: 'Explainable numbers',
    body: 'Click any tax figure and see the transactions that produced it.',
  },
  {
    title: 'ITR-ready reports',
    body: 'Structured Schedule VDA data with a full calculation audit trail.',
  },
];

const FAQS = [
  {
    q: 'Does VDA Ledger file my income tax return?',
    a: 'No. It produces Estimated VDA Tax and ITR-ready structured data. Your Final Total Income-Tax Liability depends on other income, deductions, regime, surcharge, cess, and TDS.',
  },
  {
    q: 'How are tax amounts calculated?',
    a: 'A deterministic, versioned TaxRuleSet engine calculates all figures. AI may explain results in plain English but never determines amounts.',
  },
  {
    q: 'Do you support CoinDCX?',
    a: 'Yes — via CSV import now, and a read-only ExchangeAdapter for live sync when credentials are configured. Withdrawal and trading permissions are never requested.',
  },
  {
    q: 'What if a transaction cannot be classified?',
    a: 'It is marked Review Required. The system never silently invents a transaction type.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--vda-border)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium text-[var(--vda-ink)]">{item.q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <p className="pb-4 text-sm leading-relaxed text-[var(--vda-ink-muted)]">{item.a}</p> : null}
    </div>
  );
}

function UiPreviewFrame({ title, children }) {
  return (
    <div className="overflow-hidden rounded-[var(--vda-radius-lg)] border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] shadow-[var(--vda-shadow-md)]">
      <div className="flex items-center gap-2 border-b border-[var(--vda-border)] bg-[var(--vda-surface-muted)] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--vda-border-strong)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--vda-border-strong)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--vda-border-strong)]" />
        <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-[var(--vda-ink-muted)]">
          {title}
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--vda-cream)] paper-texture text-[var(--vda-ink)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3 animate-fade-in">
          <BrandMark size={36} />
          <div>
            <p className="font-[family-name:var(--vda-font-display)] text-xl leading-none">VDA Ledger</p>
            <p className="mt-1 hidden text-[10px] uppercase tracking-[0.14em] text-[var(--vda-ink-muted)] sm:block">
              Portfolio · Tax · Audit
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a href="#features" className="hidden text-sm text-[var(--vda-ink-soft)] hover:text-[var(--vda-ink)] md:inline">
            Features
          </a>
          <a href="#tax" className="hidden text-sm text-[var(--vda-ink-soft)] hover:text-[var(--vda-ink)] md:inline">
            Tax
          </a>
          <a href="#faq" className="hidden text-sm text-[var(--vda-ink-soft)] hover:text-[var(--vda-ink)] md:inline">
            FAQ
          </a>
          <Link
            to="/login"
            className="rounded-[var(--vda-radius)] px-3 py-2 text-sm font-medium text-[var(--vda-ink-soft)] hover:text-[var(--vda-ink)]"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-3.5 py-2 text-sm font-medium text-[var(--vda-cream)] transition hover:bg-[var(--vda-ink-soft)]"
          >
            Get Started Free
          </Link>
        </nav>
      </header>

      {/* Hero — brand first, one composition */}
      <section className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-24 lg:pt-12">
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--vda-green)]">
            Built for Indian crypto investors
          </p>
          <h1 className="mt-5 font-[family-name:var(--vda-font-display)] text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.95] tracking-tight text-[var(--vda-ink)]">
            Track. Understand.
            <br />
            File with Confidence.
          </h1>
          <p className="mt-6 max-w-md text-lg text-[var(--vda-ink-soft)]">
            Your complete crypto portfolio &amp; tax platform.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--vda-ink-muted)]">
            Sync CoinDCX transactions, track real-time portfolio performance, calculate VDA tax,
            reconcile TDS, and generate ITR-ready reports — with every figure traceable to source
            transactions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-[var(--vda-radius)] bg-[var(--vda-terracotta)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--vda-shadow-sm)] transition hover:bg-[var(--vda-terracotta-soft)]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-[var(--vda-radius)] border border-[var(--vda-border-strong)] bg-[var(--vda-surface)] px-5 py-3 text-sm font-medium text-[var(--vda-ink)]"
            >
              Watch Demo
            </a>
          </div>
          <p
            className="mt-6 font-[family-name:var(--vda-font-annotation)] text-xl text-[var(--vda-green-soft)]"
            style={{ transform: 'rotate(-2deg)' }}
          >
            one source of truth for portfolio &amp; tax
          </p>
        </div>

        <div className="animate-fade-up relative" style={{ animationDelay: '120ms' }}>
          <UiPreviewFrame title="Overview · FY 2026–27">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Portfolio Value', '—'],
                ['Total Invested', '—'],
                ['Realized P&L', '—'],
                ['Unrealized P&L', '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-[var(--vda-border)] bg-[var(--vda-paper)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--vda-ink-muted)]">{label}</p>
                  <p className="mt-1 font-[family-name:var(--vda-font-display)] text-xl">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-[var(--vda-border)] bg-[var(--vda-ink)] p-4 text-[var(--vda-cream)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--vda-sidebar-muted)]">Tax summary</p>
              <p className="mt-2 text-sm">Estimated VDA Tax · awaiting ledger data</p>
              <p className="mt-1 text-xs text-[var(--vda-sidebar-muted)]">
                Distinct from Final Total Income-Tax Liability
              </p>
            </div>
          </UiPreviewFrame>
          <div
            className="pointer-events-none absolute -right-2 -top-4 hidden rounded border border-[var(--vda-border)] bg-[var(--vda-surface)] px-3 py-1 font-[family-name:var(--vda-font-annotation)] text-lg text-[var(--vda-terracotta)] shadow-sm sm:block"
            style={{ transform: 'rotate(3deg)' }}
          >
            auditable by design
          </div>
        </div>
      </section>

      {/* Exchange compatibility */}
      <section className="border-y border-[var(--vda-border)] bg-[var(--vda-surface)]/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--vda-ink-muted)]">
            Exchange compatibility
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-[var(--vda-ink-soft)]">
            <span>CoinDCX</span>
            <span className="text-[var(--vda-ink-faint)]">Binance · planned</span>
            <span className="text-[var(--vda-ink-faint)]">Kraken · planned</span>
            <span className="text-[var(--vda-ink-faint)]">CoinSwitch · planned</span>
            <span>CSV Import</span>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:grid-cols-3 sm:px-8">
        {[
          { icon: Lock, title: 'Read-only exchange access', body: 'Never request withdrawal or trading permissions.' },
          { icon: ShieldCheck, title: 'Encrypted credentials', body: 'API secrets encrypted at rest. Masked in logs.' },
          { icon: FileCheck2, title: 'Deterministic tax engine', body: 'Versioned TaxRuleSets — not LLM guesses.' },
        ].map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="animate-fade-up flex gap-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Icon className="mt-0.5 h-5 w-5 text-[var(--vda-green)]" aria-hidden />
            <div>
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm text-[var(--vda-ink-muted)]">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* More than a tracker */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vda-terracotta)]">
            More than a tracker
          </p>
          <h2 className="mt-3 font-[family-name:var(--vda-font-display)] text-3xl sm:text-4xl">
            Portfolio intelligence with a tax-grade ledger.
          </h2>
          <p className="mt-4 text-[var(--vda-ink-muted)]">
            Holdings, SIPs, P&amp;L, TDS, and ITR-ready outputs share one auditable transaction history.
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-border)] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[var(--vda-surface)] p-6">
              <h3 className="font-[family-name:var(--vda-font-display)] text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--vda-ink-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <h2 className="font-[family-name:var(--vda-font-display)] text-3xl">
          Transaction → Portfolio → Tax
        </h2>
        <p className="mt-3 max-w-xl text-sm text-[var(--vda-ink-muted)]">
          Import or sync once. Recalculate holdings, lots, and tax position from the same ledger.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Ingest', 'CSV or read-only exchange sync into a unified ledger with duplicate detection.'],
            ['02', 'Value', 'Lots, average cost, realized & unrealized P&L — separately, never blended.'],
            ['03', 'Report', 'FY tax position, TDS match, Schedule VDA structured output, PDF reports.'],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-paper)] p-5">
              <p className="font-[family-name:var(--vda-font-mono)] text-xs text-[var(--vda-terracotta)]">{n}</p>
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-2 text-sm text-[var(--vda-ink-muted)]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tax breakdown showcase */}
      <section id="tax" className="border-y border-[var(--vda-border)] bg-[var(--vda-ink)] text-[var(--vda-cream)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vda-green-muted)]">
              Why am I paying this?
            </p>
            <h2 className="mt-3 font-[family-name:var(--vda-font-display)] text-3xl sm:text-4xl">
              Every tax number opens into its source transactions.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--vda-sidebar-text)]">
              Estimated VDA Tax is calculated by the tax engine, then explained — never invented by AI.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--vda-sidebar-text)]">
              {[
                'Asset-wise income breakdown',
                'Transaction-level consideration & cost',
                'TaxRuleSet version stored with each calculation',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--vda-green-soft)]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <UiPreviewFrame title="Tax Center · explainability">
            <div className="space-y-3 text-[var(--vda-ink)]">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--vda-ink-muted)]">
                    Estimated VDA Tax
                  </p>
                  <p className="font-[family-name:var(--vda-font-display)] text-3xl">—</p>
                </div>
                <p className="text-xs text-[var(--vda-ink-muted)]">Awaiting tax engine (Phase 5)</p>
              </div>
              <div className="rounded-md bg-[var(--vda-paper)] p-3 text-sm">
                <p className="font-medium">Breakdown will list taxable transactions by asset</p>
                <p className="mt-1 text-xs text-[var(--vda-ink-muted)]">
                  No fabricated sample tax figures in Phase 1.
                </p>
              </div>
            </div>
          </UiPreviewFrame>
        </div>
      </section>

      {/* ITR / SIP / Simulator showcases */}
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-3">
        {[
          {
            title: 'ITR-ready reports',
            body: 'Schedule VDA structured data with warnings for unclassified rows. Schema versioned per FY.',
          },
          {
            title: 'SIP analytics',
            body: 'Weekly and monthly plans with investment calendar — separate from taxable VDA income.',
          },
          {
            title: 'What-if simulator',
            body: 'Estimate consideration, cost, tax, and TDS for a hypothetical sale. No trades executed.',
          },
        ].map((card) => (
          <article key={card.title} className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border)] bg-[var(--vda-surface)] p-6">
            <h3 className="font-[family-name:var(--vda-font-display)] text-2xl">{card.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--vda-ink-muted)]">{card.body}</p>
          </article>
        ))}
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h2 className="font-[family-name:var(--vda-font-display)] text-3xl">FAQ</h2>
        <div className="mt-6">
          {FAQS.map((item) => (
            <FaqItem key={item.q} item={item} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="rounded-[var(--vda-radius-lg)] border border-[var(--vda-border-strong)] bg-[var(--vda-paper)] px-6 py-12 text-center sm:px-12">
          <h2 className="font-[family-name:var(--vda-font-display)] text-3xl sm:text-4xl">
            Know exactly what happened to your crypto money.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--vda-ink-muted)]">
            Start with CSV import or demo mode. Connect CoinDCX read-only when you are ready.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-[var(--vda-radius)] bg-[var(--vda-ink)] px-6 py-3 text-sm font-semibold text-[var(--vda-cream)]"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--vda-border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[var(--vda-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span>VDA Ledger</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed">
            Estimated VDA Tax is not Final Total Income-Tax Liability. Not financial or tax advice.
            Official tax rules must be verified per financial year against Income Tax Department sources.
          </p>
        </div>
      </footer>
    </div>
  );
}
