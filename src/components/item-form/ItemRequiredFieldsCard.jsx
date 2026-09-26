import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import { IoCalendarOutline } from 'react-icons/io5';
import { formatDisplayDate, getDateLocale } from '../../utils/formatters';
import {
  currentUTCDateOnly,
  dateOnlyToOwnershipDate,
  normalizeOwnershipDate,
  ownershipDateToDateOnly,
} from '../../utils/ownershipDate';
import CurrencyInput from '../common/CurrencyInput';
import FormSectionCard, { FormField, formControlClassName } from '../common/FormSectionCard';

function ItemRequiredFieldsCard({
  name,
  onNameChange,
  price,
  onPriceChange,
  purchaseDate,
  onPurchaseDateChange,
  currencySymbol,
  currencyCode,
  language,
}) {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [month, setMonth] = useState(purchaseDate);
  const dateLocale = getDateLocale(language);

  useEffect(() => {
    setMonth(purchaseDate);
    setShowDatePicker(false);
  }, [purchaseDate]);

  useEffect(() => {
    if (!showDatePicker) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (!event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  return (
    <FormSectionCard title={t('requiredSection')} data-swipe-protected>

      {/* Item Name */}
      <FormField label={t('itemName')} htmlFor="owned-item-name" required>
        <input
          id="owned-item-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          placeholder={t('enterItemName')}
          className={formControlClassName}
        />
      </FormField>

      {/* Price */}
      <FormField label={t('price')} htmlFor="owned-item-price" required>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</div>
          <CurrencyInput
            id="owned-item-price"
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
            required
            currencyCode={currencyCode}
            placeholder={t('enterPrice')}
            className={`${formControlClassName} ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'}`}
          />
        </div>
      </FormField>

      {/* Purchase Date */}
      <FormField label={t('date')} htmlFor="owned-item-purchase-date" required>

        {/* Combination of native date picker for mobile and custom date picker for desktop */}
        <div className="relative">
          {/* Display current selected date - clicking performs different actions based on device type */}
          <button
            id="owned-item-purchase-date"
            type="button"
            aria-label={`${t('date')}: ${formatDisplayDate(purchaseDate, language)}`}
            className={`${formControlClassName} flex items-center justify-between text-left`}
            onClick={() => {
              const isMobile = window.innerWidth <= 768;
              if (isMobile) {
                const nativeDatePicker = document.getElementById('native-date-picker');
                if (nativeDatePicker) {
                  if (typeof nativeDatePicker.showPicker === 'function') {
                    nativeDatePicker.showPicker();
                  } else {
                    nativeDatePicker.click();
                  }
                }
              } else {
                setShowDatePicker((current) => !current);
              }
            }}
          >
            <span>{formatDisplayDate(purchaseDate, language)}</span>
            <div className="text-gray-400">
              <IoCalendarOutline className="text-lg" />
            </div>
          </button>

          {/* Hidden native date picker - used on mobile only */}
          <input
            id="native-date-picker"
            type="date"
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer md:hidden"
            value={ownershipDateToDateOnly(purchaseDate)}
            onChange={(event) => {
              if (event.target.value) {
                onPurchaseDateChange(dateOnlyToOwnershipDate(event.target.value));
              }
            }}
            max={currentUTCDateOnly()}
          />

          {/* Custom date picker - used on desktop */}
          {showDatePicker && (
            <div className="relative z-30 date-picker-container">
              <div
                className="fixed inset-0 bg-black/20 z-30"
                onClick={() => setShowDatePicker(false)}
              ></div>
              <div className="absolute z-40 mt-2 bg-white rounded-xl shadow-xl overflow-hidden border border-[#E6E8EC] w-full max-w-[320px] left-1/2 -translate-x-1/2">
                {/* Year and month quick selectors */}
                <div className="flex justify-between items-center bg-gray-50 p-2 border-b">
                  {/* Year selection */}
                  <select
                    value={month.getFullYear()}
                    onChange={(event) => {
                      const year = parseInt(event.target.value, 10);
                      const newDate = new Date(month);
                      newDate.setFullYear(year);
                      setMonth(newDate);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md"
                  >
                    {Array.from({ length: 30 }, (_, index) => new Date().getFullYear() - index).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>

                  {/* Month selection */}
                  <select
                    value={month.getMonth()}
                    onChange={(event) => {
                      const monthIndex = parseInt(event.target.value, 10);
                      const newDate = new Date(month);
                      newDate.setMonth(monthIndex);
                      setMonth(newDate);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md"
                  >
                    {Array.from({ length: 12 }, (_, monthIndex) => {
                      const monthName = new Intl.DateTimeFormat(
                        dateLocale.code,
                        { month: 'long' }
                      ).format(new Date(2000, monthIndex));
                      return (
                        <option key={monthIndex} value={monthIndex}>{monthName}</option>
                      );
                    })}
                  </select>
                </div>

                <DayPicker
                  mode="single"
                  selected={purchaseDate}
                  onSelect={(date) => {
                    if (date) {
                      onPurchaseDateChange(normalizeOwnershipDate(date));
                      setShowDatePicker(false);
                    }
                  }}
                  month={month}
                  onMonthChange={setMonth}
                  locale={dateLocale}
                  toDate={new Date()}
                  modifiersClassNames={{
                    selected: 'bg-teal-600 text-white',
                    today: 'text-red-500 font-bold'
                  }}
                  className="p-2"
                />
              </div>
            </div>
          )}
        </div>
      </FormField>
    </FormSectionCard>
  );
}

export default ItemRequiredFieldsCard;
