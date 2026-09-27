export const LEGAL_EFFECTIVE_DATE = 'September 27, 2026';

const legalDocuments = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      summary: 'How Worthwhile handles the information used to provide the service.',
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      sections: [
        {
          heading: 'Information Worthwhile handles',
          paragraphs: [
            'If you continue without an account, the items and planned purchases you enter are kept in your browser on that device. Guest Mode does not send those records to the Worthwhile server. If you later sign in, Worthwhile automatically attempts to migrate them to your account.',
            'When you sign in with Google, Worthwhile receives the Google account identifier, email address, display name, and profile image made available by the sign-in flow. Worthwhile creates its own user and session identifiers so your records remain associated with your account.',
            'Worthwhile stores information you choose to record in the app. Depending on the features you use, this can include item names, prices, currencies, purchase and ownership dates, sale details, ownership targets, planned purchases, contribution plans, personalized value equivalents, and language or currency preferences.'
          ]
        },
        {
          heading: 'Technical and operational information',
          paragraphs: [
            'The service may record operational logs needed to run and troubleshoot the application, such as request time, route, response status, errors, and network address. Deployment and application-version information may also be used when investigating a problem.',
            'Worthwhile does not currently use advertising trackers, marketing analytics, device fingerprinting, or advertising profiles.'
          ]
        },
        {
          heading: 'How the information is used',
          paragraphs: [
            'Account and session information is used to authenticate you and keep each user’s records separate. Information you enter is used to provide ownership, cost-per-day, planning, durability, and comparison features, and to preserve your records between visits.',
            'Operational information is used to operate, secure, diagnose, and improve the service.'
          ]
        },
        {
          heading: 'Storage and sharing',
          paragraphs: [
            'Guest items and planned purchases are stored locally in the browser’s IndexedDB storage on that device. Signed-in application records are stored in Worthwhile’s server-side database and associated with an application user identifier. Session tokens are stored in a browser cookie; the server stores a hash of the session token rather than the token itself.',
            'Google processes information when you use Google sign-in and provides the profile details described above. Worthwhile does not sell your personal information or share it for advertising. The project operator may access stored records and logs when reasonably necessary to operate, secure, or troubleshoot the service.'
          ]
        },
        {
          heading: 'Retention and requests',
          paragraphs: [
            'Guest records remain in that browser until they are cleared by you, the browser, or a successful migration flow. Server information may be retained while it is needed to provide and operate this Early Beta service, and some records may remain for a reasonable period in operational logs or backups. Worthwhile does not currently provide an automated account-deletion or server-data export workflow beyond the in-app item backup feature.',
            'For privacy questions or requests concerning your data, contact the project owner through the Worthwhile GitHub repository. A request may require identity verification before account information is disclosed or changed.'
          ]
        },
        {
          heading: 'Changes to this policy',
          paragraphs: [
            'This policy may be updated as Worthwhile evolves. Material changes will be reflected here with a revised effective date.'
          ]
        }
      ]
    },
    terms: {
      title: 'Terms of Service',
      summary: 'The basic terms for using Worthwhile during Early Beta.',
      effectiveDate: LEGAL_EFFECTIVE_DATE,
      sections: [
        {
          heading: 'The service',
          paragraphs: [
            'Worthwhile helps you understand purchases and ownership over time using information you choose to record. Its calculations and projections are informational tools, not financial, accounting, investment, tax, legal, or other professional advice.'
          ]
        },
        {
          heading: 'Early Beta',
          paragraphs: [
            'Worthwhile is an Early Beta product. Features, calculations, interfaces, and behavior may change before a stable release, and bugs or temporary interruptions may occur. Early Beta status does not reduce the care taken with user data, but it does mean the service is still being tested and improved.'
          ]
        },
        {
          heading: 'Your responsibilities',
          paragraphs: ['By using Worthwhile, you agree to:'],
          bullets: [
            'provide only information you are authorized to provide;',
            'keep your Google account, device, and access to the service reasonably secure;',
            'use the service lawfully and respect the rights of others; and',
            'not misuse, probe, disrupt, overload, or attempt unauthorized access to the service.'
          ]
        },
        {
          heading: 'Availability and changes',
          paragraphs: [
            'Worthwhile may change, suspend, or remove features as the Early Beta evolves. No particular feature or level of availability is promised, and the service may occasionally be unavailable for maintenance, failures, or circumstances outside the project owner’s control.'
          ]
        },
        {
          heading: 'Disclaimer and reasonable limits',
          paragraphs: [
            'The service is provided on an Early Beta and as-available basis. To the extent permitted by applicable law, no warranty is made that it will be uninterrupted, error-free, or suitable for a particular purpose.',
            'Do not rely on Worthwhile as the only copy of information whose loss would cause significant harm. Keep an independent backup where appropriate. To the extent permitted by applicable law, the project owner is not responsible for indirect, incidental, or consequential loss arising from use of, or inability to use, the service. Nothing in these terms excludes liability that cannot legally be excluded.'
          ]
        },
        {
          heading: 'Changes to these terms',
          paragraphs: [
            'These terms may be revised as Worthwhile changes. The current version and its effective date will remain available on this page. Continuing to use the service after a revision means the revised terms apply from that point.'
          ]
        }
      ]
    }
  },
  id: {
    privacy: {
      title: 'Kebijakan Privasi',
      summary: 'Cara Worthwhile menangani informasi yang digunakan untuk menyediakan layanan.',
      effectiveDate: '27 September 2026',
      sections: [
        {
          heading: 'Informasi yang ditangani Worthwhile',
          paragraphs: [
            'Jika Anda melanjutkan tanpa akun, barang dan rencana pembelian yang Anda masukkan disimpan di browser pada perangkat tersebut. Mode Guest tidak mengirimkan catatan itu ke server Worthwhile. Jika kemudian masuk, Worthwhile secara otomatis mencoba memigrasikannya ke akun Anda.',
            'Saat Anda masuk dengan Google, Worthwhile menerima pengenal akun Google, alamat email, nama tampilan, dan foto profil yang tersedia melalui proses masuk tersebut. Worthwhile membuat pengenal pengguna dan sesi sendiri agar catatan Anda tetap terhubung dengan akun Anda.',
            'Worthwhile menyimpan informasi yang Anda pilih untuk dicatat di aplikasi. Bergantung pada fitur yang digunakan, informasi ini dapat mencakup nama barang, harga, mata uang, tanggal pembelian dan kepemilikan, detail penjualan, target kepemilikan, rencana pembelian, rencana kontribusi, pembanding nilai pribadi, serta preferensi bahasa atau mata uang.'
          ]
        },
        {
          heading: 'Informasi teknis dan operasional',
          paragraphs: [
            'Layanan dapat mencatat log operasional yang diperlukan untuk menjalankan dan memecahkan masalah aplikasi, seperti waktu permintaan, rute, status respons, kesalahan, dan alamat jaringan. Informasi penerapan dan versi aplikasi juga dapat digunakan saat menyelidiki masalah.',
            'Worthwhile saat ini tidak menggunakan pelacak iklan, analitik pemasaran, sidik jari perangkat, atau profil periklanan.'
          ]
        },
        {
          heading: 'Cara informasi digunakan',
          paragraphs: [
            'Informasi akun dan sesi digunakan untuk mengautentikasi Anda dan memisahkan catatan setiap pengguna. Informasi yang Anda masukkan digunakan untuk menyediakan fitur kepemilikan, biaya per hari, perencanaan, ketahanan, dan perbandingan, serta untuk mempertahankan catatan Anda di antara kunjungan.',
            'Informasi operasional digunakan untuk menjalankan, mengamankan, mendiagnosis, dan meningkatkan layanan.'
          ]
        },
        {
          heading: 'Penyimpanan dan pembagian',
          paragraphs: [
            'Barang dan rencana pembelian guest disimpan secara lokal dalam penyimpanan IndexedDB browser pada perangkat tersebut. Catatan aplikasi pengguna yang masuk disimpan dalam basis data sisi server Worthwhile dan dikaitkan dengan pengenal pengguna aplikasi. Token sesi disimpan dalam kuki browser; server menyimpan hash token sesi, bukan token itu sendiri.',
            'Google memproses informasi saat Anda menggunakan proses masuk Google dan menyediakan detail profil yang dijelaskan di atas. Worthwhile tidak menjual informasi pribadi Anda atau membagikannya untuk periklanan. Pengelola proyek dapat mengakses catatan dan log tersimpan jika diperlukan secara wajar untuk menjalankan, mengamankan, atau memecahkan masalah layanan.'
          ]
        },
        {
          heading: 'Penyimpanan data dan permintaan',
          paragraphs: [
            'Catatan guest tetap berada di browser tersebut hingga dihapus oleh Anda, browser, atau alur migrasi yang berhasil. Informasi server dapat disimpan selama diperlukan untuk menyediakan dan menjalankan layanan Early Beta ini, dan sebagian catatan dapat tetap ada selama jangka waktu yang wajar dalam log operasional atau cadangan. Worthwhile saat ini belum menyediakan alur otomatis untuk menghapus akun atau mengekspor data server selain fitur pencadangan barang di dalam aplikasi.',
            'Untuk pertanyaan privasi atau permintaan terkait data Anda, hubungi pemilik proyek melalui repositori GitHub Worthwhile. Verifikasi identitas mungkin diperlukan sebelum informasi akun diungkapkan atau diubah.'
          ]
        },
        {
          heading: 'Perubahan kebijakan ini',
          paragraphs: [
            'Kebijakan ini dapat diperbarui seiring perkembangan Worthwhile. Perubahan penting akan dicantumkan di sini dengan tanggal berlaku yang diperbarui.'
          ]
        }
      ]
    },
    terms: {
      title: 'Syarat Penggunaan',
      summary: 'Ketentuan dasar penggunaan Worthwhile selama tahap Early Beta.',
      effectiveDate: '27 September 2026',
      sections: [
        {
          heading: 'Layanan',
          paragraphs: [
            'Worthwhile membantu Anda memahami pembelian dan kepemilikan dari waktu ke waktu berdasarkan informasi yang Anda pilih untuk dicatat. Perhitungan dan proyeksinya merupakan alat informasi, bukan nasihat keuangan, akuntansi, investasi, pajak, hukum, atau nasihat profesional lainnya.'
          ]
        },
        {
          heading: 'Early Beta',
          paragraphs: [
            'Worthwhile adalah produk Early Beta. Fitur, perhitungan, antarmuka, dan perilaku dapat berubah sebelum rilis stabil, serta bug atau gangguan sementara dapat terjadi. Status Early Beta tidak mengurangi kehati-hatian dalam menangani data pengguna, tetapi berarti layanan masih diuji dan ditingkatkan.'
          ]
        },
        {
          heading: 'Tanggung jawab Anda',
          paragraphs: ['Dengan menggunakan Worthwhile, Anda setuju untuk:'],
          bullets: [
            'hanya memberikan informasi yang berhak Anda berikan;',
            'menjaga keamanan akun Google, perangkat, dan akses Anda ke layanan secara wajar;',
            'menggunakan layanan secara sah dan menghormati hak pihak lain; dan',
            'tidak menyalahgunakan, menyelidiki, mengganggu, membebani, atau mencoba mengakses layanan tanpa izin.'
          ]
        },
        {
          heading: 'Ketersediaan dan perubahan',
          paragraphs: [
            'Worthwhile dapat mengubah, menangguhkan, atau menghapus fitur seiring perkembangan Early Beta. Tidak ada janji mengenai fitur tertentu atau tingkat ketersediaan, dan layanan sesekali dapat tidak tersedia karena pemeliharaan, kegagalan, atau keadaan di luar kendali pemilik proyek.'
          ]
        },
        {
          heading: 'Penafian dan batasan yang wajar',
          paragraphs: [
            'Layanan disediakan sebagai Early Beta dan sesuai ketersediaan. Sejauh diizinkan oleh hukum yang berlaku, tidak ada jaminan bahwa layanan akan selalu tersedia, bebas kesalahan, atau sesuai untuk tujuan tertentu.',
            'Jangan mengandalkan Worthwhile sebagai satu-satunya salinan informasi yang jika hilang akan menimbulkan kerugian besar. Simpan cadangan terpisah jika diperlukan. Sejauh diizinkan oleh hukum yang berlaku, pemilik proyek tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan layanan. Tidak ada bagian dari syarat ini yang mengecualikan tanggung jawab yang secara hukum tidak dapat dikecualikan.'
          ]
        },
        {
          heading: 'Perubahan syarat ini',
          paragraphs: [
            'Syarat ini dapat direvisi seiring perubahan Worthwhile. Versi terkini dan tanggal berlakunya akan tetap tersedia di halaman ini. Jika Anda terus menggunakan layanan setelah revisi, syarat yang telah direvisi berlaku sejak saat itu.'
          ]
        }
      ]
    }
  }
};

export const getLegalDocument = (documentKey, language) => {
  const supportedLanguage = language?.toLowerCase().startsWith('id') ? 'id' : 'en';
  return legalDocuments[supportedLanguage][documentKey];
};

export default legalDocuments;
