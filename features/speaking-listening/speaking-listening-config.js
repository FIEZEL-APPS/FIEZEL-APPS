(function(root){
  'use strict';
  root.FIEZEL_SPEAKING_LISTENING_CONFIG=Object.freeze({
    enabled:true,
    storageKey:'fiezel-sl-v1-state',
    language:'en-US',
    ttsRate:.86,
    maxListeningReplays:2,
    recognitionMode:'browser-default',
    persistRawAudio:false,
    persistRawTranscript:false,
    aggregateEventLimit:120,
    neuralVoicePreferred:true
  });
})(typeof globalThis!=='undefined'?globalThis:this);
