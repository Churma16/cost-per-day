const translation = {
  // General
  "appName": "Biaya Per Hari",
  "loading": "Memuat...",
  "version": "Versi",
  "appTitle": "Biaya Per Hari",
  "appDescription": "Hitung biaya harian barang Anda",

  // Header
  "totalDailyCost": "Total Biaya Harian",
  "perDay": "/hari",

  // Item List
  "noItems": "Belum ada barang",
  "purchaseAmount": "Harga pembelian",
  "purchaseDate": "Tanggal pembelian",
  "daysAgo": "hari",
  "edit": "Edit",
  "itemStatus": "Status barang",
  "statusActive": "Aktif",
  "statusRetired": "Dipensiunkan",
  "statusSold": "Terjual",
  "statusLost": "Hilang",
  "ownershipEndDate": "Tanggal akhir kepemilikan",
  "salePrice": "Harga jual",
  "enterSalePrice": "Masukkan harga jual",
  "currentCostPerDay": "Biaya saat ini per hari",
  "finalGrossCostPerDay": "Biaya kotor final per hari",
  "netOwnershipCost": "Biaya kepemilikan bersih",
  "netCostPerDay": "Biaya bersih per hari",
  "ownershipDays": "hari dimiliki",

  // Add/Edit Item
  "addNewItem": "Tambah Barang Baru",
  "editItem": "Edit Barang",
  "itemName": "Nama Barang",
  "enterItemName": "Masukkan nama barang",
  "price": "Harga",
  "enterPrice": "Masukkan harga",
  "date": "Tanggal Pembelian",
  "save": "Simpan",
  "deleteItem": "Hapus Barang",

  // Delete confirmation
  "confirmDelete": "Konfirmasi Hapus",
  "deleteConfirmation": "Apakah Anda yakin ingin menghapus barang ini? Tindakan ini tidak dapat dibatalkan.",
  "cancel": "Batal",
  "confirm": "Konfirmasi",

  // Settings
  "settings": "Pengaturan",
  "language": "Bahasa",
  "selectLanguage": "Pilih Bahasa",
  "currency": "Mata Uang",
  "selectCurrency": "Pilih Mata Uang",
  "dataManagement": "Pengelolaan Data",
  "exportData": "Ekspor Data",
  "importData": "Impor Data",

  // Currencies
  "usd": "Dolar AS (USD)",
  "eur": "Euro (EUR)",
  "cny": "Yuan Tiongkok (CNY)",
  "idr": "Rupiah Indonesia (IDR)",

  // Alerts
  "comingSoon": "Segera hadir",

  // Notifications
  "noDataForExport": "Tidak ada data untuk diekspor",
  "exportSuccess": "Data berhasil diekspor",
  "exportError": "Gagal mengekspor data",

  // Import/Export
  "invalidFileFormat": "Format file tidak valid. Pilih file .json",
  "invalidJsonFormat": "Format JSON dalam file tidak valid",
  "errorReadingFile": "Terjadi kesalahan saat membaca file",
  "invalidDataFormat": "Format data tidak valid. Data tidak dapat diimpor",
  "duplicateIds": "Ditemukan ID duplikat dalam data. Perbaiki lalu coba lagi",
  "importWarning": "Peringatan Impor",
  "importConfirmation": "Mengimpor data akan sepenuhnya mengganti semua data yang ada. Lanjutkan?",
  "importSuccess": "Data berhasil diimpor",
  "importError": "Gagal mengimpor data",

  // Value Equivalents
  "valueEquivalents": "Perbandingan Nilai",
  "valueEquivalentsDescription": "Terjemahkan biaya harian menjadi perbandingan pengeluaran sehari-hari yang akrab.",
  "addEquivalent": "Tambah Perbandingan",
  "editEquivalent": "Edit Perbandingan",
  "deleteEquivalent": "Hapus Perbandingan",
  "equivalentName": "Nama",
  "enterEquivalentName": "mis. Kopi, Gorengan",
  "equivalentAmount": "Harga",
  "enterEquivalentAmount": "Masukkan harga",
  "noEquivalents": "Belum ada perbandingan nilai yang ditambahkan",
  "confirmDeleteEquivalent": "Apakah Anda yakin ingin menghapus perbandingan nilai ini?",
  "errorLoadingEquivalents": "Gagal memuat perbandingan nilai",
  "equivalentPerDay": "{{count}} {{name}}/hari",
  "equivalentEveryNDays": "1 {{name}} setiap {{count}} hari",
  "equivalentPerMonth": "{{count}} {{name}}/bulan",

  // Insights Carousel
  "insights": "Wawasan",
  "insightsCarousel": "Korsel Wawasan",
  "previousInsight": "Wawasan sebelumnya",
  "nextInsight": "Wawasan berikutnya",
  "goToSlide": "Buka slide {{number}}",
  "slideOf": "Slide {{current}} dari {{total}}",
  "noInsightsYet": "Wawasan akan muncul seiring bertambahnya koleksi Anda",
  "insightsWelcomeTitle": "Kepemilikan Bijak",
  "insightsWelcomeCaption": "Lacak pembelian Anda dan amati bagaimana biaya hariannya berkembang seiring waktu.",

  // Planned Purchases
  "plannedPurchases": "Pembelian Terencana",
  "planningSubtitle": "Pahami hubungan antara harga dan waktu sebelum melakukan pembelian.",
  "addPlannedPurchase": "Tambah Pembelian Terencana",
  "editPlannedPurchase": "Edit Pembelian Terencana",
  "newPlan": "Rencana Baru",
  "noPlannedPurchases": "Belum ada pembelian terencana",
  "noPlannedPurchasesDescription": "Pahami pembelian besar dengan membaginya menjadi kontribusi berulang yang terjangkau sebelum membeli.",
  "targetItemName": "Nama barang impian",
  "enterTargetItemName": "mis. Laptop, Kamera, Jaket Musim Dingin",
  "targetPrice": "Target harga",
  "enterTargetPrice": "Masukkan target harga",
  "planningMode": "Arah Perencanaan",
  "modeContributionToTime": "Kontribusi -> Waktu",
  "modeTargetDateToContribution": "Target Waktu -> Kontribusi",
  "recurringContribution": "Kontribusi rutin",
  "enterContributionAmount": "Masukkan nominal",
  "cadence": "Frekuensi",
  "cadenceDaily": "Harian",
  "cadenceWeekly": "Mingguan",
  "cadenceMonthly": "Bulanan",
  "targetDate": "Target tanggal",
  "timeToReachTarget": "Estimasi waktu mencapai target",
  "requiredContribution": "Kontribusi yang dibutuhkan",
  "reachTargetIn": "Sekitar {{periods}} {{cadence}} (~{{days}} hari)",
  "requiredDaily": "{{amount}}/hari",
  "requiredWeekly": "{{amount}}/minggu",
  "requiredMonthly": "{{amount}}/bulan",
  "planningDisclaimer": "Estimasi waktu dan kontribusi adalah proyeksi perencanaan objektif, bukan jaminan atau nasihat keuangan.",
  "confirmDeletePlannedPurchase": "Apakah Anda yakin ingin menghapus pembelian terencana ini? Tindakan ini tidak dapat dibatalkan.",
  "statusPlanned": "Terencana",
  "exploreFraming": "Eksplorasi Framing",
  "daysRemaining": "{{days}} hari tersisa"
};

export default translation;

