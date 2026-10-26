export function BrandLogo({
  size = 34,
  className = '',
  variant = 'dark',
}: {
  size?: number
  className?: string
  variant?: 'dark' | 'light'
}) {
  const background = variant === 'light' ? '#f3f0e9' : '#17191c'
  const glyph = variant === 'light' ? '#17191c' : '#f3f0e9'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="2" fill={background} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="1.5" stroke={glyph} strokeOpacity="0.2" />
      <path d="M11 12H29M11 20H24M11 28H29" stroke={glyph} strokeWidth="2.5" strokeLinecap="square" />
      <circle cx="31" cy="9" r="2.5" fill="#d8491f" />
    </svg>
  )
}
