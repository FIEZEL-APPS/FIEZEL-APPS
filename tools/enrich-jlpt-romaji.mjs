import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BANK_FILE = path.join(ROOT, 'features/speaking-listening/jlpt-listening-bank-v1.json');

const bank = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));

// Kamus transliterasi hiragana/katakana/kanji ke romaji untuk pertanyaan & opsi
const ROMAJI_REPLACEMENTS = [
  ['学生は はじめに なにを しますか。', 'Gakusei wa hajimeni nani o shimasu ka.'],
  ['ふたりは なにを いくつ かいますか。', 'Futari wa nani o ikutsu kaimasu ka.'],
  ['ふたりは あした どこで あいますか。', 'Futari wa ashita doko de aimasu ka.'],
  ['男の子は どのかさを もって いきますか。', 'Otokonoko wa dono kasa o motte ikimasu ka.'],
  ['田中さんは どうして きのう パーティーに きませんでしたか。', 'Tanaka-san wa doushite kinou paatii ni kimasen deshita ka.'],
  ['かぎは どこに ありましたか。', 'Kagi wa doko ni arimashita ka.'],
  ['女の人は なぜ えきへ いきますか。', 'Onna no hito wa naze eki e ikimasu ka.'],
  ['ふたりは なんじに あいますか。', 'Futari wa nanji ni aimasu ka.'],
  ['あさ、ともだちに あいました。なんと言いますか。', 'Asa, tomodachi ni aimashita. Nan to iimasu ka.'],
  ['いえを でるとき、なんと言いますか。', 'Ie o deru toki, nan to iimasu ka.'],
  ['プレゼントを わたすとき、なんと言いますか。', 'Purezento o watasu toki, nan to iimasu ka.'],
  ['きょうは いいてんきですね。なんと言って こたえますか。', 'Kyou wa ii tenki desu ne. Nan to itte kotaemasu ka.'],
  ['すみません、いま なんじですか。', 'Sumimasen, ima nanji desu ka.'],
  ['ありがとう ございました。なんと言って こたえますか。', 'Arigatou gozaimashita. Nan to itte kotaemasu ka.'],
  ['このほん、かりても いいですか。', 'Kono hon, karitemo ii desu ka.'],
  ['アルバイトの人は これから まず なにを しますか。', 'Arubaito no hito wa korekara mazu nani o shimasu ka.'],
  ['患者は ひるごはんの あとに どのくすりを のみますか。', 'Kanja wa hirugohan no ato ni dono kusuri o nomimasu ka.'],
  ['女の人は どの電車に のりますか。', 'Onna no hito wa dono densha ni norimasu ka.'],
  ['女の人は このあと まず なにを しますか。', 'Onna no hito wa kono ato mazu nani o shimasu ka.'],
  ['ふたりは なんじから かいぎを はじめますか。', 'Futari wa nanji kara kaigi o hajimemasu ka.'],
  ['ふたりは どこで ひるごはんを たべますか。', 'Futari wa doko de hirugohan o tabemasu ka.'],
  ['女の人が いけなかった ところは どこですか。', 'Onna no hito ga ikenakatta tokoro wa doko desu ka.'],
  ['ジョンさんは なにが いちばん たいへんだと 言っていますか。', 'Jon-san wa nani ga ichiban taihen da to itte imasu ka.'],
  ['てんちょうに なんと言って きょかを とりますか。', 'Tenchou ni nan to itte kyoka o torimasu ka.'],
  ['なんと言って ていねいに ことわりますか。', 'Nan to itte teinei ni kotowarimasu ka.'],
  ['みせを でるとき、じょうしに なんと言いますか。', 'Mise o deru toki, joushi ni nan to iimasu ka.'],
  ['なんと言って こたえますか。', 'Nan to itte kotaemasu ka.'],
  ['えきまでの みちを きかれたとき、なんと言って こたえますか。', 'Eki made no michi o kikareta toki, nan to itte kotaemasu ka.']
];

const qRoMap = new Map(ROMAJI_REPLACEMENTS);

for (const item of bank.items) {
  const qJa = (item.questionJapanese || '').trim();
  if (qRoMap.has(qJa)) {
    item.questionRomaji = qRoMap.get(qJa);
  } else {
    // Cari kecocokan parsial atau default
    for (const [k, v] of qRoMap.entries()) {
      if (qJa.includes(k) || k.includes(qJa)) {
        item.questionRomaji = v;
        break;
      }
    }
    if (!item.questionRomaji) {
      item.questionRomaji = qJa; // fallback
    }
  }
}

fs.writeFileSync(BANK_FILE, JSON.stringify(bank, null, 2) + '\n');
console.log('Successfully enriched bank with questionRomaji!');
