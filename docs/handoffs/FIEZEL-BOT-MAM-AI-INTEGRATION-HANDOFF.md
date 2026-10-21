# FIEZEL BOT — Integrasi MAM AI Router Gateway Hand-off (2026-10-08)

## 📌 Ringkasan
Fiezel Bot (`tools/fiezel-bot.mjs`, `.github/workflows/fiezel-bot.yml`, `tests/fiezel-bot-test.js`) kini dilengkapi dengan integrasi **MAM AI Router Gateway** (`https://router.mamam.cc/v1`). Peningkatan ini melengkapi lapisan kecerdasan buatan Fiezel Bot dengan model reasoning dan coding berkecepatan tinggi seperti **DeepSeek V4 Pro**, **Gemini 3.7 Flash**, dan **GLM 5.3**, sekaligus menjadi perisai tangguh (*bulletproof failover*) ketika kuota Gemini Google mengalami kehabisan saldo atau rate limit HTTP 429.

- **Status**: READY FOR MERGE (Build `m025-514`)
- **Otoritas**: OWNER / MASTER Authority Approved

---

## 🚀 Fitur & Peningkatan
1. **Multi-Provider AI Hierarchy**:
   * **Lapisan 1**: Google Gemini (`gemini-pro-latest`, `gemini-3.5-flash`, `gemini-3.8-flash`) via rotasi multi-kunci `GEMINI_API_KEYS`.
   * **Lapisan 2**: MAM AI Router (`mamcore/deepseek-v4-pro`, `mamcore/gemini-3.7-flash`, `mamcore/glm-5.3`, `mamcore/claude-sonnet-4.6`) via rotasi `MAM_API_KEYS` / `MAM_API_KEY`.
   * **Lapisan 3**: Groq AI (`openai/gpt-oss-120b`) via `GROQ_API_KEY`.
   * **Lapisan 4**: Fallback Heuristik Deterministik (100% aman tanpa crash).
2. **OpenAI-Compatible Dynamic Chat Format**:
   * Mengalirkan request `chat/completions` berstandar OpenAI ke gateway router MAM.
   * Mendukung mode `response_format: { type: "json_object" }` untuk parsing temuan review terstruktur.
   * Mendukung ekstraksi ganda `message.content` dan `message.reasoning_content` (khusus arsitektur reasoning model seperti DeepSeek).
3. **Smart Local Convenience & Zero-Leakage Secret**:
   * Di GitHub Actions, kunci dibaca murni dari secrets repo `${{ secrets.MAM_API_KEY }}` & `${{ secrets.MAM_API_KEYS }}`.
   * Di lingkungan pengembangan lokal, jika environment variable kosong, bot secara otomatis dan aman membaca konfigurasi `~/.config/opencode/opencode.json` pengguna tanpa pernah membocorkan kunci ke repositori git.
   * Pencegahan kebocoran: Kunci dirotasi dan diringkas secara terselubung (`kunci#N`), patuh pada aturan keamanan A9 Secret Scanner.

---

## 🧪 Bukti Verifikasi Empiris
1. **Self-Test Engine**:
   * `node tools/fiezel-bot.mjs self-test` $\rightarrow$ **PASS (29/29 tests)**.
   * Test T29 baru berhasil menguji parser kunci MAM, format bearer authorization, dan peralihan fallback saat Gemini tidak aktif.
2. **Quality & Workflow Integrity Gate**:
   * `node tests/fiezel-bot-test.js` $\rightarrow$ **PASS (23/23 tests)**.
3. **Live Execution Test**:
   * Menjalankan perintah `explain` pada PR terbuka (#505) dengan mode MAM AI murni.
   * Berhasil melakukan penelusuran semantik kode secara akurat (menemukan bug stateful RegExp `/g` pada `tools/dev/moderasi-umpan-balik.mjs`) dan membubuhkan identitas footer:
     `<sub>Fiezel Bot v2 • MAM AI (mamcore/gemini-3.7-flash) • ...</sub>`

---

## 📂 Berkas yang Berubah
1. `tools/fiezel-bot.mjs` — Penambahan provider `mam`, pemetaan model review/fast, fungsi `mamKeyList()`, pemanggil OpenAI-compatible di `queryLLM()`, penambahan status HTTP 402 ke `KEY_ROTATE_STATUS`, loader aman lokal `loadLocalOpencodeMamKey()`, dan pengujian T29.
2. `.github/workflows/fiezel-bot.yml` — Meneruskan `MAM_API_KEY`, `MAM_API_KEYS`, `FIEZEL_BOT_MAM_REVIEW_MODELS`, dan `FIEZEL_BOT_MAM_FAST_MODELS` ke job `auto-pr-review` dan `ci-self-healing`.
3. `tests/fiezel-bot-test.js` — Penyelarasan verifikasi 29 subtes internal, variabel model MAM, dan penegasan presence secrets di workflow.
4. `docs/handoffs/FIEZEL-BOT-MAM-AI-INTEGRATION-HANDOFF.md` — Berkas dokumentasi serah terima resmi.
5. Hexa-sync rilis (`m025-514`): `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

---

## 🗺️ Langkah Berikutnya (Next Steps / Roadmap)
1. Pantau eksekusi otomatis review PR dan CI healing di GitHub Actions dengan gateway MAM AI.
2. Siapkan penambahan provider fallback berikutnya (misal Anthropic direct atau OpenRouter) bila dibutuhkan di masa mendatang.
