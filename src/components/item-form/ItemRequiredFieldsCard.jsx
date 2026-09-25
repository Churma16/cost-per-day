import React from 'react';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import { IoCalendarOutline } from 'react-icons/io5';
import { formatDisplayDate } from '../../utils/formatters';
import {
  currentUTCDateOnly,
  dateOnlyToOwnershipDate,
  normalizeOwnershipDate,
  ownershipDateToDateOnly,
} from '../../utils/ownershipDate';
import CurrencyInput from '../common/CurrencyInput';

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
  showDatePicker,
  setShowDatePicker,
  month,
  setMonth,
  getLocale,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-[#E6E8EC] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-2.5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
        {t('requiredSection')}
      </div>

      {/* Item Name */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 font-medium">
          {t('itemName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          placeholder={t('enterItemName')}
          className="w-full px-3 py-2 rounded-xl border border-[#E6E8EC] focus:border-teal-600 
          focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm"
        />
      </div>

      {/* Price */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 font-medium">
          {t('price')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</div>
          <CurrencyInput
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
            required
            currencyCode={currencyCode}
            placeholder={t('enterPrice')}
            className={`w-full px-3 py-2 ${currencySymbol.length > 1 ? 'pl-9' : 'pl-7'} rounded-xl border border-[#E6E8EC] focus:border-teal-600 
            focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200 text-sm`}
          />
        </div>
      </div>

      {/* Purchase Date */}
      <div className="space-y-1">
        <label className="text-xs text-gray-600 font-medium">
          {t('date')} <span className="text-red-500">*</span>
        </label>

        {/* Combination of native date picker for mobile and custom date picker for desktop */}
        <div className="relative">
          {/* Display current selected date - clicking performs different actions based on device type */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E6E8EC] 
            focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all duration-200
            text-left text-sm"
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
                setShowDatePicker(!showDatePicker);
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
                      const monthName = new Intl.DateTimeFormat(getLocale().code, { month: 'long' }).format(new Date(2000, monthIndex));
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
                  locale={getLocale()}
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
      </div>
    </div>
  );
}

export default ItemRequiredFieldsCard;
