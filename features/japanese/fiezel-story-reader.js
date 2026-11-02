/**
 * FIEZEL · features/japanese/fiezel-story-reader.js
 *
 * SHINOBI JAPANESE MULTI-SCENE STORYBOARD & GRADED READERS (N5-N4)
 * BRAINCORE BKT ENGINE INTEGRATED
 *
 * Desain & Invarian Pedagogis:
 * 1. Multi-Scene Progression: Tiap cerita memiliki 5 adegan terstruktur (Scene 1-4 narasi bertahap,
 *    Scene 5 kuis pemahaman & miskonsepsi). Visual adegan berganti mengikuti jalannya alur cerita.
 * 2. Perpustakaan Dokkai N5 Terkurasi: 3 judul cerita lengkap (舞妓の一日, 浅草の猫, はじめての新幹線).
 * 3. Zero-Loss Braincore BKT Telemetry: Setiap token <ruby> yang diketuk mengalirkan pembaruan
 *    penguasaan kata ke BKT secara nyata (FiezelStoryBrainBridge.recordWordInteraction).
 * 4. Multi-Device Anti-Cutoff: Tinggi foto adegan terkontrol (<= 25-30% viewport mobile), seluruh teks
 *    dan furigana 100% tampak utuh di atas lipatan layar.
 * 5. Instant Vector Art: Dilengkapi ilustrasi pemandangan SVG sinematik otentik (Makoto Shinkai & Kyoto Travertine).
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelStoryReader = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var currentView = 'library'; // 'library' | 'story'
  var activeStoryId = 'mizuki-maiko';
  var activeSceneIndex = 0;
  var isPlaying = false;
  var currentAudio = null;
  var autoAdvanceTimer = null;
  var hideFurigana = false;
  var karaokeRafId = null;
  var lastActiveCharIdx = -1;
  var pendingSeekMs = null;
  var cachedStoryTimings = {"schema_version":"1.0.0","generator":"Fiezel-ForcedAligner-Qwen3-Compatible","generated_at":"2026-11-02T08:46:11.310Z","stories":{"mizuki-maiko":{"title":"舞妓の一日","scenes":[{"scene_idx":0,"is_quiz":false,"audio_src":"./assets/stories/mizuki-1.mp3","audio_duration_ms":6920,"char_count":26,"char_timings":[{"char":"ミ","start_ms":25,"end_ms":220},{"char":"ズ","start_ms":220,"end_ms":416},{"char":"キ","start_ms":416,"end_ms":611},{"char":"は","start_ms":944,"end_ms":1132},{"char":"1","start_ms":1132,"end_ms":1320},{"char":"7","start_ms":1320,"end_ms":1508},{"char":"歳","start_ms":1508,"end_ms":1696},{"char":"の","start_ms":1696,"end_ms":1883},{"char":"舞","start_ms":1883,"end_ms":2071},{"char":"妓","start_ms":2071,"end_ms":2259},{"char":"で","start_ms":2259,"end_ms":2447},{"char":"す","start_ms":3318,"end_ms":3501},{"char":"毎","start_ms":3501,"end_ms":3684},{"char":"朝","start_ms":3684,"end_ms":3867},{"char":"部","start_ms":4222,"end_ms":4374},{"char":"屋","start_ms":4374,"end_ms":4527},{"char":"で","start_ms":4527,"end_ms":4679},{"char":"美","start_ms":4947,"end_ms":5123},{"char":"し","start_ms":5123,"end_ms":5299},{"char":"い","start_ms":5299,"end_ms":5475},{"char":"着","start_ms":5475,"end_ms":5651},{"char":"物","start_ms":5651,"end_ms":5828},{"char":"を","start_ms":5828,"end_ms":6004},{"char":"着","start_ms":6004,"end_ms":6180},{"char":"ま","start_ms":6180,"end_ms":6356},{"char":"す","start_ms":6356,"end_ms":6532}]},{"scene_idx":1,"is_quiz":false,"audio_src":"./assets/stories/mizuki-2.mp3","audio_duration_ms":5201,"char_count":21,"char_timings":[{"char":"赤","start_ms":25,"end_ms":216},{"char":"い","start_ms":216,"end_ms":406},{"char":"傘","start_ms":406,"end_ms":597},{"char":"を","start_ms":597,"end_ms":787},{"char":"持","start_ms":787,"end_ms":978},{"char":"っ","start_ms":1166,"end_ms":1246},{"char":"て","start_ms":1658,"end_ms":1835},{"char":"京","start_ms":1835,"end_ms":2011},{"char":"都","start_ms":2011,"end_ms":2188},{"char":"の","start_ms":2188,"end_ms":2364},{"char":"古","start_ms":2364,"end_ms":2541},{"char":"い","start_ms":2541,"end_ms":2717},{"char":"道","start_ms":2717,"end_ms":2894},{"char":"を","start_ms":3198,"end_ms":3399},{"char":"静","start_ms":3399,"end_ms":3599},{"char":"か","start_ms":3599,"end_ms":3800},{"char":"に","start_ms":3800,"end_ms":4000},{"char":"歩","start_ms":4000,"end_ms":4201},{"char":"き","start_ms":4201,"end_ms":4401},{"char":"ま","start_ms":4401,"end_ms":4602},{"char":"す","start_ms":4602,"end_ms":4802}]},{"scene_idx":2,"is_quiz":false,"audio_src":"./assets/stories/mizuki-3.mp3","audio_duration_ms":7384,"char_count":28,"char_timings":[{"char":"お","start_ms":25,"end_ms":202},{"char":"は","start_ms":202,"end_ms":379},{"char":"よ","start_ms":379,"end_ms":556},{"char":"う","start_ms":556,"end_ms":734},{"char":"ご","start_ms":734,"end_ms":911},{"char":"ざ","start_ms":911,"end_ms":1088},{"char":"い","start_ms":1088,"end_ms":1265},{"char":"ま","start_ms":1265,"end_ms":1442},{"char":"す","start_ms":1895,"end_ms":2089},{"char":"ミ","start_ms":2089,"end_ms":2283},{"char":"ズ","start_ms":2283,"end_ms":2478},{"char":"キ","start_ms":2478,"end_ms":2672},{"char":"さ","start_ms":2672,"end_ms":2866},{"char":"ん","start_ms":3484,"end_ms":3673},{"char":"今","start_ms":3673,"end_ms":3862},{"char":"日","start_ms":3862,"end_ms":4051},{"char":"も","start_ms":4051,"end_ms":4240},{"char":"元","start_ms":4240,"end_ms":4428},{"char":"気","start_ms":4428,"end_ms":4617},{"char":"で","start_ms":4617,"end_ms":4806},{"char":"す","start_ms":4806,"end_ms":4995},{"char":"ね","start_ms":4995,"end_ms":5184},{"char":"お","start_ms":5767,"end_ms":5966},{"char":"茶","start_ms":5966,"end_ms":6166},{"char":"を","start_ms":6166,"end_ms":6365},{"char":"ど","start_ms":6365,"end_ms":6564},{"char":"う","start_ms":6564,"end_ms":6764},{"char":"ぞ","start_ms":6764,"end_ms":6963}]},{"scene_idx":3,"is_quiz":false,"audio_src":"./assets/stories/mizuki-4.mp3","audio_duration_ms":6687,"char_count":23,"char_timings":[{"char":"夕","start_ms":25,"end_ms":222},{"char":"方","start_ms":222,"end_ms":419},{"char":"先","start_ms":419,"end_ms":616},{"char":"生","start_ms":897,"end_ms":1130},{"char":"と","start_ms":1130,"end_ms":1362},{"char":"一","start_ms":1362,"end_ms":1595},{"char":"緒","start_ms":1595,"end_ms":1827},{"char":"に","start_ms":1827,"end_ms":2060},{"char":"伝","start_ms":2060,"end_ms":2292},{"char":"統","start_ms":2788,"end_ms":3020},{"char":"的","start_ms":3020,"end_ms":3252},{"char":"な","start_ms":3252,"end_ms":3484},{"char":"踊","start_ms":3484,"end_ms":3716},{"char":"り","start_ms":3716,"end_ms":3948},{"char":"と","start_ms":4158,"end_ms":4399},{"char":"音","start_ms":4399,"end_ms":4639},{"char":"楽","start_ms":4639,"end_ms":4880},{"char":"を","start_ms":4880,"end_ms":5120},{"char":"練","start_ms":5120,"end_ms":5361},{"char":"習","start_ms":5361,"end_ms":5601},{"char":"し","start_ms":5601,"end_ms":5842},{"char":"ま","start_ms":5842,"end_ms":6082},{"char":"す","start_ms":6082,"end_ms":6323}]},{"scene_idx":4,"is_quiz":true,"audio_src":"./assets/stories/mizuki-5.mp3","audio_duration_ms":5851,"char_count":19,"char_timings":[{"char":"ミ","start_ms":25,"end_ms":259},{"char":"ズ","start_ms":259,"end_ms":492},{"char":"キ","start_ms":492,"end_ms":726},{"char":"さ","start_ms":1795,"end_ms":2013},{"char":"ん","start_ms":2013,"end_ms":2231},{"char":"は","start_ms":2231,"end_ms":2449},{"char":"夕","start_ms":2449,"end_ms":2667},{"char":"方","start_ms":2837,"end_ms":3038},{"char":"だ","start_ms":3038,"end_ms":3238},{"char":"れ","start_ms":3238,"end_ms":3439},{"char":"と","start_ms":3703,"end_ms":3894},{"char":"何","start_ms":3894,"end_ms":4085},{"char":"を","start_ms":4085,"end_ms":4276},{"char":"練","start_ms":4276,"end_ms":4467},{"char":"習","start_ms":4467,"end_ms":4659},{"char":"し","start_ms":4659,"end_ms":4850},{"char":"ま","start_ms":4850,"end_ms":5041},{"char":"す","start_ms":5041,"end_ms":5232},{"char":"か","start_ms":5232,"end_ms":5423}]}]},"asakusa-neko":{"title":"浅草の猫","scenes":[{"scene_idx":0,"is_quiz":false,"audio_src":"./assets/stories/asakusa-1.mp3","audio_duration_ms":9706,"char_count":35,"char_timings":[{"char":"ケ","start_ms":25,"end_ms":177},{"char":"ン","start_ms":177,"end_ms":329},{"char":"ジ","start_ms":329,"end_ms":480},{"char":"は","start_ms":480,"end_ms":632},{"char":"朝","start_ms":1319,"end_ms":1491},{"char":"早","start_ms":1491,"end_ms":1663},{"char":"く","start_ms":1663,"end_ms":1835},{"char":"有","start_ms":1835,"end_ms":2007},{"char":"名","start_ms":3059,"end_ms":3213},{"char":"な","start_ms":3213,"end_ms":3368},{"char":"浅","start_ms":3368,"end_ms":3522},{"char":"草","start_ms":3522,"end_ms":3677},{"char":"の","start_ms":3677,"end_ms":3831},{"char":"お","start_ms":3831,"end_ms":3985},{"char":"寺","start_ms":3985,"end_ms":4140},{"char":"に","start_ms":4140,"end_ms":4294},{"char":"来","start_ms":4967,"end_ms":5126},{"char":"ま","start_ms":5126,"end_ms":5285},{"char":"し","start_ms":5285,"end_ms":5444},{"char":"た","start_ms":5444,"end_ms":5603},{"char":"大","start_ms":5603,"end_ms":5762},{"char":"き","start_ms":5762,"end_ms":5921},{"char":"な","start_ms":7441,"end_ms":7590},{"char":"赤","start_ms":7590,"end_ms":7739},{"char":"い","start_ms":7739,"end_ms":7888},{"char":"ち","start_ms":7888,"end_ms":8036},{"char":"ょ","start_ms":8036,"end_ms":8185},{"char":"う","start_ms":8185,"end_ms":8334},{"char":"ち","start_ms":8334,"end_ms":8483},{"char":"ん","start_ms":8483,"end_ms":8632},{"char":"が","start_ms":8632,"end_ms":8781},{"char":"あ","start_ms":8781,"end_ms":8929},{"char":"り","start_ms":8929,"end_ms":9078},{"char":"ま","start_ms":9078,"end_ms":9227},{"char":"す","start_ms":9227,"end_ms":9376}]},{"scene_idx":1,"is_quiz":false,"audio_src":"./assets/stories/asakusa-2.mp3","audio_duration_ms":8684,"char_count":32,"char_timings":[{"char":"門","start_ms":25,"end_ms":183},{"char":"の","start_ms":183,"end_ms":341},{"char":"そ","start_ms":341,"end_ms":500},{"char":"ば","start_ms":500,"end_ms":658},{"char":"に","start_ms":658,"end_ms":816},{"char":"茶","start_ms":816,"end_ms":974},{"char":"色","start_ms":1749,"end_ms":1907},{"char":"の","start_ms":1907,"end_ms":2066},{"char":"猫","start_ms":2066,"end_ms":2224},{"char":"が","start_ms":2224,"end_ms":2382},{"char":"座","start_ms":2382,"end_ms":2541},{"char":"っ","start_ms":2541,"end_ms":2699},{"char":"て","start_ms":2699,"end_ms":2857},{"char":"い","start_ms":2857,"end_ms":3015},{"char":"ま","start_ms":3015,"end_ms":3174},{"char":"す","start_ms":3174,"end_ms":3332},{"char":"み","start_ms":4145,"end_ms":4291},{"char":"ん","start_ms":4291,"end_ms":4437},{"char":"な","start_ms":4437,"end_ms":4582},{"char":"は","start_ms":4582,"end_ms":4728},{"char":"そ","start_ms":5204,"end_ms":5377},{"char":"の","start_ms":5377,"end_ms":5549},{"char":"猫","start_ms":5549,"end_ms":5722},{"char":"を","start_ms":5722,"end_ms":5894},{"char":"ミ","start_ms":5894,"end_ms":6067},{"char":"カ","start_ms":7116,"end_ms":7292},{"char":"ン","start_ms":7292,"end_ms":7469},{"char":"と","start_ms":7469,"end_ms":7645},{"char":"呼","start_ms":7645,"end_ms":7821},{"char":"び","start_ms":7821,"end_ms":7997},{"char":"ま","start_ms":7997,"end_ms":8174},{"char":"す","start_ms":8174,"end_ms":8350}]},{"scene_idx":2,"is_quiz":false,"audio_src":"./assets/stories/asakusa-3.mp3","audio_duration_ms":8684,"char_count":34,"char_timings":[{"char":"ケ","start_ms":25,"end_ms":168},{"char":"ン","start_ms":168,"end_ms":311},{"char":"ジ","start_ms":311,"end_ms":453},{"char":"は","start_ms":453,"end_ms":596},{"char":"手","start_ms":596,"end_ms":739},{"char":"を","start_ms":1479,"end_ms":1629},{"char":"洗","start_ms":1629,"end_ms":1779},{"char":"っ","start_ms":1779,"end_ms":1929},{"char":"て","start_ms":1929,"end_ms":2080},{"char":"か","start_ms":2080,"end_ms":2230},{"char":"ら","start_ms":2230,"end_ms":2380},{"char":"お","start_ms":2380,"end_ms":2530},{"char":"祈","start_ms":3290,"end_ms":3440},{"char":"り","start_ms":3440,"end_ms":3591},{"char":"を","start_ms":3591,"end_ms":3741},{"char":"し","start_ms":3741,"end_ms":3891},{"char":"ま","start_ms":3891,"end_ms":4041},{"char":"し","start_ms":4041,"end_ms":4192},{"char":"た","start_ms":4192,"end_ms":4342},{"char":"お","start_ms":5327,"end_ms":5470},{"char":"み","start_ms":5470,"end_ms":5613},{"char":"く","start_ms":5613,"end_ms":5756},{"char":"じ","start_ms":5756,"end_ms":5900},{"char":"を","start_ms":5900,"end_ms":6043},{"char":"引","start_ms":6043,"end_ms":6186},{"char":"く","start_ms":6186,"end_ms":6329},{"char":"と","start_ms":7090,"end_ms":7238},{"char":"大","start_ms":7238,"end_ms":7386},{"char":"吉","start_ms":7386,"end_ms":7533},{"char":"が","start_ms":7533,"end_ms":7681},{"char":"出","start_ms":7681,"end_ms":7829},{"char":"ま","start_ms":7829,"end_ms":7977},{"char":"し","start_ms":7977,"end_ms":8124},{"char":"た","start_ms":8124,"end_ms":8272}]},{"scene_idx":3,"is_quiz":false,"audio_src":"./assets/stories/asakusa-4.mp3","audio_duration_ms":7384,"char_count":35,"char_timings":[{"char":"お","start_ms":25,"end_ms":161},{"char":"寺","start_ms":161,"end_ms":297},{"char":"の","start_ms":297,"end_ms":433},{"char":"前","start_ms":433,"end_ms":569},{"char":"の","start_ms":569,"end_ms":704},{"char":"店","start_ms":704,"end_ms":840},{"char":"で","start_ms":840,"end_ms":976},{"char":"温","start_ms":976,"end_ms":1112},{"char":"か","start_ms":1112,"end_ms":1248},{"char":"い","start_ms":1987,"end_ms":2113},{"char":"せ","start_ms":2113,"end_ms":2238},{"char":"ん","start_ms":2238,"end_ms":2364},{"char":"べ","start_ms":2364,"end_ms":2490},{"char":"い","start_ms":2490,"end_ms":2615},{"char":"を","start_ms":2615,"end_ms":2741},{"char":"買","start_ms":2741,"end_ms":2867},{"char":"い","start_ms":2867,"end_ms":2992},{"char":"ま","start_ms":2992,"end_ms":3118},{"char":"し","start_ms":3118,"end_ms":3244},{"char":"た","start_ms":3244,"end_ms":3369},{"char":"ミ","start_ms":3369,"end_ms":3495},{"char":"カ","start_ms":4270,"end_ms":4399},{"char":"ン","start_ms":4399,"end_ms":4528},{"char":"に","start_ms":4528,"end_ms":4656},{"char":"も","start_ms":4656,"end_ms":4785},{"char":"少","start_ms":5684,"end_ms":5817},{"char":"し","start_ms":5817,"end_ms":5949},{"char":"見","start_ms":5949,"end_ms":6082},{"char":"せ","start_ms":6082,"end_ms":6215},{"char":"て","start_ms":6215,"end_ms":6348},{"char":"あ","start_ms":6348,"end_ms":6480},{"char":"げ","start_ms":6480,"end_ms":6613},{"char":"ま","start_ms":6613,"end_ms":6746},{"char":"し","start_ms":6746,"end_ms":6878},{"char":"た","start_ms":6878,"end_ms":7011}]},{"scene_idx":4,"is_quiz":true,"audio_src":"./assets/stories/asakusa-5.mp3","audio_duration_ms":4876,"char_count":19,"char_timings":[{"char":"お","start_ms":25,"end_ms":215},{"char":"寺","start_ms":215,"end_ms":404},{"char":"の","start_ms":404,"end_ms":594},{"char":"門","start_ms":594,"end_ms":783},{"char":"の","start_ms":1351,"end_ms":1540},{"char":"そ","start_ms":1540,"end_ms":1730},{"char":"ば","start_ms":1730,"end_ms":1919},{"char":"に","start_ms":1919,"end_ms":2109},{"char":"い","start_ms":2109,"end_ms":2298},{"char":"る","start_ms":2298,"end_ms":2488},{"char":"猫","start_ms":2488,"end_ms":2677},{"char":"の","start_ms":2677,"end_ms":2866},{"char":"名","start_ms":2866,"end_ms":3056},{"char":"前","start_ms":3056,"end_ms":3245},{"char":"は","start_ms":3245,"end_ms":3435},{"char":"何","start_ms":3435,"end_ms":3624},{"char":"で","start_ms":3914,"end_ms":4105},{"char":"す","start_ms":4105,"end_ms":4296},{"char":"か","start_ms":4296,"end_ms":4487}]}]},"shinkansen-trip":{"title":"はじめての新幹線","scenes":[{"scene_idx":0,"is_quiz":false,"audio_src":"./assets/stories/shinkansen-1.mp3","audio_duration_ms":9149,"char_count":33,"char_timings":[{"char":"タ","start_ms":25,"end_ms":214},{"char":"ロ","start_ms":214,"end_ms":404},{"char":"ウ","start_ms":404,"end_ms":593},{"char":"は","start_ms":1409,"end_ms":1596},{"char":"朝","start_ms":1596,"end_ms":1782},{"char":"7","start_ms":1782,"end_ms":1969},{"char":"時","start_ms":1969,"end_ms":2155},{"char":"に","start_ms":2155,"end_ms":2342},{"char":"東","start_ms":2889,"end_ms":3056},{"char":"京","start_ms":3056,"end_ms":3223},{"char":"駅","start_ms":3223,"end_ms":3390},{"char":"に","start_ms":3390,"end_ms":3557},{"char":"着","start_ms":3557,"end_ms":3724},{"char":"き","start_ms":3724,"end_ms":3891},{"char":"ま","start_ms":3891,"end_ms":4058},{"char":"し","start_ms":4058,"end_ms":4225},{"char":"た","start_ms":4225,"end_ms":4392},{"char":"ホ","start_ms":5300,"end_ms":5472},{"char":"ー","start_ms":5472,"end_ms":5644},{"char":"ム","start_ms":5644,"end_ms":5815},{"char":"に","start_ms":5815,"end_ms":5987},{"char":"白","start_ms":6867,"end_ms":7033},{"char":"い","start_ms":7033,"end_ms":7199},{"char":"新","start_ms":7199,"end_ms":7365},{"char":"幹","start_ms":7365,"end_ms":7531},{"char":"線","start_ms":7531,"end_ms":7697},{"char":"が","start_ms":7697,"end_ms":7863},{"char":"待","start_ms":7863,"end_ms":8028},{"char":"っ","start_ms":8028,"end_ms":8194},{"char":"て","start_ms":8194,"end_ms":8360},{"char":"い","start_ms":8360,"end_ms":8526},{"char":"ま","start_ms":8526,"end_ms":8692},{"char":"す","start_ms":8692,"end_ms":8858}]},{"scene_idx":1,"is_quiz":false,"audio_src":"./assets/stories/shinkansen-2.mp3","audio_duration_ms":8545,"char_count":38,"char_timings":[{"char":"こ","start_ms":25,"end_ms":181},{"char":"の","start_ms":181,"end_ms":338},{"char":"新","start_ms":338,"end_ms":494},{"char":"幹","start_ms":494,"end_ms":651},{"char":"線","start_ms":651,"end_ms":807},{"char":"は","start_ms":807,"end_ms":963},{"char":"最","start_ms":963,"end_ms":1120},{"char":"新","start_ms":1120,"end_ms":1276},{"char":"の","start_ms":1696,"end_ms":1857},{"char":"自","start_ms":1857,"end_ms":2019},{"char":"動","start_ms":2019,"end_ms":2180},{"char":"運","start_ms":2180,"end_ms":2341},{"char":"転","start_ms":2556,"end_ms":2712},{"char":"シ","start_ms":2712,"end_ms":2867},{"char":"ス","start_ms":2867,"end_ms":3023},{"char":"テ","start_ms":3023,"end_ms":3179},{"char":"ム","start_ms":3179,"end_ms":3334},{"char":"で","start_ms":3334,"end_ms":3490},{"char":"安","start_ms":3490,"end_ms":3646},{"char":"全","start_ms":3646,"end_ms":3801},{"char":"に","start_ms":3801,"end_ms":3957},{"char":"走","start_ms":4477,"end_ms":4642},{"char":"り","start_ms":4642,"end_ms":4806},{"char":"ま","start_ms":4806,"end_ms":4971},{"char":"す","start_ms":4971,"end_ms":5135},{"char":"ご","start_ms":5135,"end_ms":5300},{"char":"ゆ","start_ms":5300,"end_ms":5464},{"char":"っ","start_ms":6431,"end_ms":6586},{"char":"く","start_ms":6586,"end_ms":6742},{"char":"り","start_ms":6742,"end_ms":6897},{"char":"お","start_ms":6897,"end_ms":7052},{"char":"過","start_ms":7279,"end_ms":7404},{"char":"ご","start_ms":7404,"end_ms":7529},{"char":"し","start_ms":7529,"end_ms":7654},{"char":"く","start_ms":7654,"end_ms":7778},{"char":"だ","start_ms":7778,"end_ms":7903},{"char":"さ","start_ms":7903,"end_ms":8028},{"char":"い","start_ms":8028,"end_ms":8153}]},{"scene_idx":2,"is_quiz":false,"audio_src":"./assets/stories/shinkansen-3.mp3","audio_duration_ms":9892,"char_count":39,"char_timings":[{"char":"電","start_ms":25,"end_ms":176},{"char":"車","start_ms":176,"end_ms":327},{"char":"が","start_ms":327,"end_ms":479},{"char":"ス","start_ms":479,"end_ms":630},{"char":"ピ","start_ms":630,"end_ms":781},{"char":"ー","start_ms":781,"end_ms":932},{"char":"ド","start_ms":932,"end_ms":1083},{"char":"を","start_ms":1083,"end_ms":1234},{"char":"上","start_ms":1234,"end_ms":1386},{"char":"げ","start_ms":1386,"end_ms":1537},{"char":"ま","start_ms":1537,"end_ms":1688},{"char":"す","start_ms":3157,"end_ms":3307},{"char":"窓","start_ms":3307,"end_ms":3458},{"char":"の","start_ms":3458,"end_ms":3608},{"char":"外","start_ms":3608,"end_ms":3758},{"char":"を","start_ms":3758,"end_ms":3909},{"char":"見","start_ms":3909,"end_ms":4059},{"char":"る","start_ms":4059,"end_ms":4209},{"char":"と","start_ms":4209,"end_ms":4360},{"char":"青","start_ms":4360,"end_ms":4510},{"char":"い","start_ms":5543,"end_ms":5697},{"char":"空","start_ms":5697,"end_ms":5852},{"char":"の","start_ms":5852,"end_ms":6006},{"char":"下","start_ms":6006,"end_ms":6160},{"char":"に","start_ms":6160,"end_ms":6314},{"char":"富","start_ms":6314,"end_ms":6469},{"char":"士","start_ms":6469,"end_ms":6623},{"char":"山","start_ms":6623,"end_ms":6777},{"char":"が","start_ms":7711,"end_ms":7869},{"char":"は","start_ms":7869,"end_ms":8028},{"char":"っ","start_ms":8028,"end_ms":8186},{"char":"き","start_ms":8186,"end_ms":8344},{"char":"り","start_ms":8344,"end_ms":8503},{"char":"と","start_ms":8503,"end_ms":8661},{"char":"見","start_ms":8661,"end_ms":8820},{"char":"え","start_ms":8820,"end_ms":8978},{"char":"ま","start_ms":8978,"end_ms":9136},{"char":"し","start_ms":9136,"end_ms":9295},{"char":"た","start_ms":9295,"end_ms":9453}]},{"scene_idx":3,"is_quiz":false,"audio_src":"./assets/stories/shinkansen-4.mp3","audio_duration_ms":8731,"char_count":31,"char_timings":[{"char":"た","start_ms":25,"end_ms":204},{"char":"っ","start_ms":204,"end_ms":382},{"char":"た","start_ms":382,"end_ms":561},{"char":"の","start_ms":561,"end_ms":740},{"char":"2","start_ms":740,"end_ms":918},{"char":"時","start_ms":918,"end_ms":1097},{"char":"間","start_ms":1097,"end_ms":1275},{"char":"半","start_ms":1275,"end_ms":1454},{"char":"で","start_ms":2352,"end_ms":2519},{"char":"新","start_ms":2519,"end_ms":2686},{"char":"大","start_ms":2686,"end_ms":2853},{"char":"阪","start_ms":2853,"end_ms":3019},{"char":"駅","start_ms":3019,"end_ms":3186},{"char":"に","start_ms":3186,"end_ms":3353},{"char":"到","start_ms":3353,"end_ms":3520},{"char":"着","start_ms":3520,"end_ms":3687},{"char":"し","start_ms":3687,"end_ms":3854},{"char":"ま","start_ms":3854,"end_ms":4020},{"char":"し","start_ms":4020,"end_ms":4187},{"char":"た","start_ms":4187,"end_ms":4354},{"char":"と","start_ms":5535,"end_ms":5696},{"char":"て","start_ms":5696,"end_ms":5856},{"char":"も","start_ms":5856,"end_ms":6017},{"char":"速","start_ms":6017,"end_ms":6177},{"char":"く","start_ms":6177,"end_ms":6338},{"char":"て","start_ms":6338,"end_ms":6498},{"char":"快","start_ms":7491,"end_ms":7659},{"char":"適","start_ms":7659,"end_ms":7827},{"char":"で","start_ms":7827,"end_ms":7996},{"char":"し","start_ms":7996,"end_ms":8164},{"char":"た","start_ms":8164,"end_ms":8332}]},{"scene_idx":4,"is_quiz":true,"audio_src":"./assets/stories/shinkansen-5.mp3","audio_duration_ms":4830,"char_count":19,"char_timings":[{"char":"タ","start_ms":25,"end_ms":189},{"char":"ロ","start_ms":189,"end_ms":353},{"char":"ウ","start_ms":353,"end_ms":516},{"char":"さ","start_ms":516,"end_ms":680},{"char":"ん","start_ms":1391,"end_ms":1555},{"char":"は","start_ms":1555,"end_ms":1718},{"char":"電","start_ms":1718,"end_ms":1882},{"char":"車","start_ms":1882,"end_ms":2045},{"char":"の","start_ms":2356,"end_ms":2543},{"char":"窓","start_ms":2543,"end_ms":2729},{"char":"か","start_ms":2729,"end_ms":2916},{"char":"ら","start_ms":2916,"end_ms":3103},{"char":"何","start_ms":3103,"end_ms":3290},{"char":"を","start_ms":3290,"end_ms":3476},{"char":"見","start_ms":3476,"end_ms":3663},{"char":"ま","start_ms":3663,"end_ms":3850},{"char":"し","start_ms":3850,"end_ms":4037},{"char":"た","start_ms":4037,"end_ms":4223},{"char":"か","start_ms":4223,"end_ms":4410}]}]}}};

  var STORY_COPY_ID = {
    'story.btn_next': 'Lanjut ke Adegan Berikutnya →',
    'story.btn_prev': '← Sebelumnya',
    'story.btn_quiz': 'Mulai Kuis Akhir →',
    'story.btn_library': 'Kembali ke Perpustakaan ✓',
    'story.btn_reread': '↺ Baca Ulang',
    'story.hint_tap': '👆 Ketuk kanji bergaris untuk melihat arti',
    'story.btn_start': 'Mulai Membaca →',
    'story.mizuki_title': '舞妓の一日',
    'story.mizuki_subtitle': 'Keseharian Mizuki di Kyoto',
    'story.asakusa_title': '浅草の猫',
    'story.asakusa_subtitle': 'Kucing Penjaga Kuil Asakusa',
    'story.shinkansen_title': 'はじめての新幹線',
    'story.shinkansen_subtitle': 'Perjalanan Shinkansen Pertama',
    'story.quiz_speaker_name': 'Instruktur Ujian',
    'story.quiz_audio_role': 'Audio Pertanyaan Soal (Bahasa Jepang)',
    'story.autoplay_label': 'Putar Otomatis'
  };

  var STORY_COPY_TH = {
    'story.btn_next': 'ไปยังฉากถัดไป →',
    'story.btn_prev': '← ก่อนหน้า',
    'story.btn_quiz': 'เริ่มทำแบบทดสอบ →',
    'story.btn_library': 'กลับสู่ห้องสมุด ✓',
    'story.btn_reread': '↺ อ่านซ้ำ',
    'story.hint_tap': '👆 แตะคันจิที่มีเส้นใต้เพื่อดูความหมาย',
    'story.btn_start': 'เริ่มอ่าน →',
    'story.mizuki_title': '舞妓の一日',
    'story.mizuki_subtitle': 'หนึ่งวันของไมโกะ มิซึกิ',
    'story.asakusa_title': '浅草の猫',
    'story.asakusa_subtitle': 'แมวผู้พิทักษ์วัดอาซากุสะ',
    'story.shinkansen_title': 'はじめての新幹線',
    'story.shinkansen_subtitle': 'การเดินทางด้วยชินคันเซ็นครั้งแรก',
    'story.quiz_speaker_name': 'ผู้คุมสอบ',
    'story.quiz_audio_role': 'เสียงคำถามแบบทดสอบ (ภาษาญี่ปุ่น)',
    'story.autoplay_label': 'เล่นอัตโนมัติ'
  };

  var STORY_COPY_EN = {
    'story.btn_next': 'Next Scene →',
    'story.btn_prev': '← Previous',
    'story.btn_quiz': 'Start Final Quiz →',
    'story.btn_library': 'Back to Library ✓',
    'story.btn_reread': '↺ Re-read',
    'story.hint_tap': '👆 Tap underlined kanji to view meaning',
    'story.btn_start': 'Start Reading →',
    'story.mizuki_title': 'A Day in the Life of a Maiko',
    'story.mizuki_subtitle': 'A Day in the Life of Maiko Mizuki',
    'story.asakusa_title': 'The Cat of Asakusa',
    'story.asakusa_subtitle': 'The Guardian Cat of Asakusa Temple',
    'story.shinkansen_title': 'First Time on the Shinkansen',
    'story.shinkansen_subtitle': 'First Time on the Shinkansen',
    'story.quiz_speaker_name': 'Exam Instructor',
    'story.quiz_audio_role': 'Quiz Question Audio (Japanese)',
    'story.autoplay_label': 'Auto-play'
  };

  try {
    var rootObj = typeof globalThis !== 'undefined' ? globalThis : {};
    if (rootObj.FiezelI18n) {
      if (typeof rootObj.FiezelI18n.overrideCopy === 'function') {
        rootObj.FiezelI18n.overrideCopy('id', STORY_COPY_ID);
        rootObj.FiezelI18n.overrideCopy('th', STORY_COPY_TH);
      } else if (typeof rootObj.FiezelI18n.registerCopy === 'function') {
        rootObj.FiezelI18n.registerCopy('id', STORY_COPY_ID);
        rootObj.FiezelI18n.registerCopy('th', STORY_COPY_TH);
      }
    }
  } catch (_) {}

  function t(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this)).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) { return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m; });
    return s;
  }

  function getStorySubtitle(story) {
    if (!story) return '';
    var rootObj = typeof globalThis !== 'undefined' ? globalThis : {};
    var loc = 'id';
    try {
      if (rootObj.FiezelI18n && typeof rootObj.FiezelI18n.getLocale === 'function') {
        loc = rootObj.FiezelI18n.getLocale() || 'id';
      }
    } catch (_) {}

    if (loc === 'en') {
      if (story.subtitles && story.subtitles.en) return story.subtitles.en;
      if (story.subtitleKey && STORY_COPY_EN && STORY_COPY_EN[story.subtitleKey]) {
        return STORY_COPY_EN[story.subtitleKey];
      }
    }

    if (story.subtitleKey) {
      try {
        if (rootObj.FiezelI18n && typeof rootObj.FiezelI18n.t === 'function') {
          var val = rootObj.FiezelI18n.t(story.subtitleKey);
          if (val && val !== story.subtitleKey) return val;
        }
      } catch (_) {}
    }

    if (story.subtitles && story.subtitles[loc]) {
      return story.subtitles[loc];
    }

    return story.subtitle || (story.subtitles && story.subtitles.id) || '';
  }

  // Visual Scene Vector Generators (Studio Ghibli & Kyoto Travertine Palette)
  function makeSceneSvg(type, title) {
    var svg = '';
    if (type === 'mizuki-1') {
      // Kamar Ganti Kimono
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FDFAF3"/><stop offset="100%" stop-color="#F3EAD8"/></linearGradient>' +
          '<linearGradient id="gKimono" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E11D48"/><stop offset="50%" stop-color="#BE123C"/><stop offset="100%" stop-color="#FB7185"/></linearGradient>' +
          '<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#FDE68A"/></linearGradient>' +
        '</defs>' +
        '<rect width="800" height="450" fill="url(#gRoom)"/>' +
        '<!-- Shoji Screen Lattice -->' +
        '<rect x="40" y="30" width="280" height="320" fill="#FFFDF8" stroke="#D5C5A8" stroke-width="6" rx="4"/>' +
        '<line x1="180" y1="30" x2="180" y2="350" stroke="#E2D4BD" stroke-width="3"/>' +
        '<line x1="40" y1="110" x2="320" y2="110" stroke="#E2D4BD" stroke-width="3"/>' +
        '<line x1="40" y1="190" x2="320" y2="190" stroke="#E2D4BD" stroke-width="3"/>' +
        '<line x1="40" y1="270" x2="320" y2="270" stroke="#E2D4BD" stroke-width="3"/>' +
        '<!-- Tatami Floor -->' +
        '<rect x="0" y="350" width="800" height="100" fill="#E2DCBF"/>' +
        '<line x1="0" y1="350" x2="800" y2="350" stroke="#4D7C0F" stroke-width="8"/>' +
        '<line x1="400" y1="350" x2="400" y2="450" stroke="#4D7C0F" stroke-width="6"/>' +
        '<!-- Kimono Stand & Kimono -->' +
        '<rect x="460" y="70" width="220" height="12" fill="#78350F" rx="3"/>' +
        '<rect x="480" y="82" width="14" height="270" fill="#78350F"/>' +
        '<rect x="646" y="82" width="14" height="270" fill="#78350F"/>' +
        '<path d="M 470 90 L 520 90 L 570 120 L 620 90 L 670 90 L 690 220 L 650 225 L 640 160 L 640 330 L 500 330 L 500 160 L 490 225 L 450 220 Z" fill="url(#gKimono)" filter="drop-shadow(0 6px 12px rgba(190,18,60,0.25))"/>' +
        '<rect x="525" y="170" width="90" height="42" fill="url(#gGold)" rx="2"/>' +
        '<!-- Cherry Blossom Branch Decoration -->' +
        '<path d="M 40 40 Q 140 100 240 60" stroke="#854D0E" stroke-width="4" fill="none"/>' +
        '<circle cx="120" cy="85" r="9" fill="#FDA4AF"/><circle cx="170" cy="80" r="10" fill="#FDA4AF"/><circle cx="220" cy="65" r="8" fill="#F43F5E"/>' +
      '</svg>';
    } else if (type === 'mizuki-2') {
      // Lorong Gion Kyoto
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gSky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C7D2FE"/><stop offset="100%" stop-color="#E0E7FF"/></linearGradient>' +
          '<linearGradient id="gPath" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#94A3B8"/><stop offset="100%" stop-color="#475569"/></linearGradient>' +
        '</defs>' +
        '<rect width="800" height="450" fill="url(#gSky2)"/>' +
        '<!-- Five-Story Pagoda Silhouette in Distance -->' +
        '<path d="M 390 120 L 400 60 L 410 120 Z M 375 140 L 425 140 L 415 160 L 385 160 Z M 365 180 L 435 180 L 425 210 L 375 210 Z M 355 230 L 445 230 L 430 270 L 370 270 Z M 370 270 L 430 270 L 430 330 L 370 330 Z" fill="#64748B" opacity="0.45"/>' +
        '<!-- Gion Wooden Machiya Houses Left & Right -->' +
        '<path d="M 0 160 L 260 250 L 260 450 L 0 450 Z" fill="#2E1C14"/>' +
        '<path d="M 800 160 L 540 250 L 540 450 L 800 450 Z" fill="#2E1C14"/>' +
        '<!-- Machiya Overhanging Eaves -->' +
        '<polygon points="0,150 280,245 260,255 0,165" fill="#1C100B"/>' +
        '<polygon points="800,150 520,245 540,255 800,165" fill="#1C100B"/>' +
        '<!-- Red Paper Lanterns -->' +
        '<ellipse cx="230" cy="280" rx="14" ry="20" fill="#E11D48"/><circle cx="230" cy="280" r="6" fill="#FDE047" opacity="0.8"/>' +
        '<ellipse cx="570" cy="280" rx="14" ry="20" fill="#E11D48"/><circle cx="570" cy="280" r="6" fill="#FDE047" opacity="0.8"/>' +
        '<!-- Stone Cobblestone Pavement -->' +
        '<polygon points="260,250 540,250 720,450 80,450" fill="url(#gPath)"/>' +
        '<line x1="400" y1="250" x2="400" y2="450" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="8 6"/>' +
      '</svg>';
    } else if (type === 'mizuki-3') {
      // Kedai Teh Ochaya
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="800" height="450" fill="#FDFBF7"/>' +
        '<rect x="0" y="0" width="800" height="120" fill="#3E2723"/>' +
        '<!-- Indigo Noren Curtain -->' +
        '<path d="M 80 120 L 280 120 L 280 270 L 80 270 Z M 300 120 L 500 120 L 500 270 L 300 270 Z M 520 120 L 720 120 L 720 270 L 520 270 Z" fill="#1E3A8A"/>' +
        '<circle cx="180" cy="190" r="26" fill="#FFFDF7" opacity="0.9"/><circle cx="400" cy="190" r="26" fill="#FFFDF7" opacity="0.9"/><circle cx="620" cy="190" r="26" fill="#FFFDF7" opacity="0.9"/>' +
        '<!-- Wooden Counter -->' +
        '<rect x="0" y="320" width="800" height="130" fill="#795548"/>' +
        '<rect x="0" y="320" width="800" height="18" fill="#5D4037"/>' +
        '<!-- Steaming Matcha Bowl & Chasen -->' +
        '<ellipse cx="400" cy="355" rx="38" ry="16" fill="#15803D" stroke="#2E7D32" stroke-width="3"/>' +
        '<path d="M 362 355 C 362 390 438 390 438 355 Z" fill="#15803D"/>' +
        '<path d="M 395 315 Q 390 300 398 285 M 405 315 Q 412 300 406 285" stroke="#94A3B8" stroke-width="2.5" fill="none" opacity="0.6"/>' +
      '</svg>';
    } else if (type === 'mizuki-4') {
      // Panggung Latihan Tari
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="800" height="450" fill="#FDF6E2"/>' +
        '<!-- Gold Screen with Ancient Pine Tree Backdrop -->' +
        '<rect x="60" y="40" width="680" height="260" fill="#FEF3C7" stroke="#D97706" stroke-width="8" rx="6"/>' +
        '<path d="M 360 280 C 370 200 440 180 470 120 C 490 80 540 90 560 110" stroke="#78350F" stroke-width="16" fill="none" stroke-linecap="round"/>' +
        '<circle cx="380" cy="150" r="45" fill="#15803D"/><circle cx="480" cy="110" r="50" fill="#166534"/><circle cx="580" cy="130" r="40" fill="#15803D"/>' +
        '<!-- Polished Cypress Stage Floor -->' +
        '<rect x="0" y="300" width="800" height="150" fill="#D97706"/>' +
        '<line x1="0" y1="300" x2="800" y2="300" stroke="#92400E" stroke-width="8"/>' +
        '<line x1="160" y1="300" x2="160" y2="450" stroke="#B45309" stroke-width="3"/>' +
        '<line x1="320" y1="300" x2="320" y2="450" stroke="#B45309" stroke-width="3"/>' +
        '<line x1="480" y1="300" x2="480" y2="450" stroke="#B45309" stroke-width="3"/>' +
        '<line x1="640" y1="300" x2="640" y2="450" stroke="#B45309" stroke-width="3"/>' +
        '<!-- Traditional Folding Fan (Sensu) on Stage -->' +
        '<path d="M 220 370 Q 270 330 330 350 Z" fill="#DC2626"/>' +
        '<line x1="220" y1="370" x2="275" y2="340" stroke="#FBBF24" stroke-width="2"/>' +
      '</svg>';
    } else if (type === 'mizuki-5') {
      // Refleksi Sore Yasaka Pagoda
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gTwilight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E1B4B"/><stop offset="50%" stop-color="#6B21A8"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient>' +
        '</defs>' +
        '<rect width="800" height="450" fill="url(#gTwilight)"/>' +
        '<!-- Crescent Moon -->' +
        '<path d="M 640 70 A 24 24 0 1 0 664 94 A 20 20 0 1 1 640 70 Z" fill="#FEF08A"/>' +
        '<!-- Yasaka Pagoda Sunset Silhouette -->' +
        '<path d="M 390 140 L 400 70 L 410 140 Z M 370 165 L 430 165 L 420 190 L 380 190 Z M 350 215 L 450 215 L 435 245 L 365 245 Z M 335 270 L 465 270 L 445 315 L 355 315 Z M 350 315 L 450 315 L 450 420 L 350 420 Z" fill="#0F172A"/>' +
        '<circle cx="400" cy="285" r="7" fill="#FDE047" opacity="0.9"/>' +
        '<!-- Kyoto Mountain Horizon Line -->' +
        '<path d="M 0 380 Q 200 350 400 370 Q 600 350 800 380 L 800 450 L 0 450 Z" fill="#090D16"/>' +
      '</svg>';
    } else if (type === 'asakusa') {
      // Kuil Asakusa & Kucing
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gSkyAsa" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient>' +
        '</defs>' +
        '<rect width="800" height="450" fill="url(#gSkyAsa)"/>' +
        '<!-- Giant Red Kaminarimon Lantern -->' +
        '<rect x="250" y="20" width="300" height="40" fill="#991B1B" rx="4"/>' +
        '<ellipse cx="400" cy="180" rx="90" ry="120" fill="#DC2626"/>' +
        '<rect x="360" y="60" width="80" height="15" fill="#1E293B"/>' +
        '<rect x="370" y="295" width="60" height="15" fill="#1E293B"/>' +
        '<text x="400" y="205" font-size="70" font-family="serif" font-weight="900" fill="#0F172A" text-anchor="middle">雷門</text>' +
        '<!-- Stone Pedestal & Cat Mikan -->' +
        '<rect x="0" y="340" width="800" height="110" fill="#94A3B8"/>' +
        '<rect x="80" y="270" width="130" height="70" fill="#64748B" rx="4"/>' +
        '<!-- Cute Cat Silhouette sitting -->' +
        '<ellipse cx="145" cy="245" rx="22" ry="26" fill="#D97706"/>' +
        '<circle cx="145" cy="210" r="18" fill="#F59E0B"/>' +
        '<polygon points="132,198 136,182 144,195" fill="#D97706"/>' +
        '<polygon points="146,195 154,182 158,198" fill="#D97706"/>' +
        '<ellipse cx="145" cy="225" rx="14" ry="4" fill="#DC2626"/>' +
      '</svg>';
    } else if (type === 'shinkansen') {
      // Shinkansen & Gunung Fuji
      svg = '<svg viewBox="0 0 800 450" class="fz-scene-art-svg" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gSkyFuji" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38BDF8"/><stop offset="70%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#F0F9FF"/></linearGradient>' +
        '</defs>' +
        '<rect width="800" height="450" fill="url(#gSkyFuji)"/>' +
        '<!-- Mount Fuji Volcano Peak -->' +
        '<polygon points="400,100 240,320 560,320" fill="#1E40AF"/>' +
        '<polygon points="400,100 345,175 365,190 395,170 415,195 435,175 455,185" fill="#FFFFFF"/>' +
        '<!-- Green Tea Fields & Railway Embankment -->' +
        '<rect x="0" y="300" width="800" height="150" fill="#15803D"/>' +
        '<rect x="0" y="350" width="800" height="35" fill="#475569"/>' +
        '<line x1="0" y1="365" x2="800" y2="365" stroke="#CBD5E1" stroke-width="4"/>' +
        '<!-- Shinkansen N700S High-Speed Train -->' +
        '<path d="M 120 345 C 240 345 350 338 580 338 L 740 338 Q 780 340 800 358 L 800 375 L 120 375 Z" fill="#FFFFFF" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))"/>' +
        '<line x1="280" y1="360" x2="800" y2="360" stroke="#1D4ED8" stroke-width="5"/>' +
        '<rect x="360" y="344" width="45" height="10" rx="2" fill="#0F172A"/>' +
        '<rect x="420" y="344" width="45" height="10" rx="2" fill="#0F172A"/>' +
        '<rect x="480" y="344" width="45" height="10" rx="2" fill="#0F172A"/>' +
        '<rect x="540" y="344" width="45" height="10" rx="2" fill="#0F172A"/>' +
      '</svg>';
    }
    return svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  }

  var STORIES = [
    {
      id: 'mizuki-maiko',
      title: '舞妓の一日',
      titleJpMarkup: '<ruby>舞妓<rt>まいこ</rt></ruby>の<ruby>一日<rt>いちにち</rt></ruby>',
      titleJp: '舞妓の一日',
      subtitleKey: 'story.mizuki_subtitle',
      subtitle: 'Keseharian Mizuki di Kyoto',
      subtitles: {
        id: 'Keseharian Mizuki di Kyoto',
        th: 'หนึ่งวันของไมโกะ มิซึกิ',
        en: 'A Day in the Life of Maiko Mizuki'
      },
      level: 'N5',
      category: 'Budaya & Tradisi',
      coverSvg: makeSceneSvg('mizuki-2', 'Mizuki Cover'),
      description: 'Menelusuri keseharian Mizuki, calon geisha 17 tahun di Kyoto, dari merias kimono sutra hingga latihan menari dan shamisen di Ochaya.',
      scenes: [
        {
          index: 0,
          title: 'Pagi di Kamar Ganti Kimono',
          tag: 'Adegan 1 dari 5 · Kamar Rias Tradisional',
          svgArt: makeSceneSvg('mizuki-1', 'Kamar Kimono'),
          speaker: 'Mizuki',
          role: 'Calon Geisha / Maiko (17 Tahun)',
          avatar: '👘',
          jp: 'ミズキは17<ruby>歳<rt>さい</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'舞妓\',\'まいこ\',\'calon geisha / maiko\')">舞妓<rt>まいこ</rt></ruby>です。<ruby>毎朝<rt>まいあさ</rt></ruby>、<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'部屋\',\'へや\',\'kamar / ruangan\')">部屋<rt>へや</rt></ruby>で<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'美しい\',\'うつくしい\',\'indah / cantik\')">美しい<rt>うつくしい</rt></ruby><ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'着物\',\'きもの\',\'pakaian kimono tradisional\')">着物<rt>きもの</rt></ruby>を<ruby>着<rt>き</rt></ruby>ます。',
          id: 'Mizuki adalah seorang maiko berusia 17 tahun. Setiap pagi di kamarnya, dia mengenakan pakaian kimono yang indah.'
        },
        {
          index: 1,
          title: 'Melangkah di Jalanan Batu Gion',
          tag: 'Adegan 2 dari 5 · Lorong Gion Kyoto',
          svgArt: makeSceneSvg('mizuki-2', 'Lorong Gion'),
          speaker: 'Narator',
          role: 'Kisah Kyoto N5 (Comprehensible Input)',
          avatar: '🌸',
          jp: '<ruby>赤<rt>あか</rt></ruby>い<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'傘\',\'かさ\',\'payung tradisional\')">傘<rt>かさ</rt></ruby>を<ruby>持<rt>も</rt></ruby>って、<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'京都\',\'きょうと\',\'kota Kyoto\')">京都<rt>きょうと</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'古い\',\'ふるい\',\'kuno / tua\')">古い<rt>ふるい</rt></ruby><ruby>道<rt>みち</rt></ruby>を<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'静かに\',\'しずかに\',\'dengan tenang\')">静かに<rt>しずかに</rt></ruby><ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'歩きます\',\'あるきます\',\'berjalan kaki\')">歩きます<rt>あるきます</rt></ruby>。',
          id: 'Membawa payung merah, dia melangkah dengan tenang di jalanan batu kuno kota Kyoto.'
        },
        {
          index: 2,
          title: 'Menyapa Pemilik Kedai Teh Tradisional',
          tag: 'Adegan 3 dari 5 · Kedai Teh Ochaya',
          svgArt: makeSceneSvg('mizuki-3', 'Kedai Teh Ochaya'),
          speaker: 'Pemilik Kedai',
          role: 'Tuan Rumah Kedai Teh (Ochaya)',
          avatar: '🍵',
          jp: '「おはようございます、ミズキさん。<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'今日\',\'きょう\',\'hari ini\')">今日<rt>きょう</rt></ruby>も<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'元気\',\'げんき\',\'sehat / bersemangat\')">元気<rt>げんき</rt></ruby>ですね。<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'お茶\',\'おちゃ\',\'teh hijau Jepang\')">お茶<rt>おちゃ</rt></ruby>をどうぞ。」',
          id: '"Selamat pagi, Mizuki-san. Hari ini bersemangat sekali ya. Mari minum teh hangatnya."'
        },
        {
          index: 3,
          title: 'Praktik Menari dan Instrumen Musik',
          tag: 'Adegan 4 dari 5 · Panggung Praktik Tradisional',
          svgArt: makeSceneSvg('mizuki-4', 'Panggung Menari'),
          speaker: 'Instruktur Tari',
          role: 'Instruktur Seni Budaya Tradisional',
          avatar: '🪭',
          jp: '<ruby>夕方<rt>ゆうがた</rt></ruby>、<ruby>先生<rt>せんせい</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>伝統的<rt>でんとうてき</rt></ruby>な<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'踊り\',\'おどり\',\'tarian tradisional\')">踊り<rt>おどり</rt></ruby>と<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'音楽\',\'おんがく\',\'musik\')">音楽<rt>おんがく</rt></ruby>を<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'練習します\',\'れんしゅうします\',\'berlatih\')">練習します<rt>れんしゅうします</rt></ruby>。',
          id: 'Menjelang sore, bersama sang pengajar dia tekun mendalami tarian tradisional dan musik.'
        },
        {
          index: 4,
          isQuiz: true,
          title: 'Kuis Pemahaman & Refleksi Cerita',
          tag: 'Adegan 5 dari 5 · Kuis Pemahaman Cerita',
          svgArt: makeSceneSvg('mizuki-5', 'Refleksi Sore'),
          quiz: {
            id: 'quiz-mizuki-n5',
            questionJapanese: 'ミズキさんは <ruby>夕方<rt>ゆうがた</rt></ruby>、だれと <ruby>何<rt>なに</rt></ruby>を <ruby>練習<rt>れんしゅう</rt></ruby>しますか。',
            stem: 'Pada sore hari, bersama siapa dan apa yang dilatih oleh Mizuki?',
            options: [
              { text: '<ruby>友<rt>とも</rt></ruby>だちと<ruby>部屋<rt>へや</rt></ruby>で<ruby>着物<rt>きもの</rt></ruby>を<ruby>着<rt>き</rt></ruby>る<ruby>練習<rt>れんしゅう</rt></ruby>', misconceptionId: 'wrong_activity_clothes', failWhy: 'Salah aktivitas: Memakai kimono dilakukan pada pagi hari di kamar rias.' },
              { text: '<ruby>先生<rt>せんせい</rt></ruby>と<ruby>一緒<rt>いっしょ</rt></ruby>に<ruby>伝統的<rt>でんとうてき</rt></ruby>な<ruby>踊<rt>おど</rt></ruby>りと<ruby>音楽<rt>おんがく</rt></ruby>の<ruby>練習<rt>れんしゅう</rt></ruby>', isCorrect: true },
              { text: '<ruby>一人<rt>ひとり</rt></ruby>で<ruby>京都<rt>きょうと</rt></ruby>の<ruby>道<rt>みち</rt></ruby>を<ruby>走<rt>はし</rt></ruby>る<ruby>練習<rt>れんしゅう</rt></ruby>', misconceptionId: 'wrong_activity_running', failWhy: 'Salah konteks: Mizuki tidak pernah berlari sendirian di jalanan.' }
            ],
            answerIndex: 1,
            explain: 'Naskah adegan 4 menyebutkan: "夕方、先生と一緒に伝統的な踊りと音楽を練習します".'
          }
        }
      ]
    },
    {
      id: 'asakusa-neko',
      title: '浅草の猫',
      titleJpMarkup: '<ruby>浅草<rt>あさくさ</rt></ruby>の<ruby>猫<rt>ねこ</rt></ruby>',
      titleJp: '浅草の猫',
      subtitleKey: 'story.asakusa_subtitle',
      subtitle: 'Kucing Penjaga Kuil Asakusa',
      subtitles: {
        id: 'Kucing Penjaga Kuil Asakusa',
        th: 'แมวผู้พิทักษ์วัดอาซากุสะ',
        en: 'The Guardian Cat of Asakusa Temple'
      },
      level: 'N5',
      category: 'Kehidupan Sehari-hari',
      coverSvg: makeSceneSvg('asakusa', 'Asakusa Neko Cover'),
      description: 'Kenji mengunjungi Kuil Senso-ji di Asakusa saat pagi hari dan bertemu kucing belang ramah bernama Mikan penjaga gerbang kuil.',
      scenes: [
        {
          index: 0,
          title: 'Pagi di Gerbang Kaminarimon',
          tag: 'Adegan 1 dari 5 · Gerbang Kaminarimon Asakusa',
          svgArt: makeSceneSvg('asakusa', 'Kaminarimon Asakusa'),
          speaker: 'Kenji',
          role: 'Mahasiswa Tokyo',
          avatar: '👦',
          jp: 'ケンジは<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'朝\',\'あさ\',\'pagi hari\')">朝<rt>あさ</rt></ruby><ruby>早<rt>はや</rt></ruby>く、<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'有名\',\'ゆうめい\',\'terkenal\')">有名<rt>ゆうめい</rt></ruby>な<ruby>浅草<rt>あさくさ</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'お寺\',\'おてら\',\'kuil Buddha\')">お寺<rt>おてら</rt></ruby>に<ruby>来<rt>き</rt></ruby>ました。<ruby>大<rt>おお</rt></ruby>きな<ruby>赤<rt>あか</rt></ruby>いちょうちんがあります。',
          id: 'Pagi-pagi sekali, Kenji datang ke kuil terkenal di Asakusa. Di sana ada lampion merah yang sangat besar.'
        },
        {
          index: 1,
          title: 'Kucing Belang Penjaga Kuil',
          tag: 'Adegan 2 dari 5 · Pertemuan dengan Mikan',
          svgArt: makeSceneSvg('asakusa', 'Kucing Mikan'),
          speaker: 'Narator',
          role: 'Kisah Sehari-hari N5',
          avatar: '🐱',
          jp: '<ruby>門<rt>もん</rt></ruby>のそばに、<ruby>茶色<rt>ちゃいろ</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'猫\',\'ねこ\',\'kucing\')">猫<rt>ねこ</rt></ruby>が<ruby>座<rt>すわ</rt></ruby>っています。みんなはその<ruby>猫<rt>ねこ</rt></ruby>を「ミカン」と<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'呼びます\',\'よびます\',\'memanggil\')">呼びます<rt>よびます</rt></ruby>。',
          id: 'Di dekat gerbang, seekor kucing belang duduk dengan tenang. Warga sekitar memanggil kucing itu "Mikan".'
        },
        {
          index: 2,
          title: 'Doa dan Ramalan Omikuji',
          tag: 'Adegan 3 dari 5 · Ramalan Keberuntungan',
          svgArt: makeSceneSvg('asakusa', 'Ramalan Omikuji'),
          speaker: 'Kenji',
          role: 'Mahasiswa Tokyo',
          avatar: '👦',
          jp: 'ケンジは<ruby>手<rt>て</rt></ruby>を<ruby>洗<rt>あら</rt></ruby>ってから、お<ruby>祈<rt>いの</rt></ruby>りをしました。<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'おみくじ\',\'おみくじ\',\'kertas ramalan kuil\')">おみくじ<rt>おみくじ</rt></ruby>を<ruby>引<rt>ひ</rt></ruby>くと、「<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'大吉\',\'だいきち\',\'sangat beruntung\')">大吉<rt>だいきち</rt></ruby>」が<ruby>出<rt>で</rt></ruby>ました。',
          id: 'Setelah mencuci tangan, Kenji berdoa. Saat mengambil ramalan omikuji, keluar tulisan "Daikichi" (sangat beruntung).'
        },
        {
          index: 3,
          title: 'Kedai Kerupuk Beras Senbei',
          tag: 'Adegan 4 dari 5 · Kedai Tradisional Depan Kuil',
          svgArt: makeSceneSvg('asakusa', 'Kedai Senbei'),
          speaker: 'Kenji',
          role: 'Mahasiswa Tokyo',
          avatar: '👦',
          jp: '<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'お寺\',\'おてら\',\'kuil Buddha\')">お寺<rt>おてら</rt></ruby>の<ruby>前<rt>まえ</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'店\',\'みせ\',\'kedai / toko\')">店<rt>みせ</rt></ruby>で、<ruby>温<rt>あたた</rt></ruby>かい<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'せんべい\',\'せんべい\',\'kerupuk beras tradisional Jepang\')">せんべい<rt>せんべい</rt></ruby>を<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'買いました\',\'かいました\',\'telah membeli\')">買いました<rt>かいました</rt></ruby>。ミカンにも<ruby>少<rt>すこ</rt></ruby>し<ruby>見<rt>み</rt></ruby>せてあげました。',
          id: 'Di kedai depan kuil, dia membeli kerupuk senbei yang masih hangat dan memperlihatkannya ke Mikan.'
        },
        {
          index: 4,
          isQuiz: true,
          title: 'Kuis Pemahaman Kuil Asakusa',
          tag: 'Adegan 5 dari 5 · Kuis Pemahaman Cerita',
          svgArt: makeSceneSvg('asakusa', 'Kuis Asakusa'),
          quiz: {
            id: 'quiz-asakusa-n5',
            questionJapanese: 'お<ruby>寺<rt>てら</rt></ruby>の<ruby>門<rt>もん</rt></ruby>のそばにいる <ruby>猫<rt>ねこ</rt></ruby>の<ruby>名前<rt>なまえ</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか。',
            stem: 'Siapakah nama kucing yang berada di dekat gerbang kuil?',
            options: [
              { text: '「リンゴ」という<ruby>名前<rt>なまえ</rt></ruby> (Apel)', misconceptionId: 'wrong_fruit_name', failWhy: 'Salah nama: Naskah menyebut nama kucing itu Mikan (jeruk), bukan Ringo.' },
              { text: '「ミカン」という<ruby>名前<rt>なまえ</rt></ruby> (Jeruk Mikan)', isCorrect: true },
              { text: '「サクラ」という<ruby>名前<rt>なまえ</rt></ruby> (Bunga Sakura)', misconceptionId: 'wrong_flower_name', failWhy: 'Salah nama: Sakura adalah nama bunga, bukan nama kucing kuil.' }
            ],
            answerIndex: 1,
            explain: 'Naskah adegan 2 menyebutkan secara gamblang: "みんなはその猫を「ミカン」と呼びます".'
          }
        }
      ]
    },
    {
      id: 'shinkansen-trip',
      title: 'はじめての新幹線',
      titleJpMarkup: 'はじめての<ruby>新幹線<rt>しんかんせん</rt></ruby>',
      titleJp: 'はじめての新幹線',
      subtitleKey: 'story.shinkansen_subtitle',
      subtitle: 'Perjalanan Shinkansen Pertama',
      subtitles: {
        id: 'Perjalanan Shinkansen Pertama',
        th: 'การเดินทางด้วยชินคันเซ็นครั้งแรก',
        en: 'First Time on the Shinkansen'
      },
      level: 'N5',
      category: 'Teknologi & Perjalanan',
      coverSvg: makeSceneSvg('shinkansen', 'Shinkansen Cover'),
      description: 'Pengalaman mendebarkan Taro menaiki Shinkansen otomatis dari Stasiun Tokyo menuju Shin-Osaka melewati panorama Gunung Fuji yang megah.',
      scenes: [
        {
          index: 0,
          title: 'Peron Stasiun Tokyo Pagi',
          tag: 'Adegan 1 dari 5 · Peron Stasiun Tokyo',
          svgArt: makeSceneSvg('shinkansen', 'Peron Tokyo'),
          speaker: 'Taro',
          role: 'Pelajar',
          avatar: '🚄',
          jp: 'タロウは<ruby>朝<rt>あさ</rt></ruby>7<ruby>時<rt>じ</rt></ruby>に<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'東京駅\',\'とうきょうえき\',\'Stasiun Tokyo\')">東京駅<rt>とうきょうえき</rt></ruby>に<ruby>着<rt>つ</rt></ruby>きました。ホームに<ruby>白<rt>しろ</rt></ruby>い<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'新幹線\',\'しんかんせん\',\'kereta cepat Shinkansen\')">新幹線<rt>しんかんせん</rt></ruby>が<ruby>待<rt>ま</rt></ruby>っています。',
          id: 'Taro tiba di Stasiun Tokyo pukul 7 pagi. Di peron, sebuah kereta Shinkansen putih sudah menunggu.'
        },
        {
          index: 1,
          title: 'Kabin Shinkansen Modern',
          tag: 'Adegan 2 dari 5 · Kabin Otomatis Modern',
          svgArt: makeSceneSvg('shinkansen', 'Kabin Kereta'),
          speaker: 'Petugas Kereta',
          role: 'Penyiar Kereta Shinkansen',
          avatar: '👨‍✈️',
          jp: '「この<ruby>新幹線<rt>しんかんせん</rt></ruby>は、<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'最新\',\'さいしん\',\'terbaru / modern\')">最新<rt>さいしん</rt></ruby>の<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'自動運転\',\'じどううんてん\',\'kemudi otomatis\')">自動運転<rt>じどううんてん</rt></ruby>システムで<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'安全に\',\'あんぜんに\',\'dengan aman\')">安全に<rt>あんぜんに</rt></ruby><ruby>走<rt>はし</rt></ruby>ります。ごゆっくりお<ruby>過<rt>す</rt></ruby>ごしください。」',
          id: '"Kereta Shinkansen ini melaju aman dengan sistem kemudi otomatis terbaru. Selamat menikmati perjalanan Anda."'
        },
        {
          index: 2,
          title: 'Panorama Gunung Fuji dari Jendela',
          tag: 'Adegan 3 dari 5 · Pemandangan Alam Megah',
          svgArt: makeSceneSvg('shinkansen', 'Pemandangan Gunung Fuji'),
          speaker: 'Taro',
          role: 'Pelajar',
          avatar: '🚄',
          jp: '<ruby>電車<rt>でんしゃ</rt></ruby>がスピードを<ruby>上<rt>あ</rt></ruby>げます。<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'窓\',\'まど\',\'jendela\')">窓<rt>まど</rt></ruby>の<ruby>外<rt>そと</rt></ruby>を<ruby>見<rt>み</rt></ruby>ると、<ruby>青<rt>あお</rt></ruby>い<ruby>空<rt>そら</rt></ruby>の<ruby>下<rt>した</rt></ruby>に<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'富士山\',\'ふじさん\',\'Gunung Fuji\')">富士山<rt>ふじさん</rt></ruby>がはっきりと<ruby>見<rt>み</rt></ruby>えました。',
          id: 'Kereta menambah kecepatannya. Saat menatap ke luar jendela, di bawah langit biru Gunung Fuji terlihat sangat jelas.'
        },
        {
          index: 3,
          title: 'Tiba di Stasiun Shin-Osaka',
          tag: 'Adegan 4 dari 5 · Kedatangan di Osaka',
          svgArt: makeSceneSvg('shinkansen', 'Tiba di Shin-Osaka'),
          speaker: 'Taro',
          role: 'Pelajar',
          avatar: '🚄',
          jp: 'たったの2<ruby>時間半<rt>じかんはん</rt></ruby>で、<ruby>新大阪駅<rt>しんおおさかえき</rt></ruby>に<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'到着\',\'とうちゃく\',\'tiba / sampai\')">到着<rt>とうちゃく</rt></ruby>しました。とても<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'速くて\',\'はやくて\',\'cepat\')">速くて<rt>はやくて</rt></ruby><ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'快適\',\'かいてき\',\'nyaman / menyenangkan\')">快適<rt>かいてき</rt></ruby>でした。',
          id: 'Hanya dalam waktu 2,5 jam, kereta sudah tiba di Stasiun Shin-Osaka. Perjalanan yang sangat cepat dan nyaman.'
        },
        {
          index: 4,
          isQuiz: true,
          title: 'Kuis Pemahaman Shinkansen',
          tag: 'Adegan 5 dari 5 · Kuis Pemahaman Cerita',
          svgArt: makeSceneSvg('shinkansen', 'Kuis Shinkansen'),
          quiz: {
            id: 'quiz-shinkansen-n5',
            questionJapanese: 'タロウさんは <ruby>電車<rt>でんしゃ</rt></ruby>の<ruby>窓<rt>まど</rt></ruby>から <ruby>何<rt>なに</rt></ruby>を<ruby>見<rt>み</rt></ruby>ましたか。',
            stem: 'Apakah yang dilihat Taro melalui jendela kereta?',
            options: [
              { text: '<ruby>青<rt>あお</rt></ruby>い<ruby>海<rt>うみ</rt></ruby>と<ruby>白<rt>しろ</rt></ruby>い<ruby>船<rt>ふね</rt></ruby>', misconceptionId: 'wrong_sight_sea', failWhy: 'Salah objek pemandangan: Shinkansen jalur Tokaido melewati daratan dan Fuji, bukan laut lepas.' },
              { text: '<ruby>青<rt>あお</rt></ruby>い<ruby>空<rt>そら</rt></ruby>の<ruby>下<rt>した</rt></ruby>の<ruby>富士山<rt>ふじさん</rt></ruby>', isCorrect: true },
              { text: '<ruby>大<rt>おお</rt></ruby>きな<ruby>東京<rt>とうきょう</rt></ruby>タワー', misconceptionId: 'wrong_sight_tower', failWhy: 'Salah lokasi: Tokyo Tower berada di pusat kota Tokyo sebelum kereta berangkat.' }
            ],
            answerIndex: 1,
            explain: 'Naskah adegan 3 menyebutkan: "青い空の下に富士山がはっきりと見えました".'
          }
        }
      ]
    }
  ];

  // Normalisasi kompatibilitas: pastikan image & svgArt terdefinisi di setiap adegan
  STORIES.forEach(function (s) {
    if (Array.isArray(s.scenes)) {
      s.scenes.forEach(function (sc) {
        if (sc.svgArt && !sc.image) sc.image = sc.svgArt;
        if (sc.image && !sc.svgArt) sc.svgArt = sc.image;
      });
    }
  });

  /* Ilustrasi storyboard raster per adegan (WebP precached) dan audio narasi otentik (MP3) di assets/stories/.
     Dihasilkan via ElevenLabs Neural Studio dengan intonasi pedagogis terkalibrasi peran karakter & fonetik hiragana N5.
     Adegan 1-4 narasi bertahap, Adegan 5 kuis pemahaman & pembacaan soal.
     PWA Permanence Invariant: SVG vektor selalu ter-render instan tanpa jeda download,
     dan diperkaya oleh WebP yang ter-precache di shell PWA. */
  var SCENE_IMAGE_BASE = './assets/stories/';
  var SCENE_AUDIO_BASE = './assets/stories/';
  STORIES.forEach(function (s) {
    var prefix = s.id === 'mizuki-maiko' ? 'mizuki' : (s.id === 'asakusa-neko' ? 'asakusa' : 'shinkansen');
    s.scenes.forEach(function (sc, i) {
      var n = sc.isQuiz ? 4 : i + 1;
      sc.imageSrc = SCENE_IMAGE_BASE + prefix + '-' + n + '.webp';
      sc.audioSrc = SCENE_AUDIO_BASE + prefix + '-' + (i + 1) + '.mp3';
    });
    s.coverSrc = s.scenes[0].imageSrc;
  });

  function sceneArtHtml(svg, src, alt) {
    var img = src
      ? '<img class="fz-scene-img" src="' + src + '" alt="' + String(alt || '').replace(/\x22/g, '&quot;') + '" loading="eager" decoding="async">'
      : '';
    var fallback = svg ? '<div class="fz-scene-art-svg">' + svg + '</div>' : '';
    return '<div class="fz-scene-art-stack">' + fallback + img + '</div>';
  }

  function preloadStoryAudio(story) {
    if (!story || !Array.isArray(story.scenes)) return;
    try {
      if (typeof Audio === 'undefined') return;
      story.scenes.forEach(function (sc) {
        if (sc && sc.audioSrc) {
          var a = new Audio();
          a.preload = 'auto';
          a.src = sc.audioSrc;
        }
      });
    } catch (_) {}
  }

  function isStoryExamMode() {
    try {
      var r = typeof globalThis !== 'undefined' ? globalThis : {};
      if (r.FiezelJaUi && typeof r.FiezelJaUi.isExamModeActive === 'function' && r.FiezelJaUi.isExamModeActive()) {
        return true;
      }
      if (r.state && (r.state.view === 'test' || r.state.view === 'exam')) return true;
      if (r.state && r.state.activeSession && (r.state.activeSession.measureMode || r.state.activeSession.placement || r.state.activeSession.noHints || r.state.activeSession.examKind)) return true;
      if (typeof document !== 'undefined' && document.body && document.body.classList &&
          typeof document.body.classList.contains === 'function' &&
          document.body.classList.contains('fz-exam-mode')) return true;
    } catch (_) {}
    return false;
  }

  function fallbackSolveStoryFurigana(surface, rawReading) {
    var text = String(surface || '');
    var reading = String(rawReading || '').replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
    var kanjiRe = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff々]$/;
    if (!text || !reading) return [{ ruby: text }];
    var hasKanji = false;
    for (var i = 0; i < text.length; i++) {
      if (kanjiRe.test(text[i])) { hasKanji = true; break; }
    }
    if (!hasKanji) return [{ ruby: text }];
    var pre = 0;
    while (pre < text.length && pre < reading.length && !kanjiRe.test(text[pre]) &&
      text[pre].replace(/[\u30a1-\u30f6]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }) === reading[pre]) {
      pre++;
    }
    var suf = 0;
    while (text.length - 1 - suf >= pre && reading.length - 1 - suf >= pre && !kanjiRe.test(text[text.length - 1 - suf]) &&
      text[text.length - 1 - suf].replace(/[\u30a1-\u30f6]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }) === reading[reading.length - 1 - suf]) {
      suf++;
    }
    var out = [];
    if (pre > 0) out.push({ ruby: text.slice(0, pre) });
    var coreT = text.slice(pre, text.length - suf);
    var coreR = reading.slice(pre, reading.length - suf);
    if (coreT) out.push({ ruby: coreT, rt: coreR });
    if (suf > 0) out.push({ ruby: text.slice(text.length - suf) });
    return out;
  }

  function solveStoryFurigana(surface, reading) {
    try {
      var r = typeof globalThis !== 'undefined' ? globalThis : {};
      if (r.FiezelJaUi && typeof r.FiezelJaUi.solveFuriganaSegments === 'function') {
        return r.FiezelJaUi.solveFuriganaSegments(surface, reading);
      }
      if (typeof require === 'function') {
        var jaUi = require('./fiezel-ja-ui.js');
        if (jaUi && typeof jaUi.solveFuriganaSegments === 'function') {
          return jaUi.solveFuriganaSegments(surface, reading);
        }
      }
    } catch (_) {}
    return fallbackSolveStoryFurigana(surface, reading);
  }

  /**
   * Menyelaraskan seluruh tag <ruby ...>SURFACE<rt>READING</rt></ruby> di cerita:
   * - Mengupas okurigana awalan/tengah/akhiran keluar dari <ruby> (mis. お茶 -> お + <ruby>茶<rt>ちゃ</rt></ruby>,
   *   美しい -> <ruby>美<rt>うつく</rt></ruby>しい, 練習します -> <ruby>練習<rt>れんしゅう</rt></ruby>します)
   *   sambil mempertahankan atribut .fz-story-token & onclick Braincore BKT.
   * - Dalam Mode Ujian (Exam Purity), menanggalkan seluruh <rt> dan atribut klik intip arti kata.
   */
  function normalizeStoryRubyMarkup(rawHtml, forceExam) {
    var html = String(rawHtml || '');
    if (!html || html.indexOf('<ruby') === -1) return html;
    var exam = forceExam === true || (forceExam === undefined && isStoryExamMode());
    return html.replace(/<ruby(\s[^>]*)?>([^<]+)<rt(?:\s[^>]*)?>([^<]+)<\/rt><\/ruby>/g, function (_full, attrs, surface, reading) {
      if (exam) return surface;
      var attrStr = attrs || '';
      var segs = solveStoryFurigana(surface, reading);
      if (segs.length === 1 && segs[0].rt) {
        return '<ruby' + attrStr + '>' + segs[0].ruby + '<rt>' + segs[0].rt + '</rt></ruby>';
      }
      var inner = segs.map(function (seg) {
        if (!seg.rt) return seg.ruby;
        return '<ruby>' + seg.ruby + '<rt>' + seg.rt + '</rt></ruby>';
      }).join('');
      return attrStr.trim() ? ('<span' + attrStr + '>' + inner + '</span>') : inner;
    });
  }

  var PUNCT_SET = new Set(['。', '、', '！', '？', '「', '」', ' ', '\t', '\n', '・', '—', '〜', '”', '“']);

  function getSceneCharTimings(storyId, sceneIdx) {
    if (cachedStoryTimings && cachedStoryTimings.stories && cachedStoryTimings.stories[storyId]) {
      var sc = cachedStoryTimings.stories[storyId].scenes[sceneIdx];
      return sc ? sc.char_timings : null;
    }
    return null;
  }

  function renderKaraokeSentenceMarkup(rawJpMarkup, exam, storyId, sceneIdx) {
    var normalizedHtml = normalizeStoryRubyMarkup(rawJpMarkup, exam);
    var inRt = false;
    var inTag = false;
    var charIdx = 0;
    var output = '';

    for (var i = 0; i < normalizedHtml.length; i++) {
      if (normalizedHtml.slice(i).startsWith('<rt>') || normalizedHtml.slice(i).startsWith('<rt ')) {
        inRt = true;
        output += '<rt';
        i += 2;
        continue;
      }
      if (normalizedHtml.slice(i).startsWith('</rt>')) {
        inRt = false;
        output += '</rt>';
        i += 4;
        continue;
      }
      if (normalizedHtml[i] === '<') {
        inTag = true;
        output += normalizedHtml[i];
        continue;
      }
      if (normalizedHtml[i] === '>') {
        inTag = false;
        output += normalizedHtml[i];
        continue;
      }

      if (inTag || inRt) {
        output += normalizedHtml[i];
      } else {
        var ch = normalizedHtml[i];
        if (PUNCT_SET.has(ch)) {
          output += '<span class="fz-karaoke-punct">' + ch + '</span>';
        } else {
          var cidx = charIdx++;
          output += '<span class="fz-karaoke-char" data-cidx="' + cidx + '" onclick="window.FiezelStoryReader.seekToChar(' + cidx + ', event)" title="Lompat audio ke karakter ini">' + ch + '</span>';
        }
      }
    }
    return output;
  }

  function startKaraokeSync(storyId, sceneIdx) {
    stopKaraokeSync();
    lastActiveCharIdx = -1;
    function tick() {
      if (!currentAudio || currentAudio.paused) {
        stopKaraokeSync();
        return;
      }
      var curMs = currentAudio.currentTime * 1000;
      updateKaraokeState(curMs, storyId, sceneIdx);
      karaokeRafId = requestAnimationFrame(tick);
    }
    karaokeRafId = requestAnimationFrame(tick);
  }

  function stopKaraokeSync() {
    if (karaokeRafId) {
      cancelAnimationFrame(karaokeRafId);
      karaokeRafId = null;
    }
  }

  function applyKaraokeHighlight(activeIdx, passedBeforeMs, storyId, sceneIdx) {
    var timings = getSceneCharTimings(storyId, sceneIdx);
    if (!timings || timings.length === 0) return;

    lastActiveCharIdx = activeIdx;
    var charEls = document.querySelectorAll('.fz-sentence-jp .fz-karaoke-char, .fz-quiz-q-jp .fz-karaoke-char');
    if (!charEls || charEls.length === 0) return;

    for (var c = 0; c < charEls.length; c++) {
      var el = charEls[c];
      var cidx = parseInt(el.getAttribute('data-cidx'), 10);
      if (isNaN(cidx) || !timings[cidx]) continue;

      var t = timings[cidx];
      if (cidx === activeIdx) {
        el.classList.add('fz-karaoke-active');
        el.classList.remove('fz-karaoke-passed', 'fz-karaoke-upcoming');
      } else if (cidx < activeIdx || (typeof passedBeforeMs === 'number' && t.end_ms <= passedBeforeMs)) {
        el.classList.add('fz-karaoke-passed');
        el.classList.remove('fz-karaoke-active', 'fz-karaoke-upcoming');
      } else {
        el.classList.add('fz-karaoke-upcoming');
        el.classList.remove('fz-karaoke-active', 'fz-karaoke-passed');
      }
    }
  }

  function updateKaraokeState(curMs, storyId, sceneIdx) {
    if (pendingSeekMs !== null) {
      if (curMs < pendingSeekMs - 250) {
        return;
      }
      pendingSeekMs = null;
    }

    var timings = getSceneCharTimings(storyId, sceneIdx);
    if (!timings || timings.length === 0) return;

    var activeIdx = -1;
    for (var i = 0; i < timings.length; i++) {
      if (curMs >= timings[i].start_ms && curMs < timings[i].end_ms) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx === lastActiveCharIdx && activeIdx !== -1) {
      return;
    }

    applyKaraokeHighlight(activeIdx, curMs, storyId, sceneIdx);
  }

  function seekToChar(charIdx, event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    var timings = getSceneCharTimings(activeStoryId, activeSceneIndex);
    if (!timings || !timings[charIdx]) return;
    var targetMs = timings[charIdx].start_ms;
    var targetSec = targetMs / 1000;
    pendingSeekMs = targetMs;

    applyKaraokeHighlight(charIdx, targetMs, activeStoryId, activeSceneIndex);

    var applySeekToAudio = function (audio) {
      if (!audio) return;
      try {
        audio.currentTime = targetSec;
      } catch (_) {}
      if (audio.paused) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
      isPlaying = true;
      updatePlayUi(true, (targetSec / (audio.duration || targetSec || 1)) * 100);
      startKaraokeSync(activeStoryId, activeSceneIndex);
    };

    if (!currentAudio) {
      playSceneAudio(activeSceneIndex, targetSec);
    } else {
      applySeekToAudio(currentAudio);
    }
  }

  function getStoryById(id) {
    for (var i = 0; i < STORIES.length; i++) {
      if (STORIES[i].id === id) return STORIES[i];
    }
    return STORIES[0];
  }

  function mount(container, targetStoryId) {
    if (!container) return;
    if (targetStoryId) {
      activeStoryId = targetStoryId;
      currentView = 'story';
      activeSceneIndex = 0;
      var s = getStoryById(targetStoryId);
      preloadStoryAudio(s);
    }

    if (currentView === 'library') {
      renderLibrary(container);
    } else {
      renderStory(container);
    }
  }

  function renderLibrary(container) {
    var exam = isStoryExamMode();
    var cardsHtml = STORIES.map(function (s) {
      var subtitle = getStorySubtitle(s);
      var titleHtml = normalizeStoryRubyMarkup(s.titleJpMarkup || s.title, exam);
      return '' +
        '<div class="fz-story-card-item" onclick="window.FiezelStoryReader.openStory(\'' + s.id + '\')">' +
          '<div class="fz-story-thumb-wrap">' +
            sceneArtHtml(s.coverSvg, s.coverSrc, s.title) +
            '<span class="fz-story-level-badge">' + s.level + ' • 5 Adegan</span>' +
          '</div>' +
          '<div class="fz-story-card-body">' +
            '<span class="fz-story-cat-tag">' + s.category + '</span>' +
            '<h3 class="fz-story-card-title">' + titleHtml + '</h3>' +
            (subtitle ? '<div class="fz-story-card-subtitle">' + subtitle + '</div>' : '') +
            '<p class="fz-story-card-desc">' + s.description + '</p>' +
            '<div class="fz-story-card-foot">' +
              '<span class="fz-story-cta-btn">' + t('story.btn_start', 'Mulai Membaca →') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    var html = '' +
      '<div class="fz-story-library-wrap">' +
        '<div class="fz-story-cards-grid">' +
          cardsHtml +
        '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  function renderStory(container) {
    var story = getStoryById(activeStoryId);
    var scene = story.scenes[activeSceneIndex] || story.scenes[0];
    var isQuiz = !!scene.isQuiz;
    var exam = isStoryExamMode();
    var effectiveHideFurigana = exam ? true : hideFurigana;

    // Build scene stepper pills
    var stepperHtml = story.scenes.map(function (sc, idx) {
      var isAct = idx === activeSceneIndex;
      var isPast = idx < activeSceneIndex;
      var label = sc.isQuiz ? 'Kuis' : String(idx + 1);
      var cls = 'fz-scene-step-pill ' + (isAct ? 'active' : isPast ? 'passed' : '');
      return '<button type="button" class="' + cls + '" onclick="window.FiezelStoryReader.gotoScene(' + idx + ')">' + label + '</button>';
    }).join('');

    var contentHtml = '';

    if (!isQuiz) {
      // Adegan Cerita Biasa
      contentHtml = '' +
        '<div class="fz-story-bento">' +
          '<!-- Left Column: Scene Theater -->' +
          '<div class="fz-theater-card">' +
            '<div class="fz-scene-viewport">' +
              sceneArtHtml(scene.svgArt, scene.imageSrc, scene.title) +
              '<div class="fz-scene-overlay"></div>' +
              '<span class="fz-scene-tag">' + scene.tag + '</span>' +
            '</div>' +
            '<div class="fz-audio-console">' +
              '<div class="fz-speaker-row">' +
                '<div id="fzSpeakerAvatar" class="fz-speaker-avatar' + (isPlaying ? ' speaking' : '') + '">' + scene.avatar + '</div>' +
                '<div class="fz-speaker-meta">' +
                  '<div class="fz-speaker-name">' + scene.speaker + '</div>' +
                  '<div class="fz-speaker-role">' + scene.role + '</div>' +
                '</div>' +
                '<div class="fz-autoplay-badge" title="' + t('story.autoplay_label', 'Putar Otomatis') + '">' +
                  '<span class="fz-autoplay-dot"></span> ' + t('story.autoplay_label', 'Putar Otomatis') +
                '</div>' +
              '</div>' +
              '<div class="fz-play-controls">' +
                '<button type="button" id="fzBtnPlay" class="fz-btn-play' + (isPlaying ? ' playing' : '') + '" onclick="window.FiezelStoryReader.toggleAudio()" aria-label="' + (isPlaying ? 'Jeda Audio' : 'Putar Dialog') + '">' + (isPlaying ? '⏸' : '▶') + '</button>' +
                '<div class="fz-progress-bar-wrap" onclick="window.FiezelStoryReader.seekAudio(event)" title="Geser durasi audio">' +
                  '<div id="fzAudioProgress" class="fz-progress-bar-fill"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- Right Column: Reader & Sentences Flow -->' +
          '<div class="fz-reader-card">' +
            '<div class="fz-reader-header">' +
              '<h3 class="fz-reader-title">' + scene.title + '</h3>' +
              (exam ? '' : '<span class="fz-reader-hint">' + t('story.hint_tap', '👆 Ketuk kanji bergaris untuk arti & BKT') + '</span>') +
            '</div>' +
            '<div class="fz-script-flow">' +
              '<div class="fz-sentence-block active">' +
                '<div class="fz-sentence-jp">' + renderKaraokeSentenceMarkup(scene.jp, exam, activeStoryId, activeSceneIndex) + '</div>' +
                '<div class="fz-sentence-id">' + scene.id + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="fz-story-nav-actions">' +
              (activeSceneIndex > 0 ?
                '<button type="button" class="fz-btn-nav-prev" onclick="window.FiezelStoryReader.gotoScene(' + (activeSceneIndex - 1) + ')">' + t('story.btn_prev', '← Sebelumnya') + '</button>' :
                '<div></div>') +
              '<button type="button" class="fz-btn-nav-next primary" onclick="window.FiezelStoryReader.gotoScene(' + (activeSceneIndex + 1) + ')">' +
                (activeSceneIndex === story.scenes.length - 2 ? t('story.btn_quiz', 'Mulai Kuis Akhir →') : t('story.btn_next', 'Lanjut ke Adegan Berikutnya →')) +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    } else {
      // Adegan 5: Kuis Pemahaman Akhir
      var q = scene.quiz;
      var optionsHtml = q.options.map(function (opt, idx) {
        return '' +
          '<button type="button" class="fz-option-btn" onclick="window.FiezelStoryReader.evaluateQuiz(' + idx + ', this)">' +
            '<span class="fz-quiz-opt-text">' + normalizeStoryRubyMarkup(opt.text, exam) + '</span>' +
            '<span class="fz-opt-arrow">→</span>' +
          '</button>';
      }).join('');

      contentHtml = '' +
        '<div class="fz-story-bento">' +
          '<div class="fz-theater-card">' +
            '<div class="fz-scene-viewport">' +
              sceneArtHtml(scene.svgArt, scene.imageSrc, scene.title) +
              '<div class="fz-scene-overlay"></div>' +
              '<span class="fz-scene-tag">' + scene.tag + '</span>' +
            '</div>' +
            '<div class="fz-audio-console">' +
              '<div class="fz-speaker-row">' +
                '<div id="fzSpeakerAvatar" class="fz-speaker-avatar' + (isPlaying ? ' speaking' : '') + '">🎓</div>' +
                '<div class="fz-speaker-meta">' +
                  '<div class="fz-speaker-name">' + t('story.quiz_speaker_name', 'Instruktur Ujian') + '</div>' +
                  '<div class="fz-speaker-role">' + t('story.quiz_audio_role', 'Audio Pertanyaan Soal (Bahasa Jepang)') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="fz-play-controls">' +
                '<button type="button" id="fzBtnPlay" class="fz-btn-play' + (isPlaying ? ' playing' : '') + '" onclick="window.FiezelStoryReader.toggleAudio()" aria-label="' + (isPlaying ? 'Jeda Audio' : 'Dengarkan Pertanyaan') + '">' + (isPlaying ? '⏸' : '▶') + '</button>' +
                '<div class="fz-progress-bar-wrap" onclick="window.FiezelStoryReader.seekAudio(event)" title="Geser durasi audio">' +
                  '<div id="fzAudioProgress" class="fz-progress-bar-fill"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="fz-reader-card">' +
            '<div class="fz-story-quiz-card-inner">' +
              '<div class="fz-quiz-badge-row">' +
                '<span class="fz-quiz-badge">Kuis Pemahaman Akhir</span>' +
              '</div>' +
              '<div class="fz-quiz-q-jp">' + renderKaraokeSentenceMarkup(q.questionJapanese, exam, activeStoryId, 4) + '</div>' +
              '<div class="fz-quiz-q-id">' + q.stem + '</div>' +
              '<div class="fz-quiz-options-grid">' +
                optionsHtml +
              '</div>' +
              '<div id="fzFeedbackBanner" class="fz-feedback-banner"></div>' +
              '<div class="fz-story-nav-actions" style="margin-top:16px;">' +
                '<button type="button" class="fz-btn-nav-prev" onclick="window.FiezelStoryReader.gotoScene(0)">' + t('story.btn_reread', '↺ Baca Ulang') + '</button>' +
                '<button type="button" class="fz-btn-nav-next primary" onclick="window.FiezelStoryReader.openLibrary()">' + t('story.btn_library', 'Kembali ke Perpustakaan ✓') + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    var html = '' +
      '<div class="fz-story-reader-wrap ' + (effectiveHideFurigana ? 'hide-furigana' : '') + '">' +
        '<!-- Reader Topbar Controls -->' +
        '<div class="fz-story-top-ctrls">' +
          '<div class="fz-story-top-row1">' +
            '<button type="button" class="fz-story-tab-btn" onclick="window.FiezelStoryReader.openLibrary()">' +
              '<span>←</span> Perpustakaan' +
            '</button>' +
            (exam ? '' :
              '<div class="fz-story-aux-ctrls">' +
                '<button type="button" class="fz-btn-furigana ' + (!effectiveHideFurigana ? 'active' : '') + '" id="fzBtnFurigana" onclick="window.FiezelStoryReader.toggleFurigana()" title="Sembunyikan / Tampilkan Furigana">' +
                  '<span>あA</span> Furigana' +
                '</button>' +
              '</div>') +
          '</div>' +
          '<div class="fz-story-top-row2">' +
            '<div class="fz-scene-stepper-wrap">' +
              stepperHtml +
            '</div>' +
          '</div>' +
        '</div>' +

        contentHtml +

        '<!-- Word Popover Card (Live Braincore Telemetry) -->' +
        '<div id="fzWordPopover" class="fz-word-popover">' +
          '<button type="button" class="fz-pop-close" onclick="window.FiezelStoryReader.closePopover()">✕</button>' +
          '<div class="fz-popover-top">' +
            '<div class="fz-popover-vocab">' +
              '<span id="fzPopKanji" class="fz-popover-kanji"></span>' +
              '<span id="fzPopReading" class="fz-popover-reading"></span>' +
              '<span id="fzPopMeaning" class="fz-popover-meaning"></span>' +
            '</div>' +
          '</div>' +
          '<div class="fz-bkt-meter">' +
            '<div class="fz-bkt-ring-wrap">' +
              '<svg viewBox="0 0 36 36">' +
                '<path class="fz-bkt-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />' +
                '<path id="fzBktRing" class="fz-bkt-ring-progress" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />' +
              '</svg>' +
              '<span id="fzBktPercent" class="fz-bkt-ring-text">25%</span>' +
            '</div>' +
            '<div class="fz-bkt-info">' +
              '<div class="fz-bkt-label">PENGUASAAN KATA</div>' +
              '<div id="fzBktStatusMsg" class="fz-bkt-status">Menyimpan progres kata...</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    container.innerHTML = html;
  }

  function getMountTarget() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('fzStoryContainer') || document.getElementById('app');
  }

  function openStory(id) {
    activeStoryId = id;
    currentView = 'story';
    activeSceneIndex = 0;
    stopAudio();
    var s = getStoryById(id);
    preloadStoryAudio(s);
    var target = getMountTarget();
    if (target) renderStory(target);
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  function openLibrary() {
    currentView = 'library';
    stopAudio();
    var target = getMountTarget();
    if (target) renderLibrary(target);
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  function gotoScene(idx) {
    var story = getStoryById(activeStoryId);
    if (idx < 0 || idx >= story.scenes.length) return;
    activeSceneIndex = idx;
    stopAudio();
    var target = getMountTarget();
    if (target) renderStory(target);
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  function toggleFurigana() {
    if (isStoryExamMode()) return;
    hideFurigana = !hideFurigana;
    var readerWrap = document.querySelector('.fz-story-reader-wrap');
    var btn = document.getElementById('fzBtnFurigana');
    if (readerWrap) {
      readerWrap.classList.toggle('hide-furigana', hideFurigana);
    }
    if (btn) {
      btn.classList.toggle('active', !hideFurigana);
    }
  }

  function inspectWord(kanji, reading, meaning) {
    if (isStoryExamMode()) return;
    var kEl = document.getElementById('fzPopKanji');
    var rEl = document.getElementById('fzPopReading');
    var mEl = document.getElementById('fzPopMeaning');
    var pop = document.getElementById('fzWordPopover');
    var ring = document.getElementById('fzBktRing');
    var percent = document.getElementById('fzBktPercent');
    var statusMsg = document.getElementById('fzBktStatusMsg');

    if (kEl) kEl.innerText = kanji;
    if (rEl) rEl.innerText = reading;
    if (mEl) mEl.innerText = meaning;
    if (pop) pop.classList.add('open');

    // Alirkan ke Bridge jika ada
    var root = typeof globalThis !== 'undefined' ? globalThis : {};
    var bridge = root.FiezelStoryBrainBridge;
    var record = null;
    if (bridge && typeof bridge.recordWordInteraction === 'function') {
      try {
        record = bridge.recordWordInteraction({ ja: kanji, reading: reading, meaning: meaning }, { isLookup: true });
      } catch (_) {}
    }

    if (ring) ring.style.strokeDashoffset = '75';
    if (percent) percent.innerText = '25%';
    if (statusMsg) statusMsg.innerText = t('story.vocab_saving', 'Menyimpan progres kata...');

    setTimeout(function () {
      var pLt = (record && record.pLt) || 0.72;
      var pct = Math.round(pLt * 100);
      var offset = Math.round(100 - pct);
      if (ring) ring.style.strokeDashoffset = String(offset);
      if (percent) percent.innerText = pct + '%';
      if (statusMsg) {
        if (pct >= 60) {
          statusMsg.innerHTML = '<b style="color:var(--emerald,#10b981);">' + t('story.vocab_mastered', '✨ Kosakata Dikuasai') + '</b>';
        } else {
          statusMsg.innerHTML = '<span style="color:var(--accent,#0284c7);">' + t('story.vocab_saved', 'Progres kata tersimpan') + '</span>';
        }
      }
    }, 280);
  }

  function closePopover() {
    var pop = document.getElementById('fzWordPopover');
    if (pop) pop.classList.remove('open');
  }

  function evaluateQuiz(selectedIdx, btnEl) {
    var story = getStoryById(activeStoryId);
    var scene = story.scenes[activeSceneIndex];
    if (!scene || !scene.quiz) return;
    var quiz = scene.quiz;
    var opt = quiz.options[selectedIdx];
    var isCorrect = selectedIdx === quiz.answerIndex;

    var btns = document.querySelectorAll('.fz-option-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = 'fz-option-btn';
    }

    var banner = document.getElementById('fzFeedbackBanner');

    // Gunakan evaluasi ketat bridge
    var root = typeof globalThis !== 'undefined' ? globalThis : {};
    var bridge = root.FiezelStoryBrainBridge;
    var evalRes = null;
    if (bridge && typeof bridge.evaluateStoryQuiz === 'function') {
      try {
        evalRes = bridge.evaluateStoryQuiz(quiz, selectedIdx, opt.text);
      } catch (_) {}
    }

    // Alirkan ke mastery global
    if (typeof root.updateMastery === 'function') {
      try { root.updateMastery('reading', 'story_' + story.id, isCorrect); } catch (_) {}
      try { root.updateMastery('reading_quiz_' + story.id, isCorrect); } catch (_) {}
    }
    if (typeof root.bktRecord === 'function') {
      try {
        root.bktRecord({
          lessonSkill: 'reading_' + story.id,
          skill: 'reading_' + story.id,
          toString: function () { return 'reading_' + story.id; }
        }, isCorrect, 1.0);
      } catch (_) {}
    }

    if (isCorrect) {
      if (btnEl) btnEl.classList.add('correct');
      if (banner) {
        banner.className = 'fz-feedback-banner show ok';
        banner.innerHTML = '<b>✓ Tepat Sekali!</b> ' + quiz.explain;
      }
    } else {
      if (btnEl) btnEl.classList.add('wrong');
      if (banner) {
        banner.className = 'fz-feedback-banner show fail';
        var failText = (opt && opt.failWhy) || (evalRes && evalRes.failWhy) || 'Perhatikan kembali alur cerita pada adegan sebelumnya.';
        banner.innerHTML = '<b>✕ Masih Kurang Tepat:</b> ' + failText;
      }
    }
  }

  function stopAudio() {
    isPlaying = false;
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.onended = null;
        currentAudio.ontimeupdate = null;
        currentAudio.onerror = null;
      } catch (_) {}
      currentAudio = null;
    }
    updatePlayUi(false, 0);
  }

  function updatePlayUi(playing, pct) {
    if (typeof document === 'undefined') return;
    var btn = document.getElementById('fzBtnPlay');
    var avatar = document.getElementById('fzSpeakerAvatar');
    var prog = document.getElementById('fzAudioProgress');
    if (btn) {
      btn.innerText = playing ? '⏸' : '▶';
      btn.setAttribute('aria-label', playing ? 'Jeda Audio' : 'Putar Dialog');
      if (playing) btn.classList.add('playing');
      else btn.classList.remove('playing');
    }
    if (avatar) {
      if (playing) avatar.classList.add('speaking');
      else avatar.classList.remove('speaking');
    }
    if (prog && typeof pct === 'number') {
      prog.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
  }

  function playSceneAudio(sceneIdx, initialTimeSec) {
    var story = getStoryById(activeStoryId);
    if (!story || !story.scenes || sceneIdx < 0 || sceneIdx >= story.scenes.length) {
      stopAudio();
      return;
    }
    var scene = story.scenes[sceneIdx];
    if (!scene || !scene.audioSrc) {
      stopAudio();
      return;
    }

    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.ontimeupdate = null;
        currentAudio.onerror = null;
      } catch (_) {}
      currentAudio = null;
    }

    try {
      if (typeof Audio === 'undefined') {
        isPlaying = true;
        updatePlayUi(true, 0);
        return;
      }
      currentAudio = new Audio(scene.audioSrc);
      isPlaying = true;
      var initSec = (typeof initialTimeSec === 'number' && initialTimeSec > 0) ? initialTimeSec : 0;
      if (initSec > 0) {
        pendingSeekMs = Math.round(initSec * 1000);
        var applyInitialSeek = function () {
          if (!currentAudio) return;
          try {
            currentAudio.currentTime = Math.min(initSec, (currentAudio.duration || initSec));
          } catch (_) {}
        };
        currentAudio.addEventListener('loadedmetadata', applyInitialSeek, { once: true });
        currentAudio.addEventListener('canplay', applyInitialSeek, { once: true });
      }

      updatePlayUi(true, 0);

      currentAudio.ontimeupdate = function () {
        if (!currentAudio) return;
        var dur = currentAudio.duration;
        var cur = currentAudio.currentTime;
        if (dur > 0) {
          var pct = (cur / dur) * 100;
          updatePlayUi(true, pct);
        }
      };

      currentAudio.onended = function () {
        stopKaraokeSync();
        var charEls = document.querySelectorAll('.fz-sentence-jp .fz-karaoke-char, .fz-quiz-q-jp .fz-karaoke-char');
        if (charEls && charEls.length) {
          charEls.forEach(function (el) {
            el.classList.remove('fz-karaoke-active');
            el.classList.add('fz-karaoke-passed');
          });
        }
        updatePlayUi(false, 100);
        handleSceneAudioEnded(sceneIdx);
      };

      currentAudio.onerror = function () {
        console.warn('[FiezelStoryReader] Gagal memuat berkas audio:', scene.audioSrc);
        stopAudio();
      };

      var p = currentAudio.play();
      if (p !== undefined) {
        p.then(function () {
          isPlaying = true;
          if (initSec > 0) {
            try { currentAudio.currentTime = initSec; } catch (_) {}
          }
          startKaraokeSync(activeStoryId, sceneIdx);
          if (initSec > 0) {
            updateKaraokeState(Math.round(initSec * 1000), activeStoryId, sceneIdx);
          }
        }).catch(function (err) {
          console.warn('[FiezelStoryReader] Autoplay ditolak/tertahan:', err);
          isPlaying = false;
          updatePlayUi(false, 0);
          stopKaraokeSync();
        });
      } else {
        startKaraokeSync(activeStoryId, sceneIdx);
      }
    } catch (e) {
      console.warn('[FiezelStoryReader] Audio init error:', e);
      stopAudio();
    }
  }

  function handleSceneAudioEnded(endedSceneIdx) {
    var story = getStoryById(activeStoryId);
    if (endedSceneIdx < 3) {
      // Adegan 1, 2, atau 3 selesai: Lanjut otomatis ke adegan berikutnya (1 -> 2 -> 3 -> 4)
      var nextIdx = endedSceneIdx + 1;
      autoAdvanceTimer = setTimeout(function () {
        activeSceneIndex = nextIdx;
        var target = getMountTarget();
        if (target) renderStory(target);
        playSceneAudio(nextIdx);
      }, 700);
    } else if (endedSceneIdx === 3) {
      // Adegan 4 selesai: Transisi halus ke Adegan 5 (Kuis Pemahaman Akhir)
      autoAdvanceTimer = setTimeout(function () {
        activeSceneIndex = 4;
        var target = getMountTarget();
        if (target) renderStory(target);
        // Putar audio pertanyaan kuis
        if (story && story.scenes && story.scenes[4] && story.scenes[4].audioSrc) {
          playSceneAudio(4);
        } else {
          stopAudio();
        }
      }, 1200);
    } else {
      // Audio kuis selesai
      stopAudio();
    }
  }

  function toggleAudio() {
    if (isPlaying) {
      if (currentAudio) {
        try { currentAudio.pause(); } catch (_) {}
      }
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
      }
      isPlaying = false;
      updatePlayUi(false);
    } else {
      if (currentAudio && currentAudio.paused && currentAudio.currentTime > 0 && currentAudio.currentTime < (currentAudio.duration || 0)) {
        isPlaying = true;
        updatePlayUi(true);
        var p = currentAudio.play();
        if (p !== undefined) {
          p.catch(function () {
            playSceneAudio(activeSceneIndex);
          });
        }
      } else {
        playSceneAudio(activeSceneIndex);
      }
    }
  }

  function seekAudio(e) {
    if (!currentAudio || !currentAudio.duration) return;
    var bar = e.currentTarget;
    if (!bar) return;
    var rect = bar.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var ratio = Math.max(0, Math.min(1, x / rect.width));
    try {
      currentAudio.currentTime = ratio * currentAudio.duration;
      updatePlayUi(isPlaying, ratio * 100);
      updateKaraokeState(currentAudio.currentTime * 1000, activeStoryId, activeSceneIndex);
    } catch (_) {}
  }

  return {
    STORIES: STORIES,
    normalizeStoryRubyMarkup: normalizeStoryRubyMarkup,
    mount: mount,
    openStory: openStory,
    openLibrary: openLibrary,
    gotoScene: gotoScene,
    toggleFurigana: toggleFurigana,
    inspectWord: inspectWord,
    closePopover: closePopover,
    evaluateQuiz: evaluateQuiz,
    toggleAudio: toggleAudio,
    seekAudio: seekAudio,
    stopAudio: stopAudio,
    playSceneAudio: playSceneAudio,
    handleSceneAudioEnded: handleSceneAudioEnded,
    seekToChar: seekToChar,
    getSceneCharTimings: getSceneCharTimings,
    renderKaraokeSentenceMarkup: renderKaraokeSentenceMarkup,
    startKaraokeSync: startKaraokeSync,
    stopKaraokeSync: stopKaraokeSync,
    updateKaraokeState: updateKaraokeState,
    getCurrentAudio: function () { return currentAudio; },
    getIsPlaying: function () { return isPlaying; },
    getActiveSceneIndex: function () { return activeSceneIndex; },
    getActiveStoryId: function () { return activeStoryId; }
  };
}));
