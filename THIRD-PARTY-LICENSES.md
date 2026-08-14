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

## Kokoro.js 1.2.1

Bundled local browser runtime built from `hexgrad/kokoro` commit `d4ef0569c79046dfd77fbb128502546a3afe5bef`. License: Apache-2.0. Exact text: `vendor/kokoro-js/LICENSE`.

## Kokoro-82M v1.0 ONNX model and selected voices

Bundled from `onnx-community/Kokoro-82M-v1.0-ONNX` revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`. License: Apache-2.0. Exact text: `vendor/kokoro-model/LICENSE`. Model and selected voice files are hash-locked in `NEURAL-VOICE-SOURCE-LOCK.json`.

## @huggingface/transformers 3.5.1

Bundled transitively inside the reviewed Kokoro browser build. License: Apache-2.0. Exact notice: `vendor/kokoro-js/licenses/HUGGINGFACE-TRANSFORMERS-APACHE-2.0.txt`.

## phonemizer 1.2.1

Bundled transitively inside the reviewed Kokoro browser build. License: Apache-2.0. Exact notice: `vendor/kokoro-js/licenses/PHONEMIZER-APACHE-2.0.txt`.

## ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4

Bundled runtime/WASM dependency. License: MIT. Exact notice: `vendor/kokoro-js/licenses/ONNXRUNTIME-MIT.txt`.
