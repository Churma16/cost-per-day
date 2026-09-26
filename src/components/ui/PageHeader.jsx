import React, { memo } from 'react';

/**
 * PageHeader - Standardized top page header for top-level pages
 * (Planned Purchases, Add Entry, Settings) ensuring consistent typography and vertical rhythm.
 */
export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  className = '',
  children,
}) {
  return (
    <div className={`pt-6 pb-1 px-1 ${className}`}>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed text-[#6F7782]">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
});

export default PageHeader;
