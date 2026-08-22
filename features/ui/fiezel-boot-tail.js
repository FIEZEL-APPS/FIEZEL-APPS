/**
 * FIEZEL — ekor boot: pendaftaran service worker + baris "Mode gelap" di Pengaturan.
 *
 * Isi berkas ini SEBELUMNYA adalah blok <script> inline paling bawah di index.html. Ia
 * dipindah karena app.js sekarang dimuat dengan `defer`, sedangkan blok inline TIDAK ikut
 * ditunda - blok itu akan berjalan lebih dulu dan membaca `window.openSettings` yang belum
 * ada, sehingga baris Mode gelap hilang diam-diam dan `originalOpenSettings.call` melempar
 * saat Pengaturan dibuka. Sebagai berkas ber-`defer` ia kembali berjalan paling akhir,
 * setelah app.js memasang window.openSettings - urutan itu dijaga boot-order-test.js.
 *
 * Seluruh isinya dibungkus IIFE: dulu `const originalOpenSettings` adalah pengikatan
 * leksikal global milik satu blok inline yang pasti hanya ada sekali. Sebagai berkas
 * lepas ia bisa saja termuat dua kali (mis. dipulihkan dari cache lama), dan `const`
 * global yang sama dua kali adalah SyntaxError yang mematikan boot.
 */
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  /* Inject dark mode toggle ke settings modal */
  const originalOpenSettings = window.openSettings;
  if (typeof originalOpenSettings !== 'function') return;
  window.openSettings = function() {
    originalOpenSettings.call(this);
    setTimeout(() => {
      const settingsList = document.querySelector('.settings-list');
      if (settingsList && !document.getElementById('settingDarkMode')) {
        const darkModeToggle = document.createElement('label');
        darkModeToggle.className = 'setting-row';
        darkModeToggle.id = 'settingDarkMode';
        darkModeToggle.innerHTML = `
          <span class="setting-icon"><i data-lucide="moon"></i></span>
          <span>
            <b>Mode gelap</b>
            <small>Ikuti preferensi sistem atau atur manual</small>
          </span>
          <input id="settingDarkModeToggle" type="checkbox" ${window.FiezelUI?.getCurrentTheme() === 'dark' ? 'checked' : ''}>
        `;
        settingsList.insertBefore(darkModeToggle, settingsList.firstChild);

        document.getElementById('settingDarkModeToggle').addEventListener('change', (e) => {
          window.FiezelUI?.toggleDarkMode();
          e.target.checked = window.FiezelUI?.getCurrentTheme() === 'dark';
        });

        /* Re-enhance Lucide icons */
        if (window.lucide) {
          lucide.createIcons();
        }
      }
    }, 100);
  };
}());
