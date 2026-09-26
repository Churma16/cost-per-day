import React from 'react';
import { PRODUCT_NAME } from '../constants/branding';

const SIZE_STYLES = {
  default: {
    lockup: 'gap-2',
    iconFrame: 'h-8 w-8',
    icon: 'h-12 w-12 -translate-x-2 -translate-y-3.5',
    wordmark: 'text-xl leading-6',
  },
  small: {
    lockup: 'gap-1.5',
    iconFrame: 'h-7 w-7',
    icon: 'h-[42px] w-[42px] -translate-x-[7px] -translate-y-3',
    wordmark: 'text-lg leading-6',
  },
  compact: {
    lockup: 'gap-1.5',
    iconFrame: 'h-6 w-6',
    icon: 'h-9 w-9 -translate-x-1.5 -translate-y-[10.5px]',
    wordmark: 'text-base leading-5',
  },
};

function WorthwhileBrandLockup({ className = '', size = 'default' }) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.default;

  return (
    <div
      className={`inline-flex items-center transition-all duration-300 ease-out ${styles.lockup} ${className}`.trim()}
      aria-label={PRODUCT_NAME}
    >
      <span
        className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-out ${styles.iconFrame}`}
        aria-hidden="true"
      >
        <img
          src="/worthwhile-icon-192-v2.png"
          alt=""
          className={`max-w-none object-contain transition-all duration-300 ease-out ${styles.icon}`}
        />
      </span>
      <span className={`font-semibold tracking-[-0.015em] text-[#26353D] transition-all duration-300 ease-out ${styles.wordmark}`}>
        {PRODUCT_NAME}
      </span>
    </div>
  );
}

export default WorthwhileBrandLockup;
