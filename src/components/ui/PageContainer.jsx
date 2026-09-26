import React, { forwardRef } from 'react';

/**
 * PageContainer - Standardized outer shell for top-level pages
 * (Planned Purchases, Add Entry, Settings, etc.) ensuring uniform maximum width,
 * horizontal padding, and vertical rhythm across the application.
 */
export const PageContainer = forwardRef(function PageContainer(
  {
    children,
    className = '',
    maxWidth = 'max-w-3xl',
    padded = true,
    as: Component = 'div',
    ...restProps
  },
  ref
) {
  const paddingAndSpacingClasses = padded ? 'px-4 pb-8 space-y-4' : '';
  const combinedClassName = `${paddingAndSpacingClasses} ${maxWidth} mx-auto w-full ${className}`.trim();

  return (
    <Component
      ref={ref}
      className={combinedClassName}
      {...restProps}
    >
      {children}
    </Component>
  );
});

export default PageContainer;
