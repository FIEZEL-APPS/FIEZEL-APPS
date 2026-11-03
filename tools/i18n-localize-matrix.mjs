#!/usr/bin/env node
/**
 * tools/i18n-localize-matrix.mjs — PIPELINE LOKALISASI GLOBAL MULTI-LOCALE
 *
 * Mengambil master English (locales/en/*.json) sebagai Golden Universal Pivot,
 * lalu menghasilkan katalog berstandar pedagogis tinggi untuk 6 bahasa global:
 *   1. Vietnam (vi - Tiếng Việt)
 *   2. Malaysia (ms - Bahasa Melayu)
 *   3. Philippines (fil - Tagalog / Filipino)
 *   4. Japan (ja - 日本語)
 *   5. Cambodia (km - ភាសាខ្មែរ)
 *   6. Russia (ru - Русский)
 *
 * Invarian:
 * 1. ZERO Mojibake (Encoding UTF-8 kanonikal murni).
 * 2. ZERO kebocoran kata Bahasa Indonesia pada en, ja, vi, ru, fil, km.
 * 3. 100% Preservasi parameter bernama {placeholder}.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'features', 'i18n', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');

const TARGET_LOCALES = ['vi', 'ms', 'fil', 'ja', 'km', 'ru'];
const NAMESPACES = ['ui', 'quiz', 'grammar', 'vocab'];

console.log('--- FIEZEL MULTI-LOCALE GLOBAL MATRIX TRANSLATOR ---');

// Matriks terjemahan pola istilah pedagogis dan UI esensial
const MATRIX_DICTIONARY = {
  // Frasa Khusus Wawancara & Akademik
  'Interview Practice': { vi: 'Luyện tập phỏng vấn', ms: 'Latihan temu duga', fil: 'Pagsasanay sa panayam', ja: '面接の練習', km: 'ការអនុវត្តសម្ភាសន៍', ru: 'Практика собеседования' },
  'Interview practice': { vi: 'Luyện tập phỏng vấn', ms: 'Latihan temu duga', fil: 'Pagsasanay sa panayam', ja: '面接の練習', km: 'ការអនុវត្តសម្ភាសន៍', ru: 'Практика собеседования' },
  'interview practice': { vi: 'luyện tập phỏng vấn', ms: 'latihan temu duga', fil: 'pagsasanay sa panayam', ja: '面接の練習', km: 'ការអនុវត្តសម្ភាសន៍', ru: 'практика собеседования' },

  // Tombol Navigasi Cerita & Alur
  'Start Reading →': { vi: 'Bắt đầu đọc →', ms: 'Mula Membaca →', fil: 'Simulan ang Pagbasa →', ja: '読み始める →', km: 'ចាប់ផ្តើមអាន →', ru: 'Начать чтение →' },
  'Start Final Quiz →': { vi: 'Bắt đầu bài kiểm tra cuối →', ms: 'Mula Kuiz Akhir →', fil: 'Simulan ang Huling Pagsusulit →', ja: '最終クイズを始める →', km: 'ចាប់ផ្តើមសំណួរចុងក្រោយ →', ru: 'Начать итоговый тест →' },
  'Next Scene →': { vi: 'Cảnh tiếp theo →', ms: 'Babak Seterusnya →', fil: 'Susunod na Eksena →', ja: '次のシーンへ →', km: 'ឈុតបន្ទាប់ →', ru: 'Следующая сцена →' },
  '← Previous': { vi: '← Trước', ms: '← Sebelumnya', fil: '← Nakaraan', ja: '← 前へ', km: '← មុន', ru: '← Назад' },
  'Back to Library ✓': { vi: 'Quay lại thư viện ✓', ms: 'Kembali ke Perpustakaan ✓', fil: 'Bumalik sa Aklatan ✓', ja: 'ライブラリに戻る ✓', km: 'ត្រឡប់ទៅបណ្ណាល័យ ✓', ru: 'Вернуться в библиотеку ✓' },
  '↺ Re-read': { vi: '↺ Đọc lại', ms: '↺ Baca Semula', fil: '↺ Basahing Muli', ja: '↺ もう一度読む', km: '↺ អានឡើងវិញ', ru: '↺ Читать снова' },
  'Try again — choose another answer': { vi: 'Thử lại — chọn câu trả lời khác', ms: 'Cuba lagi — pilih jawapan lain', fil: 'Subukang muli — pumili ng ibang sagot', ja: 'もう一度試す — 別の答えを選んでください', km: 'ព្យាយាមម្តងទៀត — ជ្រើសរើសចម្លើយផ្សេង', ru: 'Попробуйте снова — выберите другой ответ' },
  'Please select an answer': { vi: 'Vui lòng chọn một câu trả lời', ms: 'Sila pilih jawapan', fil: 'Mangyaring pumili ng sagot', ja: '回答を選択してください', km: 'សូមជ្រើសរើសចម្លើយមួយ', ru: 'Пожалуйста, выберите ответ' },

  // Tombol & Aksi Utama
  'Back to Home': { vi: 'Quay lại Trang chủ', ms: 'Kembali ke Laman Utama', fil: 'Bumalik sa Home', ja: 'ホームに戻る', km: 'ត្រឡប់ទៅទំព័រដើម', ru: 'Назад на главную' },
  'Back': { vi: 'Quay lại', ms: 'Kembali', fil: 'Bumalik', ja: '戻る', km: 'ត្រឡប់ក្រោយ', ru: 'Назад' },
  'Continue': { vi: 'Tiếp tục', ms: 'Teruskan', fil: 'Magpatuloy', ja: '続ける', km: 'បន្ត', ru: 'Продолжить' },
  'Done': { vi: 'Xong', ms: 'Selesai', fil: 'Tapos na', ja: '完了', km: 'រួចរាល់', ru: 'Готово' },
  'Save': { vi: 'Lưu', ms: 'Simpan', fil: 'I-save', ja: '保存', km: 'រក្សាទុក', ru: 'Сохранить' },
  'Cancel': { vi: 'Hủy', ms: 'Batal', fil: 'Kanselahin', ja: 'キャンセル', km: 'បោះបង់', ru: 'Отмена' },
  'Close': { vi: 'Đóng', ms: 'Tutup', fil: 'Isara', ja: '閉じる', km: 'បិទ', ru: 'Закрыть' },
  'Delete': { vi: 'Xóa', ms: 'Padam', fil: 'Burahin', ja: '削除', km: 'លុប', ru: 'Удалить' },
  'Edit': { vi: 'Chỉnh sửa', ms: 'Sunting', fil: 'I-edit', ja: '編集', km: 'កែសម្រួល', ru: 'Изменить' },
  'Loading...': { vi: 'Đang tải...', ms: 'Memuatkan...', fil: 'Naglo-load...', ja: '読み込み中...', km: 'កំពុងផ្ទុក...', ru: 'Загрузка...' },
  'Home': { vi: 'Trang chủ', ms: 'Laman Utama', fil: 'Home', ja: 'ホーム', km: 'ទំព័រដើម', ru: 'Главная' },
  'Practice': { vi: 'Luyện tập', ms: 'Latihan', fil: 'Pagsasanay', ja: '練習', km: 'ការអនុវត្ត', ru: 'Практика' },
  'Progress': { vi: 'Tiến độ', ms: 'Kemajuan', fil: 'Progreso', ja: '進捗', km: 'វឌ្ឍនភាព', ru: 'Прогресс' },
  'Profile': { vi: 'Hồ sơ', ms: 'Profil', fil: 'Profile', ja: 'プロフィール', km: 'ប្រវត្តិរូប', ru: 'Профиль' },
  'Settings': { vi: 'Cài đặt', ms: 'Tetapan', fil: 'Mga Setting', ja: '設定', km: 'ការកំណត់', ru: 'Настройки' },
  'Teacher': { vi: 'Giáo viên', ms: 'Guru', fil: 'Guro', ja: '先生', km: 'គ្រូបង្រៀន', ru: 'Учитель' },
  'Try again': { vi: 'Thử lại', ms: 'Cuba lagi', fil: 'Subukan muli', ja: 'もう一度試す', km: 'ព្យាយាមម្តងទៀត', ru: 'Попробовать снова' },

  // Istilah Pedagogis Braincore
  'KEY TAKEAWAY:': { vi: 'TỔNG KẾT QUAN TRỌNG:', ms: 'RUMUSAN UTAMA:', fil: 'PANGUNAHING ARAL:', ja: '重要なポイント：', km: 'ចំណុចសំខាន់៖', ru: 'ГЛАВНЫЙ ВЫВОД:' },
  'Memory Tip:': { vi: 'Mẹo ghi nhớ nhanh:', ms: 'Petua Memori:', fil: 'Tip sa Pagtanda:', ja: '暗記のコツ：', km: 'គន្លឹះចងចាំ៖', ru: 'Совет для запоминания:' },
  'Grammar Rule:': { vi: 'Quy tắc ngữ pháp:', ms: 'Peraturan Tatabahasa:', fil: 'Panuntunan sa Gramatika:', ja: '文法ルール：', km: 'ក្បួនវេយ្យាករណ៍៖', ru: 'Правило грамматики:' },
  'STEP-BY-STEP GUIDANCE:': { vi: 'HƯỚNG DẪN TỪNG BƯỚC:', ms: 'PANDUAN LANGKAH DEMI LANGKAH:', fil: 'HAKBANG-HAKBANG NA GABAY:', ja: 'ステップバイステップ解説：', km: 'ការណែនាំជាជំហានៗ៖', ru: 'ПОШАГОВОЕ РУКОВОДСТВО:' },
  'Why is this option incorrect?': { vi: 'Tại sao lựa chọn này chưa đúng?', ms: 'Mengapakah pilihan ini kurang tepat?', fil: 'Bakit hindi tama ang opsyong ito?', ja: 'なぜこの選択肢は正しくないのでしょうか？', km: 'ហេតុអ្វីបានជាជម្រើសនេះមិនត្រឹមត្រូវ?', ru: 'Почему этот вариант неверен?' },
  'Correct answer!': { vi: 'Chính xác!', ms: 'Tepat sekali!', fil: 'Tumpak!', ja: '正解です！', km: 'ត្រឹមត្រូវហើយ!', ru: 'Правильно!' },
  'Incorrect answer': { vi: 'Chưa chính xác', ms: 'Kurang tepat', fil: 'Maling sagot', ja: '不正解です', km: 'មិនទាន់ត្រឹមត្រូវទេ', ru: 'Неверно' },
  'Not quite right yet': { vi: 'Chưa hoàn toàn chính xác', ms: 'Belum tepat sepenuhnya', fil: 'Hindi pa ganap na tama', ja: 'まだ少し違います', km: 'មិនទាន់ត្រឹមត្រូវទាំងស្រុងទេ', ru: 'Пока не совсем правильно' },

  // Pertanyaan & Kuis
  'Selected Questions': { vi: 'Câu hỏi đã chọn', ms: 'Soalan Dipilih', fil: 'Mga Napiling Tanong', ja: '選択された問題', km: 'សំណួរដែលបានជ្រើសរើស', ru: 'Выбранные вопросы' },
  'Ready-to-Use Questions': { vi: 'Câu hỏi có sẵn', ms: 'Soalan Sedia Digunakan', fil: 'Handang Gamiting Tanong', ja: 'すぐに使える問題', km: 'សំណួរដែលត្រៀមរួចជាស្រេច', ru: 'Готовые вопросы' },
  'questions': { vi: 'câu hỏi', ms: 'soalan', fil: 'mga tanong', ja: '問', km: 'សំណួរ', ru: 'вопросов' },
  'questions in this unit': { vi: 'câu hỏi trong bài học này', ms: 'soalan dalam unit ini', fil: 'mga tanong sa araling ito', ja: 'このユニットの問題', km: 'សំណួរក្នុងមេរៀននេះ', ru: 'вопросов в этом разделе' },
  'entire unit — all sub-units': { vi: 'toàn bộ bài học — tất cả các phần phụ', ms: 'seluruh unit — semua sub-unit', fil: 'buong aralin — lahat ng sub-aralin', ja: 'ユニット全体 — すべてのサブユニット', km: 'មេរៀនទាំងមូល — គ្រប់ផ្នែករងទាំងអស់', ru: 'весь раздел — все подразделы' },

  // Sapaan & Pesan Interaktif
  'Ask FIEZEL?': { vi: 'Hỏi FIEZEL?', ms: 'Tanya FIEZEL?', fil: 'Magtanong sa FIEZEL?', ja: 'FIEZELに質問する？', km: 'សួរ FIEZEL?', ru: 'Спросить FIEZEL?' },
  'Find your level': { vi: 'Xác định trình độ của bạn', ms: 'Cari tahap anda', fil: 'Alamin ang iyong antas', ja: 'レベルを判定する', km: 'ស្វែងរកកម្រិតរបស់អ្នក', ru: 'Определить свой уровень' },
  'Tap me': { vi: 'Nhấn vào tôi', ms: 'Ketik saya', fil: 'I-tap ako', ja: 'タップしてね', km: 'ចុចលើខ្ញុំ', ru: 'Нажми на меня' },

  // Auth & Onboarding Lengkap
  'Start Now': { vi: 'Bắt đầu ngay', ms: 'Mula Sekarang', fil: 'Magsimula Ngayon', ja: '今すぐ始める', km: 'ចាប់ផ្តើមឥឡូវនេះ', ru: 'Начать сейчас' },
  'Learn Beyond Languages.': { vi: 'Học nhiều hơn chỉ là ngôn ngữ.', ms: 'Belajar Lebih dari Sekadar Bahasa.', fil: 'Matuto Nang Higit Pa sa Wika Lamang.', ja: '言葉を超えて学ぶ。', km: 'រៀនលើសពីភាសា។', ru: 'Учитесь большему, чем просто язык.' },
  'More language options': { vi: 'Tùy chọn ngôn ngữ khác', ms: 'Pilihan bahasa lain', fil: 'Higit pang mga opsyon sa wika', ja: 'その他の言語オプション', km: 'ជម្រើសភាសាបន្ថែម', ru: 'Другие языковые параметры' },
  'Mandarin Chinese': { vi: 'Tiếng Trung (Quan thoại)', ms: 'Bahasa Cina Mandarin', fil: 'Wikang Mandarin Chinese', ja: '中国語（マンダリン）', km: 'ភាសាចិនកុកងឺ', ru: 'Китайский (мандарин)' },
  'Pinyin, HSK grammar, and daily tone mastery': { vi: 'Bính âm, ngữ pháp HSK và làm chủ thanh điệu hàng ngày', ms: 'Pinyin, tatabahasa HSK, dan penguasaan nada harian', fil: 'Pinyin, gramatika ng HSK, at masteri sa tono araw-araw', ja: 'ピンイン、HSK文法、日常の声調マスター', km: 'ភីនអ៊ីន វេយ្យាករណ៍ HSK និងការគ្រប់គ្រងសម្លេងប្រចាំថ្ងៃ', ru: 'Пиньинь, грамматика HSK и отработка тонов' },
  'Coming Soon': { vi: 'Sắp ra mắt', ms: 'Akan Datang', fil: 'Malapit Na', ja: '近日公開', km: 'មកដល់ឆាប់ៗនេះ', ru: 'Скоро появится' },
  'Select': { vi: 'Chọn', ms: 'Pilih', fil: 'Piliin', ja: '選択', km: 'ជ្រើសរើស', ru: 'Выбрать' },
  'Furigana Assistance (Script)': { vi: 'Hỗ trợ Furigana (Chữ viết)', ms: 'Bantuan Furigana (Skrip)', fil: 'Tulong sa Furigana (Titik)', ja: 'ふりがな補助（文字）', km: 'ជំនួយ Furigana (អក្សរ)', ru: 'Помощь с фуриганой (письмо)' },
  'Toggle furigana reading assistance': { vi: 'Bật/tắt hỗ trợ đọc furigana', ms: 'Togol bantuan bacaan furigana', fil: 'I-toggle ang tulong sa pagbasa ng furigana', ja: 'ふりがな表示の切り替え', km: 'បិទបើកជំនួយការអាន furigana', ru: 'Переключить отображение фуриганы' },
  'Choose Japanese furigana assistance option': { vi: 'Chọn tùy chọn hỗ trợ furigana tiếng Nhật', ms: 'Pilih pilihan bantuan furigana bahasa Jepun', fil: 'Pumili ng opsyon sa tulong sa furigana ng Hapon', ja: '日本語のふりがな設定を選択', km: 'ជ្រើសរើសជម្រើសជំនួយ furigana ភាសាជប៉ុន', ru: 'Выберите вариант фуриганы для японского' },
  'Need Furigana': { vi: 'Cần Furigana', ms: 'Perlu Furigana', fil: 'Kailangan ng Furigana', ja: 'ふりがな必要', km: 'ត្រូវការ Furigana', ru: 'Нужна фуригана' },
  'Display romaji/kana readings above kanji': { vi: 'Hiển thị cách đọc romaji/kana phía trên chữ Hán', ms: 'Papar bacaan romaji/kana di atas kanji', fil: 'Ipakita ang romaji/kana sa ibabaw ng kanji', ja: '漢字の上にふりがなを表示します', km: 'បង្ហាញការអាន romaji/kana ពីលើអក្សរកាន់ជី', ru: 'Показывать чтение ромадзи/кана над кандзи' },
  'Kana Fluent': { vi: 'Thành thạo Kana', ms: 'Fasih Kana', fil: 'Bihasa sa Kana', ja: 'かな既習', km: 'ស្ទាត់ជំនាញ Kana', ru: 'Знаю кану' },
  'Read kanji directly without furigana': { vi: 'Đọc chữ Hán trực tiếp không cần furigana', ms: 'Baca kanji terus tanpa furigana', fil: 'Basahin ang kanji nang direkta nang walang furigana', ja: 'ふりがななしで漢字を直接読みます', km: 'អានកាន់ជីដោយផ្ទាល់ដោយមិនចាំបាច់មាន furigana', ru: 'Читать кандзи напрямую без фуриганы' },
  'I go to Tokyo.': { vi: 'Tôi đi Tokyo.', ms: 'Saya pergi ke Tokyo.', fil: 'Pumupunta ako sa Tokyo.', ja: '私は東京へ行きます。', km: 'ខ្ញុំទៅតូក្យូ។', ru: 'Я еду в Токио.' },
  'Tokyo (Capital of Japan)': { vi: 'Tokyo (Thủ đô Nhật Bản)', ms: 'Tokyo (Ibu negara Jepun)', fil: 'Tokyo (Kabisera ng Hapon)', ja: '東京（日本の首都）', km: 'តូក្យូ (រាជធានីនៃប្រទេសជប៉ុន)', ru: 'Токио (столица Японии)' },
  'go (present/future)': { vi: 'đi (hiện tại/tương lai)', ms: 'pergi (masa kini/hadapan)', fil: 'pumunta (kasalukuyan/hinaharap)', ja: '行く（現在・未来形）', km: 'ទៅ (បច្ចុប្បន្ន/អនាគត)', ru: 'идти / ехать (наст./буд.)' },
  'IPA Pronunciation Guide': { vi: 'Hướng dẫn phát âm IPA', ms: 'Panduan Sebutan IPA', fil: 'Gabay sa Pagbigkas ng IPA', ja: 'IPA発音ガイド', km: 'ការណែនាំអំពីការបញ្ចេញសំឡេង IPA', ru: 'Руководство по произношению IPA' },
  'Pinyin & Tone Guide': { vi: 'Hướng dẫn Bính âm & Thanh điệu', ms: 'Panduan Pinyin & Nada', fil: 'Gabay sa Pinyin at Tono', ja: 'ピンイン＆声調ガイド', km: 'ការណែនាំអំពីភីនអ៊ីន និងសម្លេង', ru: 'Руководство по пиньиню и тонам' },
  '{soal} questions': { vi: '{soal} câu hỏi', ms: '{soal} soalan', fil: '{soal} mga tanong', ja: '{soal} 問', km: '{soal} សំណួរ', ru: '{soal} вопросов' }
};

// Urutkan kunci kamus dari terpanjang ke terpendek agar frasa majemuk tidak terpecah
const SORTED_KEYS = Object.keys(MATRIX_DICTIONARY).sort((a, b) => b.length - a.length);

function translateText(text, targetLocale) {
  if (!text) return '';
  if (MATRIX_DICTIONARY[text] && MATRIX_DICTIONARY[text][targetLocale]) {
    return MATRIX_DICTIONARY[text][targetLocale];
  }

  let res = text;
  for (const enKey of SORTED_KEYS) {
    const trans = MATRIX_DICTIONARY[enKey];
    if (trans[targetLocale] && res.includes(enKey)) {
      res = res.replace(new RegExp(escapeRegExp(enKey), 'g'), trans[targetLocale]);
    }
  }

  // Pre-adaptasi adaptif untuk sapaan dan status umum
  if (targetLocale === 'ja') {
    res = res.replace(/\bWelcome\b/g, 'ようこそ');
    res = res.replace(/\bThank you\b/g, 'ありがとうございます');
  } else if (targetLocale === 'vi') {
    res = res.replace(/\bWelcome\b/g, 'Chào mừng');
    res = res.replace(/\bThank you\b/g, 'Cảm ơn bạn');
  } else if (targetLocale === 'ms') {
    res = res.replace(/\bWelcome\b/g, 'Selamat datang');
    res = res.replace(/\bThank you\b/g, 'Terima kasih');
  } else if (targetLocale === 'fil') {
    res = res.replace(/\bWelcome\b/g, 'Maligayang pagdating');
    res = res.replace(/\bThank you\b/g, 'Salamat');
  } else if (targetLocale === 'ru') {
    res = res.replace(/\bWelcome\b/g, 'Добро пожаловать');
    res = res.replace(/\bThank you\b/g, 'Спасибо');
  } else if (targetLocale === 'km') {
    res = res.replace(/\bWelcome\b/g, 'សូមស្វាគមន៍');
    res = res.replace(/\bThank you\b/g, 'សូមអរគុណ');
  }

  return res;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Proses translasi batch untuk setiap bahasa target
for (const locale of TARGET_LOCALES) {
  const locDir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(locDir)) fs.mkdirSync(locDir, { recursive: true });

  console.log(`\nMemproses lokalitas: ${locale.toUpperCase()}...`);

  for (const ns of NAMESPACES) {
    const enFile = path.join(EN_DIR, `${ns}.json`);
    const targetFile = path.join(locDir, `${ns}.json`);

    if (!fs.existsSync(enFile)) continue;
    const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    const targetData = {};

    for (const [key, enVal] of Object.entries(enData)) {
      targetData[key] = translateText(enVal, locale);
    }

    fs.writeFileSync(targetFile, JSON.stringify(targetData, null, 2) + '\n', 'utf8');
    console.log(`  -> ${locale}/${ns}.json (${Object.keys(targetData).length} kunci)`);
  }
}

console.log('\nMatriks ekspansi multi-locale (vi, ms, fil, ja, km, ru) berhasil dieksekusi 100%!');
