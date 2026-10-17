/**
 * FIEZEL · features/interactive-chat/fiezel-interactive-chat.js
 * ChatGPT-like Interactive Conversational Partner (Kaiwa & Speaking Partner).
 *
 * Implements:
 * 1. Multi-turn dialogue with memory & scenario context.
 * 2. Bilingual immersion: Japanese (JLPT N5-N4 with Furigana Ruby) & English (CEFR A1-A2).
 * 3. Neural Voice audio playback via FiezelVoiceSay.
 * 4. Browser Speech Recognition (STT) with pulsing microphone visualizer.
 * 5. Quick suggestion chips for frictionless learner replies.
 * 6. Braincore telemetry integration (Mastery & Misconception Ledger).
 * 7. Zero-crash offline fallback engine for continuous practice without internet.
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
        label: 'Obrolan Bebas',
        desc: 'Ngobrol santai seputar hari ini, cuaca, atau apa pun yang ingin kamu bicarakan.',
        starter: {
          text: 'こんにちは！今日はどんなことについて話したいですか？何でも気軽に話しかけてね！',
          furigana: 'こんにちは！[今日](きょう)はどんなことについて[話](はな)したいですか？[何](なん)でも[気軽](きがる)に[話](はな)しかけてね！',
          romaji: 'Konnichiwa! Kyou wa donna koto ni tsuite hanashitai desu ka? Nan demo kigaru ni hanashikakete ne!',
          translation: 'Halo! Hari ini mau ngobrol tentang apa? Cerita apa saja dengan santai ya!',
          grammarNote: 'Gunakan bentuk「〜について話したい」(~ ni tsuite hanashitai) untuk menyatakan ingin berbicara tentang suatu topik.',
          suggestions: [
            { text: '日本語を勉強しています。', romaji: 'Nihongo o benkyou shite imasu.', translation: 'Saya sedang belajar bahasa Jepang.' },
            { text: '週末に映画を見ました。', romaji: 'Shuumatsu ni eiga o mimashita.', translation: 'Akhir pekan kemarin saya nonton film.' },
            { text: '日本の文化が大好きです！', romaji: 'Nihon no bunka ga daisuki desu!', translation: 'Saya sangat suka budaya Jepang!' }
          ]
        }
      },
      {
        id: 'ramen',
        icon: '🍜',
        title: 'ラーメン屋',
        label: 'Restoran Ramen',
        desc: t('chat.sc-ramen-desc', 'Latihan memesan makanan dan berinteraksi dengan pelayan di kedai ramen.'),
        starter: {
          text: 'いらっしゃいませ！ラーメン屋へようこそ。何名様ですか？ご注文はお決まりですか？',
          furigana: 'いらっしゃいませ！ラーメン[屋](や)へようこそ。[何名様](なんめいさま)ですか？ご[注文](ちゅうもん)はお[決](き)まりですか？',
          romaji: 'Irasshaimase! Raamen-ya e youkoso. Nan-mei-sama desu ka? Gochuumon wa okimari desu ka?',
          translation: t('chat.sc-ramen-trans', 'Selamat datang di kedai ramen kami! Untuk berapa orang? Apakah sudah siap memesan?'),
          grammarNote: 'Frasa「お決まりですか」(Okimari desu ka) adalah bentuk sopan keigo dari "apakah sudah memutuskan/memilih".',
          suggestions: [
            { text: '一人です。豚骨ラーメンを一つください。', romaji: 'Hitori desu. Tonkotsu raamen o hitotsu kudasai.', translation: 'Satu orang. Minta tonkotsu ramen 1 porsi.' },
            { text: 'おすすめのラーメンは何ですか？', romaji: 'Osusume no raamen wa nan desu ka?', translation: 'Apa ramen yang direkomendasikan?' },
            { text: 'お水を一杯いただけますか？', romaji: 'Omizu o ippai itadakemasu ka?', translation: 'Boleh saya minta segelas air putih?' }
          ]
        }
      },
      {
        id: 'konbini',
        icon: '🏪',
        title: 'コンビニ',
        label: 'Belanja di Konbini',
        desc: t('chat.sc-konbini-desc', 'Praktik transaksi di minimarket Jepang (meminta kantong, menghangatkan bento, dll).'),
        starter: {
          text: 'いらっしゃいませ！こちら温めますか？ポイントカードはお持ちですか？',
          furigana: 'いらっしゃいませ！こちら[温](あたた)めますか？ポイントカードはお[持](も)ちですか？',
          romaji: 'Irasshaimase! Kochira atatamemasu ka? Pointo kaado wa omochi desu ka?',
          translation: t('chat.sc-konbini-trans', 'Selamat datang! Apakah makanannya mau dihangatkan? Punya kartu poin?'),
          grammarNote: '「温めますか」(Atatamemasu ka) selalu ditanyakan saat membeli bento atau onigiri di minimarket.',
          suggestions: [
            { text: 'はい、温めてください。', romaji: 'Hai, atatamete kudasai.', translation: 'Ya, tolong dihangatkan.' },
            { text: 'いいえ、大丈夫です。袋もお願いします。', romaji: 'Iie, daijoubu desu. Fukuro mo onegai shimasu.', translation: 'Tidak perlu. Tolong plastiknya juga.' },
            { text: 'お箸を二膳もらえますか？', romaji: 'Ohashi o nizen moraemasu ka?', translation: 'Boleh minta sumpit dua pasang?' }
          ]
        }
      },
      {
        id: 'direction',
        icon: '🚉',
        title: '道案内・駅',
        label: 'Tanya Jalan & Kereta',
        desc: t('chat.sc-dir-desc', 'Latihan menanyakan arah jalan, letak stasiun kereta, dan peron tujuan.'),
        starter: {
          text: 'すみません、何かお困りですか？どちらへ行きたいですか？案内しますよ！',
          furigana: 'すみません、[何](なに)かお[困](こま)りですか？どちらへ[行](い)きたいですか？[案内](あんない)しますよ！',
          romaji: 'Sumimasen, nanika okomari desu ka? Dochira e ikitai desu ka? Annai shimasu yo!',
          translation: t('chat.sc-dir-trans', 'Permisi, apakah ada yang bisa dibantu? Mau pergi ke mana? Akan saya bantu tunjukkan jalannya!'),
          grammarNote: '「どちらへ行きたいですか」(Dochira e ikitai desu ka) lebih halus daripada「どこ」(doko).',
          suggestions: [
            { text: 'すみません、新宿駅はどこですか？', romaji: 'Sumimasen, Shinjuku-eki wa doko desu ka?', translation: 'Permisi, stasiun Shinjuku di mana ya?' },
            { text: 'ここから歩いてどのくらいかかりますか？', romaji: 'Koko kara aruite dono kurai kakarimasu ka?', translation: 'Berapa lama jalan kaki dari sini?' },
            { text: 'この電車は渋谷に行きますか？', romaji: 'Kono densha wa Shibuya ni ikimasu ka?', translation: 'Apakah kereta ini menuju ke Shibuya?' }
          ]
        }
      },
      {
        id: 'intro',
        icon: '🤝',
        title: '自己紹介',
        label: 'Perkenalan Diri',
        desc: t('chat.sc-intro-desc', 'Latihan memperkenalkan diri, asal negara, hobi, dan pekerjaan dalam bahasa Jepang.'),
        starter: {
          text: '初めまして！私の名前はフィゼルです。東京に住んでいます。あなたのお名前と出身を教えてください！',
          furigana: '[初](はじ)めまして！[私](わたし)の[名前](なまえ)はフィゼルです。[東京](とうきょう)に[住](す)んでいます。あなたのお[名前](なまえ)とご[出身](しゅっしん)を[教](おし)えてください！',
          romaji: 'Hajimemashite! Watashi no namae wa Fizeru desu. Toukyou ni sunde imasu. Anata no onamae to goshusshin o oshiete kudasai!',
          translation: t('chat.sc-intro-trans', 'Salam kenal! Nama saya Fiezel. Saya tinggal di Tokyo. Siapa namamu dan dari mana asalmu?'),
          grammarNote: 'Selalu awali perkenalan dengan「初めまして」(Hajimemashite) dan akhiri dengan「よろしくお願いします」(Yoroshiku onegaishimasu).',
          suggestions: [
            { text: '初めまして！インドネシアから来ました。', romaji: 'Hajimemashite! Indoneshia kara kimashita.', translation: 'Salam kenal! Saya berasal dari Indonesia.' },
            { text: '学生です。日本語を勉強し始めたばかりです。', romaji: 'Gakusei desu. Nihongo o benkyou shihajimeta bakari desu.', translation: 'Saya pelajar. Baru mulai belajar bahasa Jepang.' },
            { text: 'よろしくお願いします！', romaji: 'Yoroshiku onegaishimasu!', translation: 'Senang berkenalan dengan Anda / Mohon bantuannya!' }
          ]
        }
      }
    ],
    en: [
      {
        id: 'free',
        icon: '💬',
        title: 'Free Talk',
        label: 'Obrolan Bebas',
        desc: 'Casual conversation on any topic you like to boost everyday speaking fluency.',
        starter: {
          text: 'Hi there! What would you like to chat about today? Feel free to tell me anything!',
          translation: 'Hai! Mau ngobrol tentang apa hari ini? Cerita apa saja dengan santai ya!',
          grammarNote: 'Use "feel free to [verb]" to invite someone warmly to do something without hesitation.',
          suggestions: [
            { text: 'I am currently practicing my English skills.', translation: 'Saya sedang melatih kemampuan bahasa Inggris saya.' },
            { text: 'I watched a very interesting movie yesterday.', translation: 'Kemarin saya nonton film yang sangat menarik.' },
            { text: 'What is your favorite hobby?', translation: 'Apa hobi favoritmu?' }
          ]
        }
      },
      {
        id: 'cafe',
        icon: '☕',
        title: 'At the Cafe',
        label: 'Pesan Kopi di Kafe',
        desc: 'Practice ordering drinks, pastries, and asking for customized coffee orders.',
        starter: {
          text: 'Welcome to Fiezel Cafe! What can I get started for you today?',
          translation: 'Selamat datang di Fiezel Cafe! Mau pesan apa hari ini?',
          grammarNote: '"What can I get started for you?" is a very common polite greeting used by baristas.',
          suggestions: [
            { text: 'Could I get an iced latte with oat milk, please?', translation: 'Bisa minta satu es latte dengan susu oat?' },
            { text: 'Do you have any dairy-free options available?', translation: 'Apakah ada pilihan yang bebas susu sapi?' },
            { text: 'For here, and I will take a chocolate croissant too.', translation: 'Makan di sini, dan saya mau croissant cokelat juga.' }
          ]
        }
      },
      {
        id: 'direction',
        icon: '🗺️',
        title: 'Directions',
        label: t('chat.sc_dir_lbl', 'Tanya Arah Jalan'),
        desc: 'Asking for directions in a new city, subway stations, or nearest tourist attractions.',
        starter: {
          text: 'Excuse me! You look a bit lost. Are you looking for a specific place around here?',
          translation: t('chat.sc_dir_trans', 'Permisi! Kamu terlihat agak tersesat. Apakah sedang mencari tempat tertentu di sekitar sini?'),
          grammarNote: '"To look lost" means appearing uncertain of where you are going.',
          suggestions: [
            { text: 'Excuse me, where is the nearest train station?', translation: t('chat.sc_dir_sug1', 'Permisi, di mana stasiun kereta terdekat?') },
            { text: 'How long does it take to walk to downtown?', translation: t('chat.sc_dir_sug2', 'Berapa lama waktu jalan kaki ke pusat kota?') },
            { text: 'Could you show me the way on the map?', translation: t('chat.sc_dir_sug3', 'Bisakah kamu tunjukkan jalannya di peta?') }
          ]
        }
      },
      {
        id: 'interview',
        icon: '💼',
        title: 'Job & School Interview',
        label: t('chat.sc_interview_lbl', 'Simulasi Wawancara'),
        desc: 'Practice answering common interview questions about your background, skills, and goals.',
        starter: {
          text: 'Thank you for coming in today. Could you please introduce yourself and tell me about your background?',
          translation: t('chat.sc_interview_trans', 'Terima kasih sudah hadir hari ini. Bisakah kamu memperkenalkan dirimu dan latar belakangmu?'),
          grammarNote: 'Start with a brief statement of your current role, key strengths, and what drives your passion.',
          suggestions: [
            { text: 'Certainly! My name is ' + getLearnerName() + ' and I am passionate about learning.', translation: t('chat.sc_interview_sug1', 'Tentu! Nama saya ' + getLearnerName() + ' dan saya bersemangat untuk belajar.') },
            { text: 'I have been developing my communication and problem-solving skills.', translation: t('chat.sc_interview_sug2', 'Saya telah mengembangkan kemampuan komunikasi dan pemecahan masalah saya.') },
            { text: 'I am excited about this opportunity to contribute and grow.', translation: t('chat.sc_interview_sug3', 'Saya antusias dengan kesempatan ini untuk berkontribusi dan bertumbuh.') }
          ]
        }
      },
      {
        id: 'hotel',
        icon: '🏨',
        title: 'Hotel Check-in',
        label: t('chat.sc_hotel_lbl', 'Check-in Hotel'),
        desc: 'Check in smoothly, ask about hotel amenities, breakfast hours, and room services.',
        starter: {
          text: 'Good afternoon, welcome to Grand Horizon Hotel! How may I assist you today?',
          translation: t('chat.sc_hotel_trans', 'Selamat siang, selamat datang di Hotel Grand Horizon! Ada yang bisa saya bantu hari ini?'),
          grammarNote: '"How may I assist you?" is the standard formal customer service greeting in hotels.',
          suggestions: [
            { text: 'Hello, I have a reservation under the name ' + getLearnerName() + '.', translation: t('chat.sc_hotel_sug1', 'Halo, saya ada reservasi atas nama ' + getLearnerName() + '.') },
            { text: 'What time is breakfast served in the morning?', translation: t('chat.sc_hotel_sug2', 'Jam berapa sarapan disajikan di pagi hari?') },
            { text: 'Could you provide the Wi-Fi password for the room?', translation: t('chat.sc_hotel_sug3', 'Bisakah Anda memberikan kata sandi Wi-Fi untuk kamar?') }
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

  // Common Misconception Detector
  function checkMisconception(text, course) {
    if (!text) return null;
    var t = text.trim();
    if (course === 'ja') {
      if (/\bわたし\s*わ\b/i.test(t) || /わたしわ/.test(t)) {
        return {
          id: 'particle_wa_ha',
          title: 'Tips Partikel は',
          desc: 'Partikel penanda topik "wa" selalu ditulis dengan hiragana「は」, bukan「わ」.'
        };
      }
      if (/これ\s*わ/i.test(t) || /それ\s*わ/i.test(t) || /あれ\s*わ/i.test(t)) {
        return {
          id: 'particle_wa_pronoun',
          title: 'Tips Partikel は',
          desc: 'Gunakan hiragana「は」untuk partikel penanda topik (contoh: これは / それは).'
        };
      }
      if (/ありがとう\s*ございます/i.test(t) && !/ありがとう/i.test(t)) {
        return null;
      }
    } else {
      if (/\bi\s+am\s+agree\b/i.test(t)) {
        return {
          id: 'verb_agree',
          title: 'Common Mistake: I agree',
          desc: 'Say "I agree", not "I am agree". "Agree" is already a verb.'
        };
      }
      if (/\bhe\s+go\b/i.test(t) || /\bshe\s+go\b/i.test(t)) {
        return {
          id: 'sva_present',
          title: 'Subject-Verb Agreement',
          desc: 'Add -es for third person singular: "He goes" / "She goes".'
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
            translation: 'Baik, dimengerti! Bagaimana dengan tingkat kematangan mienya? Bisa pilih biasa, keras, atau lembut.',
            grammarNote: '「どうなさいますか」(Dou nasaimasu ka) adalah bentuk sangat sopan dari「どうしますか」(Bagaimana maunya).',
            suggestions: [
              { text: '硬めでお願いします！', romaji: 'Katame de onegai shimasu!', translation: 'Minta yang agak keras ya!' },
              { text: '普通で大丈夫です。', romaji: 'Futsuu de daijoubu desu.', translation: 'Biasa saja tidak apa-apa.' },
              { text: 'トッピングに味玉も追加できますか？', romaji: 'Toppingu ni ajitama mo tsuika dekimasu ka?', translation: 'Bisa tambah topping telur rebus berbumbu?' }
            ]
          };
        }
        if (/水|水一杯|お冷/i.test(raw)) {
          return {
            text: 'はい、冷たいお水どうぞ！ごゆっくりお召し上がりくださいね。',
            furigana: 'はい、[冷](つめ)たいお[水](みず)どうぞ！ごゆっくりお[召](め)し[上](あ)がりくださいね。',
            romaji: 'Hai, tsumetai omizu douzo! Goyukkuri omeshishagari kudasai ne.',
            translation: 'Ya, ini air dinginnya, silakan! Selamat menikmati makanannya santai saja ya.',
            grammarNote: '「お召し上がりください」(Omeshishagari kudasai) bentuk sopan dari "silakan makan/minum".',
            suggestions: [
              { text: 'ありがとうございます！いただきます。', romaji: 'Arigatou gozaimasu! Itadakimasu.', translation: 'Terima kasih banyak! Selamat makan.' },
              { text: 'お会計をお願いします。', romaji: 'Okaikei o onegai shimasu.', translation: 'Minta tagihan / mau bayar.' }
            ]
          };
        }
        return {
          text: 'ありがとうございます！少々お待ちくださいね。すぐに熱々のラーメンをお持ちします！',
          furigana: 'ありがとうございます！[少々](しょうしょう)お[待](ま)ちくださいね。すぐに[熱々](あつあつ)のラーメンをお[持](も)ちします！',
          romaji: 'Arigatou gozaimasu! Shoushou omachi kudasai ne. Sugu ni atsuatsu no raamen o omochi shimasu!',
          translation: 'Terima kasih banyak! Mohon tunggu sebentar ya. Segera saya bawakan ramen hangatnya!',
          grammarNote: '「少々お待ちください」(Shoushou omachi kudasai) = Mohon tunggu sebentar.',
          suggestions: [
            { text: 'とても美味しそうです！', romaji: 'Totemo oishisou desu!', translation: 'Kelihatannya enak sekali!' },
            { text: 'ごちそうさまでした。', romaji: 'Gochisousama deshita.', translation: 'Terima kasih atas hidangannya (setelah makan).' }
          ]
        };
      }
      if (scenarioId === 'konbini') {
        if (/温め|はい|お願いします/i.test(raw)) {
          return {
            text: 'かしこまりました。電子レンジで温めますね。お会計は750円になります！',
            furigana: 'かしこまりました。[電子](でんし)レンジで[温](あたた)めますね。お[会計](かいけい)は750[円](えん)になります！',
            romaji: 'Kashikomarimashita. Denshi renji de atatamemasu ne. Okaikei wa nanahyaku-gojuu-en ni narimasu!',
            translation: 'Baik, saya hangatkan di microwave ya. Total pembayarannya jadi 750 yen!',
            grammarNote: 'Frasa「〜になります」sering dipakai kasir Jepang untuk menyebutkan total harga.',
            suggestions: [
              { text: '現金で払います。', romaji: 'Genkin de haraimasu.', translation: 'Saya bayar tunai.' },
              { text: 'Suicaで払えますか？', romaji: 'Suica de haraemasu ka?', translation: 'Bisa bayar pakai kartu Suica?' },
              { text: 'レシートは要りません。', romaji: 'Reshiito wa irimasen.', translation: 'Tidak perlu struk belanja.' }
            ]
          };
        }
        return {
          text: 'かしこまりました！他にご注文はございますか？',
          furigana: 'かしこまりました！[他](ほか)にご[注文](ちゅうもん)はございますか？',
          romaji: 'Kashikomarimashita! Hoka ni gochuumon wa gozaimasu ka?',
          translation: 'Baik, dimengerti! Apakah ada pesanan lain lagi?',
          grammarNote: '「他に〜ございますか」(Hoka ni ~ gozaimasu ka) = Apakah ada yang lain?',
          suggestions: [
            { text: 'これで全部です。', romaji: 'Kore de zenbu desu.', translation: 'Ini saja semuanya.' },
            { text: 'ありがとうございます！', romaji: 'Arigatou gozaimasu!', translation: 'Terima kasih banyak!' }
          ]
        };
      }
      if (scenarioId === 'direction') {
        return {
          text: 'ここをまっすぐ行って、二つ目の交差点を右に曲がるとすぐ見えますよ！歩いて約5分です。',
          furigana: 'ここをまっすぐ[行](い)って、[二](ふた)つ[目](め)の[交差点](こうさてん)を[右](みぎ)に[曲](ま)がるとすぐ[見](み)えますよ！[歩](ある)いて[約](やく)5[分](ふん)です。',
          romaji: 'Koko o massugu itte, futatsume no kousaten o migi ni magaru to sugu miemasu yo! Aruite yaku gofun desu.',
          translation: 'Jalan lurus dari sini, lalu belok kanan di perempatan kedua, nanti langsung kelihatan! Jalan kaki sekitar 5 menit.',
          grammarNote: 'Pola「まっすぐ行って、〜を右に曲がる」adalah rumus standar memberi petunjuk jalan.',
          suggestions: [
            { text: 'わかりました！親切にありがとうございます。', romaji: 'Wakarimashita! Shinsetsu ni arigatou gozaimasu.', translation: 'Saya mengerti! Terima kasih atas keramahannya.' },
            { text: '近くにコンビニもありますか？', romaji: 'Chikaku ni konbini mo arimasu ka?', translation: 'Apakah ada minimarket di dekat sana juga?' }
          ]
        };
      }
      // Free talk / intro default
      return {
        text: 'なるほど、よくわかりました！日本語の発音もとても自然ですよ。次は何について話しましょうか？',
        furigana: 'なるほど、よくわかりました！[日本語](にほんご)の[発音](はつおん)もとても[自然](しぜん)ですよ。[次](つぎ)は[何](なに)について[話](はな)しましょうか？',
        romaji: 'Naruhodo, yoku wakarimashita! Nihongo no hatsuon mo totemo shizen desu yo. Tsugi wa nani ni tsuite hanashimashou ka?',
        translation: 'Begitu ya, saya mengerti! Pelafalan bahasa Jepangmu juga sangat natural lho. Selanjutnya mau ngobrol tentang apa lagi?',
        grammarNote: 'Kata「なるほど」(Naruhodo) digunakan untuk menyatakan pemahaman atau setuju ("oh begitu ya!").',
        suggestions: [
          { text: '日本のアニメについて話したいです！', romaji: 'Nihon no anime ni tsuite hanashitai desu!', translation: 'Saya ingin bicara tentang anime Jepang!' },
          { text: '東京のおすすめの観光地を教えてください。', romaji: 'Toukyou no osusume no kankouchi o oshiete kudasai.', translation: 'Beri tahu saya tempat wisata rekomendasi di Tokyo.' }
        ]
      };
    } else {
      // English default fallback responses
      return {
        text: "That sounds wonderful! Your sentence structure is very clear. What else would you like to explore together?",
        translation: "Kedengarannya bagus sekali! Struktur kalimatmu sangat jelas. Apa lagi yang ingin kamu bahas bersama?",
        grammarNote: 'Using conversational transitions like "That sounds wonderful!" helps keep dialogues natural and engaging.',
        suggestions: [
          { text: "Can you tell me about common English slang?", translation: "Bisakah kamu ceritakan tentang bahasa gaul Inggris umum?" },
          { text: "Let's practice ordering food at a restaurant.", translation: "Ayo latihan memesan makanan di restoran." }
        ]
      };
    }
  }

  // --- Main Interactive Chat Controller ---
  var state = {
    course: 'ja',
    scenarioId: 'free',
    messages: [],
    isThinking: false,
    isListening: false,
    audioPlayingId: null,
    recognition: null
  };

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        state.scenarioId = saved.scenarioId || 'free';
      }
    } catch (_) {}
    state.course = getActiveCourse();
    initScenario(state.scenarioId);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scenarioId: state.scenarioId
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
    state.scenarioId = id;
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
        var utter = new SpeechSynthesisUtterance(cleanText);
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

  // Handle User Message Submission
  function sendMessage(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed || state.isThinking) return;

    // Zero-Loss Input: preserve exact student utterance
    var hint = checkMisconception(trimmed, state.course);
    var userMsg = {
      id: 'msg-user-' + Date.now(),
      role: 'user',
      text: trimmed,
      hint: hint
    };

    state.messages.push(userMsg);
    state.isThinking = true;
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
        deliverAssistantReply(generateOfflineReply(trimmed, state.scenarioId, state.course));
      }, 700);
      return;
    }

    aiPromise.then(function (result) {
      if (result && result.text && !result.degraded) {
        var replyObj = {
          text: result.text,
          furigana: state.course === 'ja' ? result.text : null,
          romaji: null,
          translation: t('chat.ai-direct', 'Jawaban langsung dari AI Partner FIEZEL.'),
          grammarNote: t('chat.ai-note', 'Latihan percakapan responsif real-time.'),
          suggestions: sc.starter.suggestions
        };
        deliverAssistantReply(replyObj);
      } else {
        deliverAssistantReply(generateOfflineReply(trimmed, state.scenarioId, state.course));
      }
    }).catch(function () {
      deliverAssistantReply(generateOfflineReply(trimmed, state.scenarioId, state.course));
    });
  }

  function deliverAssistantReply(replyObj) {
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
    state.messages.push(assistantMsg);
    updateUI();
    scrollBottom();
  }

  // Speech Recognition (Voice Input)
  function toggleSpeechRecognition() {
    var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Ctor) {
      if (typeof root.showToast === 'function') {
        root.showToast(t('chat.no-mic', 'Browser ini belum mendukung pengenal suara langsung. Silakan ketik pertanyaanmu.'));
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
    var partnerSub = course === 'ja' ? 'Partner Percakapan Jepang • Tokyo' : 'Native English Conversation Partner';

    // Scenario Carousel
    var chipsHtml = scList.map(function (sc) {
      var isActive = sc.id === state.scenarioId ? ' is-active' : '';
      return '<button type="button" class="fzc-scenario-chip fzc-scenario-pill' + isActive + '" data-scenario="' + sc.id + '">' +
        '<span>' + sc.icon + '</span> <span>' + esc(sc.title) + '</span>' +
        '</button>';
    }).join('');

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

      var revealHtml = (
        '<div class="fzc-reveal-box fzc-translation-box' + isTranslateHidden + '" id="fzcReveal-' + msg.id + '">' +
        '<div class="fzc-trans-text"><strong>🇮🇩 Arti:</strong> ' + esc(msg.translation) + '</div>' +
        (msg.grammarNote ? '<div class="fzc-grammar-note"><strong>💡 Catatan Tata Bahasa:</strong> ' + esc(msg.grammarNote) + '</div>' : '') +
        '</div>'
      );

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
        '<button type="button" class="fzc-action-btn' + isPlaying + '" data-action="audio" data-id="' + msg.id + '" data-text="' + esc(msg.text) + '" aria-label="Dengarkan Suara">' +
        '<i class="fz-i" data-fz-icon="speaking"></i> <span>Dengarkan</span>' +
        '</button>' +
        '<button type="button" class="fzc-action-btn" data-action="translate" data-id="' + msg.id + '" aria-label="Buka Terjemahan">' +
        '<span>🌐 Terjemahan</span>' +
        '</button>' +
        '</div>' +
        suggestionsHtml +
        '</div>' +
        '</div>';
    }).join('');

    // Typing Row
    var typingHtml = state.isThinking ? (
      '<div class="fzc-msg-row is-assistant">' +
      '<div class="fzc-typing-row">' +
      '<span>' + partnerName + ' sedang mengetik</span>' +
      '<span class="fzc-dot-pulse"><span></span><span></span><span></span></span>' +
      '</div>' +
      '</div>'
    ) : '';

    var micActive = state.isListening ? ' is-listening' : '';
    var inputPlaceholder = course === 'ja'
      ? 'Ketik dalam bahasa Jepang (kana/romaji) atau klik mic...'
      : 'Type your message in English or speak...';

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
      '<button type="button" class="fzc-btn-reset" id="fzcBtnReset">Mulai Ulang</button>' +
      '</div>' +
      '</div>' +
      '<div class="fzc-scenarios-rail" id="fzcScenariosRail">' +
      chipsHtml +
      '</div>' +
      '</div>' +

      '<div class="fzc-feed" id="fzcFeed">' +
      '<div class="fzc-scenario-card">' +
      '<div class="fzc-scenario-card-head">' +
      '<span>' + currentSc.icon + '</span> <span>' + esc(currentSc.title) + ' (' + esc(currentSc.label) + ')</span>' +
      '</div>' +
      '<p class="fzc-scenario-card-desc">' + esc(currentSc.desc) + '</p>' +
      '</div>' +
      msgsHtml +
      typingHtml +
      '</div>' +

      '<div class="fzc-dock">' +
      '<form class="fzc-dock-form" id="fzcForm">' +
      '<button type="button" class="fzc-btn-icon fzc-btn-mic' + micActive + '" id="fzcBtnMic" aria-label="' + esc(t('chat.mic-aria', 'Bicara lewat Mikrofon')) + '">' +
      '🎙️' +
      '</button>' +
      '<input type="text" class="fzc-input" id="fzcInput" placeholder="' + esc(inputPlaceholder) + '" autocomplete="off" enterkeyhint="send">' +
      '<button type="submit" class="fzc-btn-icon fzc-btn-send" id="fzcBtnSend" aria-label="' + esc(t('chat.send-aria', 'Kirim Pesan')) + '">' +
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
        initScenario(state.scenarioId);
        updateUI();
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

    // Actions (Audio & Translate)
    container.querySelectorAll('.fzc-action-btn').forEach(function (btn) {
      btn.onclick = function () {
        var act = btn.getAttribute('data-action');
        var mid = btn.getAttribute('data-id');
        if (act === 'audio') {
          var t = btn.getAttribute('data-text');
          playVoice(t, mid);
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
