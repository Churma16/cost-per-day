import translationEN from './en';
import translationID from './id';

describe('Indonesian translation resource', () => {
  test('defines every translation key available in English', () => {
    expect(Object.keys(translationID).sort()).toEqual(Object.keys(translationEN).sort());
  });

  test('contains representative native Indonesian translations', () => {
    expect(translationID.settings).toBe('Pengaturan');
    expect(translationID.addNewItem).toBe('Tambah Barang Baru');
    expect(translationID.totalDailyCost).toBe('Total Biaya Harian');
    expect(translationID.selectLanguage).toBe('Pilih Bahasa');
    expect(translationID.appName).toBe('Worthwhile');
    expect(translationID.appTitle).toBe('Worthwhile');
    expect(translationID.appDescription).toBe(
      'Pahami pembelian besar dari waktu ke waktu, sebelum membeli dan setelah memiliki.'
    );
  });
});
