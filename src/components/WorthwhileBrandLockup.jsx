import React from 'react';
import { PRODUCT_NAME } from '../constants/branding';

function WorthwhileBrandLockup({ className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`.trim()}
      aria-label={PRODUCT_NAME}
    >
      <span className="h-8 w-8 flex-shrink-0 overflow-hidden" aria-hidden="true">
        <img
          src="/worthwhile-icon-192-v2.png"
          alt=""
          className="h-12 w-12 max-w-none -translate-x-2 -translate-y-3.5 object-contain"
        />
      </span>
      <span className="text-xl font-semibold leading-6 tracking-[-0.015em] text-[#26353D]">
        {PRODUCT_NAME}
      </span>
    </div>
  );
}

export default WorthwhileBrandLockup;
