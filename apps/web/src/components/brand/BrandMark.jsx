export function BrandMark({ size = 32, invert = false }) {
  const ink = invert ? '#F3EFE6' : '#1A1D19';
  const accent = '#3D5A45';
  const rust = '#B65C3A';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="10" fill={invert ? '#1A1D19' : '#F3EFE6'} stroke={invert ? '#2E342C' : '#C8BDAA'} />
      <path d="M16 42 L32 16 L48 42 Z" stroke={ink} strokeWidth="3" fill="none" />
      <path d="M24 42 L32 28 L40 42" stroke={accent} strokeWidth="3" fill="none" />
      <circle cx="32" cy="46" r="3" fill={rust} />
    </svg>
  );
}
