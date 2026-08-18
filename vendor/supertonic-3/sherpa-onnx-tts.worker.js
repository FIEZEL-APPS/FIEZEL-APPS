// m025-42 Supertonic worker.
//
// Same protocol as the Piper workers this replaces (ready / generate /
// generateWithConfig / result / error), with two deliberate differences:
//
// 1. The model config is stated explicitly instead of coming from
//    getDefaultOfflineTtsModelType(). That helper only knows the model families sherpa
//    ships demos for, and Supertonic is not one of them, so leaving it to guess would
//    silently build an empty VITS config and fail with a confusing error.
//
// 2. The model files are NOT baked into a .data package. A packaged bundle would be a
//    single 145 MB file, which is over the 100 MB per-file limit of the git remote this
//    project deploys from, and it would also force one 145 MB allocation up front.
//    Instead each file is fetched from the same origin and written into the WASM
//    filesystem here, one at a time. Every file then caches independently, which is
//    also what makes a partial download resumable rather than all-or-nothing.
let tts = null;

const MODEL_FILES = [
  'duration_predictor.int8.onnx',
  'text_encoder.int8.onnx',
  'vector_estimator.int8.onnx',
  'vocoder.int8.onnx',
  'tts.json',
  'unicode_indexer.bin',
  'voice.bin'
];

self.Module = {
  locateFile: function (path, scriptDirectory = "") {
    return scriptDirectory + path;
  },
  setStatus: function (status) {
    self.postMessage({ type: "sherpa-onnx-tts-progress", status });
  },
  onRuntimeInitialized: function () {
    loadModelThenReady();
  },
};

importScripts("sherpa-onnx-wasm-main-tts.js");
importScripts("sherpa-onnx-tts.js");

function getErrorMessage(err) {
  if (err instanceof Error) {
    if (err.stack) return `${err.message}\n${err.stack}`;
    return err.message;
  }
  return `${err}`;
}

async function loadModelThenReady() {
  try {
    for (let i = 0; i < MODEL_FILES.length; i++) {
      const name = MODEL_FILES[i];
      self.postMessage({ type: "sherpa-onnx-tts-progress", status: `loading ${name}` });
      // same-origin only: these sit next to this worker, and the app has already put
      // them in the neural cache, so this resolves from cache when warm and offline.
      const response = await fetch(name, { credentials: 'same-origin' });
      if (!response || !response.ok) throw new Error('model_file_unavailable:' + name);
      const bytes = new Uint8Array(await response.arrayBuffer());
      self.Module.FS.writeFile(name, bytes);
    }

    tts = createOfflineTts(self.Module, {
      offlineTtsModelConfig: {
        offlineTtsSupertonicModelConfig: {
          durationPredictor: './duration_predictor.int8.onnx',
          textEncoder: './text_encoder.int8.onnx',
          vectorEstimator: './vector_estimator.int8.onnx',
          vocoder: './vocoder.int8.onnx',
          ttsJson: './tts.json',
          unicodeIndexer: './unicode_indexer.bin',
          voiceStyle: './voice.bin'
        },
        // One thread: Apple standalone is not cross-origin isolated, so a threaded
        // build has no threads to use and only adds failure modes (m025-22).
        numThreads: 1,
        debug: 0,
        provider: 'cpu'
      },
      ruleFsts: '',
      ruleFars: '',
      maxNumSentences: 1
    });

    self.postMessage({
      type: "sherpa-onnx-tts-ready",
      modelType: 7,
      numSpeakers: tts.numSpeakers,
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      message: "TTS Initialization failed: " + getErrorMessage(e),
    });
  }
}

self.onmessage = async (e) => {
  const { type, text, sid, speed, genConfig } = e.data;

  if (type == "generate") {
    if (!tts) return;
    try {
      const audio = tts.generate({ text: text, sid: sid || 0, speed: speed || 1.0 });
      const samples = audio.samples;
      self.postMessage(
        { type: "sherpa-onnx-tts-result", samples: samples, sampleRate: tts.sampleRate },
        [samples.buffer],
      );
    } catch (err) {
      self.postMessage({ type: "error", message: "Generation failed: " + getErrorMessage(err) });
    }
    return;
  }

  if (type == "generateWithConfig") {
    if (!tts) return;
    try {
      // `extra.lang` is how the multilingual model is told which language this line is.
      // Without it the model still speaks, but with the wrong reading rules.
      const config = Object.assign({}, genConfig || {});
      const audio = tts.generateWithConfig(text, config);
      const samples = audio.samples;
      self.postMessage(
        { type: "sherpa-onnx-tts-result", samples: samples, sampleRate: audio.sampleRate },
        [samples.buffer],
      );
    } catch (err) {
      self.postMessage({ type: "error", message: "Generation failed: " + getErrorMessage(err) });
    }
  }
};
