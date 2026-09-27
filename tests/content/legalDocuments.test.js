import { describe, expect, test } from 'vitest';
import legalDocuments, { getLegalDocument } from '../../src/content/legalDocuments';

describe('legal documents', () => {
  test.each(['privacy', 'terms'])('keeps English and Indonesian %s content structurally equivalent', (documentKey) => {
    const englishDocument = legalDocuments.en[documentKey];
    const indonesianDocument = legalDocuments.id[documentKey];

    expect(indonesianDocument.sections).toHaveLength(englishDocument.sections.length);
    expect(indonesianDocument.sections.map((section) => Boolean(section.bullets))).toEqual(
      englishDocument.sections.map((section) => Boolean(section.bullets))
    );
    expect(englishDocument.effectiveDate).toBeTruthy();
    expect(indonesianDocument.effectiveDate).toBeTruthy();
  });

  test('selects Indonesian variants and safely falls back to English', () => {
    expect(getLegalDocument('privacy', 'id-ID').title).toBe('Kebijakan Privasi');
    expect(getLegalDocument('terms', 'fr').title).toBe('Terms of Service');
    expect(getLegalDocument('privacy').title).toBe('Privacy Policy');
  });
});
