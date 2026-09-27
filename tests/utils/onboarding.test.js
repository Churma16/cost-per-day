import { describe, expect, test } from 'vitest';
import {
  hasCompletedOnboarding,
  sanitizeOnboardingSettings,
  suggestCurrency,
  suggestLanguage,
} from '../../src/utils/onboarding';

describe('first-run onboarding preferences', () => {
  test('suggests supported language and currency from device locales', () => {
    expect(suggestLanguage(['id-ID', 'en-US'])).toBe('id');
    expect(suggestCurrency(['id-ID', 'en-US'])).toBe('IDR');
    expect(suggestCurrency(['de-DE'])).toBe('EUR');
    expect(suggestCurrency(['zh-CN'])).toBe('CNY');
  });

  test('falls back safely when the locale is unsupported or incomplete', () => {
    expect(suggestLanguage(['fr-CA'])).toBe('en');
    expect(suggestCurrency(['fr-CA'])).toBe('USD');
    expect(suggestCurrency([])).toBe('USD');
  });

  test('requires an explicit persisted completion marker', () => {
    expect(hasCompletedOnboarding({ language: 'en', currency: 'USD' })).toBe(false);
    expect(hasCompletedOnboarding({ onboardingCompleted: 'true' })).toBe(true);
    expect(hasCompletedOnboarding({ onboardingCompleted: true })).toBe(true);
  });

  test('only carries valid preferences through guest sign-in', () => {
    expect(sanitizeOnboardingSettings({
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
      unsafe: 'ignored',
    })).toEqual({
      language: 'id',
      currency: 'IDR',
      onboardingCompleted: 'true',
    });
    expect(sanitizeOnboardingSettings({ language: 'fr', currency: 'BTC' })).toEqual({});
  });
});
