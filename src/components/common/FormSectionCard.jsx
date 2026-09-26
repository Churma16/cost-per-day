import React from 'react';

export const formControlClassName = `w-full px-3 py-2 rounded-xl border border-[#E6E8EC]
  bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20
  outline-none transition-all duration-200 text-sm scroll-mt-6`;

export function FormField({ label, htmlFor, required = false, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs text-gray-600 font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function FormSectionCard({ title = null, dashed = false, children, className = '', ...props }) {
  return (
    <section
      className={`bg-white rounded-2xl border ${
        dashed ? 'border-dashed' : 'border-solid'
      } border-[#E6E8EC] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-2.5 ${className}`}
      {...props}
    >
      {title && (
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export default FormSectionCard;
