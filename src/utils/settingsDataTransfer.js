import { PRODUCT_EXPORT_PREFIX } from '../constants/branding';

export const validateImportedItems = (data) => (
  Array.isArray(data)
  && data.every((item) => (
    item
    && typeof item === 'object'
    && !Array.isArray(item)
    && Boolean(item.name)
    && Number.isFinite(Number(item.price))
    && Number(item.price) > 0
    && Boolean(item.purchaseDate)
  ))
);

export const serializeItemsExport = (items) => JSON.stringify(items, null, 2);

export const buildExportFilename = (date) => (
  `${PRODUCT_EXPORT_PREFIX}-${date.toISOString().split('T')[0]}.json`
);
