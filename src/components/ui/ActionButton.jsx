import React from 'react';

/**
 * ActionButton - Shared standard action button used in card drawers and modals.
 * Supports secondary (neutral), danger (delete), and primary (call-to-action) variants.
 */
export function ActionButton({
  variant = 'secondary',
  icon: Icon,
  children,
  onClick,
  tabIndex = 0,
  disabled = false,
  className = '',
  title,
  'aria-label': ariaLabel,
  ...restProps
}) {
  let variantStyles = 'bg-[#F6F7F8] hover:bg-[#EEF0F3] border border-[#E6E8EC] text-[#20242A] focus-visible:ring-teal-500';

  if (variant === 'danger') {
    variantStyles = 'bg-white hover:bg-red-50 border border-red-200 text-red-600 focus-visible:ring-red-500';
  } else if (variant === 'primary') {
    variantStyles = 'bg-teal-600 hover:bg-teal-700 border border-teal-600 text-white focus-visible:ring-teal-500';
  }

  return (
    <button
      type="button"
      tabIndex={tabIndex}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${className}`}
      {...restProps}
    >
      {Icon && <Icon className="text-base shrink-0" aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export default ActionButton;
