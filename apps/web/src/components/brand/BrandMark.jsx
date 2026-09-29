/** Scrapbook geometric mark matching design reference */
export function BrandMark({ size = 32, invert = false }) {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M8 28 L20 8 L26 18 L14 32 Z" fill={invert ? '#F2EFE9' : '#1A1A1A'} />
      <path d="M20 8 L32 28 L26 18 Z" fill="#D95D39" />
      <path d="M14 32 L26 18 L32 28 Z" fill={invert ? '#5A7A62' : '#3D5A45'} opacity="0.9" />
    </svg>
  );
}
