import React from 'react';
import { useTranslation } from 'react-i18next';
import FormSectionCard, { FormField, formControlClassName } from '../common/FormSectionCard';

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
    <FormSectionCard title={t('optionalDetailsSection')} dashed>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <FormField label={t('category')} htmlFor="item-category">
          <input
            id="item-category"
            type="text"
            list="category-suggestions"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            placeholder={t('enterCategory')}
            className={formControlClassName}
          />
          <datalist id="category-suggestions">
            {availableCategories.map((categoryOption) => (
              <option key={categoryOption.id || categoryOption.name} value={categoryOption.name} />
            ))}
          </datalist>
        </FormField>

        <FormField label={t('brand')} htmlFor="item-brand">
          <input
            id="item-brand"
            type="text"
            list="brand-suggestions"
            value={brand}
            onChange={(event) => onBrandChange(event.target.value)}
            placeholder={t('enterBrand')}
            className={formControlClassName}
          />
          <datalist id="brand-suggestions">
            {availableBrands.map((brandOption) => (
              <option key={brandOption.id || brandOption.name} value={brandOption.name} />
            ))}
          </datalist>
        </FormField>
      </div>
    </FormSectionCard>
  );
}

export default ItemOptionalDetailsCard;
