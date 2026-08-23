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

/**
 * m025-131 kelahiran wordmark topbar.
 *
 * Dijalankan SEKALI per pemuatan aplikasi - keputusan OWNER, dan alasannya sama dengan
 * PAW: yang diulang tiap pindah menu berhenti terasa spesial dan mulai terasa seperti
 * kedipan. Kelasnya juga dilepas setelah selesai, supaya rilis berikutnya tidak mewarisi
 * animasi yang menggantung.
 *
 * Ditunda sampai bingkai berikutnya karena animasi yang dimulai pada elemen yang belum
 * di-layout akan melompati bingkai pertamanya - dan yang paling sering hilang justru
 * ledakannya.
 */
(function () {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;
  function birth() {
    var mark = doc.getElementById('fzTopMark');
    if (!mark) return;
    mark.classList.add('is-mark-born');
    setTimeout(function () { mark.classList.remove('is-mark-born'); }, 1100);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(birth, 60); }, { once: true });
  else setTimeout(birth, 60);
}());
