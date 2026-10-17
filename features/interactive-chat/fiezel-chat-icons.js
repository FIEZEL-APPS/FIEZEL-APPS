/**
 * FIEZEL · features/interactive-chat/fiezel-chat-icons.js
 * Bespoke Tactile SVG Iconography System for FIEZEL Interactive Chat (Kaiwa & Speaking Partner).
 *
 * Design Invariants:
 * 1. ZERO raw emojis, ZERO childish cartoon slop.
 * 2. High-resolution 24x24 vector grid with harmonious 1.75px stroke-width.
 * 3. Consistent rounded geometry (rx, round caps & joins).
 * 4. Dual-tone tactile depth (.fzc-i-fill for delicate 12-16% tint, .fzc-i-line for structural precision).
 * 5. UMD wrapper supporting both browser global (window.FiezelChatIcons) and Node.js require().
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelChatIcons = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  // Master SVG Body Path Registry (24x24 canvas)
  var ICONS = {
    // 1. Telephony & Call Flow (Telfonan)
    'phone':
      '<path class="fzc-i-fill" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>' +
      '<path class="fzc-i-line" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',

    'phone-call':
      '<path class="fzc-i-fill" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>' +
      '<path class="fzc-i-line" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>' +
      '<path class="fzc-i-line" d="M14 3.5a8 8 0 0 1 6.5 6.5M14 7.2a4 4 0 0 1 2.8 2.8"/>',

    'phone-off':
      '<path class="fzc-i-fill" d="M3.5 15.5c2.6-3.2 5.8-4.8 8.5-4.8s5.9 1.6 8.5 4.8a1.5 1.5 0 0 1-.4 2.1l-2.2 1.5a1.8 1.8 0 0 1-2.4-.3l-1.4-1.6c-.4-.5-1.1-.6-1.6-.2-1 .6-1.8.6-2.8 0-.5-.4-1.2-.3-1.6.2l-1.4 1.6a1.8 1.8 0 0 1-2.4.3l-2.2-1.5a1.5 1.5 0 0 1-.4-2.1z"/>' +
      '<path class="fzc-i-line" d="M3.5 15.5c2.6-3.2 5.8-4.8 8.5-4.8s5.9 1.6 8.5 4.8a1.5 1.5 0 0 1-.4 2.1l-2.2 1.5a1.8 1.8 0 0 1-2.4-.3l-1.4-1.6c-.4-.5-1.1-.6-1.6-.2-1 .6-1.8.6-2.8 0-.5-.4-1.2-.3-1.6.2l-1.4 1.6a1.8 1.8 0 0 1-2.4.3l-2.2-1.5a1.5 1.5 0 0 1-.4-2.1z"/>' +
      '<line class="fzc-i-line" x1="2" y1="2" x2="22" y2="22" stroke-width="2"/>',

    // 2. Partner / Sensei Avatar Glyphs (Replaces raw 🌸 and ✨ slop)
    'sensei':
      '<circle class="fzc-i-fill" cx="12" cy="12" r="9.5"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="9.5"/>' +
      '<path class="fzc-i-line" d="M6 7.5c3-.8 9-.8 12 0"/>' +
      '<path class="fzc-i-line" d="M5.5 9.8h13"/>' +
      '<path class="fzc-i-line" d="M8.5 9.8v8.7M15.5 9.8v8.7"/>' +
      '<circle class="fzc-i-fill" cx="12" cy="14" r="2.2"/>' +
      '<circle class="fzc-i-line" cx="12" cy="14" r="2.2"/>',

    'coach':
      '<circle class="fzc-i-fill" cx="12" cy="12" r="9.5"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="9.5"/>' +
      '<path class="fzc-i-fill" d="M12 5.5l1.6 4.9 4.9 1.6-4.9 1.6L12 18.5l-1.6-4.9-4.9-1.6 4.9-1.6z"/>' +
      '<path class="fzc-i-line" d="M12 5.5l1.6 4.9 4.9 1.6-4.9 1.6L12 18.5l-1.6-4.9-4.9-1.6 4.9-1.6z"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="1.5"/>',

    // 3. Conversational Scenarios (Bilingual Immersion)
    'free-talk':
      '<path class="fzc-i-fill" d="M14 6H6a3.5 3.5 0 0 0-3.5 3.5c0 1.8 1.3 3.3 3 3.5v2.8L9 13h5a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 14 6z"/>' +
      '<path class="fzc-i-line" d="M14 6H6a3.5 3.5 0 0 0-3.5 3.5c0 1.8 1.3 3.3 3 3.5v2.8L9 13h5a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 14 6z"/>' +
      '<path class="fzc-i-line" d="M17.5 9.5h.5a3.5 3.5 0 0 1 3.5 3.5c0 1.8-1.3 3.3-3 3.5v2.5L15.5 16.5H13a3.5 3.5 0 0 1-3.2-2"/>',

    'ramen':
      '<path class="fzc-i-fill" d="M4 11.5h16c-.2 4.7-3.8 8.5-8 8.5s-7.8-3.8-8-8.5z"/>' +
      '<path class="fzc-i-line" d="M3.5 11.5h17c-.2 5-3.9 9-8.5 9s-8.3-4-8.5-9z"/>' +
      '<path class="fzc-i-line" d="M8.5 20.5h7"/>' +
      '<path class="fzc-i-line" d="m3 7.8 18-3.2M4.2 9.4l16.8-3.2" stroke-width="1.5"/>' +
      '<path class="fzc-i-line" d="M8 5.2c0-.9.7-1.4.7-2.3M12 5.5c0-1 .8-1.5.8-2.5M16 5.2c0-.9.7-1.4.7-2.3"/>',

    'konbini':
      '<path class="fzc-i-fill" d="M3.5 6.5h17l-1.8 4.2H5.3z"/>' +
      '<path class="fzc-i-line" d="M3 6.5h18l-2 4.5H5z"/>' +
      '<path class="fzc-i-line" d="M8.5 6.5l.8 4.5M12 6.5v4.5M15.5 6.5l-.8 4.5"/>' +
      '<rect class="fzc-i-line" x="4.5" y="11" width="15" height="9.5" rx="1"/>' +
      '<path class="fzc-i-line" d="M12 11v9.5M8.5 15h.01M15.5 15h.01M3 20.5h18"/>',

    'train':
      '<rect class="fzc-i-fill" x="6" y="4" width="12" height="13" rx="3.5"/>' +
      '<rect class="fzc-i-line" x="6" y="4" width="12" height="13" rx="3.5"/>' +
      '<path class="fzc-i-line" d="M8 7.5h8M8 11h8"/>' +
      '<circle class="fzc-i-line" cx="9" cy="14" r="1.1"/>' +
      '<circle class="fzc-i-line" cx="15" cy="14" r="1.1"/>' +
      '<path class="fzc-i-line" d="m8.5 17-2.5 3.5M15.5 17l2.5 3.5M5.5 20.5h13"/>',

    'intro':
      '<path class="fzc-i-fill" d="m11 15 3.5 3.5a2.12 2.12 0 0 0 3 0l2-2a2.12 2.12 0 0 0 0-3L16 10z"/>' +
      '<path class="fzc-i-line" d="m11 15 3.5 3.5a2.12 2.12 0 0 0 3 0l2-2a2.12 2.12 0 0 0 0-3L16 10l-4-4-5.5 5.5a2.12 2.12 0 0 0 0 3l2 2a2.12 2.12 0 0 0 3 0z"/>' +
      '<path class="fzc-i-line" d="m2 14 4-4M22 10l-4 4M7.5 8.5l3-3"/>',

    'cafe':
      '<path class="fzc-i-fill" d="M4 9h11v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/>' +
      '<path class="fzc-i-line" d="M4 9h11v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/>' +
      '<path class="fzc-i-line" d="M15 10.5h2.5a2.5 2.5 0 0 1 0 5H15M2.5 20h15"/>' +
      '<path class="fzc-i-line" d="M7 6c0-.9.8-1.4.8-2.3M11 6c0-.9.8-1.4.8-2.3"/>',

    'map':
      '<polygon class="fzc-i-fill" points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/>' +
      '<polygon class="fzc-i-line" points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/>' +
      '<path class="fzc-i-line" d="M9 3v15M15 6v15"/>',

    'interview':
      '<rect class="fzc-i-fill" x="3" y="7" width="18" height="13" rx="2.5"/>' +
      '<rect class="fzc-i-line" x="3" y="7" width="18" height="13" rx="2.5"/>' +
      '<path class="fzc-i-line" d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18M10 12v2.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2.5"/>',

    'hotel':
      '<rect class="fzc-i-fill" x="5" y="4" width="14" height="17" rx="2"/>' +
      '<rect class="fzc-i-line" x="5" y="4" width="14" height="17" rx="2"/>' +
      '<path class="fzc-i-line" d="M8 8h1.5M14.5 8H16M8 12h1.5M14.5 12H16M10 21v-4a2 2 0 0 1 4 0v4M3 21h18"/>',

    'delivery':
      '<path class="fzc-i-fill" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10h-3v7h4z"/>' +
      '<circle class="fzc-i-line" cx="7" cy="17" r="2.5"/>' +
      '<circle class="fzc-i-line" cx="17.5" cy="17" r="2.5"/>' +
      '<path class="fzc-i-line" d="M9.5 17h5.5M4.5 17H3v-6c0-1.1.9-2 2-2h4l3 7M15 10l-1.5-4H9"/>',

    'pizza':
      '<path class="fzc-i-fill" d="M12 2C8.5 2 5.5 3.5 3 6l9 16 9-16c-2.5-2.5-5.5-4-9-4z"/>' +
      '<path class="fzc-i-line" d="M12 2C8.5 2 5.5 3.5 3 6l9 16 9-16c-2.5-2.5-5.5-4-9-4z"/>' +
      '<path class="fzc-i-line" d="M4.5 7.5c2.2-1.5 4.8-2.5 7.5-2.5s5.3 1 7.5 2.5"/>' +
      '<circle class="fzc-i-line" cx="12" cy="10" r="1.2"/>' +
      '<circle class="fzc-i-line" cx="9.5" cy="14" r="1.2"/>' +
      '<circle class="fzc-i-line" cx="14.5" cy="14" r="1.2"/>',

    // 4. Audio, Voice & Speech Intelligence
    'mic':
      '<rect class="fzc-i-fill" x="9" y="3" width="6" height="11" rx="3"/>' +
      '<rect class="fzc-i-line" x="9" y="3" width="6" height="11" rx="3"/>' +
      '<path class="fzc-i-line" d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>',

    'mic-active':
      '<rect class="fzc-i-fill" x="9" y="3" width="6" height="11" rx="3"/>' +
      '<rect class="fzc-i-line" x="9" y="3" width="6" height="11" rx="3"/>' +
      '<path class="fzc-i-line" d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>' +
      '<path class="fzc-i-line" d="M2.5 10a9.5 9.5 0 0 0 2 5.5M21.5 10a9.5 9.5 0 0 1-2 5.5" stroke-dasharray="2 3"/>',

    'volume':
      '<polygon class="fzc-i-fill" points="11,5 6,9 3,9 3,15 6,15 11,19"/>' +
      '<polygon class="fzc-i-line" points="11,5 6,9 3,9 3,15 6,15 11,19"/>' +
      '<path class="fzc-i-line" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/>',

    'soundwave':
      '<path class="fzc-i-line" d="M4 12v.01M8 8v8M12 4v16M16 7v10M20 10v4" stroke-width="2.2"/>',

    'translate':
      '<circle class="fzc-i-fill" cx="12" cy="12" r="9"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="9"/>' +
      '<path class="fzc-i-line" d="M3.6 9h16.8M3.6 15h16.8M12 3a13 13 0 0 1 3.5 9 13 13 0 0 1-3.5 9 13 13 0 0 1-3.5-9A13 13 0 0 1 12 3z"/>',

    'shadowing':
      '<rect class="fzc-i-fill" x="7.5" y="3" width="5" height="9.5" rx="2.5"/>' +
      '<rect class="fzc-i-line" x="7.5" y="3" width="5" height="9.5" rx="2.5"/>' +
      '<path class="fzc-i-line" d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15.5v3.5M7.5 19h5"/>' +
      '<path class="fzc-i-line" d="m15 15.5 2 2 4.5-4.5" stroke-width="2"/>',

    // 5. Actions, Navigation & Controls
    'send':
      '<path class="fzc-i-fill" d="m21.5 2.5-9.5 19-3-6.5-6.5-3 19-9.5z"/>' +
      '<path class="fzc-i-line" d="m21.5 2.5-9.5 19-3-6.5-6.5-3 19-9.5z"/>' +
      '<path class="fzc-i-line" d="m21.5 2.5-12.5 12.5"/>',

    'reload':
      '<path class="fzc-i-line" d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/>' +
      '<path class="fzc-i-line" d="M21 3v5h-5"/>',

    'close':
      '<path class="fzc-i-line" d="M18 6 6 18M6 6l12 12"/>',

    'settings':
      '<path class="fzc-i-line" d="M4 7h8M16 7h4M4 17h4M12 17h8"/>' +
      '<circle class="fzc-i-fill" cx="14" cy="7" r="2.5"/>' +
      '<circle class="fzc-i-line" cx="14" cy="7" r="2.5"/>' +
      '<circle class="fzc-i-fill" cx="10" cy="17" r="2.5"/>' +
      '<circle class="fzc-i-line" cx="10" cy="17" r="2.5"/>',

    'lightbulb':
      '<path class="fzc-i-fill" d="M9 18h6v1.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5V18z"/>' +
      '<path class="fzc-i-line" d="M9 18h6M10 21h4M15 13.5c.6-.7 1.2-1.6 1.5-2.5.5-1.4.2-2.9-.6-4a5.5 5.5 0 0 0-7.8 0c-.8 1.1-1.1 2.6-.6 4 .3.9.9 1.8 1.5 2.5v2.5h6v-2.5z"/>',

    'target':
      '<circle class="fzc-i-fill" cx="12" cy="12" r="9"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="9"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="5.5"/>' +
      '<circle class="fzc-i-fill" cx="12" cy="12" r="2.2"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="2.2"/>',

    'trophy':
      '<path class="fzc-i-fill" d="M6 4h12v6a6 6 0 0 1-12 0V4z"/>' +
      '<path class="fzc-i-line" d="M6 4h12v6a6 6 0 0 1-12 0V4z"/>' +
      '<path class="fzc-i-line" d="M6 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1M18 6h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1M12 16v3M8 21h8"/>',

    'check':
      '<path class="fzc-i-line" d="m4.5 12.5 5 5 10-10"/>',

    'check-circle':
      '<circle class="fzc-i-fill" cx="12" cy="12" r="9"/>' +
      '<circle class="fzc-i-line" cx="12" cy="12" r="9"/>' +
      '<path class="fzc-i-line" d="m8 12 3 3 5-5"/>',

    'sparkles':
      '<path class="fzc-i-fill" d="M12 2.5l2.2 6.8 6.8 2.2-6.8 2.2-2.2 6.8-2.2-6.8-6.8-2.2 6.8-2.2z"/>' +
      '<path class="fzc-i-line" d="M12 2.5l2.2 6.8 6.8 2.2-6.8 2.2-2.2 6.8-2.2-6.8-6.8-2.2 6.8-2.2z"/>' +
      '<path class="fzc-i-line" d="M19 3.5v3M20.5 5h-3M4 17.5v3M5.5 19h-3"/>'
  };

  // Synonyms & Semantic Aliases (including emoji fallbacks)
  var ALIASES = {
    'call': 'phone',
    'call-phone': 'phone',
    'telfon': 'phone',
    'telepon': 'phone',
    'call-end': 'phone-off',
    'phone-end': 'phone-off',
    'hangup': 'phone-off',
    'call-active': 'phone-call',
    'calling': 'phone-call',
    'partner-ja': 'sensei',
    'mentor-ja': 'sensei',
    'partner-en': 'coach',
    'mentor-en': 'coach',
    'free': 'free-talk',
    'chat': 'free-talk',
    'chat-bubbles': 'free-talk',
    'station': 'train',
    'direction': 'train',
    'directions': 'map',
    'phone_restaurant': 'phone-call',
    'phone_friend': 'phone-call',
    'phone_delivery': 'delivery',
    'phone_hotel': 'hotel',
    'handshake': 'intro',
    'coffee': 'cafe',
    'briefcase': 'interview',
    'work': 'interview',
    'scooter': 'delivery',
    'courier': 'delivery',
    'food': 'pizza',
    'microphone': 'mic',
    'mic-check': 'shadowing',
    'audio': 'volume',
    'speaker': 'volume',
    'listen': 'volume',
    'audio-wave': 'soundwave',
    'globe': 'translate',
    'lang': 'translate',
    'send-arrow': 'send',
    'reset': 'reload',
    'refresh': 'reload',
    'x': 'close',
    'gear': 'settings',
    'sliders': 'settings',
    'hint': 'lightbulb',
    'bulb': 'lightbulb',
    'goal': 'target',
    'bullseye': 'target',
    'bonus': 'trophy',
    'award': 'trophy',
    'done': 'check',
    'star': 'sparkles',

    // Raw Emoji Mappings (Self-Healing Anti-Slop Filter)
    '📞': 'phone',
    '📱': 'phone-call',
    '🛵': 'delivery',
    '🍕': 'pizza',
    '💬': 'free-talk',
    '🍜': 'ramen',
    '🏪': 'konbini',
    '🚉': 'train',
    '🤝': 'intro',
    '☕': 'cafe',
    '🗺️': 'map',
    '💼': 'interview',
    '🏨': 'hotel',
    '🌸': 'sensei',
    '✨': 'coach',
    '🎉': 'trophy',
    '🎯': 'target',
    '💡': 'lightbulb',
    '🔊': 'volume',
    '🌐': 'translate',
    '🎙️': 'mic',
    '➤': 'send',
    '↺': 'reload',
    '✓': 'check',
    '🌟': 'sparkles',
    '👍': 'check-circle',
    '💪': 'shadowing',
    '🇮🇩': 'translate'
  };

  function normalizeKey(k) {
    if (!k) return 'free-talk';
    var raw = String(k).trim().toLowerCase();
    return ALIASES[raw] || ALIASES[k] || raw;
  }

  function escAttr(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Main Icon Renderer Helper
   * @param {string} name - The registered icon name or alias
   * @param {Object} [opts] - Configuration options
   * @param {number|string} [opts.size=20] - Dimensions (width/height in px or css unit)
   * @param {number} [opts.strokeWidth=1.75] - Vector stroke weight
   * @param {string} [opts.color='currentColor'] - Base stroke tint
   * @param {string} [opts.className=''] - Additional CSS classes
   * @param {boolean} [opts.filled=false] - Whether to activate accented fill
   * @param {boolean} [opts.ariaHidden=true] - Accessibility hidden flag
   * @param {string} [opts.label] - Accessible label if ariaHidden is false
   * @returns {string} Inline high-resolution SVG markup
   */
  function icon(name, opts) {
    opts = opts || {};
    var key = normalizeKey(name);
    var body = ICONS[key];
    if (!body) {
      body = ICONS['free-talk'];
    }

    var size = opts.size != null ? opts.size : 20;
    var sz = typeof size === 'number' ? size + 'px' : size;
    var strokeWidth = opts.strokeWidth != null ? opts.strokeWidth : 1.75;
    var color = opts.color || 'currentColor';
    var filledCls = opts.filled ? ' is-filled' : '';
    var extraCls = opts.className || opts.class || '';
    var fullClass = ('fzc-icon fzc-icon-' + key + filledCls + (extraCls ? ' ' + extraCls : '')).trim();

    var ariaPart = '';
    var titlePart = '';
    if (opts.ariaHidden === false && opts.label) {
      ariaPart = ' role="img" aria-label="' + escAttr(opts.label) + '"';
      titlePart = '<title>' + escAttr(opts.label) + '</title>';
    } else {
      ariaPart = ' aria-hidden="true" focusable="false"';
    }

    return (
      '<svg class="' + fullClass + '" ' +
      'viewBox="0 0 24 24" ' +
      'width="' + sz + '" ' +
      'height="' + sz + '" ' +
      'fill="none" ' +
      'stroke="' + color + '" ' +
      'stroke-width="' + strokeWidth + '" ' +
      'stroke-linecap="round" ' +
      'stroke-linejoin="round"' +
      ariaPart + '>' +
      titlePart +
      body +
      '</svg>'
    );
  }

  function has(name) {
    var k = normalizeKey(name);
    return Object.prototype.hasOwnProperty.call(ICONS, k);
  }

  return {
    icon: icon,
    render: icon,
    has: has,
    icons: ICONS,
    aliases: ALIASES,
    names: Object.keys(ICONS)
  };
}));
