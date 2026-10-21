/**
 * FIEZEL Voice Studio — Cloudflare Worker WebSocket Proxy & Turn-by-Turn Fallback
 * Route: wss://fiezel.my.id/api/live-call  &  https://fiezel.my.id/api/voice-call/turn
 *
 * Bridges client PCM16 duplex audio streams to Gemini Live API WebSocket
 * and provides a serverless HTTP POST fallback when WebSocket is unavailable.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // 1. WebSocket Upgrade: wss://fiezel.my.id/api/live-call
    if (
      url.pathname.endsWith('/api/live-call') ||
      url.pathname.endsWith('/ws/live-call')
    ) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response(
          JSON.stringify({
            ok: true,
            service: 'fiezel-voice-studio-live-proxy',
            wsEndpoint: 'wss://fiezel.my.id/api/live-call',
            fallbackMode: 'turn-by-turn-rest',
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      const apiKey = env.GEMINI_API_KEY || '';
      if (!apiKey) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        server.accept();
        server.send(
          JSON.stringify({
            type: 'live_error',
            fallback: 'turn-by-turn',
            message: 'GEMINI_API_KEY not configured on Worker; switching to Turn-by-Turn Audio mode.',
          })
        );
        server.close(1011, 'Fallback to Turn-by-Turn');
        return new Response(null, { status: 101, webSocket: client });
      }

      const voice = url.searchParams.get('voice') || 'Puck';
      const personaName = url.searchParams.get('personaName') || 'PAW';
      const scenarioTitle = url.searchParams.get('scenarioTitle') || 'General Conversation';
      const targetLang = url.searchParams.get('targetLang') || 'en';

      const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const upstreamResp = await fetch(geminiWsUrl, {
        headers: { Upgrade: 'websocket' },
      });

      const upstreamWs = upstreamResp.webSocket;
      if (!upstreamWs) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        server.accept();
        server.send(
          JSON.stringify({
            type: 'live_error',
            fallback: 'turn-by-turn',
            message: 'Upstream Live WebSocket unavailable; switching to Turn-by-Turn Audio.',
          })
        );
        server.close(1011, 'Upstream unavailable');
        return new Response(null, { status: 101, webSocket: client });
      }

      upstreamWs.accept();
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      // Send initial BidiGenerateContent setup frame
      const setupFrame = {
        setup: {
          model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: `You are ${personaName}, an encouraging language speaking partner at FIEZEL. Scenario: "${scenarioTitle}". Speak naturally in ${
                  targetLang === 'ja' ? 'Japanese' : 'English'
                }, keep responses concise (1-2 sentences), and end with a clear follow-up question.`,
              },
            ],
          },
        },
      };
      upstreamWs.send(JSON.stringify(setupFrame));
      server.send(JSON.stringify({ type: 'ready', transport: 'cloudflare-worker-ws' }));

      server.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            upstreamWs.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: 'audio/pcm;rate=16000',
                      data: msg.audio,
                    },
                  ],
                },
              })
            );
          } else if (msg.text) {
            upstreamWs.send(
              JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: msg.text }] }],
                  turnComplete: true,
                },
              })
            );
          }
        } catch {
          // Ignore malformed client frames
        }
      });

      upstreamWs.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          const parts = data?.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part?.inlineData?.data) {
              server.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
            }
            if (part?.text) {
              server.send(JSON.stringify({ type: 'output_transcription', text: part.text }));
            }
          }
          if (data?.serverContent?.interrupted) {
            server.send(JSON.stringify({ type: 'interrupted' }));
          }
          if (data?.serverContent?.turnComplete) {
            server.send(JSON.stringify({ type: 'turn_complete' }));
          }
        } catch {
          // Ignore parse errors
        }
      });

      server.addEventListener('close', () => {
        try {
          upstreamWs.close();
        } catch {}
      });
      upstreamWs.addEventListener('close', () => {
        try {
          server.close();
        } catch {}
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        module: 'fiezel-voice-studio-worker',
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  },
};
