import { describe, expect, it } from 'vitest';
import {
  buildItemPayload,
  createInitialItemFormValues,
  itemFormValuesToDraftData,
  itemToFormValues,
  validateItemForm,
} from '../../src/utils/itemForm';

const createFormValues = (overrides = {}) => ({
  name: 'Laptop',
  price: '1200',
  category: 'Tech',
  brand: 'Example',
  purchaseDate: new Date('2026-09-01T12:00:00.000Z'),
  status: 'active',
  endedAt: '',
  salePrice: '',
  targetType: 'none',
  targetValue: '',
  targetMode: 'manual',
  selectedBenchmarkItemId: '',
  ...overrides,
});

describe('itemForm', () => {
  it('restores add-item draft values without changing ownership-date semantics', () => {
    const values = createInitialItemFormValues({
      name: 'Draft laptop',
      price: '1500',
      category: 'Computers',
      brand: 'Framework',
      purchaseDate: '2026-09-20',
      targetType: 'duration',
      targetValue: '730',
      targetMode: 'manual',
      selectedBenchmarkItemId: 'old-laptop',
      replacesItemId: 'older-laptop',
    });

    expect(values).toMatchObject({
      name: 'Draft laptop',
      price: '1500',
      category: 'Computers',
      brand: 'Framework',
      status: 'active',
      targetType: 'duration',
      targetValue: '730',
      targetMode: 'manual',
      selectedBenchmarkItemId: 'old-laptop',
      replacesItemId: 'older-laptop',
    });
    expect(values.purchaseDate.toISOString()).toBe('2026-09-20T12:00:00.000Z');
    expect(itemFormValuesToDraftData(values).purchaseDate).toBe('2026-09-20');
  });

  it('hydrates edit values including nullable fields and legacy target values', () => {
    expect(itemToFormValues({
      id: 'item-1',
      name: 'Phone',
      price: 500,
      purchaseDate: '2026-01-02T03:00:00.000Z',
      category: null,
      brand: null,
      status: 'sold',
      endedAt: '2026-09-10T12:00:00.000Z',
      salePrice: 100,
      targetType: 'cost_per_day',
      targetValue: null,
      targetCostPerDay: 2.5,
    })).toEqual({
      name: 'Phone',
      price: '500',
      category: '',
      brand: '',
      purchaseDate: new Date('2026-01-02T12:00:00.000Z'),
      status: 'sold',
      endedAt: '2026-09-10',
      salePrice: '100',
      targetType: 'cost_per_day',
      targetValue: '2.5',
      replacesItemId: '',
    });
  });

  it('validates lifecycle and ownership-target fields without UI dependencies', () => {
    const invalidSold = validateItemForm(createFormValues({
      status: 'sold',
      endedAt: '2026-09-11',
      salePrice: '',
      targetType: 'duration',
      targetValue: '365',
    }), {
      isEditMode: true,
      currentDateValue: '2026-09-26',
    });
    expect(invalidSold.isValid).toBe(false);
    expect(invalidSold.lifecycleFormValid).toBe(false);

    const benchmarkBrowsing = validateItemForm(createFormValues({
      targetMode: 'benchmark',
      targetType: 'duration',
      targetValue: '',
    }), {
      isEditMode: false,
      currentDateValue: '2026-09-26',
    });
    expect(benchmarkBrowsing.isValid).toBe(true);
    expect(benchmarkBrowsing.targetFormValid).toBe(true);
  });

  it('hydrates and serializes the explicit ownership journey relationship', () => {
    const hydrated = itemToFormValues({
      id: 'new-headphones',
      name: 'New Headphones',
      price: 300,
      purchaseDate: '2026-09-20T12:00:00.000Z',
      replacesItemId: 'old-headphones',
    });

    expect(hydrated.replacesItemId).toBe('old-headphones');

    expect(buildItemPayload(createFormValues({
      replacesItemId: 'old-headphones',
    }))).toEqual(expect.objectContaining({
      replacesItemId: 'old-headphones',
    }));

    expect(buildItemPayload(createFormValues({
      replacesItemId: '',
    }), { isEditMode: true })).toEqual(expect.objectContaining({
      replacesItemId: null,
    }));
  });

  it('builds create and edit payloads with canonical ownership timestamps', () => {
    expect(buildItemPayload(createFormValues({
      name: '  Laptop  ',
      category: '  ',
      targetType: 'duration',
      targetValue: '365',
    }))).toEqual({
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-09-01T12:00:00.000Z',
      category: null,
      brand: 'Example',
      targetType: 'duration',
      targetValue: 365,
      replacesItemId: null,
    });

    expect(buildItemPayload(createFormValues({
      status: 'sold',
      endedAt: '2026-09-20',
      salePrice: '400',
      targetType: 'none',
    }), { isEditMode: true })).toEqual({
      name: 'Laptop',
      price: 1200,
      purchaseDate: '2026-09-01T12:00:00.000Z',
      category: 'Tech',
      brand: 'Example',
      status: 'sold',
      endedAt: '2026-09-20T12:00:00.000Z',
      salePrice: 400,
      targetType: null,
      targetValue: null,
      replacesItemId: null,
    });
  });
});
