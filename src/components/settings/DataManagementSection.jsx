import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IoChevronForward,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';

function DataManagementSection({
  fileInputRef,
  isInteractionBlocked,
  onExport,
  onImport,
  onFileChange,
}) {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-xs font-medium text-gray-500 mb-1.5 px-1">
        {t('data')}
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
          onClick={() => {
            if (!isInteractionBlocked) onExport();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
              <IoCloudDownloadOutline className="text-base" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 leading-tight">{t('exportData')}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t('exportDataSubtitle')}</p>
            </div>
          </div>
          <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
        </button>

        <div className="border-b border-gray-100 mx-3.5" />

        <button
          type="button"
          className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-slate-50/70 transition-colors text-left"
          onClick={() => {
            if (!isInteractionBlocked) onImport();
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 flex-shrink-0">
              <IoCloudUploadOutline className="text-base" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 leading-tight">{t('importData')}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t('importDataSubtitle')}</p>
            </div>
          </div>
          <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}

export default DataManagementSection;
