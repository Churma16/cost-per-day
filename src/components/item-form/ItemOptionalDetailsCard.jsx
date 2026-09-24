import React from 'react';
import { useTranslation } from 'react-i18next';

function ItemOptionalDetailsCard({
  category,
  onCategoryChange,
  brand,
  onBrandChange,
  availableCategories = [],
  availableBrands = [],
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-dashed border-[#E6E8EC] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-2.5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
        {t('optionalDetailsSection')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label htmlFor="item-category" className="text-xs text-gray-600 font-medium">
            {t('category')}
          </label>
          <input
            id="item-category"
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            placeholder={t('enterCategory')}
            className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] focus:border-teal-600 
            focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
          />
          <datalist id="category-suggestions">
            {availableCategories.map((categoryOption) => (
              <option key={categoryOption.id || categoryOption.name} value={categoryOption.name} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1">
          <label htmlFor="item-brand" className="text-xs text-gray-600 font-medium">
            {t('brand')}
          </label>
          <input
            id="item-brand"
            type="text"
            list="brand-suggestions"
            value={brand}
            onChange={(event) => onBrandChange(event.target.value)}
            placeholder={t('enterBrand')}
            className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] focus:border-teal-600 
            focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
          />
          <datalist id="brand-suggestions">
            {availableBrands.map((brandOption) => (
              <option key={brandOption.id || brandOption.name} value={brandOption.name} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

export default ItemOptionalDetailsCard;
