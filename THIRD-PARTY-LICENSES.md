# Third-party data attribution

## English → Indonesian lexicon

FIEZEL can load an expanded vocabulary lexicon from:

`open-dsl-dict/wiktionary-dict`

Source file:
`src/en-id-enwiktionary.txt`

The source repository states that the English→Indonesian dictionary was extracted from Wiktionary and is published under the Creative Commons Attribution-ShareAlike 3.0 Unported License and the GNU Free Documentation License.

Source repository: https://github.com/open-dsl-dict/wiktionary-dict

The FIEZEL runtime treats this as a third-party data source. If you redistribute a downloaded/derived copy of the dictionary data, preserve the applicable attribution and share-alike/license notices.

The locally bundled 1,765-entry learner vocabulary is separate from this third-party source.

## Lucide icons

FIEZEL membundel distribusi Lucide untuk ikon antarmuka.

Project: https://lucide.dev/

License: ISC. Salinan lisensi tersedia di `LUCIDE-LICENSE.txt`.

## web-push 3.6.7
Used only by the scheduled push dispatcher. License: MPL-2.0. Source package: web-push-libs/web-push.

## @heyputer/cli 0.1.2
Used only by the manual/CI Core Worker deployment workflow. License: MIT. The CLI is not bundled into the FIEZEL browser runtime.

## Supertonic 3 (m025-42 active speech engine)

Bundled at `vendor/supertonic-3/`: the WASM runtime compiled from `k2-fsa/sherpa-onnx`
v1.13.6 (emscripten 4.0.23) plus the int8 model files from the sherpa-onnx release
`sherpa-onnx-supertonic-3-tts-int8-2026-05-11`.

- **Sample code / runtime**: MIT. Exact text: `vendor/supertonic-3/LICENSE`
  (Supertone Inc. 2025, shipped inside the release archive).
- **Model weights**: OpenRAIL-M, per the upstream model card at
  `supertone-inc/supertonic`. Free of charge; the licence adds use-restrictions
  (no illegal or harmful use) rather than fees. The exact OpenRAIL-M variant and
  flow-down obligations still require legal verification before a sale or sublicense.
- **Cost**: none. Inference is fully on-device — no API key, no metered billing, no
  cross-origin inference. This is the same zero-cost policy the retired engines ran
  under, re-verified in `NEURAL-VOICE-SOURCE-LOCK.json`.
- **sherpa-onnx** itself: Apache-2.0 (`k2-fsa/sherpa-onnx`).

Per-file SHA-256 values: `vendor/supertonic-3/provenance/SHA256SUMS.txt`.
Build provenance and the exact deviations from the upstream build script:
`vendor/supertonic-3/provenance/m02542-build.json` and `tools/build-supertonic-wasm.sh`.

### Retired speech dependencies

The following Kokoro-era dependencies are historical attributions only. The audit verified
that `vendor/kokoro-js/` and `vendor/kokoro-model/` are no longer present and Kokoro is not
loaded by `index.html` or `sw.js`:

- **Kokoro.js 1.2.1** — historical browser runtime from `hexgrad/kokoro` commit
  `d4ef0569c79046dfd77fbb128502546a3afe5bef`, Apache-2.0.
- **Kokoro-82M v1.0 ONNX model and selected voices** — historical model from
  `onnx-community/Kokoro-82M-v1.0-ONNX` revision
  `1939ad2a8e416c0acfeecc08a694d14ef25f2231`, Apache-2.0.
- **@huggingface/transformers 3.5.1** — historical Kokoro transitive dependency,
  Apache-2.0.
- **phonemizer 1.2.1** — historical Kokoro transitive dependency, Apache-2.0.
- **ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4** — historical Kokoro runtime/WASM
  dependency, MIT.

The older `vendor/sherpa-vits/` and `vendor/sherpa-vits-id/` rollback directories described
by an earlier revision of this file have also been removed from the tree. They are no longer
shipping rollback assets.

## Font antarmuka

FIEZEL ships font files under `assets/fonts/` and installs them through `@font-face` in
`style.css`.

- **Instrument Serif** — display face (wordmark, screen headings, dialog headings).
  Project: https://github.com/Instrument/instrument-serif. SIL Open Font License 1.1.
  **Repository notice gap:** a matching bundled OFL text has not yet been verified alongside
  the font file; add the upstream notice before a sale/redistribution of the application.
- **Plus Jakarta Sans** — body text and small headings.
  Project: https://github.com/tokotype/PlusJakartaSans. SIL Open Font License 1.1.
  **Repository notice gap:** a matching bundled OFL text has not yet been verified alongside
  the font file; add the upstream notice before a sale/redistribution of the application.
- **Noto Sans Thai Looped** — Thai face for locale th (Wave 3), subset Thai + basic Latin
  (4 static weights instantiated from the official variable font), active only through
  `:lang(th)` + `unicode-range` in `style.css`.
  Project: https://github.com/notofonts/thai (distributed through
  https://github.com/google/fonts, `ofl/notosansthailooped`).
  Copyright: 2022 The Noto Project Authors. License: SIL OFL 1.1 — full copy at
  `assets/fonts/OFL-NotoSansThaiLooped.txt`.
- **Fredoka** — `assets/fonts/Fredoka-var.woff2` is present, referenced by `style.css`, and
  precached by `sw.js`; therefore it is a shipping asset. The earlier m025-86 statement that
  Fredoka had been removed was stale after the font was re-added. Fredoka is distributed
  under SIL OFL 1.1, but this repository still needs the exact upstream source/version and
  matching bundled notice verified before a sale/redistribution.

SIL OFL 1.1 permits bundling and redistribution subject to its notice/redistribution terms.
Do not treat the project URLs above as substitutes for bundled notices when redistributing
font binaries.

## Puter SDK — external runtime dependency requiring verification

`index.html` loads Puter live from `https://js.puter.com/v2/`. It is not bundled and is not
version-pinned in this repository. The repository does not contain a Puter licence or data-
processing agreement. Before a sale, obtain and review the applicable licence/terms and data-
processing terms, and decide whether the live unpinned dependency is acceptable for the
product's threat model.

## Braincore

The sale-readiness audit found no third-party code inside `features/brain/`: the Braincore
modules are self-contained and do not import or bundle the third-party runtime dependencies
listed above. This is an engineering inventory statement, not a legal opinion.
