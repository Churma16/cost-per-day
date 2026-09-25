import { describe, it, expect } from 'vitest';
import {
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_DESCRIPTION,
  PRODUCT_EXPORT_PREFIX,
  APP_VERSION,
} from '../../src/constants/branding';

describe('branding constants', () => {
  it('defines the canonical product name as Worthwhile', () => {
    expect(PRODUCT_NAME).toBe('Worthwhile');
  });

  it('defines the product tagline', () => {
    expect(PRODUCT_TAGLINE).toBe('Make big purchases make sense over time.');
  });

  it('defines the broader product philosophy description', () => {
    expect(PRODUCT_DESCRIPTION).toBe(
      'Understand big purchases through time, before buying and after ownership.'
    );
  });

  it('defines the product export prefix', () => {
    expect(PRODUCT_EXPORT_PREFIX).toBe('worthwhile-export');
  });

  it('defines the application version matching semver format', () => {
    expect(APP_VERSION).toBeDefined();
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
