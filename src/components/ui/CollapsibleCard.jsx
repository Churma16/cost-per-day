import React from 'react';

/**
 * CollapsibleCard - Core layout primitive for expandable cards.
 * Provides consistent rounded-2xl corners, border & shadow states,
 * focus rings, smooth CSS-grid expansion, and accessibility attributes.
 */
export function CollapsibleCard({
  id,
  triggerId,
  contentId,
  isExpanded = false,
  onToggle,
  header,
  children,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  triggerAriaLabel,
}) {
  const resolvedTriggerId = triggerId || (id ? `card-trigger-${id}` : undefined);
  const resolvedContentId = contentId || (id ? `card-content-${id}` : undefined);

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'border border-teal-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
          : 'border border-[#E6E8EC] shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-[#D5D8DF]'
      } ${className}`}
    >
      <button
        type="button"
        id={resolvedTriggerId}
        aria-expanded={isExpanded}
        aria-controls={resolvedContentId}
        aria-label={triggerAriaLabel}
        onClick={onToggle}
        className={`w-full text-left p-3.5 sm:p-4 min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset transition-colors rounded-xl ${triggerClassName}`}
      >
        {header}
      </button>

      <div
        id={resolvedContentId}
        role="region"
        aria-labelledby={resolvedTriggerId}
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100 visible'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none invisible'
        }`}
      >
        <div className="overflow-hidden">
          <div className={`px-4 pb-4 pt-3 border-t border-[#E6E8EC] ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollapsibleCard;
