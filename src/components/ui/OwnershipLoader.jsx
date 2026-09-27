import React from 'react';

/**
 * Worthwhile's indeterminate progress mark, derived from the Home ownership ring.
 * Keep its color bound to the shared --loader-accent/--icon-accent tokens.
 */
function OwnershipLoader({ active = true, className = '', label = null }) {
  const accessibilityProps = label
    ? { role: 'status', 'aria-label': label }
    : { 'aria-hidden': true };

  return (
    <svg
      {...accessibilityProps}
      viewBox="0 0 26 26"
      className={`ownership-loader ${active ? 'ownership-loader--active' : ''} ${className}`.trim()}
      fill="none"
    >
      <circle
        cx="13"
        cy="13"
        r="9.5"
        stroke="var(--loader-track)"
        strokeWidth="2.2"
      />
      <g className="ownership-loader__spin">
        <circle
          className="ownership-loader__arc"
          cx="13"
          cy="13"
          r="9.5"
          stroke="var(--loader-accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      <circle
        className="ownership-loader__dot"
        cx="13"
        cy="13"
        r="2.2"
        fill="var(--loader-accent)"
      />
    </svg>
  );
}

export default OwnershipLoader;
