(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelNeuralVoiceConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const config = Object.freeze({
    schema: 'fiezel-neural-voice-v2',
    provider: 'kokoro-js-local-patched',
    providerVersion: '1.2.1',
    providerSourceCommit: 'd4ef0569c79046dfd77fbb128502546a3afe5bef',
    transformersVersion: '3.5.1',
    onnxRuntimeWebVersion: '1.22.0-dev.20250409-89f8206ba4',
    modelId: 'kokoro-model',
    dtype: 'q8',
    device: 'wasm',
    localRouting: Object.freeze({
      modelBasePath: './vendor/',
      voiceBaseUrl: './vendor/kokoro-model/voices',
      wasmBasePath: './vendor/kokoro-js/wasm/',
      remoteModelsAllowed: false,
      remoteVoiceDataAllowed: false,
      crossOriginRuntimeNetworkAllowed: false,
      sameOriginStaticAssetBootstrapAllowed: true,
      offlineAfterWarmRequired: true
    }),
    zeroCostPolicy: Object.freeze({
      paidApiAllowed: false,
      subscriptionAllowed: false,
      meteredBillingAllowed: false,
      vendorApiKeyAllowed: false,
      remoteInferenceAllowed: false,
      localInferenceRequired: true,
      buildTimePublicAssetDownloadAllowed: true,
      sameOriginStaticAssetBootstrapAllowed: true
    }),
    voices: Object.freeze({
      fiezelPrimary: 'af_bella',
      fiezelAlternate: 'af_heart',
      listeningPool: Object.freeze(['af_nicole', 'am_michael', 'bf_emma', 'bm_george']),
      catalog: Object.freeze([
        // m025-26: every slot is en-US. The sherpa VITS model has no en-GB speakers, so
        // Emma and George keep their ids and their place in the list, but are labelled
        // truthfully rather than promising a British accent the audio does not deliver.
        Object.freeze({ id: 'af_bella', label: 'Bella', locale: 'en-US' }),
        Object.freeze({ id: 'af_heart', label: 'Heart', locale: 'en-US' }),
        Object.freeze({ id: 'af_nicole', label: 'Nicole', locale: 'en-US' }),
        Object.freeze({ id: 'am_michael', label: 'Michael', locale: 'en-US' }),
        Object.freeze({ id: 'bf_emma', label: 'Emma', locale: 'en-US' }),
        Object.freeze({ id: 'bm_george', label: 'George', locale: 'en-US' })
      ])
    }),
    limits: Object.freeze({
      maxInputChars: 3600,
      targetChunkWords: 140,
      hardChunkWords: 190,
      maxQueueItems: 12
    }),
    fallback: Object.freeze({
      browserSpeechSynthesis: true,
      reason: 'Emergency-only fallback if local neural runtime cannot initialize.'
    })
  });

  return config;
});
