# NUJUM — Cuplikan Integrasi ke `app.js` & `index.html`

Empat sisipan, tidak ada yang mengubah modul lama (`latihan`, KelasKu, `progress`, `profile`, Kurikulum Merdeka).

---

## 1. `index.html` — link CSS + script (SEBELUM `./app.js`, sejajar modul brain lain)

Di blok `<link rel="stylesheet">` (sekitar baris 249–267):

```html
  <link rel="stylesheet" href="./features/nujum/fiezel-nujum.css?v=nujum-v1">
```

Di blok script, tepat SEBELUM `<script defer src="./app.js"></script>` (sekitar baris 1070):

```html
  <!-- NUJUM — The Ruthless Mentor (hero feature). Membaca app lewat window.__fiezelNujumBridge,
       jadi harus terdefinisi sebelum app.js merender Home pertama kali. -->
  <script defer src="./features/nujum/fiezel-nujum.js?v=nujum-v1"></script>
  <script defer src="./app.js"></script>
```

---

## 2. `app.js` — daftarkan view `nujum` di `VALID_VIEWS` (baris ~7418)

```js
const VALID_VIEWS=new Set(['kana','home','latihan','vocab','grammar','reading','skills','listening','speaking','writing','test','progress','classroom','library','ask','search','online','profile','learn','tutor','arena','nujum']);
```

---

## 3. `app.js` — `renderInner()` (baris ~7362): tambah satu cabang + induk tab

Setelah `if(state.view==='kana')kanaView();` tambahkan:

```js
if(state.view==='nujum')nujumView();
```

Di objek `TAB_PARENT` (masih di dalam `renderInner`) tambahkan `nujum:'home'`:

```js
const TAB_PARENT={kana:'latihan',test:'home',vocab:'latihan',grammar:'latihan',reading:'latihan',writing:'latihan',library:'latihan',skills:'latihan',listening:'latihan',speaking:'latihan',learn:'home',arena:'online',nujum:'home'};
```

Tambahkan bendera panggung agar gelembung PAW tidak menimpa tombol NUJUM (pola sama dengan `fz-stage-home`), letakkan di deretan `document.body?.classList?.toggle?.(...)`:

```js
document.body?.classList?.toggle?.('fz-stage-nujum',state.view==='nujum');
```

---

## 4. `app.js` — fungsi view + jembatan (letakkan tepat SEBELUM `function arenaView(){...}`, baris ~13591)

```js
/* NUJUM — The Ruthless Mentor. Modul di features/nujum/ tidak menyentuh state langsung;
   ia membaca lewat jembatan ini (baca-saja untuk bank soal, tulis hanya ke BKT side-state). */
function nujumView(){setApp('<div id="fzNujum" class="nj-host" data-testid="nujum-view"></div>');const mod=self.FiezelNujum;if(!mod){$('fzNujum').innerHTML='<p class="muted">Modul NUJUM belum termuat.</p>';return}mod.mount($('fzNujum'))}
window.__fiezelNujumBridge=Object.freeze({
  state:()=>state,
  getActiveLevel,
  learnerName,
  showToast,
  G:()=>G,
  GRAMMAR_ITEMS:()=>GRAMMAR_ITEMS,
  grammarMeta,
  bktRead,
  bktWrite,
  openGrammarLesson,
  practiceSkill,
  /* Hitungan miskonsepsi dari ledger resmi (opsional). Kalau bentuk ledger berubah, kembalikan 0 —
     NUJUM tetap punya penghitung lokalnya sendiri. */
  misconceptionCount:(code)=>{try{const l=misconceptionLedgerRead();const row=l?.codes?.[code]||l?.entries?.[code]||l?.[code];return Number(row?.n??row?.count??row)||0}catch(_){return 0}}
});
```

> `setApp`, `$`, `state`, `getActiveLevel`, `learnerName`, `showToast`, `G`, `GRAMMAR_ITEMS`, `grammarMeta`, `bktRead`, `bktWrite`, `openGrammarLesson`, `practiceSkill`, `misconceptionLedgerRead` semuanya sudah ada di `app.js`; tidak ada yang baru selain dua deklarasi di atas.

Sinkronkan juga pembersihan saat pindah view: di `renderInner()`, sebelum `setApp('')`, tambahkan:

```js
if(lastRenderedView==='nujum'&&state.view!=='nujum'){try{self.FiezelNujum?.unmount?.()}catch(_){}}
```

(Letakkan setelah baris `isViewChange=state.view!==lastRenderedView;` tetapi sebelum `lastRenderedView=state.view;` — atau simpan `const prevView=lastRenderedView` lebih dulu.)

---

## 5. `app.js` — Panggung Hero NUJUM di paling atas `todayHomeMarkup()` (baris ~9079)

Ganti awal `return` menjadi:

```js
  /* NUJUM hero: hal pertama yang menyambut murid. Degradasi anggun — kalau modul belum termuat,
     kartu ini kosong dan Home lama tampil persis seperti sebelumnya. */
  let nujumHero='';try{nujumHero=self.FiezelNujum?.heroMarkup?.()||''}catch(_){}
  return `<div class="today-home-cockpit fz-edu-cockpit">
  ${nujumHero}
  ${homeTop}
  ${heroCta}
  ${card1Hero}
  ${quickChips}
```

---

## 6. Landing Page (`landing.html`) — hero yang sama, tanpa state murid

```html
<link rel="stylesheet" href="./features/nujum/fiezel-nujum.css?v=nujum-v1">
<div id="nujumLandingHero"></div>
<script defer src="./features/nujum/fiezel-nujum.js?v=nujum-v1"></script>
<script defer>
  addEventListener('DOMContentLoaded',()=>{
    const el=document.getElementById('nujumLandingHero');
    if(el&&self.FiezelNujum)el.innerHTML=FiezelNujum.heroMarkup().replace("go('nujum')","location.href='./index.html#nujum'");
  });
</script>
```

Di `app.js` boot (dekat baris 7299 `if(VALID_VIEWS.has(view))go(view);`) hash `#nujum` sudah otomatis dilayani karena `nujum` masuk `VALID_VIEWS`.

---

## 7. Mengganti mesin suara (opsional, untuk tim Antigravity)

Modul memakai `speechSynthesis` (id-ID) sebagai default. Untuk menyambungkan TTS neural sendiri:

```js
FiezelNujum.setSpeaker(async (text)=>{ await MyTts.speak(text,{voice:'nujum-id'}); });
```

Fungsi harus mengembalikan Promise yang selesai saat audio selesai — waveform canvas mengikuti status itu.

---

## 8. Cek cepat setelah disuntikkan

1. Buka Home → kartu `data-testid="nujum-hero-card"` tampil paling atas dengan angka `%`.
2. Klik **Terima Tantangan** → `go('nujum')` → panggung `data-testid="nujum-stage"` phase `intro`.
3. Jalankan 8 ronde: `nujum-option-*`, `nujum-idk-button` (echo), `nujum-dispute-button` (3 soal), `nujum-teleport-button` (pindah ke Latihan → kembali via `go('nujum')` memunculkan naskah TP-04/05).
4. Papan duel: `nujum-board`, `nujum-rematch-button`.
5. `localStorage.fz_nujum_v1` menyimpan skor/penghitung miskonsepsi; BKT side-state ikut bergeser (lihat pita `nujum-uncertainty-ribbon`).
