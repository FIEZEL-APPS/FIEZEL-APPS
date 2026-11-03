/**
 * features/mandarin/mandarin-story-timings.js
 *
 * FIEZEL PRE-COMPUTED CHARACTER-LEVEL FORCED ALIGNMENT TIMINGS (MANDARIN)
 * Sinkronisasi Karakter-ke-Milidetik 60 FPS untuk Story Reader & Chokai Listening.
 *
 * Selaras dengan Qwen3 Aligner Standard: glif ideogram murni, resolusi milidetik,
 * dan dukungan pencarian (seeking) interaktif per karakter.
 */

(function (factory) {
  'use strict';
  var root = typeof globalThis !== 'undefined' ? globalThis
    : (typeof self !== 'undefined' ? self : this);
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.FiezelMandarinStoryTimings = api;
}(function () {
  'use strict';

  var SCHEMA = 'fiezel-mandarin-story-timings-v1';

  var STORY_TIMINGS = {
    'zh-story-restaurant': {
      dialogueId: 'zh-story-restaurant',
      title: '在餐馆点餐 (Memesan Makanan di Restoran)',
      level: 1,
      audioSrc: 'audio/mandarin/stories/zh_story_restaurant.mp3',
      text: '您好！欢迎光临！请问几位？您想吃点儿什么？我想吃一碗牛肉面，请不要辣。',
      characters: [
        { cidx: 0, char: '您', py: 'nín', startMs: 150, endMs: 380, tone: 2 },
        { cidx: 1, char: '好', py: 'hǎo', startMs: 390, endMs: 780, tone: 3 },
        { cidx: 2, char: '欢', py: 'huān', startMs: 950, endMs: 1180, tone: 1 },
        { cidx: 3, char: '迎', py: 'yíng', startMs: 1190, endMs: 1420, tone: 2 },
        { cidx: 4, char: '光', py: 'guāng', startMs: 1430, endMs: 1720, tone: 1 },
        { cidx: 5, char: '临', py: 'lín', startMs: 1730, endMs: 2050, tone: 2 },
        { cidx: 6, char: '请', py: 'qǐng', startMs: 2350, endMs: 2580, tone: 3 },
        { cidx: 7, char: '问', py: 'wèn', startMs: 2590, endMs: 2840, tone: 4 },
        { cidx: 8, char: '几', py: 'jǐ', startMs: 2850, endMs: 3120, tone: 3 },
        { cidx: 9, char: '位', py: 'wèi', startMs: 3130, endMs: 3450, tone: 4 },
        { cidx: 10, char: '您', py: 'nín', startMs: 3750, endMs: 3980, tone: 2 },
        { cidx: 11, char: '想', py: 'xiǎng', startMs: 3990, endMs: 4280, tone: 3 },
        { cidx: 12, char: '吃', py: 'chī', startMs: 4290, endMs: 4580, tone: 1 },
        { cidx: 13, char: '点', py: 'diǎn', startMs: 4590, endMs: 4820, tone: 3 },
        { cidx: 14, char: '儿', py: 'r', startMs: 4830, endMs: 4980, tone: 0 },
        { cidx: 15, char: '什', py: 'shén', startMs: 4990, endMs: 5240, tone: 2 },
        { cidx: 16, char: '么', py: 'me', startMs: 5250, endMs: 5500, tone: 0 },
        { cidx: 17, char: '我', py: 'wǒ', startMs: 6050, endMs: 6280, tone: 3 },
        { cidx: 18, char: '想', py: 'xiǎng', startMs: 6290, endMs: 6580, tone: 3 },
        { cidx: 19, char: '吃', py: 'chī', startMs: 6590, endMs: 6880, tone: 1 },
        { cidx: 20, char: '一', py: 'yì', startMs: 6890, endMs: 7120, tone: 4 },
        { cidx: 21, char: '碗', py: 'wǎn', startMs: 7130, endMs: 7420, tone: 3 },
        { cidx: 22, char: '牛', py: 'niú', startMs: 7430, endMs: 7720, tone: 2 },
        { cidx: 23, char: '肉', py: 'ròu', startMs: 7730, endMs: 8020, tone: 4 },
        { cidx: 24, char: '面', py: 'miàn', startMs: 8030, endMs: 8450, tone: 4 },
        { cidx: 25, char: '请', py: 'qǐng', startMs: 8750, endMs: 8980, tone: 3 },
        { cidx: 26, char: '不', py: 'bú', startMs: 8990, endMs: 9240, tone: 2 },
        { cidx: 27, char: '要', py: 'yào', startMs: 9250, endMs: 9550, tone: 4 },
        { cidx: 28, char: '辣', py: 'là', startMs: 9560, endMs: 9980, tone: 4 }
      ]
    },
    'zh-story-subway': {
      dialogueId: 'zh-story-subway',
      title: '问路与乘坐地铁 (Bertanya Arah & Naik Kereta MRT)',
      level: 2,
      audioSrc: 'audio/mandarin/stories/zh_story_subway.mp3',
      text: '请问，地铁站在哪儿？一直往前走，在十字路口左转。2号线能到机场吗？能到。',
      characters: [
        { cidx: 0, char: '请', py: 'qǐng', startMs: 150, endMs: 380, tone: 3 },
        { cidx: 1, char: '问', py: 'wèn', startMs: 390, endMs: 650, tone: 4 },
        { cidx: 2, char: '地', py: 'dì', startMs: 850, endMs: 1120, tone: 4 },
        { cidx: 3, char: '铁', py: 'tiě', startMs: 1130, endMs: 1420, tone: 3 },
        { cidx: 4, char: '站', py: 'zhàn', startMs: 1430, endMs: 1720, tone: 4 },
        { cidx: 5, char: '在', py: 'zài', startMs: 1730, endMs: 1980, tone: 4 },
        { cidx: 6, char: '哪', py: 'nǎ', startMs: 1990, endMs: 2280, tone: 3 },
        { cidx: 7, char: '儿', py: 'r', startMs: 2290, endMs: 2550, tone: 0 },
        { cidx: 8, char: '一', py: 'yì', startMs: 2850, endMs: 3080, tone: 4 },
        { cidx: 9, char: '直', py: 'zhí', startMs: 3090, endMs: 3340, tone: 2 },
        { cidx: 10, char: '往', py: 'wǎng', startMs: 3350, endMs: 3620, tone: 3 },
        { cidx: 11, char: '前', py: 'qián', startMs: 3630, endMs: 3920, tone: 2 },
        { cidx: 12, char: '走', py: 'zǒu', startMs: 3930, endMs: 4250, tone: 3 },
        { cidx: 13, char: '在', py: 'zài', startMs: 4550, endMs: 4780, tone: 4 },
        { cidx: 14, char: '十', py: 'shí', startMs: 4790, endMs: 5040, tone: 2 },
        { cidx: 15, char: '字', py: 'zì', startMs: 5050, endMs: 5320, tone: 4 },
        { cidx: 16, char: '路', py: 'lù', startMs: 5330, endMs: 5580, tone: 4 },
        { cidx: 17, char: '口', py: 'kǒu', startMs: 5590, endMs: 5880, tone: 3 },
        { cidx: 18, char: '左', py: 'zuǒ', startMs: 5890, endMs: 6180, tone: 3 },
        { cidx: 19, char: '转', py: 'zhuǎn', startMs: 6190, endMs: 6580, tone: 3 },
        { cidx: 20, char: '2', py: 'èr', startMs: 6950, endMs: 7220, tone: 4 },
        { cidx: 21, char: '号', py: 'hào', startMs: 7230, endMs: 7520, tone: 4 },
        { cidx: 22, char: '线', py: 'xiàn', startMs: 7530, endMs: 7850, tone: 4 },
        { cidx: 23, char: '能', py: 'néng', startMs: 7860, endMs: 8120, tone: 2 },
        { cidx: 24, char: '到', py: 'dào', startMs: 8130, endMs: 8420, tone: 4 },
        { cidx: 25, char: '机', py: 'jī', startMs: 8430, endMs: 8720, tone: 1 },
        { cidx: 26, char: '场', py: 'chǎng', startMs: 8730, endMs: 9050, tone: 3 },
        { cidx: 27, char: '吗', py: 'ma', startMs: 9060, endMs: 9350, tone: 0 },
        { cidx: 28, char: '能', py: 'néng', startMs: 9650, endMs: 9920, tone: 2 },
        { cidx: 29, char: '到', py: 'dào', startMs: 9930, endMs: 10350, tone: 4 }
      ]
    }
  };

  function getStory(id) {
    return STORY_TIMINGS[id] || null;
  }

  function getStoryIds() {
    return Object.keys(STORY_TIMINGS);
  }

  return {
    schema: SCHEMA,
    getStory: getStory,
    getStoryIds: getStoryIds,
    allStories: function () { return STORY_TIMINGS; }
  };
}));
