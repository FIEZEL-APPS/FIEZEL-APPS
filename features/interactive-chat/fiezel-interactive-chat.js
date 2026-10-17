/**
 * FIEZEL · features/interactive-chat/fiezel-interactive-chat.js
 * ChatGPT-like Interactive Conversational Partner (Kaiwa & Speaking Partner) for FIEZEL.
 *
 * Implements:
 * 1. Bilingual Immersion: Japanese JLPT N5-N4 with Furigana Ruby + English CEFR A1-A2.
 * 2. Multi-turn contextual conversation scenarios (Free talk, Cafe, Ramen, Konbini, Directions, Interview).
 * 3. Interactive Shadowing & Pronunciation Practice with real-time Speech-to-Text & accuracy scoring.
 * 4. Scenario Goal Tracking: 3 progressive conversational milestones per scenario.
 * 5. Per-Scenario History Persistence & Anti-Race Guard (Zero-Loss across scenario switching).
 * 6. Expanded Misconception Detector (Japanese particles, English Subject-Verb Agreement, double comparatives).
 * 7. Braincore Learning Telemetry: updateMastery, bktRecord, and learner XP syncing.
 * 8. Offline Deterministic Dialogue Fallback Graph when offline or AI quota is unavailable.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FiezelInteractiveChat = api;
    root.interactiveChatView = function () {
      api.mount(document.getElementById('app'));
    };
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  var STORAGE_KEY = 'fiezel-interactive-chat-v1';

  function t(k, fb) {
    var s;
    try {
      var I = (typeof root !== 'undefined' && root && root.FiezelI18n) || (typeof self !== 'undefined' ? self.FiezelI18n : null);
      s = I && typeof I.t === 'function' ? I.t(k) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = (fb == null ? k : fb);
    return s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getActiveCourse() {
    try {
      if (root.FiezelI18n && typeof root.FiezelI18n.getCourse === 'function') {
        return root.FiezelI18n.getCourse() === 'ja' ? 'ja' : 'en';
      }
      if (typeof root.activeTargetLang === 'function') {
        return root.activeTargetLang() === 'ja' ? 'ja' : 'en';
      }
    } catch (_) {}
    return 'ja';
  }

  function getLearnerLevel() {
    try {
      if (typeof root.getActiveLevel === 'function') return root.getActiveLevel();
      var state = (typeof root.__getFiezelState === 'function') ? root.__getFiezelState() : (root.state || {});
      return state.level || 'A1';
    } catch (_) {
      return 'N5';
    }
  }

  function getLearnerName() {
    try {
      if (typeof root.learnerName === 'function') return root.learnerName() || 'Kawan';
      var state = (typeof root.__getFiezelState === 'function') ? root.__getFiezelState() : (root.state || {});
      return state.userName || 'Kawan';
    } catch (_) {
      return 'Kawan';
    }
  }

  // --- Scenarios Data Bank ---
  var SCENARIOS = {
    ja: [
      {
        id: 'free',
        icon: '💬',
        title: 'フリートーク',
        label: t('chat.sc_free_ja', 'Obrolan Bebas'),
        desc: t('chat.sc_free_ja_desc', 'Ngobrol santai seputar hari ini, cuaca, atau apa pun yang ingin kamu bicarakan.'),
        goals: [
          { id: 'g1', text: t('chat.g_free1', 'Sapa partner percakapan (Konnichiwa / Hajimemashite)') },
          { id: 'g2', text: t('chat.g_free2', 'Bicarakan topik kegemaran atau hobi') },
          { id: 'g3', text: t('chat.g_free3', 'Berikan pendapat atau respon (Suki / Omoshiroi)') }
        ],
        starter: {
          text: 'こんにちは！今日はどんなことについて話したいですか？何でも気軽に話しかけてね！',
          furigana: 'こんにちは！[今日](きょう)はどんなことについて[話](はな)したいですか？[何](なん)でも[気軽](きがる)に[話](はな)しかけてね！',
          romaji: 'Konnichiwa! Kyou wa donna koto ni tsuite hanashitai desu ka? Nan demo kigaru ni hanashikakete ne!',
          translation: t('chat.sc_free_trans', 'Halo! Hari ini mau ngobrol tentang apa? Cerita apa saja dengan santai ya!'),
          grammarNote: t('chat.sc_free_note', 'Gunakan bentuk「〜について話したい」(~ ni tsuite hanashitai) untuk menyatakan ingin berbicara tentang suatu topik.'),
          suggestions: [
            { text: '日本語を勉強しています。', romaji: 'Nihongo o benkyou shite imasu.', translation: t('chat.sug_ja_learn', 'Saya sedang belajar bahasa Jepang.') },
            { text: '週末に映画を見ました。', romaji: 'Shuumatsu ni eiga o mimashita.', translation: t('chat.sug_ja_movie', 'Akhir pekan kemarin saya nonton film.') },
            { text: '日本の文化が大好きです！', romaji: 'Nihon no bunka ga daisuki desu!', translation: t('chat.sug_ja_culture', 'Saya sangat suka budaya Jepang!') }
          ]
        }
      },
      {
        id: 'ramen',
        icon: '🍜',
        title: 'ラーメン屋',
        label: t('chat.sc_ramen_lbl', 'Restoran Ramen'),
        desc: t('chat.sc_ramen_desc', 'Latihan memesan makanan dan berinteraksi dengan pelayan di kedai ramen.'),
        goals: [
          { id: 'g1', text: t('chat.g_ramen1', 'Pilih varian kuah ramen (Shoyu / Miso / Tonkotsu)') },
          { id: 'g2', text: t('chat.g_ramen2', 'Tentukan tekstur kematangan mie (Futsuu / Katame)') },
          { id: 'g3', text: t('chat.g_ramen3', 'Ucapkan selesai / terima kasih (Gochisousama)') }
        ],
        starter: {
          text: 'いらっしゃいませ！ラーメン屋へようこそ。何名様ですか？ご注文はお決まりですか？',
          furigana: 'いらっしゃいませ！ラーメン[屋](や)へようこそ。[何名様](なんめいさま)ですか？ご[注文](ちゅうもん)はお[決](き)まりですか？',
          romaji: 'Irasshaimase! Raamen-ya e youkoso. Nan-mei-sama desu ka? Gochuumon wa okimari desu ka?',
          translation: t('chat.sc_ramen_trans', 'Selamat datang di kedai ramen kami! Untuk berapa orang? Apakah sudah siap memesan?'),
          grammarNote: t('chat.sc_ramen_note', 'Frasa「お決まりですか」(Okimari desu ka) adalah bentuk sopan keigo dari "apakah sudah memutuskan/memilih".'),
          suggestions: [
            { text: '一人です。豚骨ラーメンを一つください。', romaji: 'Hitori desu. Tonkotsu raamen o hitotsu kudasai.', translation: t('chat.sug_ramen_order', 'Satu orang. Minta tonkotsu ramen 1 porsi.') },
            { text: 'おすすめのラーメンは何ですか？', romaji: 'Osusume no raamen wa nan desu ka?', translation: t('chat.sug_ramen_rec', 'Apa ramen yang direkomendasikan?') },
            { text: 'お水を一杯いただけますか？', romaji: 'Omizu o ippai itadakemasu ka?', translation: t('chat.sug_ramen_water', 'Boleh saya minta segelas air putih?') }
          ]
        }
      },
      {
        id: 'konbini',
        icon: '🏪',
        title: 'コンビニ',
        label: t('chat.sc_konbini_lbl', 'Belanja di Konbini'),
        desc: t('chat.sc_konbini_desc', 'Praktik transaksi di minimarket Jepang (meminta kantong, menghangatkan bento, dll).'),
        goals: [
          { id: 'g1', text: t('chat.g_konb1', 'Minta hangatkan bekal / beli belanjaan (Onegaishimasu)') },
          { id: 'g2', text: t('chat.g_konb2', 'Pilih metode pembayaran (Genkin / Suica / Card)') },
          { id: 'g3', text: t('chat.g_konb3', 'Respon tawaran kantong atau struk (Daijoubu / Kekkou)') }
        ],
        starter: {
          text: 'いらっしゃいませ！こちら温めますか？ポイントカードはお持ちですか？',
          furigana: 'いらっしゃいませ！こちら[温](あたた)めますか？ポイントカードはお[持](も)ちですか？',
          romaji: 'Irasshaimase! Kochira atatamemasu ka? Pointo kaado wa omochi desu ka?',
          translation: t('chat.sc_konbini_trans', 'Selamat datang! Apakah makanannya mau dihangatkan? Punya kartu poin?'),
          grammarNote: t('chat.sc_konbini_note', '「温めますか」(Atatamemasu ka) selalu ditanyakan saat membeli bento atau onigiri di minimarket.'),
          suggestions: [
            { text: 'はい、温めてください。', romaji: 'Hai, atatamete kudasai.', translation: t('chat.sug_konb_heat', 'Ya, tolong dihangatkan.') },
            { text: 'いいえ、大丈夫です。袋もお願いします。', romaji: 'Iie, daijoubu desu. Fukuro mo onegai shimasu.', translation: t('chat.sug_konb_bag', 'Tidak perlu. Tolong plastiknya juga.') },
            { text: 'お箸を二膳もらえますか？', romaji: 'Ohashi o nizen moraemasu ka?', translation: t('chat.sug_konb_chopsticks', 'Boleh minta sumpit dua pasang?') }
          ]
        }
      },
      {
        id: 'direction',
        icon: '🚉',
        title: '道案内・駅',
        label: t('chat.sc_dir_lbl_ja', 'Tanya Jalan & Kereta'),
        desc: t('chat.sc_dir_desc_ja', 'Latihan menanyakan arah jalan, letak stasiun kereta, dan peron tujuan.'),
        goals: [
          { id: 'g1', text: t('chat.g_dir1', 'Permisi dan sapa orang sekitar (Sumimasen)') },
          { id: 'g2', text: t('chat.g_dir2', 'Tanyakan arah stasiun atau lokasi (Doko / Eki)') },
          { id: 'g3', text: t('chat.g_dir3', 'Ucapkan rasa terima kasih (Arigatou gozaimasu)') }
        ],
        starter: {
          text: 'すみません、何かお困りですか？どちらへ行きたいですか？案内しますよ！',
          furigana: 'すみません、[何](なに)かお[困](こま)りですか？どちらへ[行](い)きたいですか？[案内](あんない)しますよ！',
          romaji: 'Sumimasen, nanika okomari desu ka? Dochira e ikitai desu ka? Annai shimasu yo!',
          translation: t('chat.sc_dir_trans_ja', 'Permisi, apakah ada yang bisa dibantu? Mau pergi ke mana? Akan saya bantu tunjukkan jalannya!'),
          grammarNote: t('chat.sc_dir_note_ja', '「どちらへ行きたいですか」(Dochira e ikitai desu ka) lebih halus daripada「どこ」(doko).'),
          suggestions: [
            { text: 'すみません、新宿駅はどこですか？', romaji: 'Sumimasen, Shinjuku-eki wa doko desu ka?', translation: t('chat.sug_dir_shinjuku', 'Permisi, stasiun Shinjuku di mana ya?') },
            { text: 'ここから歩いてどのくらいかかりますか？', romaji: 'Koko kara aruite dono kurai kakarimasu ka?', translation: t('chat.sug_dir_time', 'Berapa lama jalan kaki dari sini?') },
            { text: 'この電車は渋谷に行きますか？', romaji: 'Kono densha wa Shibuya ni ikimasu ka?', translation: t('chat.sug_dir_train', 'Apakah kereta ini menuju ke Shibuya?') }
          ]
        }
      },
      {
        id: 'intro',
        icon: '🤝',
        title: '自己紹介',
        label: t('chat.sc_intro_lbl', 'Perkenalan Diri'),
        desc: t('chat.sc_intro_desc', 'Latihan memperkenalkan diri, asal negara, hobi, dan pekerjaan dalam bahasa Jepang.'),
        goals: [
          { id: 'g1', text: t('chat.g_intro1', 'Perkenalkan nama diri (Watashi wa ... desu)') },
          { id: 'g2', text: t('chat.g_intro2', 'Sebutkan status atau profesi (Gakusei / Kaishain)') },
          { id: 'g3', text: t('chat.g_intro3', 'Tutup dengan salam perkenalan (Yoroshiku onegaishimasu)') }
        ],
        starter: {
          text: '初めまして！私の名前はフィゼルです。東京に住んでいます。あなたのお名前と出身を教えてください！',
          furigana: '[初](はじ)めまして！[私](わたし)の[名前](なまえ)はフィゼルです。[東京](とうきょう)に[住](す)んでいます。あなたのお[名前](なまえ)とご[出身](しゅっしん)を[教](おし)えてください！',
          romaji: 'Hajimemashite! Watashi no namae wa Fizeru desu. Toukyou ni sunde imasu. Anata no onamae to goshusshin o oshiete kudasai!',
          translation: t('chat.sc_intro_trans', 'Salam kenal! Nama saya Fiezel. Saya tinggal di Tokyo. Siapa namamu dan dari mana asalmu?'),
          grammarNote: t('chat.sc_intro_note', 'Selalu awali perkenalan dengan「初めまして」(Hajimemashite) dan akhiri dengan「よろしくお願いします」(Yoroshiku onegaishimasu).'),
          suggestions: [
            { text: '初めまして！インドネシアから来ました。', romaji: 'Hajimemashite! Indoneshia kara kimashita.', translation: t('chat.sug_intro_origin', 'Salam kenal! Saya berasal dari Indonesia.') },
            { text: '学生です。日本語を勉強し始めたばかりです。', romaji: 'Gakusei desu. Nihongo o benkyou shihajimeta bakari desu.', translation: t('chat.sug_intro_student', 'Saya pelajar. Baru mulai belajar bahasa Jepang.') },
            { text: 'よろしくお願いします！', romaji: 'Yoroshiku onegaishimasu!', translation: t('chat.sug_intro_pleased', 'Senang berkenalan dengan Anda / Mohon bantuannya!') }
          ]
        }
      }
    ],
    en: [
      {
        id: 'free',
        icon: '💬',
        title: 'Free Talk',
        label: t('chat.sc_free_en', 'Obrolan Bebas'),
        desc: t('chat.sc_free_en_desc', 'Casual conversation on any topic you like to boost everyday speaking fluency.'),
        goals: [
          { id: 'g1', text: t('chat.g_en_free1', 'Greet your speaking partner naturally') },
          { id: 'g2', text: t('chat.g_en_free2', 'Share a favorite activity or recent experience') },
          { id: 'g3', text: t('chat.g_en_free3', 'Ask your partner a follow-up question') }
        ],
        starter: {
          text: 'Hi there! What would you like to chat about today? Feel free to tell me anything!',
          translation: t('chat.sc_en_free_trans', 'Hai! Mau ngobrol tentang apa hari ini? Cerita apa saja dengan santai ya!'),
          grammarNote: t('chat.sc_en_free_note', 'Use "feel free to [verb]" to invite someone warmly to do something without hesitation.'),
          suggestions: [
            { text: 'I am currently practicing my English skills.', translation: t('chat.sug_en_practice', 'Saya sedang melatih kemampuan bahasa Inggris saya.') },
            { text: 'I watched a very interesting movie yesterday.', translation: t('chat.sug_en_movie', 'Kemarin saya nonton film yang sangat menarik.') },
            { text: 'What is your favorite hobby?', translation: t('chat.sug_en_hobby', 'Apa hobi favoritmu?') }
          ]
        }
      },
      {
        id: 'cafe',
        icon: '☕',
        title: 'At the Cafe',
        label: t('chat.sc_cafe_lbl', 'Pesan Kopi di Kafe'),
        desc: t('chat.sc_cafe_desc', 'Practice ordering drinks, pastries, and asking for customized coffee orders.'),
        goals: [
          { id: 'g1', text: t('chat.g_en_cafe1', 'Order a beverage (coffee / iced latte / tea)') },
          { id: 'g2', text: t('chat.g_en_cafe2', 'Customize milk, size, or pastry (oat milk / croissant)') },
          { id: 'g3', text: t('chat.g_en_cafe3', 'Specify dine-in or takeaway (for here / to go)') }
        ],
        starter: {
          text: 'Welcome to Fiezel Cafe! What can I get started for you today?',
          translation: t('chat.sc_en_cafe_trans', 'Selamat datang di Fiezel Cafe! Mau pesan apa hari ini?'),
          grammarNote: t('chat.sc_en_cafe_note', '"What can I get started for you?" is a very common polite greeting used by baristas.'),
          suggestions: [
            { text: 'Could I get an iced latte with oat milk, please?', translation: t('chat.sug_cafe_latte', 'Bisa minta satu es latte dengan susu oat?') },
            { text: 'Do you have any dairy-free options available?', translation: t('chat.sug_cafe_dairy', 'Apakah ada pilihan yang bebas susu sapi?') },
            { text: 'For here, and I will take a chocolate croissant too.', translation: t('chat.sug_cafe_pastry', 'Makan di sini, dan saya mau croissant cokelat juga.') }
          ]
        }
      },
      {
        id: 'direction',
        icon: '🗺️',
        title: 'Directions',
        label: t('chat.sc_dir_lbl_en', 'Tanya Arah Jalan'),
        desc: t('chat.sc_dir_desc_en', 'Asking for directions in a new city, subway stations, or nearest tourist attractions.'),
        goals: [
          { id: 'g1', text: t('chat.g_en_dir1', 'Excuse yourself politely to ask for help') },
          { id: 'g2', text: t('chat.g_en_dir2', 'Ask for the nearest train station or landmark') },
          { id: 'g3', text: t('chat.g_en_dir3', 'Thank the local person warmly') }
        ],
        starter: {
          text: 'Excuse me! You look a bit lost. Are you looking for a specific place around here?',
          translation: t('chat.sc_dir_trans_en', 'Permisi! Kamu terlihat agak tersesat. Apakah sedang mencari tempat tertentu di sekitar sini?'),
          grammarNote: t('chat.sc_dir_note_en', '"To look lost" means appearing uncertain of where you are going.'),
          suggestions: [
            { text: 'Excuse me, where is the nearest train station?', translation: t('chat.sug_dir_en_station', 'Permisi, di mana stasiun kereta terdekat?') },
            { text: 'How long does it take to walk to downtown?', translation: t('chat.sug_dir_en_walk', 'Berapa lama waktu jalan kaki ke pusat kota?') },
            { text: 'Could you show me the way on the map?', translation: t('chat.sug_dir_en_map', 'Bisakah kamu tunjukkan jalannya di peta?') }
          ]
        }
      },
      {
        id: 'interview',
        icon: '💼',
        title: 'Job & School Interview',
        label: t('chat.sc_interview_lbl', 'Simulasi Wawancara'),
        desc: t('chat.sc_interview_desc', 'Practice answering common interview questions about your background, skills, and goals.'),
        goals: [
          { id: 'g1', text: t('chat.g_en_int1', 'Introduce your name and current role') },
          { id: 'g2', text: t('chat.g_en_int2', 'Highlight a key skill or strength') },
          { id: 'g3', text: t('chat.g_en_int3', 'Express your motivation to grow and contribute') }
        ],
        starter: {
          text: 'Thank you for coming in today. Could you please introduce yourself and tell me about your background?',
          translation: t('chat.sc_interview_trans', 'Terima kasih sudah hadir hari ini. Bisakah kamu memperkenalkan dirimu dan latar belakangmu?'),
          grammarNote: t('chat.sc_interview_note', 'Start with a brief statement of your current role, key strengths, and what drives your passion.'),
          suggestions: [
            { text: 'Certainly! My name is ' + getLearnerName() + ' and I am passionate about learning.', translation: t('chat.sug_int_name', 'Tentu! Nama saya ' + getLearnerName() + ' dan saya bersemangat untuk belajar.') },
            { text: 'I have been developing my communication and problem-solving skills.', translation: t('chat.sug_int_skills', 'Saya telah mengembangkan kemampuan komunikasi dan pemecahan masalah saya.') },
            { text: 'I am excited about this opportunity to contribute and grow.', translation: t('chat.sug_int_contrib', 'Saya antusias dengan kesempatan ini untuk berkontribusi dan bertumbuh.') }
          ]
        }
      },
      {
        id: 'hotel',
        icon: '🏨',
        title: 'Hotel Check-in',
        label: t('chat.sc_hotel_lbl', 'Check-in Hotel'),
        desc: t('chat.sc_hotel_desc', 'Check in smoothly, ask about hotel amenities, breakfast hours, and room services.'),
        goals: [
          { id: 'g1', text: t('chat.g_en_hot1', 'State reservation details and check-in') },
          { id: 'g2', text: t('chat.g_en_hot2', 'Ask about Wi-Fi or breakfast hours') },
          { id: 'g3', text: t('chat.g_en_hot3', 'Request room key and thank the concierge') }
        ],
        starter: {
          text: 'Good evening! Welcome to the Grand Fiezel Hotel. Do you have a reservation with us?',
          translation: t('chat.sc_hotel_trans', 'Selamat malam! Selamat datang di Grand Fiezel Hotel. Apakah Anda sudah memiliki reservasi?'),
          grammarNote: t('chat.sc_hotel_note', '"To have a reservation" means your booking is already registered in advance.'),
          suggestions: [
            { text: 'Yes, I have a reservation under ' + getLearnerName() + '.', translation: t('chat.sug_hot_booking', 'Ya, saya ada reservasi atas nama ' + getLearnerName() + '.') },
            { text: 'What time is breakfast served in the morning?', translation: t('chat.sug_hot_bfast', 'Sarapan pagi disajikan jam berapa?') },
            { text: 'Is complimentary high-speed Wi-Fi available in the room?', translation: t('chat.sug_hot_wifi', 'Apakah ada Wi-Fi cepat gratis di kamar?') }
          ]
        }
      }
    ]
  };

  // Convert bracketed furigana `[Kanji](reading)` to HTML ruby
  function formatFurigana(text) {
    if (!text) return '';
    return esc(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, kanji, kana) {
      return '<ruby>' + kanji + '<rt>' + kana + '</rt></ruby>';
    });
  }

  // --- Pronunciation & Levenshtein Similarity Evaluator ---
  function levenshteinDistance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var v0 = new Array(b.length + 1);
    var v1 = new Array(b.length + 1);
    for (var i = 0; i <= b.length; i++) v0[i] = i;
    for (var j = 0; j < a.length; j++) {
      v1[0] = i + 1;
      for (var k = 0; k < b.length; k++) {
        var cost = a[j] === b[k] ? 0 : 1;
        v1[k + 1] = Math.min(v1[k] + 1, v0[k + 1] + 1, v0[k] + cost);
      }
      for (var m = 0; m <= b.length; m++) v0[m] = v1[m];
    }
    return v1[b.length];
  }

  function normalizeSpeechText(str) {
    if (!str) return '';
    var s = String(str);
    // Strip furigana bracket notation [Kanji](reading)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    s = s.replace(/[\s\.,!\?、。！？・'"`~\-_:;\(\)]/g, '');
    return s.toLowerCase();
  }

  function evaluatePronunciation(targetText, spokenText, course) {
    if (!targetText || !spokenText) {
      return { score: 0, heard: spokenText || '', passed: false };
    }
    var normTarget = normalizeSpeechText(targetText);
    var normSpoken = normalizeSpeechText(spokenText);
    if (!normTarget || !normSpoken) {
      return { score: 0, heard: spokenText, passed: false };
    }
    if (normTarget === normSpoken) {
      return { score: 100, heard: spokenText, passed: true };
    }

    var dist = levenshteinDistance(normTarget, normSpoken);
    var maxLen = Math.max(normTarget.length, normSpoken.length);
    var rawRatio = Math.max(0, 1 - (dist / maxLen));
    var score = Math.round(rawRatio * 100);

    return {
      score: Math.min(100, Math.max(0, score)),
      heard: spokenText,
      passed: score >= 60
    };
  }

  // --- Scenario Goal Evaluation ---
  function evaluateGoalProgress(scenario, messages) {
    if (!scenario || !Array.isArray(scenario.goals)) return [];
    var userMsgs = (messages || []).filter(function (m) { return m.role === 'user'; });
    var fullText = userMsgs.map(function (m) { return m.text || ''; }).join(' ').toLowerCase();
    var userMsgCount = userMsgs.length;

    return scenario.goals.map(function (g) {
      var done = false;
      if (scenario.id === 'ramen') {
        if (g.id === 'g1') done = /醤油|しょうゆ|味噌|みそ|豚骨|とんこつ|shoyu|miso|tonkotsu|ラーメン/.test(fullText);
        else if (g.id === 'g2') done = /普通|ふつう|硬め|かため|柔らかめ|やわらかめ|futsuu|katame/.test(fullText);
        else if (g.id === 'g3') done = /ごちそう|ありがとう|会計|かいけい|gochisou|arigatou/.test(fullText);
      } else if (scenario.id === 'konbini') {
        if (g.id === 'g1') done = /温め|はい|お願い|atatam|onegai|これ/.test(fullText);
        else if (g.id === 'g2') done = /現金|suica|カード|げんきん|genkin|card/.test(fullText);
        else if (g.id === 'g3') done = /袋|レシート|大丈夫|要りません|fukuro|daijoubu|irimasen|結構/.test(fullText);
      } else if (scenario.id === 'direction') {
        if (g.id === 'g1') done = /すみません|sumimasen|excuse/.test(fullText);
        else if (g.id === 'g2') done = /どこ|駅|えき|doko|eki|station|where/.test(fullText);
        else if (g.id === 'g3') done = /ありがとう|わかりました|arigatou|wakarimashita|thank/.test(fullText);
      } else if (scenario.id === 'cafe') {
        if (g.id === 'g1') done = /coffee|latte|tea|espresso|order|like to get/.test(fullText);
        else if (g.id === 'g2') done = /oat|almond|milk|croissant|large|medium|small|sugar/.test(fullText);
        else if (g.id === 'g3') done = /for here|to go|takeaway|card|cash|pay/.test(fullText);
      } else {
        if (g.id === 'g1') done = userMsgCount >= 1;
        else if (g.id === 'g2') done = userMsgCount >= 2;
        else if (g.id === 'g3') done = userMsgCount >= 3;
      }
      return { id: g.id, text: g.text, done: done };
    });
  }

  // --- Common Misconception Detector ---
  function checkMisconception(text, course) {
    if (!text) return null;
    var tRaw = text.trim();
    if (course === 'ja') {
      if (/\bわたし\s*わ\b/i.test(tRaw) || /わたしわ/.test(tRaw)) {
        return {
          id: 'particle_wa_ha',
          title: t('chat.misc_wa_title', 'Tips Partikel は'),
          desc: t('chat.misc_wa_desc', 'Partikel penanda topik "wa" selalu ditulis dengan hiragana「は」, bukan「わ」.')
        };
      }
      if (/これ\s*わ/i.test(tRaw) || /それ\s*わ/i.test(tRaw) || /あれ\s*わ/i.test(tRaw)) {
        return {
          id: 'particle_wa_pronoun',
          title: t('chat.misc_wa_pron_title', 'Tips Partikel は'),
          desc: t('chat.misc_wa_pron_desc', 'Gunakan hiragana「は」untuk partikel penanda topik (contoh: これは / それは).')
        };
      }
      if (/[がガ]\s*(食べ|たべ|飲み|のみ|買い|かい|見|み|勉強し|べんきょうし)/.test(tRaw)) {
        return {
          id: 'particle_o_vs_ga',
          title: t('chat.misc_o_ga_title', 'Tips Partikel を vs が'),
          desc: t('chat.misc_o_ga_desc', 'Gunakan partikel penanda objek「を」untuk kata kerja yang dikenai aksi (contoh: ラーメンを食べます).')
        };
      }
      if (/ですかか|ですか\s*か/.test(tRaw)) {
        return {
          id: 'particle_ka_repeat',
          title: t('chat.misc_ka_rep_title', 'Partikel Tanya か'),
          desc: t('chat.misc_ka_rep_desc', 'Partikel tanya「か」cukup digunakan satu kali di akhir kalimat tanya sopan.')
        };
      }
      if (/ありがとう\s*ございます/i.test(tRaw) && !/ありがとう/i.test(tRaw)) {
        return null;
      }
    } else {
      if (/\bi\s+am\s+agree\b/i.test(tRaw)) {
        return {
          id: 'verb_agree',
          title: t('chat.misc_agree_title', 'Common Mistake: I agree'),
          desc: t('chat.misc_agree_desc', 'Say "I agree", not "I am agree". "Agree" is already a verb.')
        };
      }
      if (/\b(he|she|it)\s+(go|want|like|need|play)\b/i.test(tRaw)) {
        return {
          id: 'sva_present',
          title: t('chat.misc_sva_title', 'Subject-Verb Agreement'),
          desc: t('chat.misc_sva_desc', 'Add -s or -es for third-person singular (e.g. "He goes" / "She wants").')
        };
      }
      if (/\b(yesterday|last\s+week|last\s+night)\b.*?\bi\s+go\b/i.test(tRaw)) {
        return {
          id: 'past_tense_go',
          title: t('chat.misc_past_title', 'Simple Past Tense'),
          desc: t('chat.misc_past_desc', 'Use the past tense form "went" for past time events (e.g. "Yesterday I went").')
        };
      }
      if (/\bi\s+am\s+study\b/i.test(tRaw)) {
        return {
          id: 'verb_study_be',
          title: t('chat.misc_be_study_title', 'Verb Form Notice'),
          desc: t('chat.misc_be_study_desc', 'Say "I am studying" for continuous actions, or "I study" for routine habits.')
        };
      }
      if (/\bmore\s+(better|easier|faster|bigger)\b/i.test(tRaw)) {
        return {
          id: 'double_comparative',
          title: t('chat.misc_double_comp_title', 'Double Comparative'),
          desc: t('chat.misc_double_comp_desc', 'Avoid "more better". The word "better" is already comparative.')
        };
      }
    }
    return null;
  }

  // Offline Deterministic Dialogue Fallback Graph
  function generateOfflineReply(userText, scenarioId, course) {
    var raw = (userText || '').toLowerCase();
    if (course === 'ja') {
      if (scenarioId === 'ramen') {
        if (/ラーメン|豚骨|味噌|醤油/i.test(raw)) {
          return {
            text: 'かしこまりました！麺の硬さはどうなさいますか？普通、硬め、柔らかめから選べますよ。',
            furigana: 'かしこまりました！[麺](めん)の[硬](かた)さはどうなさいますか？[普通](ふつう)、[硬](かた)め、[柔](やわ)らかめから[選](えら)べますよ。',
            romaji: 'Kashikomarimashita! Men no katasa wa dou nasaimasu ka? Futsuu, katame, yawarakame kara erabemasu yo.',
            translation: t('chat.off_ramen_trans1', 'Baik, dimengerti! Bagaimana dengan tingkat kematangan mienya? Bisa pilih biasa, keras, atau lembut.'),
            grammarNote: t('chat.off_ramen_note1', '「どうなさいますか」(Dou nasaimasu ka) adalah bentuk sangat sopan dari「どうしますか」(Bagaimana maunya).'),
            suggestions: [
              { text: '硬めでお願いします！', romaji: 'Katame de onegai shimasu!', translation: t('chat.sug_katame', 'Minta yang agak keras ya!') },
              { text: '普通で大丈夫です。', romaji: 'Futsuu de daijoubu desu.', translation: t('chat.sug_futsuu', 'Biasa saja tidak apa-apa.') },
              { text: 'トッピングに味玉も追加できますか？', romaji: 'Toppingu ni ajitama mo tsuika dekimasu ka?', translation: t('chat.sug_ajitam', 'Bisa tambah topping telur rebus berbumbu?') }
            ]
          };
        }
        return {
          text: 'ありがとうございます！少々お待ちくださいね。すぐに熱々のラーメンをお持ちします！',
          furigana: 'ありがとうございます！[少々](しょうしょう)お[待](ま)ちくださいね。すぐに[熱々](あつあつ)のラーメンをお[持](も)ちします！',
          romaji: 'Arigatou gozaimasu! Shoushou omachi kudasai ne. Sugu ni atsuatsu no raamen o omochi shimasu!',
          translation: t('chat.off_ramen_trans2', 'Terima kasih banyak! Mohon tunggu sebentar ya. Segera saya bawakan ramen hangatnya!'),
          grammarNote: t('chat.off_ramen_note2', '「少々お待ちください」(Shoushou omachi kudasai) = Mohon tunggu sebentar.'),
          suggestions: [
            { text: 'とても美味しそうです！', romaji: 'Totemo oishisou desu!', translation: t('chat.sug_tasty', 'Kelihatannya enak sekali!') },
            { text: 'ごちそうさまでした。', romaji: 'Gochisousama deshita.', translation: t('chat.sug_gochisou', 'Terima kasih atas hidangannya (setelah makan).') }
          ]
        };
      }
      if (scenarioId === 'konbini') {
        if (/温め|はい|お願いします/i.test(raw)) {
          return {
            text: 'かしこまりました。電子レンジで温めますね。お会計は750円になります！',
            furigana: 'かしこまりました。[電子](でんし)レンジで[温](あたた)めますね。お[会計](かいけい)は750[円](えん)になります！',
            romaji: 'Kashikomarimashita. Denshi renji de atatamemasu ne. Okaikei wa nanahyaku-gojuu-en ni narimasu!',
            translation: t('chat.off_konb_trans1', 'Baik, saya hangatkan di microwave ya. Total pembayarannya jadi 750 yen!'),
            grammarNote: t('chat.off_konb_note1', 'Frasa「〜になります」sering dipakai kasir Jepang untuk menyebutkan total harga.'),
            suggestions: [
              { text: '現金で払います。', romaji: 'Genkin de haraimasu.', translation: t('chat.sug_cash', 'Saya bayar tunai.') },
              { text: 'Suicaで払えますか？', romaji: 'Suica de haraemasu ka?', translation: t('chat.sug_suica', 'Bisa bayar pakai kartu Suica?') },
              { text: 'レシートは要りません。', romaji: 'Reshiito wa irimasen.', translation: t('chat.sug_receipt', 'Tidak perlu struk belanja.') }
            ]
          };
        }
        return {
          text: 'かしこまりました！他にご注文はございますか？',
          furigana: 'かしこまりました！[他](ほか)にご[注文](ちゅうもん)はございますか？',
          romaji: 'Kashikomarimashita! Hoka ni gochuumon wa gozaimasu ka?',
          translation: t('chat.off_konb_trans2', 'Baik, dimengerti! Apakah ada pesanan lain lagi?'),
          grammarNote: t('chat.off_konb_note2', '「他に〜ございますか」(Hoka ni ~ gozaimasu ka) = Apakah ada yang lain?'),
          suggestions: [
            { text: 'これで全部です。', romaji: 'Kore de zenbu desu.', translation: t('chat.sug_all', 'Ini saja semuanya.') },
            { text: 'ありがとうございます！', romaji: 'Arigatou gozaimasu!', translation: t('chat.sug_thanks', 'Terima kasih banyak!') }
          ]
        };
      }
      if (scenarioId === 'direction') {
        return {
          text: 'ここをまっすぐ行って、二つ目の交差点を右に曲がるとすぐ見えますよ！歩いて約5分です。',
          furigana: 'ここをまっすぐ[行](い)って、[二](ふた)つ[目](め)の[交差点](こうさてん)を[右](みぎ)に[曲](ま)がるとすぐ[見](み)えますよ！[歩](ある)いて[約](やく)5[分](ふん)です。',
          romaji: 'Koko o massugu itte, futatsume no kousaten o migi ni magaru to sugu miemasu yo! Aruite yaku gofun desu.',
          translation: t('chat.off_dir_trans', 'Jalan lurus dari sini, lalu belok kanan di perempatan kedua, nanti langsung kelihatan! Jalan kaki sekitar 5 menit.'),
          grammarNote: t('chat.off_dir_note', 'Pola「まっすぐ行って、〜を右に曲がる」adalah rumus standar memberi petunjuk jalan.'),
          suggestions: [
            { text: 'わかりました！親切にありがとうございます。', romaji: 'Wakarimashita! Shinsetsu ni arigatou gozaimasu.', translation: t('chat.sug_dir_kind', 'Saya mengerti! Terima kasih atas keramahannya.') },
            { text: '近くにコンビニもありますか？', romaji: 'Chikaku ni konbini mo arimasu ka?', translation: t('chat.sug_dir_konbini', 'Apakah ada minimarket di dekat sana juga?') }
          ]
        };
      }
      // Free talk / intro default
      return {
        text: 'なるほど、よくわかりました！日本語の発音もとても自然ですよ。次は何について話しましょうか？',
        furigana: 'なるほど、よくわかりました！[日本語](にほんご)の[発音](はつおん)もとても[自然](しぜん)ですよ。[次](つぎ)は[何](なに)について[話](はな)しましょうか？',
        romaji: 'Naruhodo, yoku wakarimashita! Nihongo no hatsuon mo totemo shizen desu yo. Tsugi wa nani ni tsuite hanashimashou ka?',
        translation: t('chat.off_free_trans', 'Begitu ya, saya mengerti! Pelafalan bahasa Jepangmu juga sangat natural lho. Selanjutnya mau ngobrol tentang apa lagi?'),
        grammarNote: t('chat.off_free_note', 'Kata「なるほど」(Naruhodo) digunakan untuk menyatakan pemahaman atau setuju ("oh begitu ya!").'),
        suggestions: [
          { text: '日本のアニメについて話したいです！', romaji: 'Nihon no anime ni tsuite hanashitai desu!', translation: t('chat.sug_anime', 'Saya ingin bicara tentang anime Jepang!') },
          { text: '東京のおすすめの観光地を教えてください。', romaji: 'Toukyou no osusume no kankouchi o oshiete kudasai.', translation: t('chat.sug_sightsee', 'Beri tahu saya tempat wisata rekomendasi di Tokyo.') }
        ]
      };
    } else {
      // English scenarios
      if (scenarioId === 'cafe') {
        return {
          text: 'Great choice! Would you like that for here, or to go? We also have freshly baked chocolate muffins today!',
          translation: t('chat.off_cafe_trans', 'Pilihan mantap! Mau dinikmati di sini atau dibungkus? Kami juga ada muffin cokelat hangat hari ini!'),
          grammarNote: t('chat.off_cafe_note', '"For here or to go" is the universal phrase for dining in vs takeout in English coffee shops.'),
          suggestions: [
            { text: 'For here, please. And I will add a muffin too!', translation: t('chat.sug_en_dine', 'Makan di sini ya. Dan saya tambah muffin juga!') },
            { text: 'To go, please. Could you make it extra hot?', translation: t('chat.sug_en_takeout', 'Dibungkus ya. Bisa dibuat lebih panas?') }
          ]
        };
      }
      if (scenarioId === 'interview') {
        return {
          text: 'That sounds impressive! What would you say is your greatest strength when collaborating with a team?',
          translation: t('chat.off_int_trans', 'Terdengar sangat impresif! Menurutmu apa kekuatan terbesarmu saat berkolaborasi dalam sebuah tim?'),
          grammarNote: t('chat.off_int_note', 'Interviewers frequently ask about team dynamics to evaluate emotional intelligence and adaptability.'),
          suggestions: [
            { text: 'I am a clear communicator and love supporting my teammates.', translation: t('chat.sug_int_comm', 'Saya komunikator yang jelas dan suka mendukung rekan tim.') },
            { text: 'I stay calm and focused when solving complex problems.', translation: t('chat.sug_int_solve', 'Saya tetap tenang dan fokus saat menyelesaikan masalah rumit.') }
          ]
        };
      }
      return {
        text: 'That sounds wonderful! You communicate your thoughts very clearly. What else would you like to explore today?',
        translation: t('chat.off_en_free_trans', 'Menyenangkan sekali! Kamu menyampaikan pemikiranmu dengan sangat jelas. Apa lagi yang ingin kamu bahas hari ini?'),
        grammarNote: t('chat.off_en_free_note', 'Using conversational transitions like "That sounds wonderful!" helps keep dialogues natural and engaging.'),
        suggestions: [
          { text: 'Can you tell me about common English slang?', translation: t('chat.sug_en_slang', 'Bisakah kamu ceritakan tentang bahasa gaul Inggris umum?') },
          { text: "Let's practice ordering food at a restaurant.", translation: t('chat.sug_en_rest', 'Ayo latihan memesan makanan di restoran.') }
        ]
      };
    }
  }

  // --- Main Interactive Chat Controller ---
  var state = {
    course: 'ja',
    scenarioId: 'free',
    messages: [],
    scenarioHistories: {},
    isThinking: false,
    isListening: false,
    shadowingMsgId: null,
    audioPlayingId: null,
    recognition: null
  };

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        state.scenarioId = saved.scenarioId || 'free';
        state.scenarioHistories = saved.scenarioHistories || {};
      }
    } catch (_) {}
    state.course = getActiveCourse();
    initScenario(state.scenarioId);
  }

  function saveState() {
    try {
      if (state.scenarioId && state.messages) {
        state.scenarioHistories[state.scenarioId] = state.messages;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scenarioId: state.scenarioId,
        scenarioHistories: state.scenarioHistories
      }));
    } catch (_) {}
  }

  function getScenario(id) {
    var list = SCENARIOS[state.course] || SCENARIOS.ja;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0];
  }

  function initScenario(id) {
    // Save current active messages before switching
    if (state.scenarioId && state.messages && state.messages.length > 0) {
      state.scenarioHistories[state.scenarioId] = state.messages;
    }
    state.scenarioId = id;
    if (state.scenarioHistories && state.scenarioHistories[id] && state.scenarioHistories[id].length > 0) {
      state.messages = state.scenarioHistories[id];
    } else {
      var sc = getScenario(id);
      var starter = sc.starter;
      state.messages = [
        {
          id: 'msg-start-' + id,
          role: 'assistant',
          text: starter.text,
          furigana: starter.furigana,
          romaji: starter.romaji,
          translation: starter.translation,
          grammarNote: starter.grammarNote,
          suggestions: starter.suggestions,
          showTranslation: false
        }
      ];
      state.scenarioHistories[id] = state.messages;
    }
  }

  function resetCurrentScenario() {
    var id = state.scenarioId;
    if (state.scenarioHistories) {
      delete state.scenarioHistories[id];
    }
    var sc = getScenario(id);
    var starter = sc.starter;
    state.messages = [
      {
        id: 'msg-start-' + id,
        role: 'assistant',
        text: starter.text,
        furigana: starter.furigana,
        romaji: starter.romaji,
        translation: starter.translation,
        grammarNote: starter.grammarNote,
        suggestions: starter.suggestions,
        showTranslation: false
      }
    ];
    state.scenarioHistories[id] = state.messages;
    saveState();
    updateUI();
  }

  // Speak text via neural voice or web speech
  function playVoice(text, msgId) {
    if (state.audioPlayingId === msgId) {
      stopVoice();
      return;
    }
    stopVoice();
    state.audioPlayingId = msgId;
    updateUI();

    var cleanText = String(text || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (root.FiezelVoiceSay && typeof root.FiezelVoiceSay.say === 'function') {
      root.FiezelVoiceSay.say(cleanText).finally(function () {
        if (state.audioPlayingId === msgId) {
          state.audioPlayingId = null;
          updateUI();
        }
      });
      return;
    }

    if (root.speechSynthesis) {
      try {
        var utter = new root.SpeechSynthesisUtterance(cleanText);
        utter.lang = state.course === 'ja' ? 'ja-JP' : 'en-US';
        utter.onend = function () {
          if (state.audioPlayingId === msgId) {
            state.audioPlayingId = null;
            updateUI();
          }
        };
        utter.onerror = function () {
          state.audioPlayingId = null;
          updateUI();
        };
        root.speechSynthesis.speak(utter);
      } catch (_) {
        state.audioPlayingId = null;
        updateUI();
      }
    }
  }

  function stopVoice() {
    state.audioPlayingId = null;
    if (root.speechSynthesis && root.speechSynthesis.cancel) {
      root.speechSynthesis.cancel();
    }
  }

  // Send telemetry to Braincore
  function dispatchBraincoreTelemetry(userText) {
    try {
      if (typeof root.updateMastery === 'function') {
        var conceptId = state.course === 'ja' ? 'ja_kaiwa_practice' : 'en_kaiwa_practice';
        root.updateMastery(conceptId, true);
      }
      if (root.FiezelBkt && typeof root.FiezelBkt.recordAttempt === 'function') {
        root.FiezelBkt.recordAttempt('kaiwa_' + state.scenarioId, true);
      }
      var appState = (typeof root.__getFiezelState === 'function') ? root.__getFiezelState() : root.state;
      if (appState && typeof appState.xp === 'number') {
        appState.xp += 5;
        if (typeof root.save === 'function') root.save();
      }
    } catch (_) {}
  }

  function dispatchShadowingTelemetry(evalRes, xpGain) {
    try {
      if (typeof root.updateMastery === 'function') {
        var conceptId = state.course === 'ja' ? 'ja_speaking_shadowing' : 'en_speaking_shadowing';
        root.updateMastery(conceptId, evalRes.passed);
      }
      if (root.FiezelBkt && typeof root.FiezelBkt.recordAttempt === 'function') {
        root.FiezelBkt.recordAttempt('shadowing_' + state.scenarioId, evalRes.passed);
      }
      var appState = (typeof root.__getFiezelState === 'function') ? root.__getFiezelState() : root.state;
      if (appState && typeof appState.xp === 'number') {
        appState.xp += xpGain;
        if (typeof root.save === 'function') root.save();
      }
    } catch (_) {}
  }

  // Handle User Message Submission
  function sendMessage(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed || state.isThinking) return;

    var reqScenarioId = state.scenarioId;

    // Zero-Loss Input: preserve exact student utterance
    var hint = checkMisconception(trimmed, state.course);
    var userMsg = {
      id: 'msg-user-' + Date.now(),
      role: 'user',
      text: trimmed,
      hint: hint
    };

    state.messages.push(userMsg);
    state.scenarioHistories[state.scenarioId] = state.messages;
    state.isThinking = true;
    saveState();
    updateUI();
    scrollBottom();

    dispatchBraincoreTelemetry(trimmed);

    // Call AI gateway if available, or fall back seamlessly
    var sc = getScenario(state.scenarioId);
    var prompt = '';
    if (state.course === 'ja') {
      prompt = 'Kamu adalah Fiezel-chan (フィゼル), partner percakapan bahasa Jepang yang ramah di Tokyo.\n' +
        'Konteks situasi: ' + sc.title + ' (' + sc.desc + '). Level murid: JLPT ' + getLearnerLevel() + '.\n' +
        'User input: "' + trimmed + '".\n' +
        'ATURAN KETAT:\n' +
        '1. Jawab dalam 1-2 kalimat bahasa Jepang yang natural dan sopan (desu/masu).\n' +
        '2. Sertakan furigana dengan format [Kanji](bacaan) untuk kanji.\n' +
        '3. Berikan terjemahan bahasa Indonesia yang jelas.';
    } else {
      prompt = 'You are Fiezel Coach, a warm and encouraging English conversational tutor.\n' +
        'Scenario: ' + sc.title + '. Learner level: CEFR ' + getLearnerLevel() + '.\n' +
        'User input: "' + trimmed + '".\n' +
        'Reply naturally in 1-2 friendly English sentences and provide an Indonesian translation.';
    }

    var aiPromise = null;
    if (typeof root.askFiezelAIResult === 'function') {
      try {
        aiPromise = root.askFiezelAIResult(prompt, 'question', {
          question: trimmed,
          level: getLearnerLevel(),
          lessonId: 'kaiwa_' + state.scenarioId
        });
      } catch (_) {
        aiPromise = null;
      }
    }

    if (!aiPromise) {
      setTimeout(function () {
        deliverAssistantReply(generateOfflineReply(trimmed, reqScenarioId, state.course), reqScenarioId);
      }, 700);
      return;
    }

    aiPromise.then(function (result) {
      if (result && result.text && !result.degraded) {
        var replyObj = {
          text: result.text,
          furigana: state.course === 'ja' ? result.text : null,
          romaji: null,
          translation: t('chat.ai_direct', 'Jawaban langsung dari AI Partner FIEZEL.'),
          grammarNote: t('chat.ai_note', 'Latihan percakapan responsif real-time.'),
          suggestions: sc.starter.suggestions
        };
        deliverAssistantReply(replyObj, reqScenarioId);
      } else {
        deliverAssistantReply(generateOfflineReply(trimmed, reqScenarioId, state.course), reqScenarioId);
      }
    }).catch(function () {
      deliverAssistantReply(generateOfflineReply(trimmed, reqScenarioId, state.course), reqScenarioId);
    });
  }

  function deliverAssistantReply(replyObj, reqScenarioId) {
    state.isThinking = false;
    var assistantMsg = {
      id: 'msg-asst-' + Date.now(),
      role: 'assistant',
      text: replyObj.text,
      furigana: replyObj.furigana,
      romaji: replyObj.romaji,
      translation: replyObj.translation,
      grammarNote: replyObj.grammarNote,
      suggestions: replyObj.suggestions || [],
      showTranslation: false
    };

    // Anti-Race: If user switched scenario while waiting, save into target scenario history without polluting current screen
    if (reqScenarioId && reqScenarioId !== state.scenarioId) {
      var targetHistory = state.scenarioHistories[reqScenarioId] || [];
      targetHistory.push(assistantMsg);
      state.scenarioHistories[reqScenarioId] = targetHistory;
      saveState();
      return;
    }

    state.messages.push(assistantMsg);
    state.scenarioHistories[state.scenarioId] = state.messages;
    saveState();
    updateUI();
    scrollBottom();
  }

  // Shadowing & Pronunciation Practice Mode
  function startShadowing(msgId, targetText) {
    var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Ctor) {
      if (typeof root.showToast === 'function') {
        root.showToast(t('chat.no_mic_shadow', 'Browser belum mendukung pengenalan suara untuk latihan pelafalan.'));
      }
      return;
    }

    if (state.recognition) {
      try { state.recognition.stop(); } catch (_) {}
      state.recognition = null;
    }

    if (state.shadowingMsgId === msgId) {
      state.shadowingMsgId = null;
      updateUI();
      return;
    }

    stopVoice();
    state.isListening = false;
    state.shadowingMsgId = msgId;
    updateUI();

    try {
      var rec = new Ctor();
      rec.lang = state.course === 'ja' ? 'ja-JP' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onresult = function (event) {
        var transcript = '';
        if (event.results && event.results[0] && event.results[0][0]) {
          transcript = event.results[0][0].transcript;
        }
        state.shadowingMsgId = null;
        state.recognition = null;

        if (transcript) {
          var evalRes = evaluatePronunciation(targetText, transcript, state.course);
          for (var i = 0; i < state.messages.length; i++) {
            if (state.messages[i].id === msgId) {
              state.messages[i].shadowResult = evalRes;
              break;
            }
          }
          var xpGain = evalRes.score >= 85 ? 15 : (evalRes.score >= 60 ? 8 : 3);
          dispatchShadowingTelemetry(evalRes, xpGain);
        }
        saveState();
        updateUI();
      };

      rec.onerror = function () {
        state.shadowingMsgId = null;
        state.recognition = null;
        updateUI();
      };

      rec.onend = function () {
        if (state.shadowingMsgId === msgId) {
          state.shadowingMsgId = null;
          state.recognition = null;
          updateUI();
        }
      };

      state.recognition = rec;
      rec.start();
    } catch (_) {
      state.shadowingMsgId = null;
      state.recognition = null;
      updateUI();
    }
  }

  // Speech Recognition (Voice Input in Input Dock)
  function toggleSpeechRecognition() {
    var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Ctor) {
      if (typeof root.showToast === 'function') {
        root.showToast(t('chat.no_mic', 'Browser ini belum mendukung pengenal suara langsung. Silakan ketik pertanyaanmu.'));
      }
      return;
    }

    if (state.isListening && state.recognition) {
      try { state.recognition.stop(); } catch (_) {}
      state.isListening = false;
      updateUI();
      return;
    }

    try {
      var rec = new Ctor();
      rec.lang = state.course === 'ja' ? 'ja-JP' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = function () {
        state.isListening = true;
        updateUI();
      };

      rec.onresult = function (event) {
        var transcript = '';
        if (event.results && event.results[0] && event.results[0][0]) {
          transcript = event.results[0][0].transcript;
        }
        state.isListening = false;
        state.recognition = null;
        updateUI();
        if (transcript) {
          var input = document.getElementById('fzcInput');
          if (input) input.value = transcript;
          sendMessage(transcript);
        }
      };

      rec.onerror = function () {
        state.isListening = false;
        state.recognition = null;
        updateUI();
      };

      rec.onend = function () {
        state.isListening = false;
        state.recognition = null;
        updateUI();
      };

      state.recognition = rec;
      rec.start();
    } catch (_) {
      state.isListening = false;
      updateUI();
    }
  }

  function scrollBottom() {
    setTimeout(function () {
      var feed = document.getElementById('fzcFeed');
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, 50);
  }

  // --- HTML Rendering ---
  function renderMarkup() {
    var course = state.course;
    var scList = SCENARIOS[course] || SCENARIOS.ja;
    var currentSc = getScenario(state.scenarioId);
    var level = getLearnerLevel();
    var partnerName = course === 'ja' ? 'フィゼル (Fiezel-chan)' : 'Fiezel Coach';
    var partnerSub = course === 'ja'
      ? t('chat.partner_sub_ja', 'Partner Percakapan Jepang • Tokyo')
      : t('chat.partner_sub_en', 'Native English Conversation Partner');

    // Scenario Carousel
    var chipsHtml = scList.map(function (sc) {
      var isActive = sc.id === state.scenarioId ? ' is-active' : '';
      return '<button type="button" class="fzc-scenario-chip fzc-scenario-pill' + isActive + '" data-scenario="' + sc.id + '">' +
        '<span>' + sc.icon + '</span> <span>' + esc(sc.title) + '</span>' +
        '</button>';
    }).join('');

    // Scenario Mission Checkpoints Tracker
    var currentGoals = evaluateGoalProgress(currentSc, state.messages);
    var doneCount = currentGoals.filter(function (g) { return g.done; }).length;
    var totalGoals = currentGoals.length;
    var goalsHtml = '';
    if (totalGoals > 0) {
      var goalItems = currentGoals.map(function (g) {
        var doneClass = g.done ? ' is-done' : '';
        return '<div class="fzc-goal-item' + doneClass + '">' +
          '<span class="fzc-goal-check">' + (g.done ? '✓' : '') + '</span>' +
          '<span>' + esc(g.text) + '</span>' +
          '</div>';
      }).join('');
      var bonusTag = doneCount === totalGoals
        ? '<span class="fzc-goal-bonus-tag">🎉 ' + t('chat.all_goals_done', 'Target Lengkap (+25 XP)') + '</span>'
        : '<span>' + doneCount + '/' + totalGoals + ' ' + t('chat.goals_done', 'Target Selesai') + '</span>';

      goalsHtml = (
        '<div class="fzc-goals-container">' +
        '<div class="fzc-goals-header">' +
        '<span>🎯 ' + t('chat.scenario_goals', 'Target Percakapan Skenario') + '</span>' +
        bonusTag +
        '</div>' +
        '<div class="fzc-goals-list">' + goalItems + '</div>' +
        '</div>'
      );
    }

    // Messages
    var msgsHtml = state.messages.map(function (msg, idx) {
      if (msg.role === 'user') {
        var hintHtml = msg.hint ? (
          '<div class="fzc-user-hint">' +
          '<strong>💡 ' + esc(msg.hint.title) + ':</strong> ' + esc(msg.hint.desc) +
          '</div>'
        ) : '';
        return '<div class="fzc-msg-row is-user">' +
          '<div class="fzc-msg-box">' +
          '<div class="fzc-bubble fzc-bubble-user fzc-message-text">' + esc(msg.text) + '</div>' +
          hintHtml +
          '</div>' +
          '</div>';
      }

      // Assistant Message
      var displayText = msg.furigana ? formatFurigana(msg.furigana) : esc(msg.text);
      var romajiHtml = msg.romaji ? '<span class="fzc-romaji">' + esc(msg.romaji) + '</span>' : '';
      var isTranslateHidden = msg.showTranslation ? '' : ' is-hidden';
      var isPlaying = state.audioPlayingId === msg.id ? ' is-playing' : '';
      var isShadowing = state.shadowingMsgId === msg.id ? ' is-shadowing' : '';

      var revealHtml = (
        '<div class="fzc-reveal-box fzc-translation-box' + isTranslateHidden + '" id="fzcReveal-' + msg.id + '">' +
        '<div class="fzc-trans-text"><strong>🇮🇩 ' + t('chat.lbl_meaning', 'Arti') + ':</strong> ' + esc(msg.translation) + '</div>' +
        (msg.grammarNote ? '<div class="fzc-grammar-note"><strong>💡 ' + t('chat.lbl_grammar', 'Catatan Tata Bahasa') + ':</strong> ' + esc(msg.grammarNote) + '</div>' : '') +
        '</div>'
      );

      // Shadowing evaluation badge if present
      var shadowResultHtml = '';
      if (msg.shadowResult) {
        var sRes = msg.shadowResult;
        var sBoxClass = sRes.score >= 85 ? '' : (sRes.score >= 60 ? '' : ' is-retry');
        var sEmoji = sRes.score >= 85 ? '🌟' : (sRes.score >= 60 ? '👍' : '💪');
        var sTitle = sRes.score >= 85
          ? t('chat.shadow_title_perfect', 'Luar Biasa!')
          : (sRes.score >= 60 ? t('chat.shadow_title_good', 'Bagus!') : t('chat.shadow_title_retry', 'Terus Latih!'));
        var sXp = sRes.score >= 85 ? 15 : (sRes.score >= 60 ? 8 : 3);
        shadowResultHtml = (
          '<div class="fzc-shadow-box' + sBoxClass + '">' +
          '<div class="fzc-shadow-header">' +
          '<span class="fzc-shadow-badge">' + sEmoji + ' ' + sTitle + ' ' + sRes.score + '% ' + t('chat.lbl_accuracy', 'Akurasi') + '</span>' +
          '<span class="fzc-shadow-xp">+' + sXp + ' XP</span>' +
          '</div>' +
          '<div class="fzc-shadow-heard">' + t('chat.lbl_heard', 'Terdengar') + ': "' + esc(sRes.heard) + '"</div>' +
          '</div>'
        );
      } else if (state.shadowingMsgId === msg.id) {
        shadowResultHtml = (
          '<div class="fzc-shadow-box is-listening">' +
          '<div class="fzc-shadow-header">' +
          '<span class="fzc-shadow-badge">🎙️ ' + t('chat.shadow_speak_now', 'Ucapkan kalimat ini sekarang...') + '</span>' +
          '</div>' +
          '</div>'
        );
      }

      // Suggestions (only on latest assistant message)
      var suggestionsHtml = '';
      if (idx === state.messages.length - 1 && Array.isArray(msg.suggestions) && msg.suggestions.length > 0) {
        var chips = msg.suggestions.map(function (sg) {
          return '<button type="button" class="fzc-suggestion-chip fzc-chip" data-send="' + esc(sg.text) + '">' +
            '<strong class="fzc-chip-main">' + esc(sg.text) + '</strong>' +
            '<span>' + esc(sg.translation || sg.romaji || '') + '</span>' +
            '</button>';
        }).join('');
        suggestionsHtml = '<div class="fzc-suggestions-row">' + chips + '</div>';
      }

      return '<div class="fzc-msg-row is-assistant">' +
        '<div class="fzc-msg-box">' +
        '<div class="fzc-bubble fzc-bubble-ai fzc-japanese-text">' +
        '<span class="fzc-message-text">' + displayText + '</span>' +
        romajiHtml +
        revealHtml +
        '</div>' +
        '<div class="fzc-actions-bar">' +
        '<button type="button" class="fzc-action-btn' + isPlaying + '" data-action="audio" data-id="' + msg.id + '" data-text="' + esc(msg.text) + '" aria-label="' + esc(t('chat.aria_listen', 'Dengarkan Suara')) + '">' +
        '<i class="fz-i" data-fz-icon="speaking"></i> <span>' + t('chat.act_listen', 'Dengarkan') + '</span>' +
        '</button>' +
        '<button type="button" class="fzc-action-btn" data-action="translate" data-id="' + msg.id + '" aria-label="' + esc(t('chat.aria_trans', 'Buka Terjemahan')) + '">' +
        '<span>🌐 ' + t('chat.act_trans', 'Terjemahan') + '</span>' +
        '</button>' +
        '<button type="button" class="fzc-action-btn' + isShadowing + '" data-action="shadow" data-id="' + msg.id + '" data-text="' + esc(msg.text) + '" aria-label="' + esc(t('chat.aria_shadow', 'Latih Ucapkan')) + '">' +
        '<span>🎙️ ' + (isShadowing ? t('chat.act_listening', 'Mendengarkan...') : t('chat.act_shadow', 'Latih Ucapkan')) + '</span>' +
        '</button>' +
        '</div>' +
        shadowResultHtml +
        suggestionsHtml +
        '</div>' +
        '</div>';
    }).join('');

    // Typing Row
    var typingHtml = state.isThinking ? (
      '<div class="fzc-msg-row is-assistant">' +
      '<div class="fzc-typing-row">' +
      '<span>' + partnerName + ' ' + t('chat.is_typing', 'sedang mengetik') + '</span>' +
      '<span class="fzc-dot-pulse"><span></span><span></span><span></span></span>' +
      '</div>' +
      '</div>'
    ) : '';

    var micActive = state.isListening ? ' is-listening' : '';
    var inputPlaceholder = course === 'ja'
      ? t('chat.placeholder_ja', 'Ketik dalam bahasa Jepang (kana/romaji) atau klik mic...')
      : t('chat.placeholder_en', 'Type your message in English or speak...');

    return (
      '<section class="fade fzc-container fzc-chat-wrapper">' +
      '<div class="fzc-header">' +
      '<div class="fzc-partner-bar">' +
      '<div class="fzc-partner-meta">' +
      '<div class="fzc-avatar-wrap">' +
      (course === 'ja' ? '🇯🇵' : '🇬🇧') +
      '<span class="fzc-online-pulse"></span>' +
      '</div>' +
      '<div class="fzc-partner-info">' +
      '<h2>' + esc(partnerName) + ' <span class="fzc-badge-level">' + esc(level) + '</span></h2>' +
      '<p>' + esc(partnerSub) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="fzc-header-actions">' +
      '<button type="button" class="fzc-btn-reset" id="fzcBtnReset">' + t('chat.reset_btn', 'Mulai Ulang') + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="fzc-scenarios-rail" id="fzcScenariosRail">' +
      chipsHtml +
      '</div>' +
      '</div>' +

      '<div class="fzc-feed" id="fzcFeed">' +
      '<div class="fzc-scenario-card">' +
      '<div class="fzc-scenario-card-head">' +
      '<span>' + currentSc.icon + '</span> <span>' + esc(currentSc.title) + ' (' + esc(currentSc.label || currentSc.title) + ')</span>' +
      '</div>' +
      '<p class="fzc-scenario-card-desc">' + esc(currentSc.desc) + '</p>' +
      goalsHtml +
      '</div>' +
      msgsHtml +
      typingHtml +
      '</div>' +

      '<div class="fzc-dock">' +
      '<form class="fzc-dock-form" id="fzcForm">' +
      '<button type="button" class="fzc-btn-icon fzc-btn-mic' + micActive + '" id="fzcBtnMic" aria-label="' + esc(t('chat.mic_aria', 'Bicara lewat Mikrofon')) + '">' +
      '🎙️' +
      '</button>' +
      '<input type="text" class="fzc-input" id="fzcInput" placeholder="' + esc(inputPlaceholder) + '" autocomplete="off" enterkeyhint="send">' +
      '<button type="submit" class="fzc-btn-icon fzc-btn-send" id="fzcBtnSend" aria-label="' + esc(t('chat.send_aria', 'Kirim Pesan')) + '">' +
      '➤' +
      '</button>' +
      '</form>' +
      '</div>' +
      '</section>'
    );
  }

  function bindEvents(container) {
    if (!container) return;

    // Reset Chat
    var resetBtn = container.querySelector('#fzcBtnReset');
    if (resetBtn) {
      resetBtn.onclick = function () {
        resetCurrentScenario();
      };
    }

    // Switch Scenario
    container.querySelectorAll('.fzc-scenario-chip').forEach(function (btn) {
      btn.onclick = function () {
        var sid = btn.getAttribute('data-scenario');
        if (sid && sid !== state.scenarioId) {
          initScenario(sid);
          saveState();
          updateUI();
        }
      };
    });

    // Form Submit
    var form = container.querySelector('#fzcForm');
    var input = container.querySelector('#fzcInput');
    var sendBtn = container.querySelector('#fzcBtnSend');
    function doSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      var val = input ? input.value : '';
      if (val && val.trim()) {
        input.value = '';
        sendMessage(val);
      }
    }
    if (form) form.onsubmit = doSubmit;
    if (sendBtn) sendBtn.onclick = doSubmit;

    // Mic Button
    var micBtn = container.querySelector('#fzcBtnMic');
    if (micBtn) {
      micBtn.onclick = function () {
        toggleSpeechRecognition();
      };
    }

    // Suggestion Chips
    container.querySelectorAll('.fzc-suggestion-chip').forEach(function (btn) {
      btn.onclick = function () {
        var text = btn.getAttribute('data-send');
        if (text) sendMessage(text);
      };
    });

    // Actions (Audio, Translate, Shadowing)
    container.querySelectorAll('.fzc-action-btn').forEach(function (btn) {
      btn.onclick = function () {
        var act = btn.getAttribute('data-action');
        var mid = btn.getAttribute('data-id');
        if (act === 'audio') {
          var tAudio = btn.getAttribute('data-text');
          playVoice(tAudio, mid);
        } else if (act === 'translate') {
          var targetMsg = null;
          for (var i = 0; i < state.messages.length; i++) {
            if (state.messages[i].id === mid) {
              targetMsg = state.messages[i];
              break;
            }
          }
          if (targetMsg) {
            targetMsg.showTranslation = !targetMsg.showTranslation;
            var box = container.querySelector('#fzcReveal-' + mid);
            if (box) box.classList.toggle('is-hidden', !targetMsg.showTranslation);
          }
        } else if (act === 'shadow') {
          var tShadow = btn.getAttribute('data-text');
          startShadowing(mid, tShadow);
        }
      };
    });
  }

  function updateUI() {
    var mountPoint = document.getElementById('app');
    if (!mountPoint) return;
    mountPoint.innerHTML = renderMarkup();
    bindEvents(mountPoint);
    if (typeof root.enhanceUI === 'function') {
      try { root.enhanceUI(); } catch (_) {}
    }
  }

  // --- Public API ---
  var api = {
    mount: function (el) {
      loadState();
      var mountPoint = el || document.getElementById('app');
      if (mountPoint) {
        mountPoint.innerHTML = renderMarkup();
        bindEvents(mountPoint);
        scrollBottom();
      }
      if (typeof root.enhanceUI === 'function') {
        try { root.enhanceUI(); } catch (_) {}
      }
    },
    sendMessage: sendMessage,
    initScenario: initScenario,
    resetCurrentScenario: resetCurrentScenario,
    getState: function () { return state; },
    formatFurigana: formatFurigana,
    parseFuriganaRuby: formatFurigana,
    checkMisconception: checkMisconception,
    detectMisconception: function (text, course) {
      var m = checkMisconception(text, course);
      if (!m) return null;
      return {
        id: m.id,
        type: m.id === 'particle_wa_ha' ? 'particle_wa_vs_ha' : m.id,
        title: m.title,
        desc: m.desc,
        tip: m.desc
      };
    },
    evaluatePronunciation: evaluatePronunciation,
    evaluateGoalProgress: evaluateGoalProgress,
    generateOfflineReply: generateOfflineReply,
    generateOfflineFallback: generateOfflineReply,
    getScenarios: function (course) {
      return SCENARIOS[course] || SCENARIOS.ja;
    },
    createInitialState: function (course, scenarioId) {
      var scList = SCENARIOS[course] || SCENARIOS.ja;
      var sc = scList.find(function (s) { return s.id === scenarioId; }) || scList[0];
      return {
        course: course,
        activeScenarioId: sc.id,
        messages: [{
          id: 'init-1',
          role: 'assistant',
          text: sc.starter.text,
          furigana: sc.starter.furigana || null,
          romaji: sc.starter.romaji || null,
          translation: sc.starter.translation,
          grammarNote: sc.starter.grammarNote || null,
          suggestions: sc.starter.suggestions || []
        }]
      };
    },
    appendUserMessage: function (st, rawText) {
      var clean = String(rawText || '').trim();
      var msgs = (st.messages || []).slice();
      msgs.push({
        id: 'user-' + Date.now(),
        role: 'user',
        text: clean
      });
      return Object.assign({}, st, { messages: msgs });
    },
    appendAssistantMessage: function (st, resp) {
      var msgs = (st.messages || []).slice();
      msgs.push({
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        text: resp.text,
        furigana: resp.furigana || null,
        romaji: resp.romaji || null,
        translation: resp.translation || '',
        grammarNote: resp.grammarNote || null,
        suggestions: resp.suggestions || []
      });
      return Object.assign({}, st, { messages: msgs });
    }
  };

  return api;
}));
