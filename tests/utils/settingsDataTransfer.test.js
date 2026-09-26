import { describe, expect, it } from 'vitest';
import {
  buildExportFilename,
  serializeItemsExport,
  validateImportedItems,
} from '../../src/utils/settingsDataTransfer';

describe('settingsDataTransfer', () => {
  it('validates imported item arrays using the existing required item fields', () => {
    expect(validateImportedItems([{
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-09-01T12:00:00.000Z',
    }])).toBe(true);

    expect(validateImportedItems({ items: [] })).toBe(false);
    expect(validateImportedItems([null])).toBe(false);
    expect(validateImportedItems([{
      name: 'Laptop',
      price: 0,
      purchaseDate: '2026-09-01T12:00:00.000Z',
    }])).toBe(false);
    expect(validateImportedItems([{
      name: 'Laptop',
      price: 1200,
    }])).toBe(false);
  });

  it('serializes exports with the existing formatted JSON convention', () => {
    const items = [{
      id: 'item-1',
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-09-01T12:00:00.000Z',
    }];

    expect(serializeItemsExport(items)).toBe(JSON.stringify(items, null, 2));
  });

  it('builds the existing dated export filename deterministically', () => {
    expect(buildExportFilename(new Date('2026-09-27T02:45:00.000Z')))
      .toBe('worthwhile-export-2026-09-27.json');
  });
});
