export function BrandLogo({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
    >
      <defs>
        <linearGradient id="ecom-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="ecom-cube-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="ecom-cube-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ecom-cube-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="ecom-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="ecom-shadow" x="-10%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" floodColor="#1e3a8a" />
        </filter>
      </defs>

      {/* Rounded squircle badge */}
      <rect width="40" height="40" rx="11" fill="url(#ecom-bg)" />

      {/* Stylized Outer Letter E Spine & Arms */}
      <path
        d="M26 11H13C11.3431 11 10 12.3431 10 14V26C10 27.6569 11.3431 29 13 29H26"
        stroke="url(#ecom-glow)"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path d="M10 20H16" stroke="url(#ecom-glow)" strokeWidth="2.75" strokeLinecap="round" />

      {/* 3D Geometric Isometric Shopping Bag / Cube */}
      <g filter="url(#ecom-shadow)">
        {/* Cube Top Face */}
        <path d="M22.5 14L27.5 16.6L22.5 19.2L17.5 16.6L22.5 14Z" fill="url(#ecom-cube-top)" />
        {/* Cube Left Face */}
        <path d="M17.5 16.6L22.5 19.2V24.8L17.5 22.2V16.6Z" fill="url(#ecom-cube-left)" />
        {/* Cube Right Face */}
        <path d="M22.5 19.2L27.5 16.6V22.2L22.5 24.8V19.2Z" fill="url(#ecom-cube-right)" />
        {/* Shopping Bag Handle */}
        <path
          d="M20.5 14.5V13C20.5 11.8954 21.3954 11 22.5 11C23.6046 11 24.5 11.8954 24.5 13V14.5"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Speed / Tech dynamic streak */}
        <circle cx="28.5" cy="14" r="1" fill="#38bdf8" />
      </g>
    </svg>
  )
}
