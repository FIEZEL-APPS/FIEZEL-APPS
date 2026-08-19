/* M028.2: Apple standalone worklet edge integrity without rewriting the base player. */
(function(root){
  'use strict';
  if(!root || root.__fiezelM0282AudioEdgeHotfix) return;
  var playerApi = root.FiezelWebAudioPlayer;
  if(!playerApi || typeof playerApi.createPlayer !== 'function') return;
  var originalCreatePlayer = playerApi.createPlayer;

  function wrapWorkletCtor(NativeCtor){
    if(typeof NativeCtor !== 'function') return NativeCtor;
    return new Proxy(NativeCtor, {
      construct: function(target, args){
        var node = Reflect.construct(target, args, target);
        var port = node && node.port;
        if(port && typeof port.postMessage === 'function' && !port.__fiezelM0282EdgeWrapped){
          var originalPost = port.postMessage.bind(port);
          try { port.__fiezelM0282EdgeWrapped = true; } catch (_) {}
          port.postMessage = function(message, transfer){
            var next = message;
            if(message && message.type === 'enqueue'){
              next = Object.assign({}, message, {
                fadeInFrames: 0,
                fadeOutFrames: 0,
                edgePolicy: 'model-native'
              });
            }
            // `clear` is an explicit cancellation command. Its fadeOutFrames is
            // intentionally passed through untouched to avoid stop/cancel clicks.
            if(arguments.length > 1) return originalPost(next, transfer);
            return originalPost(next);
          };
        }
        return node;
      }
    });
  }

  function createPlayer(env, options){
    var target = env || root;
    var appleStandalone = !!(target && target.navigator && target.navigator.standalone === true);
    var NativeCtor = target && target.AudioWorkletNode;
    if(!appleStandalone || typeof NativeCtor !== 'function'){
      return originalCreatePlayer.call(playerApi, target, options);
    }
    var WrappedCtor = wrapWorkletCtor(NativeCtor);
    var playerEnv = new Proxy(target, {
      get: function(obj, key){
        if(key === 'AudioWorkletNode') return WrappedCtor;
        return obj[key];
      },
      set: function(obj, key, value){ obj[key] = value; return true; }
    });
    return originalCreatePlayer.call(playerApi, playerEnv, options);
  }

  root.FiezelWebAudioPlayer = Object.freeze(Object.assign({}, playerApi, { createPlayer: createPlayer }));
  root.__fiezelM0282AudioEdgeHotfix = Object.freeze({
    schema: 'fiezel-m0282-audioedge-hotfix-v1',
    target: 'apple-standalone-audio-worklet',
    ordinaryFadeInFrames: 0,
    ordinaryFadeOutFrames: 0,
    cancellationFade: 'preserved'
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);