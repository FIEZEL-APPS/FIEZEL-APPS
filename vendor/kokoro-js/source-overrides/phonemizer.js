import Module from "./espeakng.worker.js";

function stage(phase) {
  try {
    const sink = globalThis.__fiezelNeuralVendorStage;
    if (typeof sink === "function") sink({ phase });
  } catch {}
}

stage("espeak_module_loaded");

function createWorker() {
  stage("espeak_worker_construct_enter");
  const worker = new Module.eSpeakNGWorker();
  stage("espeak_worker_construct_ready");
  return worker;
}

stage("espeak_worker_promise_create");
const workerPromise = new Promise((resolve) => {
  if (Module.calledRun) {
    stage("espeak_runtime_already_ready");
    resolve(createWorker());
  } else {
    stage("espeak_runtime_wait");
    Module.onRuntimeInitialized = () => {
      stage("espeak_runtime_ready");
      resolve(createWorker());
    };
  }
});

const SUPPORTED_LANGUAGES = [
  "en", // English
];

const initCache = workerPromise.then((worker) => {
  stage("espeak_initcache_enter");
  stage("espeak_list_voices_enter");
  const voices = worker
    .list_voices()
    .map(({ name, identifier, languages }) => ({
      name,
      identifier,
      languages: languages.filter((lang) =>
        SUPPORTED_LANGUAGES.includes(lang.name.split("-")[0]),
      ),
    }))
    .filter((voice) => voice.languages.length > 0);
  stage("espeak_list_voices_return");

  // Generate list of supported language identifiers:
  const identifiers = new Set();
  for (const voice of voices) {
    identifiers.add(voice.identifier);
    for (const lang of voice.languages) {
      identifiers.add(lang.name);
    }
  }

  stage("espeak_initcache_ready");
  return { voices, identifiers };
});

/**
 * List the available voices for the specified language.
 * @param {string} [language] The language identifier
 * @returns {Promise<{name: string; identifier: string; languages: {name: string; priority: number}[]}>} A list of available voices
 */
export const list_voices = async (language) => {
  const { voices } = await initCache;
  if (!language) return voices;
  const base = language.split("-")[0];
  return voices.filter((voice) =>
    voice.languages.some(
      (lang) => lang.name === base || lang.name.startsWith(base + "-"),
    ),
  );
};

/**
 * Multilingual text to phonemes converter
 *
 * @param {string} text The input text
 * @param {string} [language] The language identifier
 * @returns {Promise<string[]>} A phonemized version of the input
 */
export const phonemize = async (text, language = "en-us") => {
  stage("espeak_phonemize_enter");
  const worker = await workerPromise;
  stage("espeak_worker_await_ready");

  const { identifiers } = await initCache;
  stage("espeak_initcache_await_ready");
  if (!identifiers.has(language)) {
    throw new Error(
      `Invalid language identifier: "${language}". Should be one of: ${Array.from(identifiers).toSorted().join(", ")}.`,
    );
  }
  stage("espeak_set_voice_enter");
  worker.set_voice(language);
  stage("espeak_set_voice_return");

  stage("espeak_synthesize_enter");
  let result;
  try {
    result = worker.synthesize_ipa(text);
  } catch (error) {
    stage("espeak_synthesize_error");
    throw error;
  }
  stage("espeak_synthesize_return");

  return (
    result.ipa?.split("\n").filter((x) => x.length > 0) ?? []
  );
};
