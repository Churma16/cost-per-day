import translationEN from '../../../src/i18n/locales/en';
import translationID from '../../../src/i18n/locales/id';

describe('Indonesian translation resource', () => {
  test('defines every translation key available in English', () => {
    expect(Object.keys(translationID).sort()).toEqual(Object.keys(translationEN).sort());
  });

  test('contains representative native Indonesian translations', () => {
    expect(translationID.settings).toBe('Pengaturan');
    expect(translationID.addNewItem).toBe('Tambah Barang Baru');
    expect(translationID.totalDailyCost).toBe('Biaya Kepemilikan Harian');
    expect(translationID.selectLanguage).toBe('Pilih Bahasa');
    expect(translationID.appName).toBe('Worthwhile');
    expect(translationID.appTitle).toBe('Worthwhile');
    expect(translationID.appDescription).toBe(
      'Pahami arti pembelian seiring waktu, sebelum membeli dan selama memilikinya.'
    );
    expect(translationEN.itemStatus).toBe('Ownership Journey');
    expect(translationEN.statusActiveEarly).toBe('Just Joined You');
    expect(translationEN.statusActive).toBe('Still With You');
    expect(translationEN.statusRetired).toBe('No Longer in Use');
    expect(translationEN.statusSold).toBe('Changed Hands');
    expect(translationEN.statusLost).toBe('Lost');
    expect(translationID.itemStatus).toBe('Perjalanan Kepemilikan');
    expect(translationID.statusActiveEarly).toBe('Baru Bergabung');
    expect(translationID.statusActive).toBe('Masih Bersamamu');
    expect(translationID.statusRetired).toBe('Selesai Digunakan');
    expect(translationID.statusSold).toBe('Berpindah Tangan');
    expect(translationID.statusLost).toBe('Hilang');
    expect(translationEN.navHome).toBe('Home');
    expect(translationID.navHome).toBe('Beranda');
    expect(translationEN.requiredContribution).toBe('Estimated contribution');
    expect(translationID.requiredContribution).toBe('Estimasi kontribusi');
    expect(translationEN.insightTitleBestValue).toBe('Lowest Daily Cost So Far');
    expect(translationID.insightTitleBestValue).toBe('Biaya Harian Terendah Saat Ini');
  });
});
