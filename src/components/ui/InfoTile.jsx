import React from 'react';

/**
 * InfoTile - Shared small metadata card with icon, label, and formatted value.
 * Used inside expanded cards across Home and Planning for visual consistency.
 */
export function InfoTile({
  icon: Icon,
  label,
  value,
  subValue,
  className = '',
}) {
  return (
    <div className={`bg-[#F6F7F8] rounded-xl p-2.5 sm:p-3 border border-[#E6E8EC] ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-[#6F7782] mb-1">
        {Icon && <Icon className="text-sm shrink-0" aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-semibold text-[#20242A] text-sm tabular-nums truncate">
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-[#6F7782] mt-0.5 truncate">
          {subValue}
        </div>
      )}
    </div>
  );
}

export default InfoTile;
