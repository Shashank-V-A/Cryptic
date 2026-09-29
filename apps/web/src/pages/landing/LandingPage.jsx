import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Play,
  CalendarDays,
  Shield,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark.jsx';
import {
  BotanicalLeaves,
  ChevronTape,
  HandNote,
  InkMark,
  PolaroidFrame,
  SectionEyebrow,
  StickyNote,
  WashiStrip,
} from '../../components/landing/CollageAccents.jsx';
import { useState } from 'react';

const NAV = [
  { href: '#product', label: 'Product' },
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

const TRUST = [
  { icon: CalendarDays, label: 'Real-time tracking' },
  { icon: Shield, label: 'Indian tax compliance' },
  { icon: FileText, label: 'ITR-ready reports' },
];

const FEATURES = [
  {
    title: 'Unified ledger',
    body: 'Every buy, sell, transfer, fee, reward, and swap — normalized and auditable.',
    note: 'source of truth',
  },
  {
    title: 'Acquisition lots',
    body: 'Lot-level cost basis so sales map back to the purchases that funded them.',
    note: 'trace every sale',
  },
  {
    title: 'India VDA tax',
    body: 'Versioned tax rules by financial year — not hard-coded rates in the UI.',
    note: 'deterministic',
  },
  {
    title: 'TDS reconciliation',
    body: 'Match exchange TDS to ledger sales. Surface gaps instead of hiding them.',
    note: 'no silent fixes',
  },
  {
    title: 'Explainable numbers',
    body: 'Click any tax figure and see the transactions that produced it.',
    note: 'why this amount?',
  },
  {
    title: 'ITR-ready reports',
    body: 'Structured Schedule VDA data with a full calculation audit trail.',
    note: 'filing ready',
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
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--vda-ink-muted)] transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <p className="pb-4 text-sm leading-relaxed text-[var(--vda-ink-muted)]">{item.a}</p> : null}
    </div>
  );
}

function HeroCollage() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
      <div className="animate-float-in relative z-10" style={{ animationDelay: '160ms' }}>
        <div
          className="relative rotate-[-1.8deg] bg-white p-2 pb-8 shadow-[var(--vda-shadow-photo)] sm:p-3 sm:pb-10"
          style={{
            clipPath:
              'polygon(0% 0%, 97% 0%, 100% 3%, 98.5% 7%, 100% 12%, 97.8% 18%, 100% 24%, 98.2% 31%, 100% 38%, 97.5% 46%, 100% 54%, 98% 62%, 100% 70%, 97.6% 78%, 100% 86%, 98.4% 93%, 100% 100%, 0% 100%)',
          }}
        >
          <img
            src="/landing/hero-mountains.png"
            alt="Snow-capped mountains at dusk"
            className="aspect-[4/3] w-full object-cover"
            width={800}
            height={600}
          />
        </div>

        <HandNote className="pointer-events-none absolute -left-1 top-[16%] z-20 max-w-[11rem] sm:-left-8 sm:max-w-[13rem] sm:text-[1.55rem]">
          Same Investments.
          <br />
          Smarter Decisions.
        </HandNote>

        <StickyNote
          taped
          className="absolute -bottom-2 right-2 z-20 w-[9.5rem] sm:right-6 sm:w-[11rem]"
          rotate={3}
        >
          <p className="text-center tracking-wide">
            BUILT FOR INDIAN
            <br />
            INVESTORS —
            <br />
            VDA LEDGER
          </p>
        </StickyNote>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--vda-cream)] paper-texture paper-crease text-[var(--vda-ink)]">
      {/* Sparse collage: leaves + a few terracotta accents (not every section) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <BotanicalLeaves
          width={220}
          className="absolute -left-12 top-[64px] hidden opacity-95 lg:block xl:-left-6"
        />
        {/* Hero accent — chevron under leaves (design reference) */}
        <div className="absolute left-8 top-[300px] hidden lg:block xl:left-12">
          <ChevronTape size="lg" />
        </div>

        <BotanicalLeaves
          width={150}
          className="absolute -right-10 top-[1400px] hidden rotate-[14deg] opacity-80 lg:block"
        />
        {/* Mid-page accent near how-it-works / tax */}
        <div className="absolute right-12 top-[1520px] hidden lg:block">
          <ChevronTape size="md" />
        </div>
      </div>

      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 animate-fade-in">
          <BrandMark size={34} />
          <span className="text-[15px] font-semibold tracking-tight">VDA Ledger</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] text-[var(--vda-ink-soft)] md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[var(--vda-ink)]">
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[var(--vda-ink-soft)]"
        >
          Get Started
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20 lg:pt-10">
        <div className="animate-fade-up relative z-10 max-w-xl">
          <h1 className="font-[family-name:var(--vda-font-display)] text-[clamp(2.35rem,5.2vw,3.85rem)] font-medium leading-[1.08] tracking-[-0.02em] text-[var(--vda-ink)]">
            Track your crypto journey.
            <br />
            File your taxes{' '}
            <span className="hand-underline italic">with confidence.</span>
          </h1>

          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-[var(--vda-ink-soft)]">
            Your complete crypto portfolio &amp; tax platform for Indian investors.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--vda-shadow-sm)] transition hover:bg-[var(--vda-ink-soft)]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2.5 text-sm font-medium text-[var(--vda-ink-soft)] transition hover:text-[var(--vda-ink)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--vda-ink)]/25">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
              Watch Demo
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--vda-border)] pt-6">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-[13px] text-[var(--vda-ink-muted)]">
                <Icon className="h-4 w-4 text-[var(--vda-ink-soft)]" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 min-h-[320px] sm:min-h-[400px]">
          <HeroCollage />
        </div>
      </section>

      {/* Product */}
      <section id="product" className="relative z-10">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="scrapbook-panel relative overflow-hidden px-6 py-7 sm:px-8">
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <InkMark />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--vda-ink-muted)]">
                  Built for Indian crypto investors
                </p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-[var(--vda-ink-soft)]">
                <span>CoinDCX</span>
                <span className="text-[var(--vda-ink-faint)]">Binance · planned</span>
                <span>CSV Import</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>Features</SectionEyebrow>
          <h2 className="font-[family-name:var(--vda-font-display)] text-3xl sm:text-4xl">
            More than a tracker — a tax-grade ledger.
          </h2>
          <p className="mt-4 text-[var(--vda-ink-muted)]">
            Holdings, SIPs, P&amp;L, TDS, and ITR-ready outputs share one auditable transaction history.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="scrapbook-panel relative p-5 transition hover:-translate-y-0.5"
              style={{ transform: `rotate(${i % 2 === 0 ? -0.4 : 0.5}deg)` }}
            >
              <HandNote rotate={-2} className="mb-2 text-[1.05rem] text-[var(--vda-green-soft)]">
                {f.note}
              </HandNote>
              <h3 className="font-[family-name:var(--vda-font-display)] text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--vda-ink-muted)]">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="workflow" className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="font-[family-name:var(--vda-font-display)] text-3xl">
              Transaction → Portfolio → Tax
            </h2>
            <p className="mt-3 max-w-xl text-sm text-[var(--vda-ink-muted)]">
              Import or sync once. Recalculate holdings, lots, and tax position from the same ledger.
            </p>
          </div>
          <StickyNote taped rotate={-4} className="w-36 text-center text-[0.9rem]">
            one ledger.
            <br />
            every answer.
          </StickyNote>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ['01', 'Ingest', 'CSV or read-only exchange sync into a unified ledger with duplicate detection.'],
            ['02', 'Value', 'Lots, average cost, realized & unrealized P&L — separately, never blended.'],
            ['03', 'Report', 'FY tax position, TDS match, Schedule VDA structured output, PDF reports.'],
          ].map(([n, title, body], i) => (
            <li key={n}>
              <PolaroidFrame rotate={i === 1 ? 1.2 : i === 2 ? -1 : -0.5} caption={`step ${n}`}>
                <div className="min-h-[150px] bg-[var(--vda-paper)] p-5">
                  <p className="font-[family-name:var(--vda-font-mono)] text-xs text-[var(--vda-ink-muted)]">
                    {n}
                  </p>
                  <p className="mt-3 font-[family-name:var(--vda-font-display)] text-2xl">{title}</p>
                  <p className="mt-3 text-sm text-[var(--vda-ink-muted)]">{body}</p>
                </div>
              </PolaroidFrame>
            </li>
          ))}
        </ol>
      </section>

      {/* Tax showcase */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div
          className="relative overflow-hidden bg-[var(--vda-sidebar)] px-6 py-12 text-[var(--vda-cream)] shadow-[var(--vda-shadow-photo)] sm:px-10 sm:py-14"
          style={{
            clipPath:
              'polygon(0% 1%, 99% 0%, 100% 8%, 99.2% 22%, 100% 40%, 98.8% 58%, 100% 76%, 99% 100%, 0% 99%, 0.8% 70%, 0% 40%)',
          }}
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
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
            <div className="relative rotate-[1.5deg] bg-[var(--vda-cream)] p-3 text-[var(--vda-ink)] shadow-[var(--vda-shadow-md)]">
              <div className="bg-[var(--vda-paper)] p-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--vda-ink-muted)]">
                  Estimated VDA Tax
                </p>
                <p className="mt-2 font-[family-name:var(--vda-font-display)] text-4xl">—</p>
                <p className="mt-3 text-sm text-[var(--vda-ink-muted)]">
                  Distinct from Final Total Income-Tax Liability. No fabricated sample figures.
                </p>
                <HandNote className="mt-4 text-[1.15rem] text-[var(--vda-green)]" rotate={-3}>
                  click any figure → see the trades
                </HandNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <SectionEyebrow>Pricing</SectionEyebrow>
        <h2 className="font-[family-name:var(--vda-font-display)] text-3xl">Start free. Scale when ready.</h2>
        <p className="mt-3 max-w-xl text-sm text-[var(--vda-ink-muted)]">
          Start free with CSV import and demo mode. Paid plans for multi-exchange sync and accountant
          workflows — coming soon.
        </p>

        <div className="mt-10 max-w-md">
          <PolaroidFrame rotate={-1} caption="free forever starter">
            <div className="bg-[var(--vda-paper)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--vda-green)]">
                Free
              </p>
              <p className="mt-2 font-[family-name:var(--vda-font-display)] text-4xl">₹0</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--vda-ink-muted)]">
                {['CSV import', 'Portfolio & tax foundations', 'Demo mode'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--vda-green)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="mt-6 inline-flex rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Get Started Free
              </Link>
            </div>
          </PolaroidFrame>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <div className="scrapbook-panel relative px-6 py-8 sm:px-8">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="font-[family-name:var(--vda-font-display)] text-3xl">Questions, answered plainly.</h2>
          <div className="mt-6">
            {FAQS.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="relative scrapbook-panel overflow-hidden px-6 py-14 text-center sm:px-12">
          <BotanicalLeaves
            width={130}
            className="absolute -left-10 top-1/2 hidden -translate-y-1/2 opacity-85 sm:block"
          />
          <div className="absolute right-8 top-6 hidden sm:block" aria-hidden>
            <WashiStrip rotate={12} width={48} />
          </div>
          <h2 className="relative font-[family-name:var(--vda-font-display)] text-3xl sm:text-4xl">
            Same investments. Smarter decisions.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm text-[var(--vda-ink-muted)]">
            Start with CSV import or demo mode. Connect CoinDCX read-only when you are ready.
          </p>
          <Link
            to="/signup"
            className="relative mt-8 inline-flex items-center gap-2 rounded-[var(--vda-radius-pill)] bg-[var(--vda-ink)] px-6 py-3 text-sm font-semibold text-white"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--vda-border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[var(--vda-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span>VDA Ledger</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed">
            Estimated VDA Tax is not Final Total Income-Tax Liability. Not financial or tax advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
