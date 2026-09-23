import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PageMetadata from './PageMetadata';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

describe('PageMetadata component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';
    const existingMeta = document.querySelector('meta[name="description"]');
    if (existingMeta) {
      existingMeta.remove();
    }
  });

  it('updates document.title and creates meta description in English', () => {
    useLanguage.mockReturnValue({ language: 'en' });
    useTranslation.mockReturnValue({
      t: (key) => {
        if (key === 'appTitle') return 'Worthwhile';
        if (key === 'appDescription')
          return 'Understand big purchases through time, before buying and after ownership.';
        return key;
      },
    });

    render(<PageMetadata />);

    expect(document.title).toBe('Worthwhile');
    const metaElement = document.querySelector('meta[name="description"]');
    expect(metaElement).not.toBeNull();
    expect(metaElement?.getAttribute('content')).toBe(
      'Understand big purchases through time, before buying and after ownership.'
    );
  });

  it('updates existing meta description when switching language to Indonesian', () => {
    const initialMeta = document.createElement('meta');
    initialMeta.name = 'description';
    initialMeta.content = 'Old description';
    document.head.appendChild(initialMeta);

    useLanguage.mockReturnValue({ language: 'id' });
    useTranslation.mockReturnValue({
      t: (key) => {
        if (key === 'appTitle') return 'Worthwhile';
        if (key === 'appDescription')
          return 'Pahami pembelian besar dari waktu ke waktu, sebelum membeli dan setelah memiliki.';
        return key;
      },
    });

    render(<PageMetadata />);

    expect(document.title).toBe('Worthwhile');
    const metaElement = document.querySelector('meta[name="description"]');
    expect(metaElement?.getAttribute('content')).toBe(
      'Pahami pembelian besar dari waktu ke waktu, sebelum membeli dan setelah memiliki.'
    );
  });
});
