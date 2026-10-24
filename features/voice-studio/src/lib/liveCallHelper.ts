export interface BeginnerReplyCard {
  id: string;
  badgeId: string;
  badgeTh: string;
  tier: 'easy' | 'mission' | 'rescue';
  text: string;
  pronunciation: string;
  hintId: string;
  hintTh: string;
  contextAnchorId?: string;
  contextAnchorTh?: string;
  wordBreakdown: Array<{ word: string; reading: string; meaningId: string }>;
}

export interface LiveTranslationResult {
  text: string;
  pronunciation: string;
  translationId: string;
  translationTh: string;
}

export interface ExtractedUserContext {
  city: string;
  companion: string;
  companionId: string;
  favoritePlace: string;
  favoritePlaceId: string;
  drinkOrder: string;
  drinkOrderId: string;
  afterPlan: string;
  afterPlanId: string;
  studyTopic: string;
  studyTopicId: string;
  tripPlace: string;
  foodItem: string;
  foodItemId: string;
}

const KNOWN_UTTERANCE_TRANSLATIONS: Array<{
  match: string;
  pronunciation: string;
  translationId: string;
  translationTh: string;
}> = [
  {
    match: 'where do you live',
    pronunciation: 'Hai der! Nais tu tok wit yu tudei. Wer du yu liv, end hu du yu liv wit et hom?',
    translationId:
      'Halo! Senang mengobrol denganmu hari ini. Di mana rumahmu (tempat tinggalmu), dan dengan siapa kamu tinggal di rumah?',
    translationTh:
      'สวัสดีครับ! ดีใจที่ได้คุยกันวันนี้ บ้านของคุณอยู่ที่ไหน และที่บ้านอาศัยอยู่กับใครครับ?',
  },
  {
    match: 'what is your favorite place near your house',
    pronunciation:
      'Det sauns laik e lav-li pleis tu liv! Wot iz yer fei-vrit pleis nier yer haus, laik e park or e lokal kafe?',
    translationId:
      'Terdengar seperti tempat yang nyaman untuk ditinggali! Apa tempat favorit di dekat rumahmu, seperti taman atau kafe lokal?',
    translationTh:
      'ฟังดูเป็นสถานที่ที่น่าอยู่มากเลยครับ! สถานที่โปรดใกล้ๆ บ้านของคุณคือที่ไหนเหรอ เช่น สวนสาธารณะหรือคาเฟ่?',
  },
  {
    match: 'how long have you lived there',
    pronunciation:
      'Det sauns laik e lav-li nei-ber-hud! Heving plei-ses laik det nier yer haus iz ve-ri kon-vi-ni-ent. Hau long hev yu livd der?',
    translationId:
      'Terdengar seperti lingkungan yang sangat nyaman! Punya tempat seperti itu di dekat rumah pasti memudahkan. Sudah berapa lama kamu tinggal di sana?',
    translationTh:
      'ฟังดูเป็นย่านที่น่าอยู่มากเลย! มีสถานที่แบบนั้นอยู่ใกล้บ้านคงสะดวกมาก คุณอาศัยอยู่ที่นั่นมานานแค่ไหนแล้ว?',
  },
  {
    match: 'what do you usually do there on weekends',
    pronunciation:
      'Going der sounds so ri-lek-sing! Wot du yu yu-zju-e-li du der on wik-ends, end hu du yu go wit?',
    translationId:
      'Pergi ke sana terdengar sangat menenangkan! Apa yang biasanya kamu lakukan di sana saat akhir pekan, dan bersama siapa kamu pergi?',
    translationTh:
      'การไปที่นั่นฟังดูผ่อนคลายมากเลย! ปกติคุณทำอะไรที่นั่นในวันหยุดสุดสัปดาห์ และไปกับใครครับ?',
  },
  {
    match: 'what would you like to drink today',
    pronunciation:
      'Hey der! Gud tu si yu et de kafe. Wot wud yu laik tu dringk tudei, end wot ar yu duing after awer kofi?',
    translationId:
      'Halo! Senang bertemu kamu di kafe. Kamu ingin minum apa hari ini, dan apa rencanamu setelah kita ngopi?',
    translationTh:
      'สวัสดี! ดีใจที่ได้เจอกันที่คาเฟ่ วันนี้คุณอยากดื่มอะไร และหลังจากดื่มกาแฟเสร็จคุณมีแผนจะทำอะไรต่อ?',
  },
  {
    match: 'what is your presentation topic about',
    pronunciation:
      'Wan ais la-tei kaming rait ap! Best of lak pri-pering yer pre-zen-tei-syen. Wot iz yer pre-zen-tei-syen topik ebaut?',
    translationId:
      'Satu es kopi susu segera siap! Semoga sukses menyiapkan presentasi bersama timmu sore ini. Apa topik presentasi kalian?',
    translationTh:
      'ลาเต้เย็น 1 แก้วได้แล้วครับ! ขอให้การเตรียมงานนำเสนอกับทีมช่วงบ่ายนี้ราบรื่นนะ หัวข้อที่นำเสนอเกี่ยวกับเรื่องอะไรครับ?',
  },
  {
    match: 'what are you and your friend studying at the library',
    pronunciation:
      'Got it, wan hot kofi kaming ap! Wot ar yu end yer frend stadi-ing et de lai-bre-ri?',
    translationId:
      'Siap, satu kopi panas! Apa yang akan kamu pelajari bersama temanmu di perpustakaan?',
    translationTh:
      'รับทราบ กาแฟร้อน 1 แก้วครับ! วันนี้จะไปติววิชาอะไรกับเพื่อนที่ห้องสมุดเอ่ย?',
  },
  {
    match: 'what topics are you covering today',
    pronunciation:
      'Kaming rait ap! En ais la-tei iz e greit cois bi-for stadi-ing. Wot topiks ar yu ka-ve-ring tudei?',
    translationId:
      'Segera disiapkan! Pilihan minuman yang tepat sebelum belajar. Topik atau materi apa yang sedang kamu bahas hari ini?',
    translationTh:
      'ได้เลยครับ! เป็นตัวเลือกที่ดีมากก่อนไปอ่านหนังสือ วันนี้คุณกำลังทบทวนหัวข้ออะไรอยู่เหรอ?',
  },
  {
    match: 'how long are you staying at the library',
    pronunciation:
      'Nais! Tu meik de sen-tens kom-plit, yu ken sei det. Hau long ar yu stei-ing et de lai-bre-ri tudei?',
    translationId:
      'Bagus! Berapa lama kamu berencana belajar di perpustakaan hari ini?',
    translationTh:
      'ดีเลย! วันนี้คุณวางแผนจะอ่านหนังสือที่ห้องสมุดนานแค่ไหนครับ?',
  },
  {
    match: 'when is your presentation',
    pronunciation:
      'Det iz e ve-ri in-tres-ting topik! Wen iz yer pre-zen-tei-syen, end hau du yu fil ebaut it?',
    translationId:
      'Itu topik yang sangat menarik! Kapan jadwal presentasimu, dan bagaimana perasaanmu mempersiapkannya?',
    translationTh:
      'นั่นเป็นหัวข้อที่น่าสนใจมาก! คุณต้องนำเสนอเมื่อไหร่ และรู้สึกอย่างไรบ้างกับการเตรียมตัว?',
  },
  {
    match: 'where did you go, and what was the best part',
    pronunciation:
      'Welkam bek! Ai herd yu tuk e syort trip last wik-end. Wer did yu go, end wot woz de best part of yer wik-end?',
    translationId:
      'Selamat datang kembali! Kudengar kamu sempat bepergian akhir pekan lalu. Ke mana kamu pergi, dan apa bagian paling seru dari akhir pekanmu?',
    translationTh:
      'ยินดีต้อนรับกลับ! ได้ข่าวว่าสุดสัปดาห์ก่อนคุณไปเที่ยวมา ไปที่ไหนมาครับ และอะไรคือส่วนที่ประทับใจที่สุด?',
  },
  {
    match: 'which dish was your favorite',
    pronunciation:
      'Det sauns laik en o-sem wik-end! Strit fud in de maun-ten er iz de best. Wic disy woz yer fei-vrit?',
    translationId:
      'Terdengar seperti akhir pekan yang luar biasa! Kuliner lokal memang paling nikmat. Hidangan mana yang paling kamu sukai?',
    translationTh:
      'ฟังดูเป็นวันหยุดสุดสัปดาห์ที่ยอดเยี่ยมเลย! ชอบเมนูไหนมากที่สุดครับ?',
  },
  {
    match: 'who did you go with',
    pronunciation:
      'Det sauns laik e wan-der-ful wik-end! Hu did yu go wit, end wot woz yer fei-vrit part?',
    translationId:
      'Terdengar seperti akhir pekan yang menyenangkan! Bersama siapa kamu pergi ke sana, dan apa bagian favoritmu?',
    translationTh:
      'ฟังดูเป็นวันหยุดสุดสัปดาห์ที่ยอดเยี่ยมมาก! คุณไปเที่ยวกับใคร และชอบส่วนไหนมากที่สุด?',
  },
  {
    match: 'would you like to visit there again',
    pronunciation:
      'Det fud sauns so di-li-syes! Wud yu laik tu vi-zit der e-gen nekst ho-li-dei?',
    translationId:
      'Makanan itu terdengar sangat lezat! Apakah kamu ingin berkunjung ke sana lagi pada liburan berikutnya?',
    translationTh:
      'อาหารฟังดูน่าอร่อยมาก! วันหยุดครั้งหน้าคุณอยากกลับไปเที่ยวที่นั่นอีกไหม?',
  },
  {
    match: 'do you think remote work increases productivity',
    pronunciation:
      'Let as muv on tu Part Tri. Du yu tingk ri-mot werk in-kri-ses pro-dak-ti-vi-ti, or daz it wi-ken tiim ko-la-bo-rei-syen?',
    translationId:
      'Mari lanjut ke Bagian 3. Menurutmu apakah kerja jarak jauh meningkatkan produktivitas, atau justru melemahkan kolaborasi tim?',
    translationTh:
      'มาต่อกันที่ส่วนที่ 3 คุณคิดว่าการทำงานทางไกลช่วยเพิ่มประสิทธิภาพ หรือทำให้ความร่วมมือในทีมลดลง?',
  },
  {
    match: 'regulate remote work hours',
    pronunciation:
      'Ek-se-lent poin. Du yu tingk ga-vern-ments syud re-gyu-leit ri-mot werk awers in de fyu-cer?',
    translationId:
      'Poin yang sangat tajam. Menurutmu apakah pemerintah atau perusahaan perlu mengatur jam kerja jarak jauh di masa depan?',
    translationTh:
      'เป็นประเด็นที่ยอดเยี่ยมมาก คุณคิดว่ารัฐบาลหรือบริษัทควรกำหนดชั่วโมงการทำงานทางไกลในอนาคตไหม?',
  },
  {
    match: 'allow hybrid schedules in the future',
    pronunciation:
      'Ek-se-lent poin. Du yu tingk kam-pe-nis syud e-lau hai-brid ske-juls in de fyu-cer?',
    translationId:
      'Poin yang sangat baik. Menurutmu apakah perusahaan sebaiknya menerapkan jadwal kerja hibrida di masa depan?',
    translationTh:
      'ประเด็นยอดเยี่ยมมาก คุณคิดว่าบริษัทควรใช้รูปแบบการทำงานแบบไฮบริดในอนาคตไหม?',
  },
  {
    match: 'いらっしゃいませ！ご注文はお決まりですか',
    pronunciation:
      'Irasshaimase! Go-chuumon wa o-kimari desu ka? Kyou no o-susume wa hotto koohii to chiizukeeki desu yo.',
    translationId:
      'Selamat datang! Apakah pesanan Anda sudah ditentukan? Rekomendasi hari ini adalah kopi panas dan cheesecake.',
    translationTh:
      'ยินดีต้อนรับค่ะ! รับอะไรดีคะ? เมนูแนะนำวันนี้คือกาแฟร้อนกับชีสเค้กค่ะ',
  },
  {
    match: '店内でお召し上がりですか',
    pronunciation:
      'Kashikomarimashita! Hotto koohii to chiizukeeki desu ne. Tennai de o-meshiagari desu ka?',
    translationId:
      'Baik, pesanan diterima! Apakah ingin dinikmati di dalam kafe (makan di sini), atau dibawa pulang?',
    translationTh:
      'รับทราบค่ะ! จะรับประทานที่ร้าน หรือรับกลับบ้านดีคะ?',
  },
  {
    match: 'お砂糖とミルクはお使いになりますか',
    pronunciation:
      'Hotto koohii desu ne! O-satou to miruku wa o-tsukai ni narimasu ka?',
    translationId:
      'Baik, kopi panas ya! Apakah Anda ingin menggunakan gula dan susu?',
    translationTh:
      'กาแฟร้อนนะคะ! รับน้ำตาลกับนมด้วยไหมคะ?',
  },
  {
    match: 'ごゆっくりどうぞ',
    pronunciation:
      'Kashikomarimashita! O-seki made o-mochi shimasu node, go-yukkuri douzo. Kyou wa kore kara o-dekake desu ka?',
    translationId:
      'Baik! Pesanan akan kami antar ke meja Anda, silakan bersantai. Apakah setelah ini Anda ada rencana bepergian?',
    translationTh:
      'รับทราบค่ะ! เดี๋ยวจะนำไปเสิร์ฟที่โต๊ะนะคะ วันนี้หลังจากนี้มีแผนจะไปไหนต่อไหมคะ?',
  },
  {
    match: 'お疲れさま！最近、大学のレポートで忙しそうだね',
    pronunciation:
      'Otsukaresama! Saikin, daigaku no repooto de isogashisou da ne. Nanika komatte iru koto wa aru?',
    translationId:
      'Halo, semangat ya! Akhir-akhir ini kamu terlihat sibuk dengan laporan kampus. Apakah ada hal yang sedang menyulitkanmu?',
    translationTh:
      'เหนื่อยหน่อยนะ! ช่วงนี้ดูยุ่งกับรายงานมหาวิทยาลัยเลย มีอะไรที่กำลังกังวลอยู่หรือเปล่า?',
  },
  {
    match: '今週の金曜日、図書館で一緒に練習しない',
    pronunciation:
      'Ii shitsumon da ne! Mainichi sanjuppun zutsu juuyou na bunpou o fukushuu suru no ga o-susume da yo. Konshuu no kinyoubi, toshokan de issho ni renshuu shinai?',
    translationId:
      'Pertanyaan yang bagus! Aku sarankan mengulang tata bahasa penting 30 menit setiap hari. Jumat minggu ini, mau latihan bersama di perpustakaan?',
    translationTh:
      'เป็นคำถามที่ดีเลย! แนะนำให้ทบทวนไวยากรณ์สำคัญวันละ 30 นาทีนะ วันศุกร์นี้มาฝึกด้วยกันที่ห้องสมุดไหม?',
  },
  {
    match: 'まずは教科書のまとめから一緒に始めようか',
    pronunciation:
      'Naruhodo, raishuu tesuto ga aru n da ne! Mazu wa kyoukasho no matome kara issho ni hajimeyou ka?',
    translationId:
      'Begitu ya, minggu depan ada ujian! Bagaimana kalau kita mulai belajar bersama dari rangkuman buku teks dulu?',
    translationTh:
      'อย่างนี้นี่เอง สัปดาห์หน้ามีสอบสินะ! เรามาเริ่มจากสรุปเนื้อหาในหนังสือเรียนกันก่อนดีไหม?',
  },
];

const ENGLISH_WORD_PHONETICS: Record<string, string> = {
  i: 'Ai',
  "i'd": 'Aid',
  "i'm": 'Aim',
  "i've": 'Aiv',
  you: 'yu',
  your: 'yer',
  we: 'wi',
  our: 'awer',
  my: 'mai',
  me: 'mi',
  they: 'dei',
  their: 'der',
  it: 'it',
  is: 'iz',
  are: 'ar',
  am: 'em',
  was: 'woz',
  were: 'wer',
  have: 'hev',
  has: 'hez',
  had: 'hed',
  do: 'du',
  does: 'daz',
  did: 'did',
  will: 'wil',
  would: 'wud',
  could: 'kud',
  should: 'syud',
  can: 'ken',
  to: 'tu',
  of: 'of',
  in: 'in',
  on: 'on',
  at: 'et',
  for: 'for',
  with: 'wit',
  from: 'from',
  about: 'e-baut',
  after: 'af-ter',
  before: 'bi-for',
  near: 'nier',
  around: 'e-raund',
  because: 'bi-koz',
  although: 'ol-do',
  however: 'hau-e-ver',
  while: 'wail',
  and: 'end',
  or: 'or',
  but: 'bat',
  so: 'so',
  the: 'de',
  a: 'e',
  an: 'en',
  this: 'dis',
  that: 'det',
  there: 'der',
  here: 'hier',
  where: 'wer',
  what: 'wot',
  who: 'hu',
  when: 'wen',
  why: 'wai',
  how: 'hau',
  which: 'wic',
  live: 'liv',
  lived: 'livd',
  living: 'li-ving',
  house: 'haus',
  home: 'hom',
  apartment: 'e-part-ment',
  neighborhood: 'nei-ber-hud',
  city: 'si-ti',
  center: 'sen-ter',
  town: 'taun',
  village: 'vi-lij',
  quiet: 'kwa-yet',
  comfortable: 'kam-fer-te-bel',
  peaceful: 'pis-ful',
  convenient: 'kon-vi-ni-ent',
  family: 'fe-mi-li',
  parents: 'pe-rents',
  brother: 'bra-der',
  sister: 'sis-ter',
  mother: 'ma-der',
  father: 'fa-der',
  friend: 'frend',
  friends: 'frends',
  team: 'tiim',
  colleagues: 'ko-ligs',
  favorite: 'fei-vrit',
  place: 'pleis',
  places: 'plei-ses',
  park: 'park',
  green: 'grin',
  local: 'lo-kal',
  cafe: 'ka-fei',
  coffee: 'ko-fi',
  shop: 'syop',
  market: 'mar-ket',
  night: 'nait',
  morning: 'mor-ning',
  afternoon: 'af-ter-nun',
  evening: 'iv-ning',
  weekend: 'wik-end',
  weekends: 'wik-ends',
  walk: 'wok',
  walking: 'wo-king',
  jogging: 'jo-ging',
  relax: 'ri-leks',
  relaxing: 'ri-lek-sing',
  read: 'rid',
  reading: 'ri-ding',
  book: 'buk',
  books: 'buks',
  usually: 'yu-zju-e-li',
  often: 'o-fen',
  always: 'ol-weis',
  sometimes: 'sam-taims',
  every: 'ev-ri',
  day: 'dei',
  days: 'deis',
  week: 'wik',
  weeks: 'wiks',
  month: 'mant',
  months: 'mants',
  year: 'yir',
  years: 'yirs',
  since: 'sins',
  childhood: 'caild-hud',
  born: 'born',
  like: 'laik',
  love: 'lav',
  loved: 'lavd',
  enjoy: 'en-joi',
  really: 'ri-li',
  very: 've-ri',
  much: 'mac',
  many: 'me-ni',
  little: 'li-tel',
  bit: 'bit',
  more: 'mor',
  most: 'most',
  best: 'best',
  good: 'gud',
  great: 'greit',
  nice: 'nais',
  wonderful: 'wan-der-ful',
  awesome: 'o-sem',
  lovely: 'lav-li',
  cozy: 'ko-zi',
  delicious: 'di-li-syes',
  tasty: 'teis-ti',
  spicy: 'spai-si',
  sweet: 'swit',
  warm: 'worm',
  hot: 'hot',
  cold: 'kold',
  iced: 'aisd',
  latte: 'la-tei',
  tea: 'ti',
  matcha: 'ma-ca',
  milk: 'milk',
  sugar: 'syu-ger',
  please: 'plis',
  thank: 'tengk',
  thanks: 'tengks',
  meeting: 'mi-ting',
  prepare: 'pri-per',
  preparing: 'pri-pe-ring',
  presentation: 'pre-zen-tei-syen',
  topic: 'to-pik',
  topics: 'to-piks',
  project: 'pro-jek',
  digital: 'di-ji-tal',
  marketing: 'mar-ke-ting',
  social: 'so-syel',
  media: 'mi-di-ya',
  technology: 'tek-no-lo-ji',
  clean: 'klin',
  energy: 'e-ner-ji',
  business: 'biz-nis',
  english: 'ing-glisy',
  japanese: 'je-pe-nis',
  grammar: 'gre-mer',
  speaking: 'spi-king',
  conversation: 'kon-ver-sei-syen',
  study: 'sta-di',
  studying: 'sta-di-ing',
  library: 'lai-bre-ri',
  hours: 'awers',
  hour: 'awer',
  two: 'tu',
  three: 'tri',
  five: 'faiv',
  ten: 'ten',
  tomorrow: 'tu-mo-ro',
  today: 'tu-dei',
  yesterday: 'yes-ter-dei',
  last: 'last',
  next: 'nekst',
  went: 'went',
  go: 'go',
  going: 'go-ing',
  visited: 'vi-zi-ted',
  visit: 'vi-zit',
  ate: 'eit',
  eat: 'it',
  eating: 'i-ting',
  took: 'tuk',
  take: 'teik',
  photos: 'fo-tos',
  pictures: 'pik-cers',
  mountains: 'maun-tens',
  mountain: 'maun-ten',
  beach: 'bic',
  street: 'strit',
  food: 'fud',
  dish: 'disy',
  satay: 'sa-tei',
  fried: 'fraid',
  rice: 'rais',
  noodles: 'nu-dels',
  soup: 'sup',
  remote: 'ri-mot',
  work: 'werk',
  working: 'wer-king',
  hybrid: 'hai-brid',
  schedule: 'ske-jul',
  schedules: 'ske-juls',
  company: 'kam-pe-ni',
  companies: 'kam-pe-nis',
  employees: 'em-plo-yis',
  productivity: 'pro-dak-ti-vi-ti',
  collaboration: 'ko-la-bo-rei-syen',
  balance: 'be-lens',
  saves: 'seivs',
  time: 'taim',
  think: 'tingk',
  believe: 'bi-liv',
  opinion: 'o-pin-yen',
  agree: 'e-gri',
  yes: 'yes',
  no: 'no',
  sure: 'syur',
  definitely: 'de-fi-nit-li',
  speak: 'spik',
  slower: 'slo-wer',
  repeat: 'ri-pit',
  again: 'e-gen',
  help: 'help',
  tell: 'tel',
  plan: 'plen',
  planning: 'ple-ning',
  holiday: 'ho-li-dei',
  trip: 'trip',
};

export function approximateEnglishPhoneticId(text: string): string {
  const phraseModified = text
    .replace(/\bI'd like\b/gi, 'Aid laik')
    .replace(/\bI would like\b/gi, 'Ai wud laik')
    .replace(/\bCould you\b/gi, 'Kud yu')
    .replace(/\bWould you\b/gi, 'Wud yu')
    .replace(/\bDo you\b/gi, 'Du yu')
    .replace(/\bHow long\b/gi, 'Hau long')
    .replace(/\bOn the other hand\b/gi, 'On de a-der hend');

  return phraseModified.replace(/[A-Za-z']+/g, (word) => {
    const lower = word.toLowerCase();
    if (ENGLISH_WORD_PHONETICS[lower]) {
      const mapped = ENGLISH_WORD_PHONETICS[lower];
      if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        return mapped.charAt(0).toUpperCase() + mapped.slice(1);
      }
      return mapped;
    }
    return word;
  });
}

export function approximateJapaneseRomaji(text: string): string {
  const map: Array<[RegExp, string]> = [
    [/いらっしゃいませ/g, 'Irasshaimase'],
    [/ご注文はお決まりですか/g, 'go-chuumon wa o-kimari desu ka'],
    [/かしこまりました/g, 'Kashikomarimashita'],
    [/すみません/g, 'Sumimasen'],
    [/ありがとうございます/g, 'arigatou gozaimasu'],
    [/よろしくお願いします/g, 'yoroshiku onegaishimasu'],
    [/お願いします/g, 'onegaishimasu'],
    [/ください/g, 'kudasai'],
    [/ホットコーヒー/g, 'hotto koohii'],
    [/アイスコーヒー/g, 'aisu koohii'],
    [/チーズケーキ/g, 'chiizukeeki'],
    [/サンドイッチ/g, 'sandoicchi'],
    [/お砂糖とミルク/g, 'o-satou to miruku'],
    [/お砂糖/g, 'o-satou'],
    [/ミルク/g, 'miruku'],
    [/ブラックで/g, 'burakku de'],
    [/大丈夫です/g, 'daijoubu desu'],
    [/一つ/g, 'hitotsu'],
    [/二つ/g, 'futatsu'],
    [/店内で/g, 'tennai de'],
    [/お召し上がりですか/g, 'o-meshiagari desu ka'],
    [/お持ち帰りで/g, 'o-mochikaeri de'],
    [/持ち帰りで/g, 'mochikaeri de'],
    [/袋を/g, 'fukuro o'],
    [/レジ袋/g, 'rejibukuro'],
    [/窓際の席/g, 'madogiwa no seki'],
    [/わたしは/g, 'watashi wa'],
    [/私は/g, 'watashi wa'],
    [/来週/g, 'raishuu'],
    [/今週の金曜日/g, 'konshuu no kinyoubi'],
    [/金曜日/g, 'kinyoubi'],
    [/図書館で/g, 'toshokan de'],
    [/図書館/g, 'toshokan'],
    [/一緒に/g, 'issho ni'],
    [/練習しましょう/g, 'renshuu shimashou'],
    [/練習したいです/g, 'renshuu shitai desu'],
    [/練習/g, 'renshuu'],
    [/大切な/g, 'taisetsu na'],
    [/テストがあるので/g, 'tesuto ga aru node'],
    [/テスト/g, 'tesuto'],
    [/レポート/g, 'repooto'],
    [/毎日/g, 'mainichi'],
    [/どう勉強したらいいですか/g, 'dou benkyou shitara ii desu ka'],
    [/勉強/g, 'benkyou'],
    [/教科書のまとめ/g, 'kyoukasho no matome'],
    [/文法/g, 'bunpou'],
    [/書き方/g, 'kakikata'],
    [/難しいので/g, 'muzukashii node'],
    [/教えていただけますか/g, 'oshiete itadakemasu ka'],
    [/ぜひ/g, 'zehi'],
    [/とても楽しみです/g, 'totemo tanoshimi desu'],
    [/もう一度/g, 'mou ichido'],
    [/ゆっくり/g, 'yukkuri'],
    [/言ってください/g, 'itte kudasai'],
    [/はい/g, 'Hai'],
    [/いいえ/g, 'Iie'],
    [/です/g, 'desu'],
    [/ます/g, 'masu'],
  ];
  let out = text;
  for (const [rgx, rep] of map) {
    out = out.replace(rgx, ` ${rep} `);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function approximateJapaneseToIndonesian(text: string): string {
  if (text.includes('砂糖') || text.includes('ミルク') || text.includes('ブラック')) {
    return 'Apakah Anda ingin menambahkan gula dan susu pada kopi Anda?';
  }
  if (text.includes('店内') || text.includes('持ち帰り')) {
    return 'Apakah pesanan ingin dinikmati di dalam kafe atau dibawa pulang?';
  }
  if (text.includes('コーヒー') && text.includes('ください')) {
    return 'Tolong berikan saya satu kopi panas dan cheesecake.';
  }
  if (text.includes('金曜日') || text.includes('図書館')) {
    return 'Bagaimana kalau hari Jumat ini kita latihan bersama di perpustakaan?';
  }
  if (text.includes('教科書') || text.includes('まとめ')) {
    return 'Bagaimana kalau kita mulai belajar bersama dari rangkuman buku teks dulu?';
  }
  if (text.includes('もう一度') || text.includes('ゆっくり')) {
    return 'Maaf, tolong ucapkan sekali lagi dengan lebih pelan.';
  }
  if (text.includes('テスト') || text.includes('勉強')) {
    return 'Karena minggu depan ada ujian, bagaimana sebaiknya saya belajar?';
  }
  return `Kalimat bahasa Jepang: "${text}"`;
}

function approximateEnglishToIndonesian(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('how long have you lived')) {
    return 'Lingkungan itu terdengar sangat nyaman! Sudah berapa lama kamu tinggal di sana?';
  }
  if (lower.includes('what is your favorite place near your house')) {
    return 'Terdengar seperti tempat yang nyaman! Apa tempat favorit di dekat rumahmu, seperti taman atau kafe lokal?';
  }
  if (lower.includes('what do you usually do there')) {
    return 'Tempat itu terdengar sangat asyik! Apa yang biasanya kamu lakukan di sana saat akhir pekan?';
  }
  if (lower.includes('what is your presentation topic') || lower.includes('topics are you covering')) {
    return 'Pilihan minuman yang segar! Apa topik presentasi atau materi yang sedang kamu siapkan hari ini?';
  }
  if (lower.includes('when is your presentation')) {
    return 'Topik itu sangat menarik! Kapan presentasimu diadakan, dan apakah persiapanmu sudah lancar?';
  }
  if (lower.includes('how long are you staying at the library')) {
    return 'Semangat belajarnya! Berapa lama kamu berencana belajar di perpustakaan hari ini?';
  }
  if (lower.includes('which dish was your favorite')) {
    return 'Liburan akhir pekan yang seru! Makanan atau jajanan apa yang paling kamu sukai di sana?';
  }
  if (lower.includes('who did you go with')) {
    return 'Cerita akhir pekan yang menyenangkan! Bersama siapa kamu pergi ke sana?';
  }
  if (lower.includes('would you like to visit there again')) {
    return 'Terdengar sangat berkesan! Apakah kamu ingin berkunjung ke sana lagi pada liburan berikutnya?';
  }
  if (lower.includes('hybrid') || lower.includes('remote work')) {
    return 'Poin argumen yang sangat baik. Menurutmu bagaimana aturan kerja jarak jauh atau hibrida sebaiknya diterapkan ke depannya?';
  }
  if (lower.includes('i live in') || lower.includes('my house is')) {
    return 'Saya tinggal bersama keluarga saya, dan suasana lingkungan rumah saya sangat nyaman.';
  }
  if (lower.includes('favorite place near my house')) {
    return 'Tempat favorit di dekat rumah saya adalah taman hijau dan kafe lokal untuk bersantai.';
  }
  if (lower.includes('latte') || lower.includes('coffee')) {
    return 'Saya ingin memesan kopi, lalu setelah ini saya akan belajar atau menyiapkan presentasi.';
  }
  if (lower.includes('went to') || lower.includes('weekend')) {
    return 'Akhir pekan lalu saya pergi berlibur bersama keluarga, makan kuliner lokal, dan mengambil foto.';
  }
  return `Terjemahan langsung: "${text}"`;
}

export function translateAndPhoneticizeLiveText(
  rawText: string,
  targetLang: 'en' | 'ja',
  explicitTranslationId?: string,
  explicitTranslationTh?: string,
  explicitPronunciation?: string
): LiveTranslationResult {
  const clean = (rawText || '').trim();
  if (!clean) {
    return {
      text: '',
      pronunciation: '',
      translationId: '',
      translationTh: '',
    };
  }

  const lower = clean.toLowerCase();
  for (const item of KNOWN_UTTERANCE_TRANSLATIONS) {
    if (lower.includes(item.match.toLowerCase())) {
      return {
        text: clean,
        pronunciation: explicitPronunciation || approximateEnglishPhoneticId(clean),
        translationId: explicitTranslationId || item.translationId,
        translationTh: explicitTranslationTh || item.translationTh,
      };
    }
  }

  if (targetLang === 'ja') {
    const romaji = explicitPronunciation || approximateJapaneseRomaji(clean);
    const idTrans = explicitTranslationId || approximateJapaneseToIndonesian(clean);
    const thTrans = explicitTranslationTh || idTrans;
    return {
      text: clean,
      pronunciation: romaji,
      translationId: idTrans,
      translationTh: thTrans,
    };
  }

  const phoneticEn = explicitPronunciation || approximateEnglishPhoneticId(clean);
  const idTrans = explicitTranslationId || approximateEnglishToIndonesian(clean);
  const thTrans = explicitTranslationTh || idTrans;

  return {
    text: clean,
    pronunciation: phoneticEn,
    translationId: idTrans,
    translationTh: thTrans,
  };
}

/**
 * Extracts contextual details from the student's previous answer(s) so that
 * real-time answer suggestions weave in the student's actual conversation context!
 */
export function extractUserConversationContext(
  lastUserText?: string,
  history?: Array<{ speaker: 'ai' | 'user'; text: string }>
): ExtractedUserContext {
  const combinedUserText = [
    ...(history || []).filter((h) => h.speaker === 'user').map((h) => h.text),
    lastUserText || '',
  ]
    .join(' ')
    .trim();
  const lower = combinedUserText.toLowerCase();

  // 1. Detect City
  let city = 'Jakarta';
  const cityMatches: Array<[RegExp, string]> = [
    [/\bbandung\b/i, 'Bandung'],
    [/\bjakarta\b/i, 'Jakarta'],
    [/\bsurabaya\b/i, 'Surabaya'],
    [/\byogyakarta\b|\bjogja\b/i, 'Yogyakarta'],
    [/\bbali\b|\bdenpasar\b/i, 'Bali'],
    [/\bmedan\b/i, 'Medan'],
    [/\bsemarang\b/i, 'Semarang'],
    [/\bmalang\b/i, 'Malang'],
    [/\bbogor\b/i, 'Bogor'],
    [/\btokyo\b/i, 'Tokyo'],
    [/\bosaka\b/i, 'Osaka'],
    [/\bkyoto\b/i, 'Kyoto'],
    [/\bbangkok\b/i, 'Bangkok'],
  ];
  for (const [rgx, name] of cityMatches) {
    if (rgx.test(combinedUserText)) {
      city = name;
      break;
    }
  }

  // 2. Detect Companion
  let companion = 'my family';
  let companionId = 'keluarga saya';
  if (/\bparents and my brother\b/i.test(lower)) {
    companion = 'my parents and my brother';
    companionId = 'orang tua dan kakak saya';
  } else if (/\bbrother\b/i.test(lower)) {
    companion = 'my brother';
    companionId = 'kakak saya';
  } else if (/\bsister\b/i.test(lower)) {
    companion = 'my sister';
    companionId = 'saudara perempuan saya';
  } else if (/\bparents\b/i.test(lower)) {
    companion = 'my parents';
    companionId = 'orang tua saya';
  } else if (/\bfriend\b|\bfriends\b/i.test(lower)) {
    companion = 'my best friend';
    companionId = 'sahabat saya';
  } else if (/\bteam\b|\bcolleagues\b/i.test(lower)) {
    companion = 'my team';
    companionId = 'tim saya';
  }

  // 3. Detect Favorite Place near house
  let favoritePlace = 'the green park';
  let favoritePlaceId = 'taman hijau';
  if (/\bcafe\b|\bcoffee shop\b/i.test(lower)) {
    favoritePlace = 'the cozy local cafe';
    favoritePlaceId = 'kafe lokal yang nyaman';
  } else if (/\bmarket\b/i.test(lower)) {
    favoritePlace = 'the traditional night market';
    favoritePlaceId = 'pasar malam tradisional';
  } else if (/\blibrary\b/i.test(lower)) {
    favoritePlace = 'the city library';
    favoritePlaceId = 'perpustakaan kota';
  }

  // 4. Detect Drink Order
  let drinkOrder = 'an iced latte';
  let drinkOrderId = 'es kopi susu (iced latte)';
  if (/\bhot coffee\b/i.test(lower)) {
    drinkOrder = 'a hot coffee';
    drinkOrderId = 'kopi hangat';
  } else if (/\bmatcha\b/i.test(lower)) {
    drinkOrder = 'an iced matcha latte';
    drinkOrderId = 'es matcha latte';
  } else if (/\btea\b/i.test(lower)) {
    drinkOrder = 'a warm lemon tea';
    drinkOrderId = 'teh lemon hangat';
  }

  // 5. Detect Plan after coffee
  let afterPlan = 'prepare our presentation';
  let afterPlanId = 'menyiapkan presentasi kami';
  if (/\blibrary\b|\bstudying\b/i.test(lower)) {
    afterPlan = 'study at the library';
    afterPlanId = 'belajar di perpustakaan';
  }

  // 6. Detect Study/Presentation Topic
  let studyTopic = 'digital marketing';
  let studyTopicId = 'pemasaran digital';
  if (/\bgreen technology\b|\bclean energy\b/i.test(lower)) {
    studyTopic = 'green technology and clean energy';
    studyTopicId = 'teknologi hijau dan energi bersih';
  } else if (/\benglish\b|\bgrammar\b/i.test(lower)) {
    studyTopic = 'English conversation and grammar';
    studyTopicId = 'percakapan dan tata bahasa Inggris';
  }

  // 7. Detect Trip Place & Food
  const tripPlace = /\bbandung\b/i.test(lower)
    ? 'Bandung'
    : /\byogyakarta\b|\bjogja\b/i.test(lower)
      ? 'Yogyakarta'
      : /\bbali\b/i.test(lower)
        ? 'Bali'
        : city === 'Jakarta'
          ? 'Bandung'
          : city;

  let foodItem = 'satay and warm fried rice';
  let foodItemId = 'sate dan nasi goreng hangat';
  if (/\bnoodles\b/i.test(lower)) {
    foodItem = 'spicy local noodles';
    foodItemId = 'mie lokal pedas';
  }

  return {
    city,
    companion,
    companionId,
    favoritePlace,
    favoritePlaceId,
    drinkOrder,
    drinkOrderId,
    afterPlan,
    afterPlanId,
    studyTopic,
    studyTopicId,
    tripPlace,
    foodItem,
    foodItemId,
  };
}

/**
 * Generates contextual multi-turn AI responses so the AI partner dynamically responds to what
 * the student actually said and advances the conversation to a fresh follow-up question.
 */
export function generateDynamicContextualAiReply(params: {
  userText: string;
  lastAiQuestionText?: string;
  scenarioId: string;
  targetLang: 'en' | 'ja';
  history?: Array<{ speaker: 'ai' | 'user'; text: string }>;
}): {
  aiReply: string;
  aiReplyTranslationId: string;
  aiReplyTranslationTh: string;
} {
  const uLower = (params.userText || '').toLowerCase();
  const prevAiLower = (params.lastAiQuestionText || '').toLowerCase();
  const ctx = extractUserConversationContext(params.userText, params.history);

  if (params.targetLang === 'ja') {
    const isN4 = params.scenarioId.includes('n4');
    if (isN4) {
      if (
        prevAiLower.includes('金曜日') ||
        prevAiLower.includes('図書館') ||
        prevAiLower.includes('教科書') ||
        uLower.includes('金曜日') ||
        uLower.includes('はい') ||
        uLower.includes('楽しみ') ||
        uLower.includes('何時')
      ) {
        return {
          aiReply:
            'よかった！じゃあ金曜日の午後2時に図書館の入り口で会おうね。どの文法のパートが一番難しそう？',
          aiReplyTranslationId:
            'Syukurlah! Kalau begitu mari bertemu hari Jumat jam 2 siang di pintu masuk perpustakaan ya. Bagian tata bahasa mana yang menurutmu paling sulit?',
          aiReplyTranslationTh:
            'ดีเลย! งั้นเจอกันวันศุกร์เวลาบ่าย 2 โมงที่หน้าทางเข้าห้องสมุดนะ ไวยากรณ์ส่วนไหนที่คิดว่ายากที่สุดเหรอ?',
        };
      }
      return {
        aiReply:
          'いい質問だね！毎日30分ずつ重要な文法を復習するのがおすすめだよ。今週の金曜日、図書館で一緒に練習しない？',
        aiReplyTranslationId:
          'Pertanyaan yang bagus! Aku sarankan kamu mengulang tata bahasa penting 30 menit setiap hari. Jumat minggu ini, mau latihan bersama di perpustakaan?',
        aiReplyTranslationTh:
          'เป็นคำถามที่ดีเลย! แนะนำให้ทบทวนไวยากรณ์สำคัญวันละ 30 นาทีนะ วันศุกร์นี้มาฝึกด้วยกันที่ห้องสมุดไหม?',
      };
    }

    // Japanese Kissaten / Konbini
    if (
      prevAiLower.includes('店内') ||
      prevAiLower.includes('持ち帰り') ||
      uLower.includes('店内') ||
      uLower.includes('持ち帰り')
    ) {
      return {
        aiReply:
          'かしこまりました！お砂糖とミルクはお使いになりますか？それともブラックになさいますか？',
        aiReplyTranslationId:
          'Baik, dimengerti! Apakah Anda ingin menggunakan gula dan susu, atau kopi hitam saja (black)?',
        aiReplyTranslationTh:
          'รับทราบค่ะ! จะรับน้ำตาลกับนมด้วยไหมคะ หรือรับเป็นกาแฟดำดีคะ?',
      };
    }
    if (
      prevAiLower.includes('砂糖') ||
      prevAiLower.includes('ミルク') ||
      uLower.includes('砂糖') ||
      uLower.includes('ミルク') ||
      uLower.includes('ブラック') ||
      uLower.includes('大丈夫')
    ) {
      return {
        aiReply:
          'ありがとうございます！すぐにお席までお持ちしますね。今日はこれからどこかへお出かけですか？',
        aiReplyTranslationId:
          'Terima kasih banyak! Segera kami antarkan ke kursi Anda ya. Apakah hari ini setelah ngopi Anda berencana pergi ke suatu tempat?',
        aiReplyTranslationTh:
          'ขอบคุณมากค่ะ! เดี๋ยวจะรีบนำไปเสิร์ฟที่โต๊ะนะคะ วันนี้หลังจากนี้มีแผนจะไปเที่ยวไหนต่อไหมคะ?',
      };
    }
    const hasIceCoffee = uLower.includes('アイスコーヒー') || uLower.includes('aisu');
    const hasCheeseCake = uLower.includes('チーズケーキ') || uLower.includes('keeki');
    const orderedJa =
      hasIceCoffee && hasCheeseCake
        ? 'アイスコーヒーとチーズケーキ'
        : hasIceCoffee
          ? 'アイスコーヒーお一つ'
          : hasCheeseCake
            ? 'ホットコーヒーとチーズケーキ'
            : 'ホットコーヒーお一つ';
    const orderedId =
      hasIceCoffee && hasCheeseCake
        ? 'Es kopi dan cheesecake'
        : hasIceCoffee
          ? 'Satu es kopi'
          : hasCheeseCake
            ? 'Kopi panas dan cheesecake'
            : 'Satu kopi panas';
    return {
      aiReply: `かしこまりました！${orderedJa}ですね。店内でお召し上がりですか、それともお持ち帰りですか？`,
      aiReplyTranslationId: `Baik, dimengerti! ${orderedId} ya. Apakah ingin dinikmati di dalam kafe, atau dibawa pulang?`,
      aiReplyTranslationTh:
        'รับทราบค่ะ! จะรับประทานที่ร้าน หรือรับกลับบ้านดีคะ?',
    };
  }

  // ENGLISH MULTI-TURN CONVERSATION PROGRESSION
  // 1. Hometown / Where do you live
  if (params.scenarioId.includes('hometown') || prevAiLower.includes('where do you live')) {
    if (
      prevAiLower.includes('favorite place near your house') ||
      uLower.includes('favorite place') ||
      uLower.includes('green park') ||
      uLower.includes('local cafe') ||
      uLower.includes('market')
    ) {
      return {
        aiReply: `Spending time at ${ctx.favoritePlace} in ${ctx.city} sounds so relaxing! What do you usually do there on weekends, and who do you go with?`,
        aiReplyTranslationId: `Menghabiskan waktu di ${ctx.favoritePlaceId} di ${ctx.city} terdengar sangat menenangkan! Apa yang biasanya kamu lakukan di sana saat akhir pekan, dan bersama siapa kamu pergi?`,
        aiReplyTranslationTh: `การไปใช้เวลาที่นั่นใน ${ctx.city} ฟังดูผ่อนคลายมากเลย! ปกติคุณทำอะไรที่นั่นในวันหยุดสุดสัปดาห์ และไปกับใครครับ?`,
      };
    }
    if (
      prevAiLower.includes('what do you usually do there') ||
      prevAiLower.includes('how long have you lived')
    ) {
      return {
        aiReply: `That is wonderful! Living in ${ctx.city} with ${ctx.companion} sounds really warm. How long have you lived in ${ctx.city}, and what do you love most about your city?`,
        aiReplyTranslationId: `Luar biasa! Tinggal di ${ctx.city} bersama ${ctx.companionId} terdengar sangat hangat. Sudah berapa lama kamu tinggal di ${ctx.city}, dan apa hal yang paling kamu sukai dari kotamu?`,
        aiReplyTranslationTh: `ยอดเยี่ยมมาก! การอาศัยอยู่ใน ${ctx.city} ฟังดูอบอุ่นมาก คุณอาศัยอยู่ที่นั่นมานานแค่ไหนแล้ว และชอบอะไรที่สุดในเมืองของคุณ?`,
      };
    }
    return {
      aiReply: `Living in ${ctx.city} with ${ctx.companion} sounds really nice! What is your favorite place near your house in ${ctx.city}, like a park or a local cafe?`,
      aiReplyTranslationId: `Tinggal di ${ctx.city} bersama ${ctx.companionId} terdengar sangat menyenangkan! Apa tempat favorit di dekat rumahmu di ${ctx.city}, seperti taman atau kafe lokal?`,
      aiReplyTranslationTh: `การอาศัยอยู่ใน ${ctx.city} ฟังดูดีมากเลย! สถานที่โปรดใกล้ๆ บ้านของคุณใน ${ctx.city} คือที่ไหนเหรอ เช่น สวนสาธารณะหรือคาเฟ่แถวบ้าน?`,
    };
  }

  // 2. Cafe Ordering & Afternoon Plans
  if (params.scenarioId.includes('cafe')) {
    if (
      prevAiLower.includes('presentation topic') ||
      prevAiLower.includes('studying at the library') ||
      prevAiLower.includes('topics are you covering') ||
      uLower.includes('topic') ||
      uLower.includes('marketing') ||
      uLower.includes('technology') ||
      uLower.includes('project')
    ) {
      return {
        aiReply: `A project about ${ctx.studyTopic} sounds super interesting! When is your presentation, and how long will you and ${ctx.companion} practice today?`,
        aiReplyTranslationId: `Proyek tentang ${ctx.studyTopicId} terdengar sangat menarik! Kapan jadwal presentasimu, dan berapa lama kamu bersama ${ctx.companionId} akan berlatih hari ini?`,
        aiReplyTranslationTh: `โปรเจกต์เกี่ยวกับ ${ctx.studyTopic} ฟังดูน่าสนใจมาก! คุณต้องนำเสนอเมื่อไหร่ และวันนี้จะซ้อมกันนานแค่ไหนครับ?`,
      };
    }
    if (uLower.includes('library') || uLower.includes('studying')) {
      return {
        aiReply: `One ${ctx.drinkOrder.replace(/^an?\s+/i, '')} coming right up! Studying at the library with ${ctx.companion} is a great plan. What subject or topic are you studying at the library today?`,
        aiReplyTranslationId: `Satu ${ctx.drinkOrderId} segera disiapkan! Belajar di perpustakaan bersama ${ctx.companionId} adalah rencana yang bagus. Materi atau topik apa yang akan kalian pelajari di perpustakaan hari ini?`,
        aiReplyTranslationTh: `ได้ทันทีครับ! การไปอ่านหนังสือที่ห้องสมุดเป็นแผนที่ดีมาก วันนี้คุณจะไปติววิชาหรือหัวข้ออะไรที่ห้องสมุดเอ่ย?`,
      };
    }
    return {
      aiReply: `One ${ctx.drinkOrder.replace(/^an?\s+/i, '')} coming right up! Best of luck preparing your presentation with ${ctx.companion} this afternoon. What is your presentation topic about?`,
      aiReplyTranslationId: `Satu ${ctx.drinkOrderId} segera disiapkan! Semoga sukses menyiapkan presentasi bersama ${ctx.companionId} sore ini. Apa topik presentasi kalian?`,
      aiReplyTranslationTh: `ได้แล้วครับ! ขอให้การเตรียมงานนำเสนอกับทีมช่วงบ่ายนี้ราบรื่นนะ หัวข้อที่นำเสนอเกี่ยวกับเรื่องอะไรครับ?`,
    };
  }

  // 3. Past Weekend Trip
  if (params.scenarioId.includes('past') || params.scenarioId.includes('weekend')) {
    if (
      prevAiLower.includes('which dish') ||
      prevAiLower.includes('who did you go with') ||
      uLower.includes('favorite dish') ||
      uLower.includes('satay') ||
      uLower.includes('fried rice')
    ) {
      return {
        aiReply: `Eating ${ctx.foodItem} in ${ctx.tripPlace} with ${ctx.companion} sounds so delicious! Would you like to visit ${ctx.tripPlace} again on your next holiday, or try another city?`,
        aiReplyTranslationId: `Makan ${ctx.foodItemId} di ${ctx.tripPlace} bersama ${ctx.companionId} terdengar sangat lezat! Apakah kamu ingin berkunjung ke ${ctx.tripPlace} lagi saat liburan berikutnya, atau mencoba kota lain?`,
        aiReplyTranslationTh: `การได้ทานอาหารอร่อยๆ ที่ ${ctx.tripPlace} ฟังดูน่าประทับใจมาก! วันหยุดครั้งหน้าคุณอยากกลับไปเที่ยว ${ctx.tripPlace} อีก หรืออยากลองไปเมืองอื่นครับ?`,
      };
    }
    return {
      aiReply: `That sounds like an awesome weekend in ${ctx.tripPlace} with ${ctx.companion}! Local food in the cool air is the best. Which dish was your favorite during the trip?`,
      aiReplyTranslationId: `Terdengar seperti akhir pekan yang luar biasa di ${ctx.tripPlace} bersama ${ctx.companionId}! Kuliner lokal di sana memang paling nikmat. Hidangan mana yang paling kamu sukai selama perjalanan?`,
      aiReplyTranslationTh: `ฟังดูเป็นวันหยุดสุดสัปดาห์ที่ยอดเยี่ยมที่ ${ctx.tripPlace} เลย! อาหารท้องถิ่นคือที่สุดแล้ว ชอบเมนูไหนมากที่สุดในทริปนี้ครับ?`,
    };
  }

  // 4. IELTS / B1 Remote Work Discussion
  return {
    aiReply:
      'Excellent point. Your clause clearly contrasts the benefits and drawbacks. Do you think companies should allow hybrid schedules in the future to balance productivity and teamwork?',
    aiReplyTranslationId:
      'Poin yang sangat tajam. Kalimatmu dengan jelas membandingkan manfaat dan tantangannya. Menurutmu apakah perusahaan sebaiknya menerapkan jadwal kerja hibrida di masa depan untuk menyeimbangkan produktivitas dan kerja sama tim?',
    aiReplyTranslationTh:
      'ประเด็นยอดเยี่ยมมาก คุณเปรียบเทียบข้อดีและข้อเสียได้ชัดเจน คุณคิดว่าบริษัทควรใช้รูปแบบการทำงานแบบไฮบริดในอนาคตไหม?',
  };
}

/**
 * Helper to create a complete BeginnerReplyCard with automatic phonetic Cara Baca
 */
function buildCard(params: {
  id: string;
  badgeId: string;
  badgeTh: string;
  tier: 'easy' | 'mission' | 'rescue';
  text: string;
  targetLang: 'en' | 'ja';
  pronunciation?: string;
  hintId: string;
  hintTh: string;
  contextAnchorId?: string;
  contextAnchorTh?: string;
  wordBreakdown?: Array<{ word: string; reading: string; meaningId: string }>;
}): BeginnerReplyCard {
  const autoPron =
    params.pronunciation ||
    (params.targetLang === 'ja'
      ? approximateJapaneseRomaji(params.text)
      : approximateEnglishPhoneticId(params.text));

  return {
    id: params.id,
    badgeId: params.badgeId,
    badgeTh: params.badgeTh,
    tier: params.tier,
    text: params.text,
    pronunciation: autoPron,
    hintId: params.hintId,
    hintTh: params.hintTh,
    contextAnchorId: params.contextAnchorId,
    contextAnchorTh: params.contextAnchorTh,
    wordBreakdown: params.wordBreakdown || [],
  };
}

/**
 * REAL-TIME CONTEXTUAL 3-OPTION ANSWER GENERATOR
 * Dynamically synthesizes 3 complete reply options (with Cara Baca & Arti)
 * tailored to BOTH the AI's latest spoken question (`lastAiQuestionText`)
 * AND the student's previous answer (`lastUserText`).
 */
export function getBeginnerReplyCards(
  scenarioId: string,
  targetLang: 'en' | 'ja',
  dynamicSuggestions?: Array<{
    text: string;
    hintId: string;
    hintTh: string;
    pronunciation?: string;
    tier?: 'easy' | 'mission' | 'rescue';
    badgeId?: string;
    badgeTh?: string;
  }>,
  lastAiQuestionText?: string,
  lastUserText?: string,
  history?: Array<{ speaker: 'ai' | 'user'; text: string }>
): BeginnerReplyCard[] {
  const aiQ = (lastAiQuestionText || '').toLowerCase();
  const ctx = extractUserConversationContext(lastUserText, history);

  // First synthesize the 3 deterministic, context-aware cards for the exact AI question + user's prior turn
  const contextualCards = synthesizeContextualThreeCards(
    scenarioId,
    targetLang,
    aiQ,
    lastAiQuestionText || '',
    lastUserText || '',
    ctx
  );

  // If the live AI turn returned specific non-generic dynamic suggestions, merge them cleanly into the 3-card set
  if (dynamicSuggestions && dynamicSuggestions.length > 0) {
    const validDynamic = dynamicSuggestions.filter((d) => {
      const t = (d.text || '').trim();
      if (!t || t.length < 4) return false;
      // Ignore generic fallback placeholders so contextual cards always win
      if (/could you tell me a little more about that/i.test(t)) return false;
      if (/yes, i usually do that with my friends on weekends/i.test(t)) return false;
      return true;
    });

    if (validDynamic.length >= 3) {
      const tiers: Array<'easy' | 'mission' | 'rescue'> = ['easy', 'mission', 'rescue'];
      const badgesId = [
        'Opsi 1 · Mudah & Singkat (Sesuai Konteks Live)',
        'Opsi 2 · Natural & Kontekstual (Rekomendasi Partner)',
        'Opsi 3 · Lengkap & Sopan (Tindak Lanjut)',
      ];
      const badgesTh = [
        'ตัวเลือก 1 · สั้นและพูดง่าย (ตามบริบทสด)',
        'ตัวเลือก 2 · เป็นธรรมชาติและครบถ้วน (แนะนำ)',
        'ตัวเลือก 3 · สุภาพและสมบูรณ์',
      ];
      return validDynamic.slice(0, 3).map((dyn, idx) =>
        buildCard({
          id: `dyn_live_${idx}`,
          badgeId: dyn.badgeId || badgesId[idx] || badgesId[0],
          badgeTh: dyn.badgeTh || badgesTh[idx] || badgesTh[0],
          tier: dyn.tier || tiers[idx] || 'mission',
          text: dyn.text,
          targetLang,
          pronunciation: dyn.pronunciation,
          hintId: dyn.hintId,
          hintTh: dyn.hintTh || dyn.hintId,
          contextAnchorId: contextualCards[idx]?.contextAnchorId,
          contextAnchorTh: contextualCards[idx]?.contextAnchorTh,
        })
      );
    }
  }

  return contextualCards;
}

function synthesizeContextualThreeCards(
  scenarioId: string,
  targetLang: 'en' | 'ja',
  aiQ: string,
  rawAiText: string,
  lastUserText: string,
  ctx: ExtractedUserContext
): BeginnerReplyCard[] {
  const hasPreviousUserTurn = Boolean(lastUserText && lastUserText.trim().length > 0);

  // ============================================================================
  // JAPANESE (JA) REAL-TIME CONTEXTUAL 3-OPTION GENERATOR
  // ============================================================================
  if (targetLang === 'ja') {
    // 1. Follow-up: Sugar & Milk or Black coffee ("お砂糖とミルク", "ブラック")
    if (aiQ.includes('砂糖') || aiQ.includes('ミルク') || aiQ.includes('ブラック')) {
      return [
        buildCard({
          id: 'ja_sugar_1',
          badgeId: 'Opsi 1 · Mudah & Singkat (Pakai Susu Saja)',
          badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (ใส่นมอย่างเดียว)',
          tier: 'easy',
          text: 'ミルクだけお願いします。ありがとうございます。',
          targetLang: 'ja',
          pronunciation: 'Miruku dake onegaishimasu. Arigatou gozaimasu.',
          hintId: 'Tolong tambahkan susu saja. Terima kasih banyak.',
          hintTh: 'ขอนมอย่างเดียวครับ/ค่ะ ขอบคุณมากครับ/ค่ะ',
          contextAnchorId: 'Menjawab pertanyaan Partner AI tentang tambahan gula & susu',
          wordBreakdown: [
            { word: 'ミルクだけ', reading: 'miruku dake', meaningId: 'susu saja' },
            { word: 'お願いします', reading: 'onegaishimasu', meaningId: 'tolong ya' },
          ],
        }),
        buildCard({
          id: 'ja_sugar_2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Gula + Susu)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (รับทั้งน้ำตาลและนม)',
          tier: 'mission',
          text: 'はい、お砂糖とミルクを一つずつお願いします。',
          targetLang: 'ja',
          pronunciation: 'Hai, o-satou to miruku o hitotsu zutsu onegaishimasu.',
          hintId: 'Ya, tolong berikan gula dan susu masing-masing satu.',
          hintTh: 'รับครับ/ค่ะ ขอน้ำตาลและนมอย่างละ 1 ที่ครับ/ค่ะ',
          contextAnchorId: 'Menjawab pertanyaan Partner AI tentang gula & susu secara lengkap',
          wordBreakdown: [
            { word: 'お砂糖とミルク', reading: 'o-satou to miruku', meaningId: 'gula dan susu' },
            { word: '一つずつ', reading: 'hitotsu zutsu', meaningId: 'masing-masing satu' },
          ],
        }),
        buildCard({
          id: 'ja_sugar_3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Kopi Hitam / Tanpa Gula)',
          badgeTh: 'ตัวเลือก 3 · สุภาพ (ดื่มกาแฟดำ ไม่ใส่น้ำตาล)',
          tier: 'rescue',
          text: 'いいえ、ブラックで大丈夫です。ありがとうございます。',
          targetLang: 'ja',
          pronunciation: 'Iie, burakku de daijoubu desu. Arigatou gozaimasu.',
          hintId: 'Tidak perlu, kopi hitam saja sudah cukup. Terima kasih banyak.',
          hintTh: 'ไม่เป็นไรครับ/ค่ะ ขอเป็นกาแฟดำได้เลย ขอบคุณครับ/ค่ะ',
          contextAnchorId: 'Menolak tambahan gula/susu dengan sopan',
          wordBreakdown: [
            { word: 'ブラックで', reading: 'burakku de', meaningId: 'kopi hitam saja' },
            { word: '大丈夫です', reading: 'daijoubu desu', meaningId: 'tidak apa-apa / cukup' },
          ],
        }),
      ];
    }

    // 2. Follow-up: Dine-in vs Takeout ("店内でお召し上がり", "お持ち帰り")
    if (aiQ.includes('店内') || aiQ.includes('持ち帰り') || aiQ.includes('袋')) {
      return [
        buildCard({
          id: 'ja_dine_1',
          badgeId: 'Opsi 1 · Mudah & Singkat (Makan di Sini)',
          badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (ทานที่ร้าน)',
          tier: 'easy',
          text: 'はい、店内でお願いします。ありがとうございます。',
          targetLang: 'ja',
          pronunciation: 'Hai, tennai de onegaishimasu. Arigatou gozaimasu.',
          hintId: 'Ya, saya makan/minum di dalam kafe, tolong. Terima kasih banyak.',
          hintTh: 'ใช่ครับ/ค่ะ ขอทานที่ร้านนะครับ/คะ ขอบคุณมากครับ/ค่ะ',
          contextAnchorId: 'Menjawab pertanyaan Partner AI apakah makan di tempat atau dibawa pulang',
          wordBreakdown: [
            { word: '店内で', reading: 'tennai de', meaningId: 'di dalam kafe' },
            { word: 'お願いします', reading: 'onegaishimasu', meaningId: 'tolong (sopan)' },
          ],
        }),
        buildCard({
          id: 'ja_dine_2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Bawa Pulang + Kantong)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (รับกลับบ้าน + ขอถุง)',
          tier: 'mission',
          text: 'お持ち帰りでお願いします。袋を一つください。',
          targetLang: 'ja',
          pronunciation: 'O-mochikaeri de onegaishimasu. Fukuro o hitotsu kudasai.',
          hintId: 'Tolong dibungkus untuk dibawa pulang. Tolong berikan satu kantong.',
          hintTh: 'ขอรับกลับบ้านครับ/ค่ะ ขอถุง 1 ใบด้วยครับ/ค่ะ',
          contextAnchorId: 'Memilih dibawa pulang beserta permintaan kantong',
          wordBreakdown: [
            { word: 'お持ち帰りで', reading: 'o-mochikaeri de', meaningId: 'dibawa pulang' },
            { word: '袋を一つ', reading: 'fukuro o hitotsu', meaningId: 'satu kantong' },
          ],
        }),
        buildCard({
          id: 'ja_dine_3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Duduk Dekat Jendela)',
          badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ทานที่ร้านริมหน้าต่าง)',
          tier: 'rescue',
          text: '店内でお願いします。窓際の席に座ってもいいですか。',
          targetLang: 'ja',
          pronunciation: 'Tennai de onegaishimasu. Madogiwa no seki ni suwatte mo ii desu ka.',
          hintId: 'Saya makan di sini, tolong. Apakah boleh saya duduk di kursi dekat jendela?',
          hintTh: 'ทานที่ร้านครับ/ค่ะ ขอนั่งที่โต๊ะริมหน้าต่างได้ไหมครับ/คะ?',
          contextAnchorId: 'Makan di kafe sekaligus menanyakan kursi dengan sopan',
          wordBreakdown: [
            { word: '窓際の席', reading: 'madogiwa no seki', meaningId: 'kursi dekat jendela' },
            { word: '座ってもいいですか', reading: 'suwatte mo ii desu ka', meaningId: 'bolehkah duduk?' },
          ],
        }),
      ];
    }

    // 3. Follow-up: Plans after cafe ("お出かけですか", "これから")
    if (aiQ.includes('お出かけ') || aiQ.includes('これから')) {
      return [
        buildCard({
          id: 'ja_plan_1',
          badgeId: 'Opsi 1 · Mudah & Singkat (Ke Perpustakaan)',
          badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (ไปห้องสมุด)',
          tier: 'easy',
          text: 'はい、これから図書館へ勉強しに行きます。',
          targetLang: 'ja',
          pronunciation: 'Hai, kore kara toshokan e benkyou shi ni ikimasu.',
          hintId: 'Ya, setelah ini saya akan pergi ke perpustakaan untuk belajar.',
          hintTh: 'ใช่ครับ/ค่ะ หลังจากนี้จะไปอ่านหนังสือที่ห้องสมุดครับ/ค่ะ',
          contextAnchorId: 'Menjawab pertanyaan Partner AI tentang rencana setelah dari kafe',
        }),
        buildCard({
          id: 'ja_plan_2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Bertemu Teman)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (ไปพบเพื่อน)',
          tier: 'mission',
          text: 'コーヒーを飲んだあとで、友だちと買い物に行きます。',
          targetLang: 'ja',
          pronunciation: 'Koohii o nonda ato de, tomodachi to kaimono ni ikimasu.',
          hintId: 'Setelah minum kopi, saya akan pergi berbelanja bersama teman.',
          hintTh: 'หลังดื่มกาแฟเสร็จ ฉันจะไปซื้อของกับเพื่อนครับ/ค่ะ',
          contextAnchorId: 'Menceritakan kegiatan bersama teman setelah ngopi',
        }),
        buildCard({
          id: 'ja_plan_3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Bersantai di Kafe)',
          badgeTh: 'ตัวเลือก 3 · สุภาพ (พักผ่อนอ่านหนังสือที่ร้าน)',
          tier: 'rescue',
          text: 'いいえ、今日はここでゆっくり本を読みます。',
          targetLang: 'ja',
          pronunciation: 'Iie, kyou wa koko de yukkuri hon o yomimasu.',
          hintId: 'Tidak, hari ini saya ingin bersantai membaca buku di sini.',
          hintTh: 'ไม่ครับ/ค่ะ วันนี้ตั้งใจจะนั่งอ่านหนังสือสบายๆ ที่นี่ครับ/ค่ะ',
          contextAnchorId: 'Menjawab bahwa ingin bersantai di kafe',
        }),
      ];
    }

    // 4. Senpai Follow-up: Library practice on Friday / Textbook summary ("金曜日", "図書館", "教科書", "パート")
    if (
      aiQ.includes('金曜日') ||
      aiQ.includes('図書館') ||
      aiQ.includes('教科書') ||
      aiQ.includes('パート')
    ) {
      return [
        buildCard({
          id: 'ja_senpai_f1',
          badgeId: 'Opsi 1 · Mudah & Singkat (Setuju Latihan)',
          badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (ตกลงไปฝึกด้วยกัน)',
          tier: 'easy',
          text: 'はい、ぜひお願いします！とても楽しみです。',
          targetLang: 'ja',
          pronunciation: 'Hai, zehi onegaishimasu! Totemo tanoshimi desu.',
          hintId: 'Ya, tentu saja mau! Saya sangat menantikannya, mohon bantuannya.',
          hintTh: 'ได้เลยครับ/ค่ะ รบกวนด้วยนะครับ/คะ ตั้งตารอมากเลย!',
          contextAnchorId: 'Menerima ajakan Senpai untuk belajar bersama',
        }),
        buildCard({
          id: 'ja_senpai_f2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Tanya Jam di Perpustakaan)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (ถามเวลานัดที่ห้องสมุด)',
          tier: 'mission',
          text: 'ありがとうございます！金曜日は何時に図書館へ行ったらいいですか。',
          targetLang: 'ja',
          pronunciation: 'Arigatou gozaimasu! Kinyoubi wa nanji ni toshokan e ittara ii desu ka.',
          hintId: 'Terima kasih banyak! Hari Jumat sebaiknya saya datang ke perpustakaan jam berapa?',
          hintTh: 'ขอบคุณมากครับ/ค่ะ! วันศุกร์ควรไปที่ห้องสมุดกี่โมงดีครับ/คะ?',
          contextAnchorId: 'Menjawab ajakan Senpai sekaligus menanyakan jam bertemu',
        }),
        buildCard({
          id: 'ja_senpai_f3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Sebutkan Materi Sulit)',
          badgeTh: 'ตัวเลือก 3 · สุภาพและครบถ้วน (บอกบทที่ยังไม่เข้าใจ)',
          tier: 'rescue',
          text: '助かります！条件形の文法がまだ難しいので、教えてください。',
          targetLang: 'ja',
          pronunciation: 'Tasukarimasu! Joukenkei no bunpou ga mada muzukashii node, oshiete kudasai.',
          hintId: 'Sangat terbantu! Karena tata bahasa bentuk pengandaian masih sulit, tolong ajarkan saya.',
          hintTh: 'ช่วยได้มากเลยครับ/ค่ะ! เพราะไวยากรณ์รูปเงื่อนไขยังยากอยู่ ช่วยสอนให้หน่อยนะครับ/คะ',
          contextAnchorId: 'Menjelaskan bagian materi ujian yang masih sulit kepada Senpai',
        }),
      ];
    }

    // 5. Japanese Senpai Opening ("レポート", "忙しそう", "困っている")
    if (scenarioId.includes('n4') || aiQ.includes('レポート') || aiQ.includes('困っている')) {
      return [
        buildCard({
          id: 'ja_senpai_1',
          badgeId: 'Opsi 1 · Mudah & Singkat (Minta Ajarkan Laporan)',
          badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (ขอให้ช่วยสอนเขียนรายงาน)',
          tier: 'easy',
          text: 'レポートが難しいので、書き方を教えていただけますか。',
          targetLang: 'ja',
          pronunciation: 'Repooto ga muzukashii node, kakikata o oshiete itadakemasu ka.',
          hintId: 'Karena laporannya sulit, bisakah Senpai mengajarkan cara menulisnya?',
          hintTh: 'เพราะรายงานยากมาก ช่วยสอนวิธีเขียนให้หน่อยได้ไหมครับ/คะ?',
          contextAnchorId: 'Menjawab pertanyaan Senpai tentang kesulitan tugas kampus',
        }),
        buildCard({
          id: 'ja_senpai_2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Saran Belajar Ujian)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (ขอคำแนะนำเรื่องสอบสัปดาห์หน้า)',
          tier: 'mission',
          text: '来週大切なテストがあるので、毎日どう勉強したらいいですか。',
          targetLang: 'ja',
          pronunciation: 'Raishuu taisetsu na tesuto ga aru node, mainichi dou benkyou shitara ii desu ka.',
          hintId: 'Karena minggu depan ada ujian penting, sebaiknya setiap hari saya belajar bagaimana?',
          hintTh: 'เพราะสัปดาห์หน้ามีสอบสำคัญ ทุกวันควรจะฝึกเรียนอย่างไรดีครับ/คะ?',
          contextAnchorId: 'Meminta saran belajar kepada Senpai menggunakan pola ~node dan ~tara',
        }),
        buildCard({
          id: 'ja_senpai_3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Latihan Percakapan)',
          badgeTh: 'ตัวเลือก 3 · สุภาพ (ขอฝึกสนทนาภาษาญี่ปุ่นด้วยกัน)',
          tier: 'rescue',
          text: '日本語の会話がもっと上手になりたいので、練習を手伝ってください。',
          targetLang: 'ja',
          pronunciation: 'Nihongo no kaiwa ga motto jouzu ni naritai node, renshuu o tetsudatte kudasai.',
          hintId: 'Karena saya ingin lebih mahir bercakap-cakap bahasa Jepang, tolong bantu latihan saya.',
          hintTh: 'เพราะอยากพูดภาษาญี่ปุ่นให้เก่งขึ้น ช่วยซ้อมสนทนาให้หน่อยนะครับ/คะ',
          contextAnchorId: 'Meminta bantuan latihan percakapan bahasa Jepang secara sopan',
        }),
      ];
    }

    // 6. Japanese Kissaten Opening (Default JA)
    return [
      buildCard({
        id: 'ja_kissaten_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Pesan Kopi Panas)',
        badgeTh: 'ตัวเลือก 1 · สั้นและง่าย (สั่งกาแฟร้อน 1 แก้ว)',
        tier: 'easy',
        text: 'すみません、ホットコーヒーを一つください。',
        targetLang: 'ja',
        pronunciation: 'Sumimasen, hotto koohii o hitotsu kudasai.',
        hintId: 'Permisi, tolong berikan saya satu kopi panas.',
        hintTh: 'ขอโทษนะคะ/ครับ ขอกาแฟร้อน 1 แก้วค่ะ/ครับ',
        contextAnchorId: 'Menjawab pertanyaan pelayan kafe untuk memesan minuman',
      }),
      buildCard({
        id: 'ja_kissaten_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Kopi Panas + Cheesecake)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (สั่งกาแฟร้อนและชีสเค้ก)',
        tier: 'mission',
        text: 'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
        targetLang: 'ja',
        pronunciation: 'Sumimasen, hotto koohii o hitotsu to chiizukeeki o hitotsu kudasai.',
        hintId: 'Permisi, tolong berikan satu kopi panas dan satu potong cheesecake.',
        hintTh: 'ขอโทษครับ/ค่ะ ขอกาแฟร้อน 1 แก้ว และชีสเค้ก 1 ชิ้นครับ/ค่ะ',
        contextAnchorId: 'Memesan menu rekomendasi kafe secara lengkap dengan partikel ~o',
      }),
      buildCard({
        id: 'ja_kissaten_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Es Kopi + Makan di Sini)',
        badgeTh: 'ตัวเลือก 3 · สุภาพและครบถ้วน (สั่งกาแฟเย็นทานที่ร้าน)',
        tier: 'rescue',
        text: 'アイスコーヒーを一つお願いします。店内で飲みます。',
        targetLang: 'ja',
        pronunciation: 'Aisu koohii o hitotsu onegaishimasu. Tennai de nomimasu.',
        hintId: 'Tolong satu es kopi. Saya akan meminumnya di dalam kafe.',
        hintTh: 'ขอกาแฟเย็น 1 แก้วครับ/ค่ะ จะดื่มที่ร้านครับ/ค่ะ',
        contextAnchorId: 'Memesan es kopi sekaligus menyebutkan makan di tempat',
      }),
    ];
  }

  // ============================================================================
  // ENGLISH (EN) REAL-TIME CONTEXTUAL 3-OPTION GENERATOR
  // ============================================================================

  // 1. Follow-up Question: "What is your favorite place near your house?"
  if (
    aiQ.includes('favorite place near your house') ||
    aiQ.includes('park or a local cafe') ||
    aiQ.includes('what is near your house')
  ) {
    return [
      buildCard({
        id: 'en_favplace_1',
        badgeId: `Opsi 1 · Mudah & Singkat (Taman di ${ctx.city})`,
        badgeTh: `ตัวเลือก 1 · สั้นและพูดง่าย (สวนสาธารณะใน ${ctx.city})`,
        tier: 'easy',
        text: `My favorite place near my house in ${ctx.city} is a green park. I often walk there in the afternoon.`,
        targetLang: 'en',
        hintId: `Tempat favorit di dekat rumah saya di ${ctx.city} adalah taman hijau. Saya sering jalan sore di sana.`,
        hintTh: `สถานที่โปรดใกล้บ้านฉันใน ${ctx.city} คือสวนสาธารณะสีเขียว ฉันมักไปเดินเล่นตอนบ่าย`,
        contextAnchorId: `Menjawab pertanyaan Partner AI tentang tempat favorit di dekat rumahmu (${ctx.city})`,
      }),
      buildCard({
        id: 'en_favplace_2',
        badgeId: `Opsi 2 · Natural & Kontekstual (Kafe Bersama ${ctx.companionId})`,
        badgeTh: `ตัวเลือก 2 · เป็นธรรมชาติ (คาเฟ่ใกล้บ้านใน ${ctx.city})`,
        tier: 'mission',
        text: `There is a cozy local cafe near my house in ${ctx.city}. I love going there with ${ctx.companion} on weekends.`,
        targetLang: 'en',
        hintId: `Ada kafe lokal yang nyaman di dekat rumah saya di ${ctx.city}. Saya suka pergi ke sana bersama ${ctx.companionId} saat akhir pekan.`,
        hintTh: `มีคาเฟ่เล็กๆ ที่อบอุ่นอยู่ใกล้บ้านใน ${ctx.city} ฉันชอบไปที่นั่นในวันหยุดสุดสัปดาห์`,
        contextAnchorId: `Menyambung jawabanmu sebelumnya tentang tinggal di ${ctx.city} bersama ${ctx.companionId}`,
      }),
      buildCard({
        id: 'en_favplace_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Pasar Malam Kuliner)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ตลาดกลางคืนใกล้บ้าน)',
        tier: 'rescue',
        text: `I really like the traditional market near my home in ${ctx.city} because we can buy delicious local snacks there.`,
        targetLang: 'en',
        hintId: `Saya sangat menyukai pasar tradisional di dekat rumah saya di ${ctx.city} karena kami bisa membeli jajanan lokal yang lezat di sana.`,
        hintTh: `ฉันชอบตลาดแถวบ้านใน ${ctx.city} มาก เพราะเราสามารถซื้อขนมท้องถิ่นอร่อยๆ ได้ที่นั่น`,
        contextAnchorId: `Memberikan alasan lengkap mengapa menyukai tempat di dekat rumah (${ctx.city})`,
      }),
    ];
  }

  // 2. Follow-up Question: "What do you usually do there on weekends, and who do you go with?"
  if (
    aiQ.includes('what do you usually do there') ||
    (aiQ.includes('on weekends') && aiQ.includes('who do you go with'))
  ) {
    return [
      buildCard({
        id: 'en_weekend_act_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Jalan Santai & Olahraga)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (เดินเล่นและออกกำลังกาย)',
        tier: 'easy',
        text: `I usually go jogging and enjoy the fresh air there with ${ctx.companion}.`,
        targetLang: 'en',
        hintId: `Saya biasanya olahraga lari pagi dan menikmati udara segar di sana bersama ${ctx.companionId}.`,
        hintTh: `ปกติฉันจะไปวิ่งจ็อกกิ้งและรับอากาศบริสุทธิ์ที่นั่น`,
        contextAnchorId: `Menjawab kegiatan akhir pekan di ${ctx.favoritePlaceId} (${ctx.city})`,
      }),
      buildCard({
        id: 'en_weekend_act_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Ngobrol & Minum Kopi)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (พูดคุยและพักผ่อนวันหยุด)',
        tier: 'mission',
        text: `On weekends, I go to ${ctx.favoritePlace} in ${ctx.city} with ${ctx.companion} to relax, drink coffee, and talk together.`,
        targetLang: 'en',
        hintId: `Saat akhir pekan, saya pergi ke ${ctx.favoritePlaceId} di ${ctx.city} bersama ${ctx.companionId} untuk bersantai, minum kopi, dan mengobrol.`,
        hintTh: `ในวันหยุดสุดสัปดาห์ ฉันจะไปพักผ่อน ดื่มกาแฟ และพูดคุยกันที่นั่น`,
        contextAnchorId: `Menghubungkan tempat favorit (${ctx.favoritePlaceId}) dengan keluarga/temanmu`,
      }),
      buildCard({
        id: 'en_weekend_act_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Baca Buku & Foto Bersama)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (อ่านหนังสือและถ่ายรูป)',
        tier: 'rescue',
        text: `Sometimes I go there with my friends to read books and take nice photos in the afternoon.`,
        targetLang: 'en',
        hintId: `Kadang-kadang saya pergi ke sana bersama teman-teman untuk membaca buku dan mengambil foto yang bagus di sore hari.`,
        hintTh: `บางครั้งฉันก็ไปที่นั่นกับเพื่อนๆ เพื่ออ่านหนังสือและถ่ายรูปสวยๆ ตอนบ่าย`,
        contextAnchorId: 'Menjelaskan variasi aktivitas sore hari secara natural',
      }),
    ];
  }

  // 3. Follow-up Question: "How long have you lived there?"
  if (aiQ.includes('how long have you lived') || aiQ.includes('love most about your city')) {
    return [
      buildCard({
        id: 'en_howlong_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Tinggal 5 Tahun)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (อาศัยอยู่มา 5 ปี)',
        tier: 'easy',
        text: `I have lived in ${ctx.city} for five years with ${ctx.companion}.`,
        targetLang: 'en',
        hintId: `Saya sudah tinggal di ${ctx.city} selama lima tahun bersama ${ctx.companionId}.`,
        hintTh: `ฉันอาศัยอยู่ใน ${ctx.city} มาห้าปีแล้ว`,
        contextAnchorId: `Menjawab pertanyaan Partner AI tentang berapa lama tinggal di ${ctx.city}`,
      }),
      buildCard({
        id: 'en_howlong_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Sejak Kecil & Suka Suasananya)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (อยู่มาตั้งแต่เด็กและชอบบรรยากาศ)',
        tier: 'mission',
        text: `I have lived in ${ctx.city} since childhood, and I love the friendly people and delicious local food.`,
        targetLang: 'en',
        hintId: `Saya sudah tinggal di ${ctx.city} sejak kecil, dan saya sangat menyukai warganya yang ramah serta makanan lokalnya yang lezat.`,
        hintTh: `ฉันอาศัยอยู่ใน ${ctx.city} มาตั้งแต่เด็ก และชอบผู้คนที่เป็นมิตรรวมถึงอาหารท้องถิ่นอร่อยๆ`,
        contextAnchorId: `Menjawab lama tinggal sekaligus hal yang paling disukai dari ${ctx.city}`,
      }),
      buildCard({
        id: 'en_howlong_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Baru Pindah 2 Tahun Lalu)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ย้ายมาอยู่ได้ 2 ปี)',
        tier: 'rescue',
        text: `We moved to ${ctx.city} about two years ago because the neighborhood is very peaceful and convenient.`,
        targetLang: 'en',
        hintId: `Kami pindah ke ${ctx.city} sekitar dua tahun lalu karena lingkungannya sangat tenang dan strategis.`,
        hintTh: `พวกเราย้ายมาอยู่ที่ ${ctx.city} เมื่อประมาณสองปีก่อน เพราะย่านนี้สงบและสะดวกสบายมาก`,
        contextAnchorId: 'Menceritakan alasan pindah dan kenyamanan lingkungan rumah',
      }),
    ];
  }

  // 4. Hometown Opening Question: "Where do you live, and who do you live with at home?"
  if (aiQ.includes('where do you live') || scenarioId === 'scen_en_a1_hometown') {
    return [
      buildCard({
        id: 'home_easy',
        badgeId: 'Opsi 1 · Mudah & Singkat (Tinggal Bersama Keluarga)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (อาศัยอยู่กับครอบครัว)',
        tier: 'easy',
        text: 'I live in Jakarta with my family. My house is quiet and comfortable.',
        targetLang: 'en',
        hintId: 'Saya tinggal di Jakarta bersama keluarga saya. Rumah saya tenang dan nyaman.',
        hintTh: 'ฉันอาศัยอยู่ที่จาการ์ตากับครอบครัว บ้านของฉันเงียบสงบและอบอุ่น',
        contextAnchorId: 'Menjawab langsung pertanyaan Partner AI tentang tempat tinggal & keluarga',
        wordBreakdown: [
          { word: 'I live in...', reading: 'Ai liv in', meaningId: 'Saya tinggal di...' },
          { word: 'with my family', reading: 'wit mai fe-mi-li', meaningId: 'bersama keluargaku' },
        ],
      }),
      buildCard({
        id: 'home_mission',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Dekat Pusat Kota)',
        badgeTh: 'ตัวเลือก 2 · ประโยคสมบูรณ์ (ใกล้ใจกลางเมือง)',
        tier: 'mission',
        text: 'My house is in Bandung, near the city center. I live there with my parents and my brother.',
        targetLang: 'en',
        hintId: 'Rumah saya di Bandung, dekat pusat kota. Saya tinggal di sana bersama orang tua dan kakak saya.',
        hintTh: 'บ้านของฉันอยู่ที่บันดุง ใกล้ใจกลางเมือง ฉันอาศัยอยู่ที่นั่นกับพ่อแม่และพี่ชาย',
        contextAnchorId: 'Menyebutkan lokasi rumah beserta anggota keluarga di rumah',
        wordBreakdown: [
          { word: 'My house is in', reading: 'Mai haus iz in', meaningId: 'Rumah saya di' },
          { word: 'near city center', reading: 'nier si-ti sen-ter', meaningId: 'dekat pusat kota' },
        ],
      }),
      buildCard({
        id: 'home_rescue',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Lingkungan Dekat Taman)',
        badgeTh: 'ตัวเลือก 3 · สุภาพและชัดเจน (แถวบ้านมีสวนสาธารณะ)',
        tier: 'rescue',
        text: 'I live in Surabaya with my parents, and there is a lovely green park near our house.',
        targetLang: 'en',
        hintId: 'Saya tinggal di Surabaya bersama orang tua saya, dan ada taman hijau yang asri di dekat rumah kami.',
        hintTh: 'ฉันอาศัยอยู่ที่สุราบายากับพ่อแม่ และมีสวนสาธารณะสีเขียวอยู่ใกล้บ้านของเรา',
        contextAnchorId: 'Menjawab tempat tinggal sekaligus mendeskripsikan sekitar rumah',
        wordBreakdown: [
          { word: 'with my parents', reading: 'wit mai pe-rents', meaningId: 'bersama orang tuaku' },
          { word: 'near our house', reading: 'nier awer haus', meaningId: 'dekat rumah kami' },
        ],
      }),
    ];
  }

  // 5. Cafe Follow-up 1: "What is your presentation topic about?" or "What are you studying at the library?"
  if (
    aiQ.includes('presentation topic') ||
    aiQ.includes('topics are you covering') ||
    aiQ.includes('studying at the library') ||
    aiQ.includes('what subject')
  ) {
    const isLibraryContext =
      aiQ.includes('library') || (lastUserText || '').toLowerCase().includes('library');
    return [
      buildCard({
        id: 'cafe_topic_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Topik Pemasaran Digital)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (การตลาดดิจิทัล)',
        tier: 'easy',
        text: isLibraryContext
          ? `We are studying digital marketing and preparing notes at the library.`
          : `Our presentation topic is about digital marketing and social media.`,
        targetLang: 'en',
        hintId: isLibraryContext
          ? 'Kami sedang mempelajari pemasaran digital dan menyiapkan catatan di perpustakaan.'
          : 'Topik presentasi kami adalah tentang pemasaran digital dan media sosial.',
        hintTh: 'พวกเรากำลังศึกษาเรื่องการตลาดดิจิทัลและโซเชียลมีเดีย',
        contextAnchorId: isLibraryContext
          ? `Menjawab pertanyaan Partner AI tentang materi yang dipelajari bersama ${ctx.companionId} di perpustakaan`
          : `Menjawab pertanyaan Partner AI tentang topik presentasi bersama ${ctx.companionId}`,
      }),
      buildCard({
        id: 'cafe_topic_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Teknologi Hijau & Energi)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (โปรเจกต์เทคโนโลยีสีเขียว)',
        tier: 'mission',
        text: `After finishing ${ctx.drinkOrder}, ${ctx.companion} and I are working on a project about green technology and clean energy.`,
        targetLang: 'en',
        hintId: `Setelah menghabiskan ${ctx.drinkOrderId}, saya dan ${ctx.companionId} akan mengerjakan proyek tentang teknologi hijau dan energi bersih.`,
        hintTh: 'หลังจากดื่มกาแฟเสร็จ พวกเราจะทำโปรเจกต์เกี่ยวกับเทคโนโลยีสีเขียวและพลังงานสะอาด',
        contextAnchorId: `Menyambung pesanan ${ctx.drinkOrderId} dengan topik proyek bersama ${ctx.companionId}`,
      }),
      buildCard({
        id: 'cafe_topic_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Latihan Komunikasi Bisnis)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ฝึกการสื่อสารภาษาอังกฤษ)',
        tier: 'rescue',
        text: `We are practicing English business communication so we can speak confidently in class tomorrow.`,
        targetLang: 'en',
        hintId: `Kami sedang berlatih komunikasi bisnis Bahasa Inggris agar besok bisa berbicara dengan percaya diri di kelas.`,
        hintTh: 'พวกเรากำลังฝึกการสื่อสารภาษาอังกฤษเชิงธุรกิจเพื่อจะได้พูดอย่างมั่นใจในคลาสพรุ่งนี้',
        contextAnchorId: 'Menjelaskan tujuan belajar secara utuh dan jelas',
      }),
    ];
  }

  // 6. Cafe Follow-up 2: "When is your presentation, and how long will you practice today?" / "How long are you staying at the library?"
  if (
    aiQ.includes('when is your presentation') ||
    aiQ.includes('how long are you staying') ||
    aiQ.includes('how long will you')
  ) {
    return [
      buildCard({
        id: 'cafe_time_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Besok Pagi · Latihan 2 Jam)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (พรุ่งนี้เช้า · ซ้อม 2 ชั่วโมง)',
        tier: 'easy',
        text: `Our presentation is tomorrow morning, so we are practicing for two hours today.`,
        targetLang: 'en',
        hintId: `Presentasi kami diadakan besok pagi, jadi hari ini kami berlatih selama dua jam.`,
        hintTh: 'การนำเสนอของเราคือพรุ่งนี้เช้า วันนี้เราเลยจะซ้อมกันประมาณ 2 ชั่วโมง',
        contextAnchorId: `Menjawab jadwal presentasi (${ctx.studyTopicId}) dan durasi latihan`,
      }),
      buildCard({
        id: 'cafe_time_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Jumat Depan & Siap)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (วันศุกร์นี้และพร้อมมาก)',
        tier: 'mission',
        text: `It is this Friday afternoon. ${ctx.companion.charAt(0).toUpperCase() + ctx.companion.slice(1)} and I will practice for three hours until our slides are ready.`,
        targetLang: 'en',
        hintId: `Jadwalnya hari Jumat sore ini. Saya dan ${ctx.companionId} akan berlatih selama tiga jam sampai materi slide kami siap.`,
        hintTh: 'นำเสนอวันศุกร์บ่ายนี้ครับ พวกเราจะซ้อมกัน 3 ชั่วโมงจนกว่าสไลด์จะพร้อม',
        contextAnchorId: `Menyambung rencana latihan bersama ${ctx.companionId}`,
      }),
      buildCard({
        id: 'cafe_time_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Awal Minggu Depan)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (สัปดาห์หน้าและตื่นเต้นมาก)',
        tier: 'rescue',
        text: `Our presentation is next Monday, and we feel excited because we prepared many good examples.`,
        targetLang: 'en',
        hintId: `Presentasi kami hari Senin depan, dan kami merasa antusias karena sudah menyiapkan banyak contoh yang bagus.`,
        hintTh: 'งานนำเสนอคือวันจันทร์หน้า และเรารู้สึกตื่นเต้นเพราะเตรียมตัวอย่างดีๆ ไว้เยอะมาก',
        contextAnchorId: 'Menjawab waktu presentasi sekaligus perasaan saat persiapan',
      }),
    ];
  }

  // 7. Cafe Opening Question: "What would you like to drink today, and what are you doing after our coffee?"
  if (
    aiQ.includes('what would you like to drink') ||
    aiQ.includes('ordering again using') ||
    scenarioId === 'scen_en_a2_cafe'
  ) {
    return [
      buildCard({
        id: 'cafe_easy',
        badgeId: 'Opsi 1 · Mudah & Singkat (Kopi Hangat + Perpustakaan)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (กาแฟร้อน + ไปห้องสมุด)',
        tier: 'easy',
        text: "I'd like a hot coffee, please. After this, I am studying with my friend at the library.",
        targetLang: 'en',
        hintId: 'Saya ingin kopi hangat, tolong. Setelah ini, saya akan belajar bersama teman di perpustakaan.',
        hintTh: 'ขอกาแฟร้อนหนึ่งแก้วครับ/ค่ะ หลังจากนี้ฉันจะไปติวหนังสือกับเพื่อนที่ห้องสมุด',
        contextAnchorId: 'Memesan minuman dengan sopan & menyebutkan rencana belajar setelahnya',
      }),
      buildCard({
        id: 'cafe_mission',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Iced Latte + Presentasi Tim)',
        badgeTh: 'ตัวเลือก 2 · คำตอบครบตามภารกิจ (ลาเต้เย็น + เตรียมงานนำเสนอ)',
        tier: 'mission',
        text: "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation.",
        targetLang: 'en',
        hintId:
          'Saya ingin es kopi susu, tolong. Setelah ngopi, saya akan bertemu tim untuk menyiapkan presentasi kami.',
        hintTh:
          'ขอลาเต้เย็นหนึ่งแก้วครับ/ค่ะ หลังดื่มกาแฟเสร็จ ฉันจะไปพบทีมเพื่อเตรียมงานนำเสนอ',
        contextAnchorId: 'Memenuhi target I would like + Present Continuous rencana sore hari',
      }),
      buildCard({
        id: 'cafe_rescue',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Matcha Latte + Proyek Kampus)',
        badgeTh: 'ตัวเลือก 3 · สุภาพและชัดเจน (มัทฉะลาเต้ + ทำโปรเจกต์)',
        tier: 'rescue',
        text: 'Could I have an iced matcha latte, please? Later this afternoon, I am working on a design project.',
        targetLang: 'en',
        hintId: 'Bisakah saya memesan es matcha latte? Sore nanti, saya akan mengerjakan proyek desain.',
        hintTh: 'ขอเป็นมัทฉะลาเต้เย็นได้ไหมครับ/คะ? ช่วงบ่ายวันนี้ฉันจะทำโปรเจกต์ออกแบบต่อ',
        contextAnchorId: 'Menggunakan variasi modal sopan Could I have...?',
      }),
    ];
  }

  // 8. Trip Follow-up 1: "Which dish was your favorite?" or "Who did you go with?"
  if (
    aiQ.includes('which dish') ||
    aiQ.includes('what local food') ||
    aiQ.includes('who did you go with') ||
    aiQ.includes('what else did you do')
  ) {
    return [
      buildCard({
        id: 'trip_food_1',
        badgeId: `Opsi 1 · Mudah & Singkat (Sate & Nasi Goreng di ${ctx.tripPlace})`,
        badgeTh: `ตัวเลือก 1 · สั้นและพูดง่าย (สะเต๊ะและข้าวผัดที่ ${ctx.tripPlace})`,
        tier: 'easy',
        text: `My favorite dish in ${ctx.tripPlace} was chicken satay and warm fried rice. It was very delicious!`,
        targetLang: 'en',
        hintId: `Hidangan favorit saya di ${ctx.tripPlace} adalah sate ayam dan nasi goreng hangat. Rasanya sangat lezat!`,
        hintTh: `เมนูโปรดของฉันที่ ${ctx.tripPlace} คือสะเต๊ะไก่และข้าวผัดร้อนๆ อร่อยมากเลย!`,
        contextAnchorId: `Menjawab pertanyaan Partner AI tentang kuliner favorit saat di ${ctx.tripPlace}`,
      }),
      buildCard({
        id: 'trip_food_2',
        badgeId: `Opsi 2 · Natural & Kontekstual (Mie Lokal Bersama ${ctx.companionId})`,
        badgeTh: `ตัวเลือก 2 · เป็นธรรมชาติ (บะหมี่ท้องถิ่นกับครอบครัว)`,
        tier: 'mission',
        text: `I went to the night market in ${ctx.tripPlace} with ${ctx.companion}, and we loved the spicy local noodles and hot tea.`,
        targetLang: 'en',
        hintId: `Saya pergi ke pasar malam di ${ctx.tripPlace} bersama ${ctx.companionId}, dan kami sangat menyukai mie lokal pedas serta teh hangat.`,
        hintTh: `ฉันไปตลาดกลางคืนที่ ${ctx.tripPlace} และชอบบะหมี่ท้องถิ่นรสเผ็ดกับชาร้อนมาก`,
        contextAnchorId: `Menyambung cerita liburanmu di ${ctx.tripPlace} bersama ${ctx.companionId}`,
      }),
      buildCard({
        id: 'trip_food_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Kopi Pegunungan & Jajanan)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (กาแฟและขนมท้องถิ่น)',
        tier: 'rescue',
        text: `We also visited a scenic cafe in ${ctx.tripPlace} and tried roasted corn while enjoying the cool mountain air.`,
        targetLang: 'en',
        hintId: `Kami juga mengunjungi kafe berpemandangan indah di ${ctx.tripPlace} dan mencoba jagung bakar sambil menikmati udara pegunungan yang sejuk.`,
        hintTh: `พวกเราแวะคาเฟ่วิวสวยใน ${ctx.tripPlace} และลองชิมข้าวโพดปิ้งท่ามกลางอากาศเย็นสบาย`,
        contextAnchorId: 'Menceritakan pengalaman tambahan selama liburan dengan Past Simple',
      }),
    ];
  }

  // 9. Trip Follow-up 2: "Would you like to visit there again on your next holiday?"
  if (aiQ.includes('visit') && (aiQ.includes('again') || aiQ.includes('next holiday'))) {
    return [
      buildCard({
        id: 'trip_again_1',
        badgeId: `Opsi 1 · Mudah & Singkat (Ingin ke ${ctx.tripPlace} Lagi)`,
        badgeTh: `ตัวเลือก 1 · สั้นและพูดง่าย (อยากกลับไป ${ctx.tripPlace} อีก)`,
        tier: 'easy',
        text: `Yes, I would love to visit ${ctx.tripPlace} again with ${ctx.companion} next holiday!`,
        targetLang: 'en',
        hintId: `Ya, saya sangat ingin berkunjung ke ${ctx.tripPlace} lagi bersama ${ctx.companionId} pada liburan berikutnya!`,
        hintTh: `ใช่ ฉันอยากกลับไปเที่ยวที่ ${ctx.tripPlace} อีกครั้งในวันหยุดหน้าแน่นอน!`,
        contextAnchorId: `Menjawab pertanyaan Partner AI tentang rencana berkunjung kembali ke ${ctx.tripPlace}`,
      }),
      buildCard({
        id: 'trip_again_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Eksplorasi Tempat Baru)',
        badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (อยากไปสำรวจที่ใหม่ๆ)',
        tier: 'mission',
        text: `I loved ${ctx.tripPlace}, and next holiday we also want to explore Yogyakarta and try traditional food there.`,
        targetLang: 'en',
        hintId: `Saya sangat menyukai ${ctx.tripPlace}, dan pada liburan berikutnya kami juga ingin menjelajahi Yogyakarta serta mencicipi kuliner tradisional di sana.`,
        hintTh: `ฉันชอบ ${ctx.tripPlace} มาก และวันหยุดหน้าพวกเราก็อยากลองไปเที่ยวยอกยาการ์ตาด้วย`,
        contextAnchorId: 'Membandingkan pengalaman lalu dengan rencana liburan berikutnya',
      }),
      buildCard({
        id: 'trip_again_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Rekomendasi untuk Teman)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (แนะนำให้เพื่อนไปเที่ยว)',
        tier: 'rescue',
        text: `Definitely! We had such a great time in ${ctx.tripPlace} that I already recommended it to all my friends.`,
        targetLang: 'en',
        hintId: `Tentu saja! Kami merasakan pengalaman yang begitu menyenangkan di ${ctx.tripPlace} sampai saya sudah merekomendasikannya kepada semua teman saya.`,
        hintTh: `แน่นอน! พวกเรามีความสุขที่ ${ctx.tripPlace} มากจนฉันแนะนำให้เพื่อนๆ ทุกคนไปเที่ยวตามแล้ว`,
        contextAnchorId: 'Menutup cerita perjalanan akhir pekan dengan antusias',
      }),
    ];
  }

  // 10. Trip Opening Question: "Where did you go, and what was the best part of your weekend?"
  if (
    aiQ.includes('where did you go') ||
    aiQ.includes('short trip last weekend') ||
    scenarioId === 'scen_en_a2_past_trip'
  ) {
    return [
      buildCard({
        id: 'trip_easy',
        badgeId: 'Opsi 1 · Mudah & Singkat (Ke Yogyakarta Bersama Keluarga)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (ไปยอกยาการ์ตากับครอบครัว)',
        tier: 'easy',
        text: 'Last weekend, I went to Yogyakarta with my family and ate delicious noodles.',
        targetLang: 'en',
        hintId: 'Akhir pekan lalu, saya pergi ke Yogyakarta bersama keluarga dan makan mie yang lezat.',
        hintTh: 'สุดสัปดาห์ที่แล้ว ฉันไปยอกยาการ์ตากับครอบครัวและกินบะหมี่แสนอร่อย',
        contextAnchorId: 'Menjawab tujuan liburan dan aktivitas menggunakan Past Simple (went, ate)',
      }),
      buildCard({
        id: 'trip_mission',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Ke Bandung & Foto Gunung)',
        badgeTh: 'ตัวเลือก 2 · คำตอบครบตามภารกิจ (ไปบันดุงและถ่ายรูปภูเขา)',
        tier: 'mission',
        text: 'Last weekend I went to Bandung with my brother. We ate local street food and took photos of the mountains.',
        targetLang: 'en',
        hintId:
          'Akhir pekan lalu saya pergi ke Bandung bersama kakak saya. Kami makan jajanan lokal dan memotret gunung.',
        hintTh:
          'สุดสัปดาห์ก่อนฉันไปบันดุงกับพี่ชาย เราทานสตรีทฟู้ดท้องถิ่นและถ่ายรูปภูเขา',
        contextAnchorId: 'Menggunakan rangkaian kata kerja lampau tak beraturan (went, ate, took)',
      }),
      buildCard({
        id: 'trip_rescue',
        badgeId: 'Opsi 3 · Lengkap & Sopan (Pantai Bali & Matahari Terbenam)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ไปเที่ยวทะเลบาหลี)',
        tier: 'rescue',
        text: 'Last weekend I visited Bali with my best friend, and the best part was watching the sunset at the beach.',
        targetLang: 'en',
        hintId:
          'Akhir pekan lalu saya mengunjungi Bali bersama sahabat saya, dan bagian terbaiknya adalah menikmati matahari terbenam di pantai.',
        hintTh:
          'สุดสัปดาห์ก่อนฉันไปเที่ยวบาหลีกับเพื่อนสนิท และส่วนที่ประทับใจที่สุดคือการดูพระอาทิตย์ตกริมชายหาด',
        contextAnchorId: 'Menjawab langsung ke mana pergi dan apa bagian paling berkesan (the best part)',
      }),
    ];
  }

  // 11. IELTS / B1 Remote Work Follow-up & Opening
  if (
    aiQ.includes('remote work') ||
    aiQ.includes('hybrid') ||
    aiQ.includes('regulate') ||
    aiQ.includes('feel more connected') ||
    scenarioId.includes('ielts')
  ) {
    if (
      aiQ.includes('hybrid') ||
      aiQ.includes('regulate') ||
      aiQ.includes('feel more connected') ||
      hasPreviousUserTurn
    ) {
      return [
        buildCard({
          id: 'ielts_f1',
          badgeId: 'Opsi 1 · Mudah & Jelas (Dukung Jadwal Kerja Hibrida)',
          badgeTh: 'ตัวเลือก 1 · ชัดเจนและกระชับ (สนับสนุนการทำงานแบบไฮบริด)',
          tier: 'easy',
          text: 'I believe companies should allow hybrid schedules because they balance flexibility and teamwork.',
          targetLang: 'en',
          hintId:
            'Saya percaya perusahaan sebaiknya menerapkan jadwal hibrida karena dapat menyeimbangkan fleksibilitas dan kerja sama tim.',
          hintTh:
            'ฉันเชื่อว่าบริษัทควรใช้ตารางงานแบบไฮบริด เพราะช่วยสร้างสมดุลระหว่างความยืดหยุ่นและการทำงานเป็นทีม',
          contextAnchorId: 'Menjawab pertanyaan tindak lanjut PAW tentang kebijakan kerja masa depan',
        }),
        buildCard({
          id: 'ielts_f2',
          badgeId: 'Opsi 2 · Natural & Kontekstual (Klausa Kontras B1/B2)',
          badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (ใช้คำเชื่อมเปรียบเทียบระดับ B1/B2)',
          tier: 'mission',
          text: 'Although working from home saves commuting time, meeting at the office twice a week keeps the team connected.',
          targetLang: 'en',
          hintId:
            'Meskipun bekerja dari rumah menghemat waktu perjalanan, bertemu di kantor dua kali seminggu menjaga tim tetap terhubung.',
          hintTh:
            'แม้ว่าการทำงานจากบ้านจะช่วยประหยัดเวลาเดินทาง แต่การเข้าออฟฟิศสัปดาห์ละสองครั้งช่วยให้ทีมเชื่อมโยงกันได้ดี',
          contextAnchorId: 'Menggunakan struktur Although... untuk memberikan solusi seimbang',
        }),
        buildCard({
          id: 'ielts_f3',
          badgeId: 'Opsi 3 · Lengkap & Sopan (Aturan Jam Kerja Sehat)',
          badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (กำหนดชั่วโมงทำงานที่ชัดเจน)',
          tier: 'rescue',
          text: 'Furthermore, companies should respect clear working hours so employees can maintain a healthy work-life balance.',
          targetLang: 'en',
          hintId:
            'Selain itu, perusahaan perlu menghormati jam kerja yang jelas agar karyawan dapat menjaga keseimbangan hidup dan pekerjaan.',
          hintTh:
            'นอกจากนี้ บริษัทควรเคารพเวลาทำงานที่ชัดเจน เพื่อให้พนักงานรักษาสมดุลชีวิตและการทำงานได้',
          contextAnchorId: 'Menambahkan argumen lanjutan dengan kata hubung Furthermore',
        }),
      ];
    }

    return [
      buildCard({
        id: 'ielts_open_1',
        badgeId: 'Opsi 1 · Mudah & Singkat (Hemat Waktu Perjalanan)',
        badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (ประหยัดเวลาเดินทาง)',
        tier: 'easy',
        text: 'I think remote work increases productivity because employees save commuting time every day.',
        targetLang: 'en',
        hintId:
          'Menurut saya kerja jarak jauh meningkatkan produktivitas karena karyawan dapat menghemat waktu perjalanan setiap hari.',
        hintTh:
          'ฉันคิดว่าการทำงานทางไกลช่วยเพิ่มประสิทธิภาพ เพราะพนักงานประหยัดเวลาเดินทางในทุกๆ วัน',
        contextAnchorId: 'Menjawab pertanyaan Partner AI tentang dampak kerja jarak jauh terhadap produktivitas',
      }),
      buildCard({
        id: 'ielts_open_2',
        badgeId: 'Opsi 2 · Natural & Kontekstual (Klausa Although Lengkap)',
        badgeTh: 'ตัวเลือก 2 · คำตอบครบตามภารกิจ (ใช้โครงสร้าง Although)',
        tier: 'mission',
        text: 'Although working from home is convenient because it saves time, it can reduce team collaboration.',
        targetLang: 'en',
        hintId:
          'Meskipun bekerja dari rumah praktis karena menghemat waktu, hal itu dapat mengurangi kolaborasi tim.',
        hintTh:
          'แม้ว่าการทำงานจากบ้านจะสะดวกเพราะประหยัดเวลา แต่ก็อาจลดความร่วมมือภายในทีมลงได้',
        contextAnchorId: 'Membandingkan manfaat dan kelemahan kerja jarak jauh secara seimbang',
      }),
      buildCard({
        id: 'ielts_open_3',
        badgeId: 'Opsi 3 · Lengkap & Sopan (On the other hand...)',
        badgeTh: 'ตัวเลือก 3 · ประโยคสมบูรณ์ (ใช้ On the other hand)',
        tier: 'rescue',
        text: 'Remote work helps people focus quietly at home. On the other hand, new team members need direct guidance.',
        targetLang: 'en',
        hintId:
          'Kerja jarak jauh membantu orang fokus dengan tenang di rumah. Di sisi lain, anggota tim baru membutuhkan bimbingan langsung.',
        hintTh:
          'การทำงานทางไกลช่วยให้มีสมาธิที่บ้าน ในทางกลับกัน พนักงานใหม่ยังต้องการคำแนะนำอย่างใกล้ชิด',
        contextAnchorId: 'Menggunakan penanda wacana On the other hand untuk opini B1',
      }),
    ];
  }

  // 12. Universal Real-Time Question Fallback (handles ANY spontaneous live AI question!)
  const cleanQuestion = rawAiText.trim() || 'Could you tell me more about that?';
  return [
    buildCard({
      id: 'univ_live_1',
      badgeId: 'Opsi 1 · Mudah & Singkat (Jawab Langsung)',
      badgeTh: 'ตัวเลือก 1 · สั้นและพูดง่าย (ตอบตรงคำถาม)',
      tier: 'easy',
      text: `Yes, I really enjoy doing that in ${ctx.city} with ${ctx.companion}.`,
      targetLang: 'en',
      hintId: `Ya, saya sangat senang melakukan hal itu di ${ctx.city} bersama ${ctx.companionId}.`,
      hintTh: `ใช่ ฉันชอบทำสิ่งนั้นใน ${ctx.city} มากเลย`,
      contextAnchorId: `Menjawab langsung pertanyaan live PAW: "${cleanQuestion.slice(0, 60)}"`,
    }),
    buildCard({
      id: 'univ_live_2',
      badgeId: 'Opsi 2 · Natural & Kontekstual (Sesuai Jawabanmu Tadi)',
      badgeTh: 'ตัวเลือก 2 · เป็นธรรมชาติ (เชื่อมโยงกับคำตอบก่อนหน้า)',
      tier: 'mission',
      text: `In my experience, spending time with ${ctx.companion} on weekends is always fun and relaxing.`,
      targetLang: 'en',
      hintId: `Menurut pengalaman saya, menghabiskan waktu bersama ${ctx.companionId} di akhir pekan selalu menyenangkan dan menenangkan.`,
      hintTh: `จากประสบการณ์ของฉัน การใช้เวลาร่วมกันในวันหยุดสุดสัปดาห์สนุกและผ่อนคลายเสมอ`,
      contextAnchorId: `Melanjutkan percakapan berdasarkan konteks jawabanmu sebelumnya`,
    }),
    buildCard({
      id: 'univ_live_3',
      badgeId: 'Opsi 3 · Lengkap & Sopan (Tanya Balik ke Partner)',
      badgeTh: 'ตัวเลือก 3 · สุภาพและสมบูรณ์ (ถามกลับอย่างเป็นธรรมชาติ)',
      tier: 'rescue',
      text: `I usually do that twice a week. What do you recommend I try next time?`,
      targetLang: 'en',
      hintId: `Saya biasanya melakukan itu dua kali seminggu. Apa yang kamu sarankan untuk saya coba lain kali?`,
      hintTh: `ปกติฉันทำแบบนั้นสัปดาห์ละสองครั้ง ครั้งหน้าคุณแนะนำให้ฉันลองอะไรดีครับ/คะ?`,
      contextAnchorId: 'Menjawab sekaligus menjaga percakapan dua arah tetap hidup',
    }),
  ];
}
