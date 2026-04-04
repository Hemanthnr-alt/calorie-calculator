import { Link } from 'react-router-dom';

// ─── SVG logo mark — explicit colors, no CSS var inheritance issues ────────────
function LogoMark({ size = 38 }) {
  // Use a unique gradient ID to avoid conflicts if multiple instances render
  const gradId = 'brandGrad_30cal';
  const glowId = 'brandGlow_30cal';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#34d399" />
          <stop offset="55%"  stopColor="#22c990" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background rounded rect */}
      <rect
        x="1" y="1" width="42" height="42"
        rx="12"
        fill={`url(#${gradId})`}
      />

      {/* Inner highlight */}
      <rect
        x="1" y="1" width="42" height="18"
        rx="12"
        fill="rgba(255,255,255,0.12)"
      />

      {/* "30" text */}
      <text
        x="22"
        y="29"
        textAnchor="middle"
        fill="#ffffff"
        style={{
          fontSize: '15px',
          fontWeight: 800,
          fontFamily: "'Sora', 'Plus Jakarta Sans', system-ui, sans-serif",
          letterSpacing: '-0.05em',
        }}
      >
        30
      </text>
    </svg>
  );
}

// ─── BrandLogo component ──────────────────────────────────────────────────────
export function BrandLogo({ to, size = 'md', className = '' }) {
  const dim  = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const tSz  = size === 'sm' ? '0.95rem' : size === 'lg' ? '1.15rem' : '1.05rem';

  const inner = (
    <span
      className={`brand-logo-wrap ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
    >
      <LogoMark size={dim} />
      <span className="brand-logo-text">
        <span
          className="brand-logo-title"
          style={{ fontSize: tSz }}
        >
          30 Cal
        </span>
        <span className="brand-logo-tagline">Daily nutrition</span>
      </span>
    </span>
  );

  if (to === null) return inner;

  return (
    <Link
      to={to ?? '/'}
      className="brand-logo-link"
      aria-label="30 Cal — go to overview"
    >
      {inner}
    </Link>
  );
}
