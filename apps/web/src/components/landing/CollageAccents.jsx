/** Sparse scrapbook accents — avoid repeating terracotta “sticks”. */

export function BotanicalLeaves({ className = '', width = 200 }) {
  return (
    <img
      src="/landing/hero-leaves.png?v=3"
      alt=""
      aria-hidden="true"
      width={width}
      height={width}
      className={`pointer-events-none select-none [background:transparent] ${className}`}
      draggable={false}
      style={{ background: 'transparent' }}
    />
  );
}

/** Short washi strip — use a few times, not on every block. */
export function WashiStrip({ className = '', rotate = -18, width = 56 }) {
  return (
    <span
      className={`inline-block h-[9px] washi-tape ${className}`}
      style={{ width, transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    />
  );
}

/** Terracotta chevron (">") — place 2–3 times max on the page. */
export function ChevronTape({ className = '', size = 'md' }) {
  const bar =
    size === 'lg'
      ? 'h-[11px] w-[88px] sm:h-[12px] sm:w-[108px]'
      : size === 'sm'
        ? 'h-[7px] w-[46px]'
        : 'h-[9px] w-[70px] sm:h-[10px] sm:w-[82px]';

  return (
    <div
      className={`relative inline-block ${
        size === 'lg'
          ? 'h-[48px] w-[105px] sm:h-[56px] sm:w-[125px]'
          : size === 'sm'
            ? 'h-[26px] w-[54px]'
            : 'h-[40px] w-[86px] sm:h-[44px] sm:w-[96px]'
      } ${className}`}
      aria-hidden="true"
    >
      <span
        className={`absolute left-0 top-[2px] ${bar} washi-tape`}
        style={{ transform: 'rotate(32deg)', transformOrigin: 'left center' }}
      />
      <span
        className={`absolute bottom-[2px] left-0 ${bar} washi-tape`}
        style={{ transform: 'rotate(-32deg)', transformOrigin: 'left center' }}
      />
    </div>
  );
}

/** Soft ink mark as a quieter accent than chevron bars */
export function InkMark({ className = '' }) {
  return (
    <svg
      className={className}
      width="28"
      height="10"
      viewBox="0 0 28 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 6.2C6 3.8 11 3.2 15.5 4.4C19.2 5.4 23.5 5.8 26.5 4.1"
        stroke="var(--vda-green)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function StickyNote({ children, className = '', rotate = 3, taped = false }) {
  return (
    <div
      className={`sticky-note relative px-3 py-3 ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {taped ? (
        <div
          className="absolute -top-2 left-1/2 h-3 w-11 -translate-x-1/2 washi-tape opacity-90"
          style={{ transform: 'translateX(-50%) rotate(-5deg)' }}
          aria-hidden
        />
      ) : null}
      <div className="font-[family-name:var(--vda-font-annotation)] text-[0.95rem] font-semibold leading-snug text-[var(--vda-ink)]">
        {children}
      </div>
    </div>
  );
}

export function PolaroidFrame({ children, className = '', rotate = -1.5, caption }) {
  return (
    <div
      className={`relative bg-[var(--vda-surface)] p-2.5 pb-8 shadow-[var(--vda-shadow-photo)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="overflow-hidden bg-[var(--vda-cream-deep)]">{children}</div>
      {caption ? (
        <p className="absolute bottom-2 left-0 right-0 text-center font-[family-name:var(--vda-font-annotation)] text-sm text-[var(--vda-ink-soft)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function HandNote({ children, className = '', rotate = -4 }) {
  return (
    <p
      className={`font-[family-name:var(--vda-font-annotation)] text-[1.35rem] leading-tight text-[var(--vda-ink)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </p>
  );
}

export function SectionEyebrow({ children }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <InkMark />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vda-green)]">
        {children}
      </p>
    </div>
  );
}
