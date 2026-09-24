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
    expect(translationEN.itemStatus).toBe('Ownership Journey');
    expect(translationEN.statusActive).toBe('Still With You');
    expect(translationEN.statusRetired).toBe('No Longer in Use');
    expect(translationEN.statusSold).toBe('Changed Hands');
    expect(translationEN.statusLost).toBe('Lost');
    expect(translationID.itemStatus).toBe('Perjalanan Kepemilikan');
    expect(translationID.statusActive).toBe('Masih Bersamamu');
    expect(translationID.statusRetired).toBe('Selesai Digunakan');
    expect(translationID.statusSold).toBe('Berpindah Tangan');
    expect(translationID.statusLost).toBe('Hilang');
  });
});
