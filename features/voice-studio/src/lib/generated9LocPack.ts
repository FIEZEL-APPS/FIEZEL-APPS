// Auto-generated 9-locale native translation pack for Voice Studio
import type { LearnerLocale } from '../types/voiceCall';

export interface ScenarioTransEntry {
  title?: string;
  subtitle?: string;
  competency?: string;
  competencyName?: string;
  situation?: string;
  openingTranslation?: string;
  missionGoals?: string[];
  sampleLabels?: string[];
}

export interface PersonaTransEntry {
  role?: string;
  personalityTag?: string;
  roastStyle?: string;
  openingGreetingTranslation?: string;
  levelRange?: string;
}

export const VS_EXTRA_MULTI_UI: Partial<Record<LearnerLocale, Record<string, string>>> = {
  "ms": {
    "app.brand": "Studio Suara AI FIEZEL",
    "app.subtitle": "Tutor pertuturan langsung · Terjemahan masa nyata & penilaian Braincore",
    "nav.scenarios": "Senario",
    "nav.activeCall": "Panggilan Aktif",
    "nav.braincore": "Braincore",
    "course.en": "Bahasa Inggeris",
    "course.ja": "Bahasa Jepun",
    "locale.id": "Bahasa Indonesia",
    "locale.th": "ภาษาไทย",
    "hero.kicker": "Rakan Pertuturan AI",
    "hero.title": "Bertutur secara semula jadi dengan Mochi",
    "hero.desc": "Perbualan suara masa nyata dengan terjemahan langsung, panduan sebutan, dan telemetri Braincore.",
    "mode.live": "FaceTime Langsung",
    "mode.turn": "Giliran Demi Giliran",
    "call.startLive": "Mulakan Panggilan FaceTime",
    "call.endLive": "Tamatkan Panggilan",
    "call.connecting": "Menyambung...",
    "call.connected": "Disambungkan",
    "call.pushToTalk": "Tahan atau ketik untuk bercakap",
    "call.stopRecording": "Hentikan rakaman",
    "call.sendText": "Hantar",
    "call.placeholder": "Atau taip ayat anda di sini...",
    "call.replayAi": "Mainkan Suara",
    "call.measureBadge": "Mod Peperiksaan",
    "call.practiceBadge": "Mod Latihan",
    "call.examPurityNotice": "Mod peperiksaan menyembunyikan petunjuk dan furigana untuk penilaian yang objektif.",
    "call.scaffoldTitle": "Idea Balasan",
    "call.hintButton": "Tunjukkan Bantuan Jawapan",
    "call.samplePrompts": "Contoh Jawapan",
    "prereq.bypassReady": "Prasyarat dikuasai",
    "prereq.lockedTitle": "Buka Kunci Prasyarat Kosa Kata",
    "prereq.lockedDesc": "Semak istilah utama ini sekali agar perbualan anda berjalan lancar.",
    "prereq.completeBtn": "Saya faham — mulakan perbualan",
    "diag.correctHeader": "Struktur Kemas!",
    "diag.wrongHeader": "Semakan Struktur",
    "diag.exactInputLabel": "Apa yang anda katakan:",
    "diag.whyFailsLabel": "Sebab perlu disesuaikan:",
    "diag.missingWordsLabel": "Perkataan untuk ditambah:",
    "diag.correctionLabel": "Bentuk yang lebih kemas:",
    "diag.naturalLabel": "Alternatif semula jadi:",
    "dash.title": "Peta Pertuturan Braincore",
    "dash.subtitle": "Telemetri BKT, FSRS & OLM masa nyata merentas senario",
    "dash.viewTrend": "Trend",
    "dash.viewBreakdown": "Pecahan",
    "dash.statFluency": "Kefasihan",
    "dash.statGrammar": "Ketepatan Tatabahasa",
    "dash.statTime": "Masa Bertutur",
    "dash.statTurns": "Jumlah Giliran",
    "dash.legendGrammar": "Tatabahasa",
    "dash.legendFluency": "Kefasihan",
    "dash.legendBkt": "Penguasaan (BKT)",
    "dash.legendVocab": "Kepelbagaian Kosa Kata",
    "dash.recentTurns": "Giliran Perbualan Terkini",
    "olm.title": "Model Pelajar Terbuka (OLM)",
    "olm.subtitle": "Kemahiran yang dijejaki oleh Braincore merentas sesi suara terkini",
    "olm.syncBtn": "Segerakkan dengan Akaun",
    "olm.synced": "Disegerakkan",
    "olm.ledgerTitle": "Lejar Salah Konsep",
    "olm.ledgerEmpty": "Tiada salah konsep berulang dikesan lagi. Teruskan bertutur!",
    "state.NOT_EXPOSED": "Belum Dimulakan",
    "state.EXPOSED": "Diperkenalkan",
    "state.PRACTICING": "Sedang Berlatih",
    "state.DEVELOPING": "Sedang Berkembang",
    "state.MASTERED": "Dikuasai",
    "state.RETAINED": "Dikekalkan",
    "state.TRANSFERRED": "Dipindahkan",
    "ui.switchPersona": "Tukar Rakan & Gaya Suara",
    "ui.whiteboard": "Papan Putih",
    "ui.tacticalBoard": "Papan Taktikal",
    "ui.casualMode": "☕ Santai",
    "ui.mentorMode": "🎓 Mentor",
    "ui.cefrBtnTitle": "Pilih Tahap Sasaran CEFR (A1 - C2)",
    "ui.levelWord": "Tahap",
    "ui.listening": "Mochi sedang mendengar… (jeda berfikir)",
    "ui.speakingNow": "Sedang bertutur...",
    "ui.mochiSpeakingStatus": "Mochi sedang bertutur...",
    "ui.recordingStatus": "Merakam suara...",
    "ui.micMutedShort": "Mik dibisukan",
    "ui.preparingReply": "Menyediakan balasan...",
    "ui.loadingTranslation": "Menterjemah...",
    "ui.translationLabel": "Maksud / Terjemahan:",
    "ui.hide": "👁️ Sembunyikan",
    "ui.showTranslation": "👁️ Tunjukkan Terjemahan",
    "ui.hideTitle": "Sembunyikan terjemahan",
    "ui.showTitle": "Tunjukkan terjemahan",
    "ui.playing": "Sedang dimainkan...",
    "ui.playAtRate": "Mainkan audio pada kelajuan semasa",
    "ui.youLabel": "Anda:",
    "ui.handsFreeSub": "Bebas Tangan · Mik dua hala sedia untuk perbualan langsung",
    "ui.startFaceTimeTitle": "Mulakan panggilan suara FaceTime bebas tangan",
    "ui.micOff": "Mik Mati",
    "ui.youSpeak": "Sedang bertutur...",
    "ui.mochiSpeakMic": "Mochi Sedang Bercakap · Mik Hidup",
    "ui.mochiSpeak": "Mochi Sedang Bercakap",
    "ui.tapEnableMic": "Ketik untuk Hidupkan Mik",
    "ui.micOn": "Mik Aktif",
    "ui.enableMicTitle": "Hidupkan Mik",
    "ui.muteMicTitle": "Bisukan Mik",
    "ui.endCallTitle": "Tamatkan Panggilan FaceTime",
    "ui.freeGem": "🧪 Permata Percuma",
    "ui.freeDaily": "🎁 Percuma",
    "ui.choosePersonaTitle": "Pilih Rakan & Gaya Suara",
    "ui.choosePersonaSub": "Pilih mentor dengan gaya pengajaran, loghat dan tahap maklum balas yang anda sukai",
    "ui.availableMentors": "Mentor Fiezel",
    "ui.tapToSwitch": "Ketik untuk tukar",
    "ui.rateSlow": "0.85x - Santai & Jelas",
    "ui.rateNatural": "0.92x - Semula Jadi & Seimbang",
    "ui.rateNormal": "1.0x - Kelajuan Normal Penutur Jati",
    "ui.tapInterrupt": "Ketik untuk mencelah Mochi",
    "ui.prereqUnlockedToast": "Prasyarat kosa kata telah dikuasai!",
    "ui.sswUnlockedHint": "Cubalah",
    "ui.modelAnswerBtn": "Jawapan Contoh",
    "ui.refreshIdeas": "Dapatkan idea balasan baharu",
    "ui.bestAnswer": "Jawapan Terbaik",
    "ui.modelTranslationLabel": "Terjemahan Jawapan Contoh",
    "ui.listenTitle": "Dengar sebutan",
    "ui.speakTitle": "Berlatih menyebut ayat ini",
    "ui.tabShort": "1 · Ringkas",
    "ui.tabNatural": "2 · Semula Jadi",
    "ui.tabFollowUp": "3 · + Susulan",
    "ui.toggleShowIdeas": "Tunjukkan idea ayat",
    "ui.toggleHideIdeas": "Sembunyikan butiran bantuan",
    "home.studioEn": "Bahasa Inggeris · Studio Bahasa Inggeris",
    "home.studioJa": "Bahasa Jepun · Studio Bahasa Jepun",
    "home.studioZh": "Bahasa Mandarin · Studio Bahasa Mandarin",
    "home.readyDesc": "Panggilan suara interaktif bersama Mochi yang menampilkan terjemahan langsung, panduan sebutan dan penilaian Braincore.",
    "home.filterFree": "Perbualan Bebas",
    "home.filterDaily": "Kehidupan Harian",
    "home.filterAcademic": "Pengenalan & Pendapat",
    "home.dailyGoal": "Sasaran Bertutur Harian",
    "home.turnsLeftSuffix": "lagi giliran bertutur hari ini",
    "home.goalDone": "Sasaran harian tercapai!",
    "home.streakDays": "Hari Berturut-turut",
    "home.accuracy": "Penguasaan Aktif (Braincore)",
    "home.mochiPickPrefix": "Pilihan Mochi",
    "home.openingPromptLabel": "Soalan Pembukaan Mochi:",
    "home.mochiHelperTitle": "Mochi Rakan Bertutur Anda",
    "home.mochiHelperSub": "● Sedia untuk Panggilan & Membantu",
    "home.pickFocusTitle": "Pilih Fokus Hari Ini",
    "home.pickFocusSub": "Semak kosa kata utama atau dengar contoh sebutan sebelum memulakan panggilan anda",
    "home.braincoreMap": "Peta Braincore",
    "home.liveCallTitle": "Panggilan Langsung Fiezel",
    "home.activeScenarios": "senario aktif",
    "home.pickScenarioTitle": "Pilih Senario Perbualan",
    "home.readyToTalk": "Sedia untuk Berbual",
    "home.vocabPrereq": "Prasyarat Kosa Kata",
    "home.hideMascot": "Sembunyikan maskot",
    "home.talkWithMochi": "Berbual terus dengan Mochi",
    "home.studioVocabTile": "Kosa Kata",
    "home.vocabCoreSuffix": "perkataan prasyarat teras",
    "home.studioGrammarTile": "Tatabahasa",
    "home.studioShadowTile": "Bayangan Suara",
    "home.studioShadowSub": "Dengar & ulang sebutan Mochi",
    "home.panelVocabLabel": "STUDIO KOSA KATA PRASYARAT",
    "home.panelGrammarLabel": "STUDIO POLA TATABAHASA",
    "home.panelShadowLabel": "STUDIO BAYANGAN SEBUTAN",
    "home.closeStudio": "Tutup studio",
    "home.listenTermPrefix": "Dengar",
    "home.markVocabMastered": "Tandakan Kosa Kata Dikuasai (Braincore BKT)",
    "home.practiceInCall": "Berlatih dalam Panggilan Suara",
    "home.competencyFocusLabel": "Fokus Kecekapan:",
    "home.tapListenNatural": "Ketik ayat di bawah untuk mendengar sebutan semula jadi:",
    "home.mochiOpeningSentence": "Ayat Pembuka Mochi",
    "home.listenPronBtn": "Dengar",
    "home.scenariosAvailSuffix": "senario tersedia",
    "home.ariaDailyRhythm": "Ucapan harian dan rentak pertuturan",
    "home.ariaContinue": "Teruskan belajar",
    "home.ariaPickFocus": "Pilih fokus",
    "home.ariaScenarioTrack": "Laluan senario perbualan",
    "home.ariaMascot": "Maskot Mochi",
    "home.goalAriaSuffix": "sasaran pertuturan harian",
    "ui.scenarioTrackLabel": "Senario & Topik",
    "ui.scenariosShort": "senario",
    "ui.activeTag": "Aktif",
    "ui.chooseBtn": "Pilih",
    "ui.startTalkWith": "Mula Berbual dengan",
    "ui.speakShortBtn": "Bercakap",
    "ui.sendShortBtn": "Hantar",
    "ui.typeMsgPlaceholder": "Taip mesej...",
    "ui.handsFreeBtn": "Bebas Tangan",
    "ui.transcriptHeading": "Transkrip Perbualan",
    "ui.backToFaceTime": "Kembali ke Panggilan Langsung",
    "ui.resetBtn": "Mula semula",
    "ui.emptyChatTitle": "Bersedia untuk memulakan perbualan anda",
    "ui.emptyChatDesc": "Bercakap ke dalam mikrofon, pilih cadangan balasan di atas, atau taip mesej di bawah. Sejarah sembang dan maklum balas tatabahasa anda akan dipaparkan di sini.",
    "ui.backToCall": "← Kembali ke Panggilan",
    "ui.matrixTitle": "Matriks Kecekapan Kurikulum Aktif",
    "ui.competencyCol": "Kecekapan",
    "ui.detectedSuffix": "x dikesan",
    "ui.thinkingPauseTag": "(jeda berfikir...)",
    "ui.coachSpeakingInterrupt": "Jurulatih sedang bercakap",
    "ui.coachInterruptHint": "· mikrofon aktif, bercakap bila-bila masa untuk mencelah",
    "ui.micOffBanner": "Mik dibisukan",
    "ui.micOffHint": ": ketik butang mikrofon untuk nyahbisu",
    "ui.micHandsFreeBanner": "Mikrofon bebas tangan aktif",
    "ui.micHandsFreeHint": ": bercakap secara semula jadi tanpa menekan butang",
    "ui.listeningPleaseSpeak": "Mendengar... Sila bercakap",
    "ui.micMutedTitle": "Mikrofon dibisukan. Klik untuk mengaktifkan suara.",
    "ui.micActiveTitle": "Bebas tangan aktif. Klik untuk membisukan suara.",
    "ui.interruptAndSpeak": "Celah rakan & bercakap",
    "ui.homeTab": "Utama",
    "ui.voiceTab": "Panggilan Suara",
    "ui.speakPartnerBrandJA": "Rakan Kaiwa",
    "ui.speakPartnerBrand": "Rakan Pertuturan",
    "ui.gemModalFeatureDesc": "Ciri ini menggunakan Permata, yang boleh anda peroleh secara percuma daripada latihan harian.",
    "ui.cancelBtn": "Batal",
    "ui.connectBtn": "Sambung",
    "ui.notEnoughGemsTitle": "Permata Tidak Mencukupi",
    "ui.understoodBtn": "Faham",
    "ui.connectLiveNow": "Sambung Panggilan Langsung Sekarang"
  },
  "vi": {
    "app.brand": "Studio Giọng nói AI FIEZEL",
    "app.subtitle": "Gia sư luyện nói trực tiếp · Dịch thời gian thực & đánh giá Braincore",
    "nav.scenarios": "Tình huống",
    "nav.activeCall": "Cuộc gọi đang diễn ra",
    "nav.braincore": "Braincore",
    "course.en": "Tiếng Anh",
    "course.ja": "Tiếng Nhật",
    "locale.id": "Tiếng Indonesia",
    "locale.th": "Tiếng Thái",
    "hero.kicker": "Bạn đồng hành luyện nói AI",
    "hero.title": "Trò chuyện tự nhiên cùng Mochi",
    "hero.desc": "Hội thoại giọng nói thời gian thực với bản dịch trực tiếp, hướng dẫn phát âm và dữ liệu đo lường Braincore.",
    "mode.live": "FaceTime trực tiếp",
    "mode.turn": "Theo từng lượt",
    "call.startLive": "Bắt đầu cuộc gọi FaceTime",
    "call.endLive": "Kết thúc cuộc gọi",
    "call.connecting": "Đang kết nối...",
    "call.connected": "Đã kết nối",
    "call.pushToTalk": "Nhấn giữ hoặc chạm để nói",
    "call.stopRecording": "Dừng ghi âm",
    "call.sendText": "Gửi",
    "call.placeholder": "Hoặc nhập câu của bạn vào đây...",
    "call.replayAi": "Phát giọng nói",
    "call.measureBadge": "Chế độ thi",
    "call.practiceBadge": "Chế độ luyện tập",
    "call.examPurityNotice": "Chế độ thi ẩn gợi ý và furigana để đánh giá khách quan.",
    "call.scaffoldTitle": "Gợi ý trả lời",
    "call.hintButton": "Hiện trợ giúp đáp án",
    "call.samplePrompts": "Câu trả lời mẫu",
    "prereq.bypassReady": "Đã nắm vững kiến thức tiên quyết",
    "prereq.lockedTitle": "Mở khóa từ vựng tiên quyết",
    "prereq.lockedDesc": "Ôn lại các từ khóa này một lần để cuộc hội thoại diễn ra trôi chảy.",
    "prereq.completeBtn": "Tôi đã hiểu — bắt đầu hội thoại",
    "diag.correctHeader": "Cấu trúc chuẩn xác!",
    "diag.wrongHeader": "Đánh giá cấu trúc",
    "diag.exactInputLabel": "Điều bạn đã nói:",
    "diag.whyFailsLabel": "Lý do cần điều chỉnh:",
    "diag.missingWordsLabel": "Từ cần thêm:",
    "diag.correctionLabel": "Cách diễn đạt chuẩn hơn:",
    "diag.naturalLabel": "Cách nói tự nhiên khác:",
    "dash.title": "Bản đồ Braincore Kỹ năng Nói",
    "dash.subtitle": "Dữ liệu đo lường BKT, FSRS & OLM theo thời gian thực qua các tình huống",
    "dash.viewTrend": "Xu hướng",
    "dash.viewBreakdown": "Chi tiết",
    "dash.statFluency": "Độ trôi chảy",
    "dash.statGrammar": "Độ chính xác ngữ pháp",
    "dash.statTime": "Thời lượng nói",
    "dash.statTurns": "Tổng số lượt",
    "dash.legendGrammar": "Ngữ pháp",
    "dash.legendFluency": "Độ trôi chảy",
    "dash.legendBkt": "Mức độ thành thạo (BKT)",
    "dash.legendVocab": "Độ đa dạng từ vựng",
    "dash.recentTurns": "Các lượt hội thoại gần đây",
    "olm.title": "Mô hình Người học Mở (OLM)",
    "olm.subtitle": "Các kỹ năng được Braincore theo dõi qua các phiên luyện nói gần đây",
    "olm.syncBtn": "Đồng bộ với tài khoản",
    "olm.synced": "Đã đồng bộ",
    "olm.ledgerTitle": "Sổ theo dõi lỗi sai thường gặp",
    "olm.ledgerEmpty": "Chưa phát hiện lỗi sai lặp lại nào. Hãy tiếp tục luyện nói nhé!",
    "state.NOT_EXPOSED": "Chưa bắt đầu",
    "state.EXPOSED": "Đã làm quen",
    "state.PRACTICING": "Đang luyện tập",
    "state.DEVELOPING": "Đang tiến bộ",
    "state.MASTERED": "Đã thành thạo",
    "state.RETAINED": "Đã ghi nhớ bền vững",
    "state.TRANSFERRED": "Đã vận dụng linh hoạt",
    "ui.switchPersona": "Đổi bạn đồng hành & phong cách giọng nói",
    "ui.whiteboard": "Bảng trắng",
    "ui.tacticalBoard": "Bảng chiến thuật",
    "ui.casualMode": "☕ Thân mật",
    "ui.mentorMode": "🎓 Cố vấn",
    "ui.cefrBtnTitle": "Chọn trình độ CEFR mục tiêu (A1 - C2)",
    "ui.levelWord": "Trình độ",
    "ui.listening": "Mochi đang lắng nghe… (quãng nghỉ suy nghĩ)",
    "ui.speakingNow": "Đang nói...",
    "ui.mochiSpeakingStatus": "Mochi đang nói...",
    "ui.recordingStatus": "Đang ghi âm giọng nói...",
    "ui.micMutedShort": "Đã tắt mic",
    "ui.preparingReply": "Đang chuẩn bị câu trả lời...",
    "ui.loadingTranslation": "Đang dịch...",
    "ui.translationLabel": "Nghĩa / Bản dịch:",
    "ui.hide": "👁️ Ẩn",
    "ui.showTranslation": "👁️ Hiện bản dịch",
    "ui.hideTitle": "Ẩn bản dịch",
    "ui.showTitle": "Hiện bản dịch",
    "ui.playing": "Đang phát...",
    "ui.playAtRate": "Phát âm thanh ở tốc độ hiện tại",
    "ui.youLabel": "Bạn:",
    "ui.handsFreeSub": "Rảnh tay · Mic hai chiều sẵn sàng cho cuộc trò chuyện trực tiếp",
    "ui.startFaceTimeTitle": "Bắt đầu cuộc gọi thoại FaceTime rảnh tay",
    "ui.micOff": "Mic đang tắt",
    "ui.youSpeak": "Đang nói...",
    "ui.mochiSpeakMic": "Mochi đang nói · Mic đang bật",
    "ui.mochiSpeak": "Mochi đang nói",
    "ui.tapEnableMic": "Chạm để bật mic",
    "ui.micOn": "Mic đang bật",
    "ui.enableMicTitle": "Bật mic",
    "ui.muteMicTitle": "Tắt mic",
    "ui.endCallTitle": "Kết thúc cuộc gọi FaceTime",
    "ui.freeGem": "🧪 Gem miễn phí",
    "ui.freeDaily": "🎁 Miễn phí",
    "ui.choosePersonaTitle": "Chọn bạn đồng hành & phong cách giọng nói",
    "ui.choosePersonaSub": "Chọn người hướng dẫn có phong cách giảng dạy, giọng điệu và mức độ phản hồi bạn thích",
    "ui.availableMentors": "Người hướng dẫn Fiezel",
    "ui.tapToSwitch": "Chạm để chuyển đổi",
    "ui.rateSlow": "0.85x - Chậm rãi & rõ ràng",
    "ui.rateNatural": "0.92x - Tự nhiên & cân bằng",
    "ui.rateNormal": "1.0x - Tốc độ người bản xứ bình thường",
    "ui.tapInterrupt": "Chạm để ngắt lời Mochi",
    "ui.prereqUnlockedToast": "Đã nắm vững từ vựng nền tảng!",
    "ui.sswUnlockedHint": "Thử ngay",
    "ui.modelAnswerBtn": "Câu trả lời mẫu",
    "ui.refreshIdeas": "Lấy ý tưởng trả lời mới",
    "ui.bestAnswer": "Câu trả lời hay nhất",
    "ui.modelTranslationLabel": "Bản dịch câu trả lời mẫu",
    "ui.listenTitle": "Nghe phát âm",
    "ui.speakTitle": "Luyện nói câu này",
    "ui.tabShort": "1 · Ngắn gọn",
    "ui.tabNatural": "2 · Tự nhiên",
    "ui.tabFollowUp": "3 · + Hỏi thêm",
    "ui.toggleShowIdeas": "Hiện gợi ý câu nói",
    "ui.toggleHideIdeas": "Ẩn chi tiết trợ giúp",
    "home.studioEn": "Tiếng Anh · Studio Tiếng Anh",
    "home.studioJa": "Tiếng Nhật · Studio Tiếng Nhật",
    "home.studioZh": "Tiếng Trung · Studio Tiếng Trung",
    "home.readyDesc": "Cuộc gọi thoại tương tác cùng Mochi với tính năng dịch trực tiếp, hướng dẫn phát âm và đánh giá Braincore.",
    "home.filterFree": "Trò chuyện tự do",
    "home.filterDaily": "Đời sống hằng ngày",
    "home.filterAcademic": "Giới thiệu & Quan điểm",
    "home.dailyGoal": "Mục tiêu nói hằng ngày",
    "home.turnsLeftSuffix": "lượt nói nữa trong hôm nay",
    "home.goalDone": "Đã đạt mục tiêu hôm nay!",
    "home.streakDays": "Chuỗi ngày học",
    "home.accuracy": "Mức độ thành thạo (Braincore)",
    "home.mochiPickPrefix": "Gợi ý của Mochi",
    "home.openingPromptLabel": "Câu hỏi mở đầu của Mochi:",
    "home.mochiHelperTitle": "Mochi - Bạn đồng hành luyện nói của bạn",
    "home.mochiHelperSub": "● Sẵn sàng gọi & hỗ trợ",
    "home.pickFocusTitle": "Chọn trọng tâm hôm nay",
    "home.pickFocusSub": "Ôn lại từ vựng trọng tâm hoặc nghe phát âm mẫu trước khi bắt đầu cuộc gọi",
    "home.braincoreMap": "Bản đồ Braincore",
    "home.liveCallTitle": "Cuộc gọi Fiezel trực tiếp",
    "home.activeScenarios": "tình huống đang hoạt động",
    "home.pickScenarioTitle": "Chọn tình huống hội thoại",
    "home.readyToTalk": "Sẵn sàng trò chuyện",
    "home.vocabPrereq": "Từ vựng nền tảng",
    "home.hideMascot": "Ẩn linh vật",
    "home.talkWithMochi": "Trò chuyện trực tiếp với Mochi",
    "home.studioVocabTile": "Từ vựng",
    "home.vocabCoreSuffix": "từ vựng nền tảng cốt lõi",
    "home.studioGrammarTile": "Ngữ pháp",
    "home.studioShadowTile": "Luyện nói nhại theo giọng",
    "home.studioShadowSub": "Nghe & lặp lại phát âm của Mochi",
    "home.panelVocabLabel": "STUDIO TỪ VỰNG TIÊN QUYẾT",
    "home.panelGrammarLabel": "STUDIO MẪU NGỮ PHÁP",
    "home.panelShadowLabel": "STUDIO LUYỆN PHÁT ÂM SHADOWING",
    "home.closeStudio": "Đóng studio",
    "home.listenTermPrefix": "Nghe",
    "home.markVocabMastered": "Đánh dấu đã thành thạo từ vựng (Braincore BKT)",
    "home.practiceInCall": "Luyện tập trong Cuộc gọi thoại",
    "home.competencyFocusLabel": "Trọng tâm năng lực:",
    "home.tapListenNatural": "Chạm vào một câu bên dưới để nghe phát âm tự nhiên:",
    "home.mochiOpeningSentence": "Câu mở đầu của Mochi",
    "home.listenPronBtn": "Nghe",
    "home.scenariosAvailSuffix": "tình huống có sẵn",
    "home.ariaDailyRhythm": "Chào hỏi hằng ngày và nhịp điệu nói",
    "home.ariaContinue": "Tiếp tục học",
    "home.ariaPickFocus": "Chọn trọng tâm",
    "home.ariaScenarioTrack": "Lộ trình tình huống hội thoại",
    "home.ariaMascot": "Linh vật Mochi",
    "home.goalAriaSuffix": "mục tiêu nói hằng ngày",
    "ui.scenarioTrackLabel": "Tình huống & Chủ đề",
    "ui.scenariosShort": "tình huống",
    "ui.activeTag": "Đang hoạt động",
    "ui.chooseBtn": "Chọn",
    "ui.startTalkWith": "Bắt đầu trò chuyện với",
    "ui.speakShortBtn": "Nói",
    "ui.sendShortBtn": "Gửi",
    "ui.typeMsgPlaceholder": "Nhập tin nhắn...",
    "ui.handsFreeBtn": "Rảnh tay",
    "ui.transcriptHeading": "Bản ghi hội thoại",
    "ui.backToFaceTime": "Quay lại Cuộc gọi trực tiếp",
    "ui.resetBtn": "Bắt đầu lại",
    "ui.emptyChatTitle": "Sẵn sàng bắt đầu cuộc trò chuyện của bạn",
    "ui.emptyChatDesc": "Hãy nói vào micro, chọn một câu trả lời gợi ý ở trên hoặc nhập tin nhắn bên dưới. Lịch sử trò chuyện và phản hồi ngữ pháp của bạn sẽ hiển thị tại đây.",
    "ui.backToCall": "← Quay lại Cuộc gọi",
    "ui.matrixTitle": "Ma trận năng lực chương trình học hiện tại",
    "ui.competencyCol": "Năng lực",
    "ui.detectedSuffix": "lần được phát hiện",
    "ui.thinkingPauseTag": "(đang tạm dừng suy nghĩ...)",
    "ui.coachSpeakingInterrupt": "Huấn luyện viên đang nói",
    "ui.coachInterruptHint": "· micro đang bật, hãy nói bất cứ lúc nào để ngắt lời",
    "ui.micOffBanner": "Đã tắt mic",
    "ui.micOffHint": ": chạm vào nút micro để bật tiếng",
    "ui.micHandsFreeBanner": "Micro rảnh tay đang bật",
    "ui.micHandsFreeHint": ": nói tự nhiên mà không cần nhấn nút",
    "ui.listeningPleaseSpeak": "Đang nghe... Mời bạn nói",
    "ui.micMutedTitle": "Micro đã tắt tiếng. Nhấp để bật giọng nói.",
    "ui.micActiveTitle": "Chế độ rảnh tay đang bật. Nhấp để tắt tiếng.",
    "ui.interruptAndSpeak": "Ngắt lời bạn đồng hành & nói",
    "ui.homeTab": "Trang chủ",
    "ui.voiceTab": "Cuộc gọi thoại",
    "ui.speakPartnerBrandJA": "Bạn luyện Kaiwa",
    "ui.speakPartnerBrand": "Bạn luyện nói",
    "ui.gemModalFeatureDesc": "Tính năng này sử dụng Ngọc, bạn có thể kiếm miễn phí từ việc luyện tập hằng ngày.",
    "ui.cancelBtn": "Hủy",
    "ui.connectBtn": "Kết nối",
    "ui.notEnoughGemsTitle": "Không đủ Ngọc",
    "ui.understoodBtn": "Đã hiểu",
    "ui.connectLiveNow": "Kết nối cuộc gọi trực tiếp ngay"
  },
  "fil": {
    "app.brand": "FIEZEL AI Voice Studio",
    "app.subtitle": "Live na tutor sa pagsasalita · Real-time na pagsasalin at pagsusuri ng Braincore",
    "nav.scenarios": "Mga Senaryo",
    "nav.activeCall": "Kasalukuyang Tawag",
    "nav.braincore": "Braincore",
    "course.en": "Ingles",
    "course.ja": "Hapones",
    "locale.id": "Bahasa Indonesia",
    "locale.th": "ภาษาไทย",
    "hero.kicker": "AI na Kasama sa Pagsasalita",
    "hero.title": "Magsalita nang natural kasama si Mochi",
    "hero.desc": "Real-time na pakikipag-usap gamit ang boses na may live na pagsasalin, gabay sa pagbigkas, at telemetry ng Braincore.",
    "mode.live": "Live na FaceTime",
    "mode.turn": "Salitan",
    "call.startLive": "Simulan ang Tawag sa FaceTime",
    "call.endLive": "Tapusin ang Tawag",
    "call.connecting": "Kumokonekta...",
    "call.connected": "Nakakonekta",
    "call.pushToTalk": "Pindutin nang matagal o i-tap para magsalita",
    "call.stopRecording": "Ihinto ang pag-record",
    "call.sendText": "Ipadala",
    "call.placeholder": "O i-type ang iyong pangungusap dito...",
    "call.replayAi": "I-play ang Boses",
    "call.measureBadge": "Mode ng Pagsusulit",
    "call.practiceBadge": "Mode ng Pagsasanay",
    "call.examPurityNotice": "Itinatago ng mode ng pagsusulit ang mga pahiwatig at furigana para sa obhetibong pagtatasa.",
    "call.scaffoldTitle": "Mga Ideya sa Sagot",
    "call.hintButton": "Ipakita ang Tulong sa Sagot",
    "call.samplePrompts": "Mga Halimbawang Sagot",
    "prereq.bypassReady": "Kabisado na ang mga pangunang kailangan",
    "prereq.lockedTitle": "I-unlock ang mga Kailangang Bokabularyo",
    "prereq.lockedDesc": "Balikan muna ang mga mahahalagang salitang ito nang isang beses para maging maayos ang takbo ng usapan ninyo.",
    "prereq.completeBtn": "Naiintindihan ko — simulan ang usapan",
    "diag.correctHeader": "Malinis ang Pagkakabuo!",
    "diag.wrongHeader": "Pagsusuri ng Estruktura",
    "diag.exactInputLabel": "Ang sinabi mo:",
    "diag.whyFailsLabel": "Bakit kailangang isaayos:",
    "diag.missingWordsLabel": "Mga salitang idadagdag:",
    "diag.correctionLabel": "Mas malinis na ayos:",
    "diag.naturalLabel": "Natural na alternatibo:",
    "dash.title": "Mapa ng Braincore sa Pagsasalita",
    "dash.subtitle": "Real-time na BKT, FSRS at OLM telemetry sa iba't ibang senaryo",
    "dash.viewTrend": "Takbo",
    "dash.viewBreakdown": "Paghahati-hati",
    "dash.statFluency": "Katatasan",
    "dash.statGrammar": "Kawastuhan sa Gramatika",
    "dash.statTime": "Oras ng Pagsasalita",
    "dash.statTurns": "Kabuuang Palitan",
    "dash.legendGrammar": "Gramatika",
    "dash.legendFluency": "Katatasan",
    "dash.legendBkt": "Kahusayan (BKT)",
    "dash.legendVocab": "Yaman ng Bokabularyo",
    "dash.recentTurns": "Mga Kamakailang Palitan sa Usapan",
    "olm.title": "Open Learner Model (OLM)",
    "olm.subtitle": "Mga kasanayang sinusubaybayan ng Braincore sa mga kamakailang sesyon ng boses",
    "olm.syncBtn": "I-sync sa Account",
    "olm.synced": "Naka-sync na",
    "olm.ledgerTitle": "Talaan ng mga Maling Pagkaunawa",
    "olm.ledgerEmpty": "Wala pang paulit-ulit na maling pagkaunawang nakita. Tuloy lang sa pagsasalita!",
    "state.NOT_EXPOSED": "Hindi Pa Nasimulan",
    "state.EXPOSED": "Naipakilala",
    "state.PRACTICING": "Nagsasanay",
    "state.DEVELOPING": "Umuunlad",
    "state.MASTERED": "Kabisado Na",
    "state.RETAINED": "Nananatili",
    "state.TRANSFERRED": "Nailapat Na",
    "ui.switchPersona": "Palitan ang Kausap at Estilo ng Boses",
    "ui.whiteboard": "Whiteboard",
    "ui.tacticalBoard": "Taktikal na Pisara",
    "ui.casualMode": "☕ Kaswal",
    "ui.mentorMode": "🎓 Mentor",
    "ui.cefrBtnTitle": "Piliin ang Target na Antas ng CEFR (A1 - C2)",
    "ui.levelWord": "Antas",
    "ui.listening": "Nakikinig si Mochi… (sandaling pag-iisip)",
    "ui.speakingNow": "Nagsasalita...",
    "ui.mochiSpeakingStatus": "Nagsasalita si Mochi...",
    "ui.recordingStatus": "Nire-record ang boses...",
    "ui.micMutedShort": "Naka-mute ang mic",
    "ui.preparingReply": "Inihahanda ang sagot...",
    "ui.loadingTranslation": "Isinasalin...",
    "ui.translationLabel": "Kahulugan / Salin:",
    "ui.hide": "👁️ Itago",
    "ui.showTranslation": "👁️ Ipakita ang Salin",
    "ui.hideTitle": "Itago ang salin",
    "ui.showTitle": "Ipakita ang salin",
    "ui.playing": "Pinapatugtog...",
    "ui.playAtRate": "Patugtugin ang audio sa kasalukuyang bilis",
    "ui.youLabel": "Ikaw:",
    "ui.handsFreeSub": "Hands-Free · Handa ang two-way mic para sa live na pag-uusap",
    "ui.startFaceTimeTitle": "Simulan ang hands-free na FaceTime voice call",
    "ui.micOff": "Naka-off ang Mic",
    "ui.youSpeak": "Nagsasalita...",
    "ui.mochiSpeakMic": "Nagsasalita si Mochi · Naka-on ang Mic",
    "ui.mochiSpeak": "Nagsasalita si Mochi",
    "ui.tapEnableMic": "I-tap para I-enable ang Mic",
    "ui.micOn": "Aktibo ang Mic",
    "ui.enableMicTitle": "I-enable ang Mic",
    "ui.muteMicTitle": "I-mute ang Mic",
    "ui.endCallTitle": "Tapusin ang FaceTime Call",
    "ui.freeGem": "🧪 Libreng Gem",
    "ui.freeDaily": "🎁 Libre",
    "ui.choosePersonaTitle": "Pumili ng Partner at Estilo ng Boses",
    "ui.choosePersonaSub": "Pumili ng mentor na may estilo ng pagtuturo, accent, at antas ng feedback na gusto mo",
    "ui.availableMentors": "Mga Mentor ng Fiezel",
    "ui.tapToSwitch": "I-tap para magpalit",
    "ui.rateSlow": "0.85x - Kalmado at Malinaw",
    "ui.rateNatural": "0.92x - Natural at Balanse",
    "ui.rateNormal": "1.0x - Normal na Bilis ng Native",
    "ui.tapInterrupt": "I-tap para sumingit kay Mochi",
    "ui.prereqUnlockedToast": "Kabisado na ang mga kailangang bokabularyo!",
    "ui.sswUnlockedHint": "Subukan",
    "ui.modelAnswerBtn": "Halimbawang Sagot",
    "ui.refreshIdeas": "Kumuha ng bagong ideya ng sagot",
    "ui.bestAnswer": "Pinakamagandang Sagot",
    "ui.modelTranslationLabel": "Salin ng Halimbawang Sagot",
    "ui.listenTitle": "Pakinggan ang pagbigkas",
    "ui.speakTitle": "Sanaying sabihin ang pangungusap na ito",
    "ui.tabShort": "1 · Maikli",
    "ui.tabNatural": "2 · Natural",
    "ui.tabFollowUp": "3 · + Follow-up",
    "ui.toggleShowIdeas": "Ipakita ang mga ideya ng pangungusap",
    "ui.toggleHideIdeas": "Itago ang mga detalye ng tulong",
    "home.studioEn": "Ingles · English Studio",
    "home.studioJa": "Hapones · Japanese Studio",
    "home.studioZh": "Mandarin · Mandarin Studio",
    "home.readyDesc": "Mga interactive na voice call kasama si Mochi na may live na pagsasalin, gabay sa pagbigkas, at pagsusuri ng Braincore.",
    "home.filterFree": "Malayang Usapan",
    "home.filterDaily": "Pang-araw-araw na Buhay",
    "home.filterAcademic": "Pagpapakilala at Opinyon",
    "home.dailyGoal": "Araw-araw na Layunin sa Pagsasalita",
    "home.turnsLeftSuffix": "pang pagkakataong magsalita ngayong araw",
    "home.goalDone": "Naabot na ang layunin para sa araw na ito!",
    "home.streakDays": "Araw na Sunod-sunod",
    "home.accuracy": "Aktibong Kasanayan (Braincore)",
    "home.mochiPickPrefix": "Pili ni Mochi",
    "home.openingPromptLabel": "Pambungad na Tanong ni Mochi:",
    "home.mochiHelperTitle": "Si Mochi, ang Katuwang Mo sa Pagsasalita",
    "home.mochiHelperSub": "● Handang Tumawag at Tumulong",
    "home.pickFocusTitle": "Piliin ang Pokus Ngayong Araw",
    "home.pickFocusSub": "Balikan ang mahahalagang bokabularyo o pakinggan ang mga halimbawang pagbigkas bago simulan ang tawag",
    "home.braincoreMap": "Mapa ng Braincore",
    "home.liveCallTitle": "Live na Tawag sa Fiezel",
    "home.activeScenarios": "aktibong senaryo",
    "home.pickScenarioTitle": "Pumili ng Senaryo ng Usapan",
    "home.readyToTalk": "Handa nang Makipag-usap",
    "home.vocabPrereq": "Mga Kailangang Bokabularyo",
    "home.hideMascot": "Itago ang mascot",
    "home.talkWithMochi": "Makipag-usap nang direkta kay Mochi",
    "home.studioVocabTile": "Bokabularyo",
    "home.vocabCoreSuffix": "mahahalagang kailangang salita",
    "home.studioGrammarTile": "Gramatika",
    "home.studioShadowTile": "Pagsabay sa Boses (Shadowing)",
    "home.studioShadowSub": "Makinig at ulitin ang pagbigkas ni Mochi",
    "home.panelVocabLabel": "STUDIO NG KINAKAILANGANG BOKABULARYO",
    "home.panelGrammarLabel": "STUDIO NG MGA PATTERN SA GRAMATIKA",
    "home.panelShadowLabel": "STUDIO NG SHADOWING SA PAGBIGKAS",
    "home.closeStudio": "Isara ang studio",
    "home.listenTermPrefix": "Makinig sa",
    "home.markVocabMastered": "Markahang Kabisado ang Bokabularyo (Braincore BKT)",
    "home.practiceInCall": "Magsanay sa Voice Call",
    "home.competencyFocusLabel": "Pokus ng Kasanayan:",
    "home.tapListenNatural": "I-tap ang isang pangungusap sa ibaba para marinig ang natural na pagbigkas:",
    "home.mochiOpeningSentence": "Pambungad na Linya ni Mochi",
    "home.listenPronBtn": "Makinig",
    "home.scenariosAvailSuffix": "mga sitwasyong available",
    "home.ariaDailyRhythm": "Araw-araw na pagbati at ritmo sa pagsasalita",
    "home.ariaContinue": "Magpatuloy sa pag-aaral",
    "home.ariaPickFocus": "Pumili ng pokus",
    "home.ariaScenarioTrack": "Track ng mga sitwasyon sa pag-uusap",
    "home.ariaMascot": "Maskot na Mochi",
    "home.goalAriaSuffix": "araw-araw na target sa pagsasalita",
    "ui.scenarioTrackLabel": "Mga Sitwasyon at Paksa",
    "ui.scenariosShort": "mga sitwasyon",
    "ui.activeTag": "Aktibo",
    "ui.chooseBtn": "Piliin",
    "ui.startTalkWith": "Magsimulang Makipag-usap kay",
    "ui.speakShortBtn": "Magsalita",
    "ui.sendShortBtn": "Ipadala",
    "ui.typeMsgPlaceholder": "Mag-type ng mensahe...",
    "ui.handsFreeBtn": "Hands-Free",
    "ui.transcriptHeading": "Transcript ng Usapan",
    "ui.backToFaceTime": "Bumalik sa Live Call",
    "ui.resetBtn": "Simulan Muli",
    "ui.emptyChatTitle": "Handa nang simulan ang usapan mo",
    "ui.emptyChatDesc": "Magsalita sa mikropono, pumili ng iminungkahing sagot sa itaas, o mag-type ng mensahe sa ibaba. Lalabas dito ang iyong chat history at feedback sa gramatika.",
    "ui.backToCall": "← Bumalik sa Tawag",
    "ui.matrixTitle": "Aktibong Matrix ng Kasanayan sa Kurikulum",
    "ui.competencyCol": "Kasanayan",
    "ui.detectedSuffix": "x na nakita",
    "ui.thinkingPauseTag": "(sandaling nag-iisip...)",
    "ui.coachSpeakingInterrupt": "Nagsasalita ang Coach",
    "ui.coachInterruptHint": "· aktibo ang mic, magsalita anumang oras para sumingit",
    "ui.micOffBanner": "Naka-mute ang mic",
    "ui.micOffHint": ": i-tap ang mic button para i-unmute",
    "ui.micHandsFreeBanner": "Aktibo ang hands-free mic",
    "ui.micHandsFreeHint": ": magsalita nang natural nang hindi pumipindot ng button",
    "ui.listeningPleaseSpeak": "Nakikinig... Magsalita ka na",
    "ui.micMutedTitle": "Naka-mute ang mikropono. I-click para paganahin ang boses.",
    "ui.micActiveTitle": "Aktibo ang hands-free. I-click para i-mute ang boses.",
    "ui.interruptAndSpeak": "Sumingit sa kausap at magsalita",
    "ui.homeTab": "Tahanan",
    "ui.voiceTab": "Voice Call",
    "ui.speakPartnerBrandJA": "Partner sa Kaiwa",
    "ui.speakPartnerBrand": "Partner sa Pagsasalita",
    "ui.gemModalFeatureDesc": "Gumagamit ang feature na ito ng Gems, na puwede mong makuha nang libre mula sa araw-araw na pagsasanay.",
    "ui.cancelBtn": "Kanselahin",
    "ui.connectBtn": "Kumonekta",
    "ui.notEnoughGemsTitle": "Kulang ang Gems",
    "ui.understoodBtn": "Naintindihan",
    "ui.connectLiveNow": "Kumonekta sa Live Call Ngayon"
  },
  "ja": {
    "app.brand": "FIEZEL AI ボイススタジオ",
    "app.subtitle": "ライブスピーキングチューター・リアルタイム翻訳＆Braincore評価",
    "locale.id": "インドネシア語",
    "locale.th": "タイ語",
    "hero.kicker": "AIスピーキングパートナー",
    "hero.title": "Mochiと自然に話しましょう",
    "hero.desc": "リアルタイム翻訳、発音ガイド、Braincoreの学習分析を備えたリアルタイム音声会話です。",
    "mode.live": "ライブFaceTime",
    "mode.turn": "ターン制会話",
    "call.pushToTalk": "長押しまたはタップして話す",
    "call.stopRecording": "録音を停止",
    "call.sendText": "送信",
    "call.placeholder": "または、ここに文を入力してください...",
    "call.examPurityNotice": "試験モードでは客観的な評価のため、ヒントとふりがなが非表示になります。",
    "call.scaffoldTitle": "返答のアイデア",
    "call.hintButton": "解答ヘルプを表示",
    "call.samplePrompts": "回答例",
    "prereq.bypassReady": "前提項目を習得済み",
    "diag.correctHeader": "きれいな文構造です！",
    "diag.wrongHeader": "文構造のレビュー",
    "diag.exactInputLabel": "あなたの発話：",
    "diag.whyFailsLabel": "修正のポイント：",
    "diag.missingWordsLabel": "追加するとよい語：",
    "diag.correctionLabel": "より整った形：",
    "diag.naturalLabel": "自然な言い換え：",
    "dash.title": "スピーキング Braincore マップ",
    "dash.subtitle": "シナリオ全体のリアルタイム BKT・FSRS・OLM 学習データ",
    "dash.viewTrend": "推移",
    "dash.viewBreakdown": "内訳",
    "dash.statFluency": "流暢さ",
    "dash.statGrammar": "文法の正確さ",
    "dash.statTime": "発話時間",
    "dash.statTurns": "合計ターン数",
    "dash.legendGrammar": "文法",
    "dash.legendFluency": "流暢さ",
    "dash.legendBkt": "習得度 (BKT)",
    "dash.legendVocab": "語彙の多様性",
    "dash.recentTurns": "最近の会話ターン",
    "olm.title": "オープン学習者モデル (OLM)",
    "olm.subtitle": "最近の音声セッションでBraincoreが記録したスキル",
    "olm.syncBtn": "アカウントと同期",
    "olm.synced": "同期済み",
    "olm.ledgerTitle": "誤用・つまずき履歴",
    "olm.ledgerEmpty": "繰り返しの誤りはまだ検出されていません。この調子で話し続けましょう！",
    "state.NOT_EXPOSED": "未開始",
    "state.EXPOSED": "導入済み",
    "state.PRACTICING": "練習中",
    "state.DEVELOPING": "発展中",
    "state.MASTERED": "習得済み",
    "state.RETAINED": "記憶定着",
    "state.TRANSFERRED": "応用済み",
    "ui.cefrBtnTitle": "目標CEFRレベルを選択 (A1 - C2)",
    "ui.hideTitle": "翻訳を隠す",
    "ui.showTitle": "翻訳を表示",
    "ui.playAtRate": "現在の速度で音声を再生",
    "ui.startFaceTimeTitle": "ハンズフリーのFaceTime音声通話を開始",
    "ui.enableMicTitle": "マイクを有効にする",
    "ui.muteMicTitle": "マイクをミュート",
    "ui.endCallTitle": "FaceTime通話を終了",
    "ui.freeGem": "🧪 無料ジェム",
    "ui.freeDaily": "🎁 無料",
    "ui.rateSlow": "0.85倍速 - ゆっくり明瞭",
    "ui.rateNatural": "0.92倍速 - 自然で聞き取りやすい",
    "ui.rateNormal": "1.0倍速 - ネイティブ標準速度",
    "ui.tapInterrupt": "タップしてMochiの話を止める",
    "ui.prereqUnlockedToast": "前提となる語彙をすべて習得しました！",
    "ui.sswUnlockedHint": "試してみる",
    "ui.refreshIdeas": "新しい返答アイデアを取得",
    "ui.bestAnswer": "最適な回答",
    "ui.modelTranslationLabel": "模範解答の翻訳",
    "ui.listenTitle": "発音を聞く",
    "ui.speakTitle": "この文を声に出して練習する",
    "ui.toggleShowIdeas": "例文のアイデアを表示",
    "ui.toggleHideIdeas": "ヘルプの詳細を隠す",
    "home.studioEn": "英語・英語スタジオ",
    "home.studioJa": "日本語・日本語スタジオ",
    "home.studioZh": "中国語 · 中国語スタジオ",
    "home.turnsLeftSuffix": "回（本日の残りスピーキング）",
    "home.openingPromptLabel": "Mochiの最初の質問：",
    "home.mochiHelperTitle": "スピーキングパートナー Mochi",
    "home.mochiHelperSub": "● 通話・サポート準備完了",
    "home.pickFocusSub": "通話を始める前に、重要語彙を確認したり発音サンプルを聞いたりできます",
    "home.liveCallTitle": "Fiezel ライブ通話",
    "home.activeScenarios": "件のアクティブなシナリオ",
    "home.vocabPrereq": "必須語彙",
    "home.hideMascot": "マスコットを非表示",
    "home.talkWithMochi": "Mochiと直接話す",
    "home.studioVocabTile": "語彙",
    "home.vocabCoreSuffix": "語の基本必須単語",
    "home.studioGrammarTile": "文法",
    "home.studioShadowTile": "音声シャドーイング",
    "home.studioShadowSub": "Mochiの発音を聞いて繰り返しましょう",
    "home.panelVocabLabel": "必須語彙スタジオ",
    "home.panelGrammarLabel": "文法パターンスタジオ",
    "home.panelShadowLabel": "発音シャドーイングスタジオ",
    "home.closeStudio": "スタジオを閉じる",
    "home.listenTermPrefix": "音声を聞く：",
    "home.markVocabMastered": "語彙を習得済みにする（Braincore BKT）",
    "home.practiceInCall": "音声通話で練習する",
    "home.competencyFocusLabel": "重点コンピテンシー：",
    "home.tapListenNatural": "下の文をタップすると自然な発音を聞けます：",
    "home.mochiOpeningSentence": "Mochiの最初の一言",
    "home.listenPronBtn": "聞く",
    "home.scenariosAvailSuffix": "件のシナリオが利用可能",
    "home.ariaDailyRhythm": "毎日のあいさつとスピーキングのリズム",
    "home.ariaContinue": "学習を続ける",
    "home.ariaPickFocus": "重点テーマを選択",
    "home.ariaScenarioTrack": "会話シナリオトラック",
    "home.ariaMascot": "Mochiマスコット",
    "home.goalAriaSuffix": "1日のスピーキング目標",
    "ui.scenarioTrackLabel": "シナリオ・トピック",
    "ui.scenariosShort": "シナリオ",
    "ui.activeTag": "アクティブ",
    "ui.chooseBtn": "選択",
    "ui.startTalkWith": "会話を始める：",
    "ui.emptyChatTitle": "会話を始める準備ができました",
    "ui.emptyChatDesc": "マイクに向かって話すか、上の返信候補を選ぶか、下にメッセージを入力してください。チャット履歴と文法のフィードバックがここに表示されます。",
    "ui.matrixTitle": "アクティブなカリキュラム・コンピテンシー一覧",
    "ui.competencyCol": "コンピテンシー",
    "ui.detectedSuffix": "回検出",
    "ui.thinkingPauseTag": "（考え中...）",
    "ui.coachSpeakingInterrupt": "コーチが話しています",
    "ui.coachInterruptHint": "・マイク有効：いつでも話して割り込めます",
    "ui.micOffBanner": "マイクがミュート中です",
    "ui.micOffHint": "：マイクボタンをタップしてミュートを解除してください",
    "ui.micHandsFreeBanner": "ハンズフリーマイク有効",
    "ui.micHandsFreeHint": "：ボタンを押さずにそのまま自然に話してください",
    "ui.listeningPleaseSpeak": "聞き取っています…お話しください",
    "ui.micMutedTitle": "マイクはミュートされています。クリックして音声を有効にしてください。",
    "ui.micActiveTitle": "ハンズフリーが有効です。クリックして音声をミュートしてください。",
    "ui.interruptAndSpeak": "パートナーに割り込んで話す",
    "ui.speakPartnerBrandJA": "会話パートナー",
    "ui.speakPartnerBrand": "スピーキングパートナー",
    "ui.gemModalFeatureDesc": "この機能ではジェムを使用します。ジェムは毎日の練習で無料獲得できます。",
    "ui.cancelBtn": "キャンセル",
    "ui.connectBtn": "接続する",
    "ui.notEnoughGemsTitle": "ジェムが不足しています",
    "ui.understoodBtn": "わかりました",
    "ui.connectLiveNow": "今すぐライブ通話に接続"
  },
  "km": {
    "app.brand": "ស្ទូឌីយោសំឡេង FIEZEL AI",
    "app.subtitle": "គ្រូបង្វឹកនិយាយផ្ទាល់ · បកប្រែភ្លាមៗ និងការវាយតម្លៃ Braincore",
    "nav.scenarios": "ស្ថានភាពសន្ទនា",
    "nav.activeCall": "ការហៅកំពុងដំណើរការ",
    "nav.braincore": "Braincore",
    "course.en": "ភាសាអង់គ្លេស",
    "course.ja": "ភាសាជប៉ុន",
    "locale.id": "ភាសាឥណ្ឌូនេស៊ី",
    "locale.th": "ភាសាថៃ",
    "hero.kicker": "ដៃគូហាត់និយាយ AI",
    "hero.title": "និយាយដោយធម្មជាតិជាមួយ Mochi",
    "hero.desc": "ការសន្ទនាជាសំឡេងភ្លាមៗ ជាមួយការបកប្រែផ្ទាល់ ការណែនាំអំពីការបញ្ចេញសំឡេង និងទិន្នន័យតាមដាន Braincore។",
    "mode.live": "FaceTime ផ្ទាល់",
    "mode.turn": "ឆ្លើយឆ្លងតាមវេន",
    "call.startLive": "ចាប់ផ្តើមការហៅ FaceTime",
    "call.endLive": "បញ្ចប់ការហៅ",
    "call.connecting": "កំពុងភ្ជាប់...",
    "call.connected": "បានភ្ជាប់",
    "call.pushToTalk": "ចុចឱ្យជាប់ ឬប៉ះដើម្បីនិយាយ",
    "call.stopRecording": "បញ្ឈប់ការថតសំឡេង",
    "call.sendText": "ផ្ញើ",
    "call.placeholder": "ឬវាយប្រយោគរបស់អ្នកនៅទីនេះ...",
    "call.replayAi": "ចាក់សំឡេង",
    "call.measureBadge": "របៀបប្រឡង",
    "call.practiceBadge": "របៀបហ្វឹកហាត់",
    "call.examPurityNotice": "របៀបប្រឡងនឹងលាក់តម្រុយ និង furigana ដើម្បីធ្វើការវាយតម្លៃដោយសត្យានុម័ត។",
    "call.scaffoldTitle": "គំនិតឆ្លើយតប",
    "call.hintButton": "បង្ហាញជំនួយចម្លើយ",
    "call.samplePrompts": "គំរូចម្លើយ",
    "prereq.bypassReady": "បានស្ទាត់ជំនាញមូលដ្ឋានជាមុនហើយ",
    "prereq.lockedTitle": "ដោះសោវាក្យសព្ទមូលដ្ឋានជាមុន",
    "prereq.lockedDesc": "រំលឹកពាក្យគន្លឹះទាំងនេះម្តង ដើម្បីឱ្យការសន្ទនារបស់អ្នកដំណើរការទៅដោយរលូន។",
    "prereq.completeBtn": "ខ្ញុំយល់ហើយ — ចាប់ផ្តើមសន្ទនា",
    "diag.correctHeader": "រចនាសម្ព័ន្ធប្រយោគត្រឹមត្រូវល្អ!",
    "diag.wrongHeader": "ពិនិត្យរចនាសម្ព័ន្ធប្រយោគ",
    "diag.exactInputLabel": "អ្វីដែលអ្នកបាននិយាយ៖",
    "diag.whyFailsLabel": "មូលហេតុដែលគួរកែសម្រួល៖",
    "diag.missingWordsLabel": "ពាក្យដែលគួរបន្ថែម៖",
    "diag.correctionLabel": "ទម្រង់ដែលល្អជាង៖",
    "diag.naturalLabel": "ជម្រើសធម្មជាតិផ្សេងទៀត៖",
    "dash.title": "ផែនទី Braincore ការនិយាយ",
    "dash.subtitle": "ទិន្នន័យតាមដាន BKT, FSRS និង OLM ភ្លាមៗនៅគ្រប់ស្ថានភាពសន្ទនា",
    "dash.viewTrend": "និន្នាការ",
    "dash.viewBreakdown": "ការវិភាគលម្អិត",
    "dash.statFluency": "ភាពស្ទាត់ជំនាញ",
    "dash.statGrammar": "ភាពត្រឹមត្រូវវេយ្យាករណ៍",
    "dash.statTime": "រយៈពេលនិយាយ",
    "dash.statTurns": "ចំនួនវេនសរុប",
    "dash.legendGrammar": "វេយ្យាករណ៍",
    "dash.legendFluency": "ភាពស្ទាត់ជំនាញ",
    "dash.legendBkt": "ភាពស្ទាត់ជំនាញ (BKT)",
    "dash.legendVocab": "ភាពសម្បូរបែបនៃវាក្យសព្ទ",
    "dash.recentTurns": "វេនសន្ទនាថ្មីៗ",
    "olm.title": "គំរូអ្នកសិក្សាបើកចំហ (OLM)",
    "olm.subtitle": "ជំនាញដែល Braincore បានតាមដាននៅក្នុងវគ្គនិយាយថ្មីៗ",
    "olm.syncBtn": "ធ្វើសមកាលកម្មជាមួយគណនី",
    "olm.synced": "បានធ្វើសមកាលកម្ម",
    "olm.ledgerTitle": "បញ្ជីកត់ត្រាការយល់ច្រឡំ",
    "olm.ledgerEmpty": "មិនទាន់រកឃើញការយល់ច្រឡំដដែលៗនៅឡើយទេ។ បន្តនិយាយទៀត!",
    "state.NOT_EXPOSED": "មិនទាន់ចាប់ផ្តើម",
    "state.EXPOSED": "បានណែនាំ",
    "state.PRACTICING": "កំពុងហ្វឹកហាត់",
    "state.DEVELOPING": "កំពុងអភិវឌ្ឍ",
    "state.MASTERED": "ស្ទាត់ជំនាញ",
    "state.RETAINED": "ចងចាំបានយូរ",
    "state.TRANSFERRED": "បានផ្ទេរចំណេះដឹង",
    "ui.switchPersona": "ប្តូរដៃគូ និងរចនាប័ទ្មសំឡេង",
    "ui.whiteboard": "ក្តារខៀនស",
    "ui.tacticalBoard": "ក្តារយុទ្ធសាស្ត្រ",
    "ui.casualMode": "☕ ធម្មតា",
    "ui.mentorMode": "🎓 គ្រូណែនាំ",
    "ui.cefrBtnTitle": "ជ្រើសរើសកម្រិត CEFR គោលដៅ (A1 - C2)",
    "ui.levelWord": "កម្រិត",
    "ui.listening": "Mochi កំពុងស្តាប់… (ឈប់សម្រាកគិត)",
    "ui.speakingNow": "កំពុងនិយាយ...",
    "ui.mochiSpeakingStatus": "Mochi កំពុងនិយាយ...",
    "ui.recordingStatus": "កំពុងថតសំឡេង...",
    "ui.micMutedShort": "បានបិទសំឡេងមីក្រូហ្វូន",
    "ui.preparingReply": "កំពុងរៀបចំចម្លើយ...",
    "ui.loadingTranslation": "កំពុងបកប្រែ...",
    "ui.translationLabel": "អត្ថន័យ / ការបកប្រែ៖",
    "ui.hide": "👁️ លាក់",
    "ui.showTranslation": "👁️ បង្ហាញការបកប្រែ",
    "ui.hideTitle": "លាក់ការបកប្រែ",
    "ui.showTitle": "បង្ហាញការបកប្រែ",
    "ui.playing": "កំពុងចាក់...",
    "ui.playAtRate": "ចាក់សំឡេងតាមល្បឿនបច្ចុប្បន្ន",
    "ui.youLabel": "អ្នក៖",
    "ui.handsFreeSub": "មិនបាច់ប្រើដៃ · មីក្រូហ្វូនសន្ទនាទៅមករួចរាល់សម្រាប់ការសន្ទនាផ្ទាល់",
    "ui.startFaceTimeTitle": "ចាប់ផ្តើមការហៅសំឡេង FaceTime ដោយមិនបាច់ប្រើដៃ",
    "ui.micOff": "បិទមីក្រូហ្វូន",
    "ui.youSpeak": "កំពុងនិយាយ...",
    "ui.mochiSpeakMic": "Mochi កំពុងនិយាយ · បើកមីក្រូហ្វូន",
    "ui.mochiSpeak": "Mochi កំពុងនិយាយ",
    "ui.tapEnableMic": "ប៉ះដើម្បីបើកមីក្រូហ្វូន",
    "ui.micOn": "មីក្រូហ្វូនកំពុងដំណើរការ",
    "ui.enableMicTitle": "បើកមីក្រូហ្វូន",
    "ui.muteMicTitle": "បិទសំឡេងមីក្រូហ្វូន",
    "ui.endCallTitle": "បញ្ចប់ការហៅ FaceTime",
    "ui.freeGem": "🧪 Gem ឥតគិតថ្លៃ",
    "ui.freeDaily": "🎁 ឥតគិតថ្លៃ",
    "ui.choosePersonaTitle": "ជ្រើសរើសដៃគូ និងរចនាប័ទ្មសំឡេង",
    "ui.choosePersonaSub": "ជ្រើសរើសគ្រូបង្ហាត់ដែលមានរបៀបបង្រៀន សំនៀង និងកម្រិតផ្តល់មតិកែលម្អដែលអ្នកចូលចិត្ត",
    "ui.availableMentors": "គ្រូបង្ហាត់ Fiezel",
    "ui.tapToSwitch": "ប៉ះដើម្បីប្តូរ",
    "ui.rateSlow": "0.85x - យឺតល្មម និងច្បាស់លាស់",
    "ui.rateNatural": "0.92x - ធម្មជាតិ និងមានតុល្យភាព",
    "ui.rateNormal": "1.0x - ល្បឿនធម្មតារបស់ជនជាតិដើម",
    "ui.tapInterrupt": "ប៉ះដើម្បីកាត់សម្តី Mochi",
    "ui.prereqUnlockedToast": "បានស្ទាត់ជំនាញវាក្យសព្ទមូលដ្ឋានជាមុនហើយ!",
    "ui.sswUnlockedHint": "សាកល្បង",
    "ui.modelAnswerBtn": "ចម្លើយគំរូ",
    "ui.refreshIdeas": "ទទួលយកគំនិតឆ្លើយតបថ្មីៗ",
    "ui.bestAnswer": "ចម្លើយល្អបំផុត",
    "ui.modelTranslationLabel": "ការបកប្រែចម្លើយគំរូ",
    "ui.listenTitle": "ស្តាប់ការបញ្ចេញសំឡេង",
    "ui.speakTitle": "ហាត់និយាយប្រយោគនេះ",
    "ui.tabShort": "1 · ខ្លី",
    "ui.tabNatural": "2 · ធម្មជាតិ",
    "ui.tabFollowUp": "3 · + សំណួរបន្ត",
    "ui.toggleShowIdeas": "បង្ហាញគំនិតប្រយោគ",
    "ui.toggleHideIdeas": "លាក់ព័ត៌មានលម្អិតជំនួយ",
    "home.studioEn": "ភាសាអង់គ្លេស · English Studio",
    "home.studioJa": "ភាសាជប៉ុន · Japanese Studio",
    "home.studioZh": "ភាសាចិនកុកងឺ · Mandarin Studio",
    "home.readyDesc": "ការហៅសំឡេងអន្តរកម្មជាមួយ Mochi ដែលមានការបកប្រែផ្ទាល់ មគ្គុទ្ទេសក៍បញ្ចេញសំឡេង និងការវាយតម្លៃពី Braincore។",
    "home.filterFree": "ការសន្ទនាសេរី",
    "home.filterDaily": "ជីវិតប្រចាំថ្ងៃ",
    "home.filterAcademic": "ការណែនាំខ្លួន និងមតិយោបល់",
    "home.dailyGoal": "គោលដៅនិយាយប្រចាំថ្ងៃ",
    "home.turnsLeftSuffix": "វេននិយាយបន្ថែមទៀតសម្រាប់ថ្ងៃនេះ",
    "home.goalDone": "សម្រេចគោលដៅប្រចាំថ្ងៃហើយ!",
    "home.streakDays": "ថ្ងៃបន្តបន្ទាប់",
    "home.accuracy": "ភាពស្ទាត់ជំនាញសកម្ម (Braincore)",
    "home.mochiPickPrefix": "ជម្រើសរបស់ Mochi",
    "home.openingPromptLabel": "សំណួរបើកឆាករបស់ Mochi៖",
    "home.mochiHelperTitle": "Mochi មិត្តភក្តិហាត់និយាយរបស់អ្នក",
    "home.mochiHelperSub": "● រួចរាល់សម្រាប់ការហៅ និងជួយអ្នក",
    "home.pickFocusTitle": "ជ្រើសរើសប្រធានបទផ្តោតសម្រាប់ថ្ងៃនេះ",
    "home.pickFocusSub": "រំលឹកវាក្យសព្ទសំខាន់ៗ ឬស្តាប់គំរូការបញ្ចេញសំឡេង មុនពេលចាប់ផ្តើមការហៅរបស់អ្នក",
    "home.braincoreMap": "ផែនទី Braincore",
    "home.liveCallTitle": "ការហៅផ្ទាល់ Fiezel",
    "home.activeScenarios": "ស្ថានភាពសន្ទនាសកម្ម",
    "home.pickScenarioTitle": "ជ្រើសរើសស្ថានភាពសន្ទនា",
    "home.readyToTalk": "រួចរាល់ដើម្បីនិយាយ",
    "home.vocabPrereq": "វាក្យសព្ទមូលដ្ឋានជាមុន",
    "home.hideMascot": "លាក់ម៉ាស្កូត",
    "home.talkWithMochi": "និយាយដោយផ្ទាល់ជាមួយ Mochi",
    "home.studioVocabTile": "វាក្យសព្ទ",
    "home.vocabCoreSuffix": "ពាក្យមូលដ្ឋានសំខាន់ៗ",
    "home.studioGrammarTile": "វេយ្យាករណ៍",
    "home.studioShadowTile": "ហាត់និយាយតាមសំឡេង",
    "home.studioShadowSub": "ស្តាប់ និងនិយាយតាមការបញ្ចេញសំឡេងរបស់ Mochi",
    "home.panelVocabLabel": "ស្ទូឌីយោវាក្យសព្ទតម្រូវជាមុន",
    "home.panelGrammarLabel": "ស្ទូឌីយោទម្រង់វេយ្យាករណ៍",
    "home.panelShadowLabel": "ស្ទូឌីយោហ្វឹកហាត់បញ្ចេញសំឡេងតាម",
    "home.closeStudio": "បិទស្ទូឌីយោ",
    "home.listenTermPrefix": "ស្តាប់",
    "home.markVocabMastered": "សម្គាល់ថាស្ទាត់ជំនាញវាក្យសព្ទ (Braincore BKT)",
    "home.practiceInCall": "អនុវត្តក្នុងការហៅជាសំឡេង",
    "home.competencyFocusLabel": "ផ្តោតលើសមត្ថភាព៖",
    "home.tapListenNatural": "ចុចលើប្រយោគខាងក្រោម ដើម្បីស្តាប់ការបញ្ចេញសំឡេងបែបធម្មជាតិ៖",
    "home.mochiOpeningSentence": "ឃ្លាបើកឆាករបស់ Mochi",
    "home.listenPronBtn": "ស្តាប់",
    "home.scenariosAvailSuffix": "ស្ថានភាពដែលមាន",
    "home.ariaDailyRhythm": "ការសួរសុខទុក្ខប្រចាំថ្ងៃ និងចង្វាក់នៃការនិយាយ",
    "home.ariaContinue": "បន្តការសិក្សា",
    "home.ariaPickFocus": "ជ្រើសរើសចំណុចផ្តោត",
    "home.ariaScenarioTrack": "ផ្នែកស្ថានភាពសន្ទនា",
    "home.ariaMascot": "តួអង្គតំណាង Mochi",
    "home.goalAriaSuffix": "គោលដៅនិយាយប្រចាំថ្ងៃ",
    "ui.scenarioTrackLabel": "ស្ថានភាព និងប្រធានបទ",
    "ui.scenariosShort": "ស្ថានភាព",
    "ui.activeTag": "កំពុងសកម្ម",
    "ui.chooseBtn": "ជ្រើសរើស",
    "ui.startTalkWith": "ចាប់ផ្តើមនិយាយជាមួយ",
    "ui.speakShortBtn": "និយាយ",
    "ui.sendShortBtn": "ផ្ញើ",
    "ui.typeMsgPlaceholder": "វាយសារ...",
    "ui.handsFreeBtn": "ដោយមិនបាច់ចុច",
    "ui.transcriptHeading": "កំណត់ត្រាការសន្ទនា",
    "ui.backToFaceTime": "ត្រឡប់ទៅការហៅផ្ទាល់",
    "ui.resetBtn": "ចាប់ផ្តើមឡើងវិញ",
    "ui.emptyChatTitle": "រួចរាល់ដើម្បីចាប់ផ្តើមការសន្ទនារបស់អ្នក",
    "ui.emptyChatDesc": "និយាយចូលក្នុងមីក្រូហ្វូន ជ្រើសរើសចម្លើយណែនាំខាងលើ ឬវាយសារខាងក្រោម។ ប្រវត្តិជជែក និងមតិកែលម្អវេយ្យាករណ៍របស់អ្នកនឹងបង្ហាញនៅទីនេះ។",
    "ui.backToCall": "← ត្រឡប់ទៅការហៅ",
    "ui.matrixTitle": "តារាងសមត្ថភាពកម្មវិធីសិក្សាសកម្ម",
    "ui.competencyCol": "សមត្ថភាព",
    "ui.detectedSuffix": "ដងត្រូវបានរកឃើញ",
    "ui.thinkingPauseTag": "(កំពុងឈប់គិតបន្តិច...)",
    "ui.coachSpeakingInterrupt": "គ្រូបង្វឹកកំពុងនិយាយ",
    "ui.coachInterruptHint": "· មីក្រូហ្វូនកំពុងបើក អាចនិយាយកាត់បានគ្រប់ពេល",
    "ui.micOffBanner": "បានបិទសំឡេងមីក្រូហ្វូន",
    "ui.micOffHint": "៖ ចុចប៊ូតុងមីក្រូហ្វូនដើម្បីបើកសំឡេង",
    "ui.micHandsFreeBanner": "មីក្រូហ្វូនមិនបាច់ចុចកំពុងសកម្ម",
    "ui.micHandsFreeHint": "៖ និយាយតាមធម្មជាតិដោយមិនចាំបាច់ចុចប៊ូតុង",
    "ui.listeningPleaseSpeak": "កំពុងស្តាប់... សូមនិយាយ",
    "ui.micMutedTitle": "មីក្រូហ្វូនត្រូវបានបិទសំឡេង។ ចុចដើម្បីបើកសំឡេង។",
    "ui.micActiveTitle": "របៀបមិនបាច់ចុចកំពុងសកម្ម។ ចុចដើម្បីបិទសំឡេង។",
    "ui.interruptAndSpeak": "ផ្អាកដៃគូ ហើយនិយាយ",
    "ui.homeTab": "ទំព័រដើម",
    "ui.voiceTab": "ការហៅជាសំឡេង",
    "ui.speakPartnerBrandJA": "ដៃគូសន្ទនា Kaiwa",
    "ui.speakPartnerBrand": "ដៃគូហាត់និយាយ",
    "ui.gemModalFeatureDesc": "មុខងារនេះប្រើប្រាស់ Gems ដែលអ្នកអាចរកបានដោយឥតគិតថ្លៃពីការអនុវត្តប្រចាំថ្ងៃ។",
    "ui.cancelBtn": "បោះបង់",
    "ui.connectBtn": "ភ្ជាប់",
    "ui.notEnoughGemsTitle": "Gems មិនគ្រប់គ្រាន់ទេ",
    "ui.understoodBtn": "យល់ហើយ",
    "ui.connectLiveNow": "ភ្ជាប់ការហៅផ្ទាល់ឥឡូវនេះ"
  },
  "ru": {
    "app.brand": "Голосовая ИИ-студия FIEZEL",
    "app.subtitle": "Живой репетитор разговорной речи · Перевод в реальном времени и оценка Braincore",
    "nav.scenarios": "Сценарии",
    "nav.activeCall": "Активный звонок",
    "nav.braincore": "Braincore",
    "course.en": "Английский",
    "course.ja": "Японский",
    "locale.id": "Индонезийский",
    "locale.th": "Тайский",
    "hero.kicker": "ИИ-собеседник для разговорной практики",
    "hero.title": "Общайтесь естественно с Mochi",
    "hero.desc": "Голосовое общение в реальном времени с живым переводом, подсказками по произношению и телеметрией Braincore.",
    "mode.live": "Живой видеозвонок",
    "mode.turn": "Реплика за репликой",
    "call.startLive": "Начать видеозвонок",
    "call.endLive": "Завершить звонок",
    "call.connecting": "Подключение...",
    "call.connected": "Подключено",
    "call.pushToTalk": "Удерживайте или нажмите, чтобы говорить",
    "call.stopRecording": "Остановить запись",
    "call.sendText": "Отправить",
    "call.placeholder": "Или введите фразу здесь...",
    "call.replayAi": "Воспроизвести голос",
    "call.measureBadge": "Режим экзамена",
    "call.practiceBadge": "Режим практики",
    "call.examPurityNotice": "В режиме экзамена скрываются подсказки и фуригана для объективной оценки.",
    "call.scaffoldTitle": "Идеи для ответа",
    "call.hintButton": "Показать подсказку для ответа",
    "call.samplePrompts": "Примеры ответов",
    "prereq.bypassReady": "Обязательная база освоена",
    "prereq.lockedTitle": "Освойте обязательную лексику",
    "prereq.lockedDesc": "Повторите эти ключевые слова один раз, чтобы диалог шёл свободно.",
    "prereq.completeBtn": "Понятно — начать разговор",
    "diag.correctHeader": "Отличная структура!",
    "diag.wrongHeader": "Разбор структуры",
    "diag.exactInputLabel": "Что вы сказали:",
    "diag.whyFailsLabel": "Почему стоит поправить:",
    "diag.missingWordsLabel": "Слова, которые стоит добавить:",
    "diag.correctionLabel": "Более точный вариант:",
    "diag.naturalLabel": "Естественный вариант:",
    "dash.title": "Карта речи Braincore",
    "dash.subtitle": "Телеметрия BKT, FSRS и OLM по сценариям в реальном времени",
    "dash.viewTrend": "Динамика",
    "dash.viewBreakdown": "Детализация",
    "dash.statFluency": "Беглость речи",
    "dash.statGrammar": "Грамматическая точность",
    "dash.statTime": "Время речи",
    "dash.statTurns": "Всего реплик",
    "dash.legendGrammar": "Грамматика",
    "dash.legendFluency": "Беглость речи",
    "dash.legendBkt": "Усвоение (BKT)",
    "dash.legendVocab": "Разнообразие лексики",
    "dash.recentTurns": "Недавние реплики диалога",
    "olm.title": "Открытая модель учащегося (OLM)",
    "olm.subtitle": "Навыки, отслеживаемые Braincore за последние голосовые сессии",
    "olm.syncBtn": "Синхронизировать с аккаунтом",
    "olm.synced": "Синхронизировано",
    "olm.ledgerTitle": "Журнал типовых ошибок",
    "olm.ledgerEmpty": "Повторяющихся ошибок пока не выявлено. Продолжайте говорить!",
    "state.NOT_EXPOSED": "Не начато",
    "state.EXPOSED": "Ознакомление",
    "state.PRACTICING": "Практика",
    "state.DEVELOPING": "Развитие",
    "state.MASTERED": "Освоено",
    "state.RETAINED": "Закреплено",
    "state.TRANSFERRED": "Применено в речи",
    "ui.switchPersona": "Сменить собеседника и стиль речи",
    "ui.whiteboard": "Доска",
    "ui.tacticalBoard": "Тактическая доска",
    "ui.casualMode": "☕ Неформальный",
    "ui.mentorMode": "🎓 Наставник",
    "ui.cefrBtnTitle": "Выберите целевой уровень CEFR (A1 - C2)",
    "ui.levelWord": "Уровень",
    "ui.listening": "Mochi слушает… (пауза на размышление)",
    "ui.speakingNow": "Вы говорите...",
    "ui.mochiSpeakingStatus": "Mochi говорит...",
    "ui.recordingStatus": "Запись голоса...",
    "ui.micMutedShort": "Микрофон выключен",
    "ui.preparingReply": "Подготовка ответа...",
    "ui.loadingTranslation": "Перевод...",
    "ui.translationLabel": "Значение / Перевод:",
    "ui.hide": "👁️ Скрыть",
    "ui.showTranslation": "👁️ Показать перевод",
    "ui.hideTitle": "Скрыть перевод",
    "ui.showTitle": "Показать перевод",
    "ui.playing": "Воспроизведение...",
    "ui.playAtRate": "Воспроизвести аудио с текущей скоростью",
    "ui.youLabel": "Вы:",
    "ui.handsFreeSub": "Свободные руки · Двусторонний микрофон готов к живому разговору",
    "ui.startFaceTimeTitle": "Начать голосовой звонок FaceTime без рук",
    "ui.youSpeak": "Вы говорите...",
    "ui.mochiSpeakMic": "Mochi говорит · Микрофон вкл.",
    "ui.mochiSpeak": "Mochi говорит",
    "ui.tapEnableMic": "Нажмите, чтобы включить микрофон",
    "ui.micOn": "Микрофон активен",
    "ui.enableMicTitle": "Включить микрофон",
    "ui.muteMicTitle": "Выключить микрофон",
    "ui.endCallTitle": "Завершить звонок FaceTime",
    "ui.freeGem": "🧪 Бесплатный гем",
    "ui.freeDaily": "🎁 Бесплатно",
    "ui.choosePersonaTitle": "Выберите собеседника и стиль голоса",
    "ui.choosePersonaSub": "Выберите наставника с подходящим стилем обучения, акцентом и уровнем обратной связи",
    "ui.availableMentors": "Наставники Fiezel",
    "ui.tapToSwitch": "Нажмите, чтобы переключить",
    "ui.rateSlow": "0.85x - Спокойно и чётко",
    "ui.rateNatural": "0.92x - Естественно и сбалансированно",
    "ui.rateNormal": "1.0x - Обычная скорость носителя",
    "ui.tapInterrupt": "Нажмите, чтобы перебить Mochi",
    "ui.prereqUnlockedToast": "Базовая лексика освоена!",
    "ui.sswUnlockedHint": "Попробовать",
    "ui.modelAnswerBtn": "Образец ответа",
    "ui.refreshIdeas": "Получить новые идеи ответа",
    "ui.bestAnswer": "Лучший ответ",
    "ui.modelTranslationLabel": "Перевод образца ответа",
    "ui.listenTitle": "Послушать произношение",
    "ui.speakTitle": "Потренируйтесь произносить это предложение",
    "ui.tabShort": "1 · Кратко",
    "ui.tabNatural": "2 · Естественно",
    "ui.tabFollowUp": "3 · + Продолжение",
    "ui.toggleShowIdeas": "Показать идеи предложений",
    "ui.toggleHideIdeas": "Скрыть подробности подсказки",
    "home.studioEn": "Английский · Студия английского",
    "home.studioJa": "Японский · Студия японского",
    "home.studioZh": "Китайский · Студия китайского",
    "home.readyDesc": "Интерактивные голосовые звонки с Mochi: живой перевод, подсказки по произношению и оценка Braincore.",
    "home.filterFree": "Свободное общение",
    "home.filterDaily": "Повседневная жизнь",
    "home.filterAcademic": "Знакомство и мнение",
    "home.dailyGoal": "Ежедневная цель по речи",
    "home.turnsLeftSuffix": "ещё реплик сегодня",
    "home.goalDone": "Дневная цель достигнута!",
    "home.streakDays": "Дней подряд",
    "home.accuracy": "Активное усвоение (Braincore)",
    "home.mochiPickPrefix": "Выбор Mochi",
    "home.openingPromptLabel": "Вступительный вопрос Mochi:",
    "home.mochiHelperTitle": "Mochi — ваш собеседник для практики речи",
    "home.mochiHelperSub": "● Готов к звонку и помощи",
    "home.pickFocusTitle": "Выберите фокус на сегодня",
    "home.pickFocusSub": "Повторите ключевую лексику или послушайте примеры произношения перед началом звонка",
    "home.braincoreMap": "Карта Braincore",
    "home.liveCallTitle": "Живой звонок Fiezel",
    "home.activeScenarios": "активных сценариев",
    "home.pickScenarioTitle": "Выберите сценарий разговора",
    "home.readyToTalk": "Готовы к разговору",
    "home.vocabPrereq": "Базовая лексика",
    "home.hideMascot": "Скрыть маскота",
    "home.talkWithMochi": "Поговорить напрямую с Mochi",
    "home.studioVocabTile": "Словарь",
    "home.vocabCoreSuffix": "ключевых базовых слов",
    "home.studioGrammarTile": "Грамматика",
    "home.studioShadowTile": "Голосовой шэдоуинг",
    "home.studioShadowSub": "Слушайте и повторяйте произношение Mochi",
    "home.panelVocabLabel": "СТУДИЯ БАЗОВОЙ ЛЕКСИКИ",
    "home.panelGrammarLabel": "СТУДИЯ ГРАММАТИЧЕСКИХ МОДЕЛЕЙ",
    "home.panelShadowLabel": "СТУДИЯ ПРОИЗНОШЕНИЯ И ШЭДОУИНГА",
    "home.closeStudio": "Закрыть студию",
    "home.listenTermPrefix": "Послушать",
    "home.markVocabMastered": "Отметить лексику освоенной (Braincore BKT)",
    "home.practiceInCall": "Практиковать в голосовом звонке",
    "home.competencyFocusLabel": "Фокус компетенции:",
    "home.tapListenNatural": "Нажмите на предложение ниже, чтобы услышать естественное произношение:",
    "home.mochiOpeningSentence": "Вступительная фраза Mochi",
    "home.listenPronBtn": "Слушать",
    "home.scenariosAvailSuffix": "сценариев доступно",
    "home.ariaDailyRhythm": "Ежедневное приветствие и темп речи",
    "home.ariaContinue": "Продолжить обучение",
    "home.ariaPickFocus": "Выбрать фокус",
    "home.ariaScenarioTrack": "Трек разговорных сценариев",
    "home.ariaMascot": "Маскот Mochi",
    "home.goalAriaSuffix": "ежедневная цель разговорной практики",
    "ui.scenarioTrackLabel": "Сценарии и темы",
    "ui.scenariosShort": "сценариев",
    "ui.activeTag": "Активно",
    "ui.chooseBtn": "Выбрать",
    "ui.startTalkWith": "Начать разговор с",
    "ui.emptyChatTitle": "Всё готово к началу разговора",
    "ui.emptyChatDesc": "Говорите в микрофон, выберите предложенный ответ выше или введите сообщение ниже. История чата и разбор грамматики появятся здесь.",
    "ui.matrixTitle": "Матрица компетенций активной программы",
    "ui.competencyCol": "Компетенция",
    "ui.detectedSuffix": "x обнаружено",
    "ui.thinkingPauseTag": "(пауза на размышление...)",
    "ui.coachSpeakingInterrupt": "Наставник говорит",
    "ui.coachInterruptHint": "· микрофон активен, говорите в любой момент, чтобы перебить",
    "ui.micOffBanner": "Микрофон выключен",
    "ui.micOffHint": ": нажмите кнопку микрофона, чтобы включить звук",
    "ui.micHandsFreeBanner": "Режим «свободные руки» активен",
    "ui.micHandsFreeHint": ": говорите естественно, не нажимая кнопку",
    "ui.listeningPleaseSpeak": "Слушаю... Пожалуйста, говорите",
    "ui.micMutedTitle": "Микрофон выключен. Нажмите, чтобы включить голос.",
    "ui.micActiveTitle": "Режим «свободные руки» активен. Нажмите, чтобы выключить звук.",
    "ui.interruptAndSpeak": "Перебить собеседника и говорить",
    "ui.speakPartnerBrandJA": "Собеседник Kaiwa",
    "ui.speakPartnerBrand": "Собеседник для практики",
    "ui.gemModalFeatureDesc": "Эта функция использует самоцветы (Gems), которые можно бесплатно получать за ежедневную практику.",
    "ui.cancelBtn": "Отмена",
    "ui.connectBtn": "Подключиться",
    "ui.notEnoughGemsTitle": "Недостаточно самоцветов",
    "ui.understoodBtn": "Понятно",
    "ui.connectLiveNow": "Подключить живой звонок сейчас"
  }
};

export const VS_WB_TRANSLATIONS: Partial<Record<LearnerLocale, Record<string, string>>> = {
  "th": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "ฟีเจอร์คุยสดกับ Fiezel ต้องการการเชื่อมต่ออินเทอร์เน็ตสำหรับการสนทนาแบบเรียลไทม์",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "เบราว์เซอร์บล็อกการเล่นอัตโนมัติ แตะ \"เล่นเสียง\" เพื่อฟังคำตอบ",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "เสียง Neural กำลังเชื่อมต่อใหม่ ข้อความยังแสดงอยู่ แตะ \"เล่นเสียง\" เพื่อลองอีกครั้ง",
    "Student": "นักเรียน",
    "Learning Board": "กระดานเรียนรู้",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "คุณยังใช้รูปแบบหลอก \"{trap}\" อยู่ — ให้เปลี่ยนไปใช้รูปแบบที่ไฮไลต์ไว้บนกระดาน",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "หลัง \"Did / Didn't / Does\" ให้ใช้กริยาช่อง 1 (V1) แทนรูปอดีตกาล \"{verb}\"",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "อย่าวาง \"{be}\" ไว้หน้ากริยา \"{verb}\" ให้ใช้ประธานตามด้วยกริยาโดยตรง",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "สำหรับจุดเริ่มต้นของเวลาที่เจาะจง (เช่น ปี 2020 หรือวันจันทร์) ให้ใช้ \"since\" ไม่ใช่ \"for\"",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "กับวันในสัปดาห์ (Monday, Friday ฯลฯ) ให้ใช้คำบุพบท \"on\" ไม่ใช่ \"in\"",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "\"Despite\" จะไม่ตามด้วย \"of\" — ให้ใช้ \"despite + noun\" โดยตรง หรือใช้ \"in spite of\"",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "หลังกริยาช่วย (should/must/can) ให้ใช้กริยารูปเดิมโดยตรงโดยไม่ต้องมี \"to\"",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "แต่งประโยคให้สมบูรณ์อย่างน้อย 3 คำ (ประธาน + กริยา + ส่วนขยาย) เพื่อทดสอบโครงสร้างนี้",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "\"ますでした\" ผิดหลักไวยากรณ์ — ให้ผัน ます เป็น ました โดยตรงเพื่อแสดงรูปอดีต",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "คำกริยารูปพจนานุกรมไม่สามารถต่อท้ายด้วย です โดยตรงได้ — ให้ใช้รูปสุภาพ 〜ます / 〜ました",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "สำหรับสถานที่ที่เกิดการกระทำ (อ่านหนังสือ/ดื่ม) ให้ใช้คำช่วย で แทน に",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "เขียนประโยคเต็มเป็นตัวอักษรญี่ปุ่น (ฮิรางานะ/คันจิ) ตามโครงสร้างที่กำหนด",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "เพื่อแสดงการกระทำที่กำลังดำเนินอยู่ ให้ใช้ 正在 หรือ 在 หน้ากริยาแทน 是",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "ในภาษาจีนกลาง คำบอกเวลา (เช่น 现在 / 昨天) ต้องวางไว้หน้าคำกริยาเสมอ",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "เขียนประโยคเต็มเป็นตัวอักษรจีน (ฮั่นจื้อ) ให้ตรงตามโครงสร้างที่กำหนด",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "ยอดเยี่ยม! โครงสร้างประโยคตรงตามสูตรเป๊ะ กดส่งเข้าสายเพื่อให้ติวเตอร์ฟังได้เลย",
    "Not quite right yet. Review the meaning and structure above and try again.": "คำตอบยังไม่ถูกต้อง ลองทบทวนตัวเลือกที่เลือกอีกครั้ง",
    "Check your word order and verb form against the formula blocks above.": "ตรวจสอบลำดับคำและรูปกริยาของคุณเทียบกับบล็อกโครงสร้างด้านบน",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "ไมโครโฟนถูกบล็อก อนุญาตไมโครโฟนในแถบที่อยู่ หรือพิมพ์ประโยคด้านล่าง",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "การรู้จำเสียงต้องใช้อินเทอร์เน็ต ลองอีกครั้งหรือพิมพ์ประโยค",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "เบราว์เซอร์บล็อกสิทธิ์การใช้ไมโครโฟน กรุณาอนุญาตการใช้ไมค์ที่แถบที่อยู่ หรือพิมพ์ประโยคของคุณด้านล่าง",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "เบราว์เซอร์นี้ยังไม่รองรับการรู้จำเสียงพูดอัตโนมัติ กรุณาพิมพ์ประโยคของคุณด้านล่าง หรือเลือกคำตอบแนะนำด้านบน",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "สิทธิ์การใช้ไมโครโฟนยังไม่ได้เปิดใช้งานในเบราว์เซอร์นี้ กรุณาพิมพ์ประโยคของคุณ หรือเลือกการ์ดคำตอบแนะนำด้านบน",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "ยังไม่ได้ยินเสียง พูดให้ชัดเจนใส่ไมโครโฟน หรือพิมพ์ในช่องด้านล่าง",
    "Switching cleanly to a fresh voice channel...": "กำลังสลับไปยังช่องสัญญาณเสียงความเร็วสูงใหม่...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "ยังไม่มีเสียง Fiezel เล่นออกมา, ไม่ถูกหัก Gem (0 💎 ปลอดภัย)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "จบการสนทนา: {turns} การตอบกลับเสียง Fiezel, สิทธิ์ฟรีรายวัน (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "จบการสนทนา: {turns} การตอบกลับเสียง Fiezel, ใช้ไป {gems} 💎 ตามโควตาจริง",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - ผู้สอนสอบแปรรูปอาหาร",
    "SSW Mode": "โหมด SSW",
    "Session conversation guide": "คู่มือบทสนทนาประจำรอบ",
    "Open SSW Tactical Board": "เปิดกระดานกลยุทธ์ SSW",
    "Braincore": "สถิติ",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - ผู้สอนสอบแปรรูปอาหาร (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "คู่มือ OTAFF 91 หน้า + คำศัพท์ 266 คำ + แบบฝึกหัด CBT 58 ข้อ",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "เยี่ยม! บันทึกจุดนี้ลงโน้ต SSW แล้ว อยากดูขั้นตอนต่อไปในหน้านี้ต่อไหม?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "เยี่ยมมาก เข้าใจแล้ว! ตอนนี้เรากลับมาฝึกภาษาที่เรียนกันต่อ — ลองแต่งประโยคของตัวเองดูสัก 1 ประโยคเลย!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "คุณต้องมีอย่างน้อย {gems} Gem สำหรับเสียงตอบแรกของ {brand} (ยอดปัจจุบัน: {balance} 💎)",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "ทำแบบฝึกหัดในควิซเพื่อสะสม Gem หรือรอรีเซ็ตสิทธิ์ฟรีรายวันในวันพรุ่งนี้!",
    "1 · Ask Details": "1 · ถามรายละเอียด",
    "2 · Tips & Example": "2 · เคล็ดลับและตัวอย่าง",
    "3 · Test Me": "3 · ทดสอบฉัน",
    "Check Progress & Stage 1": "เช็กความคืบหน้า & ด่านที่ 1",
    "Sensei, check my SSW progress and where to start from zero!": "เซนเซ ช่วยเช็กความคืบหน้า SSW ของฉันหน่อย แล้วควรเริ่มจากศูนย์ตรงไหนดี!",
    "Allergen Update Apr 2026": "อัปเดตสารก่อภูมิแพ้ เม.ย. 2026",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "อธิบายอัปเดตสารก่อภูมิแพ้ OTAFF Ver 5.1 เดือนเมษายน 2026: วอลนัท (Kurumi), เม็ดมะม่วงหิมพานต์ (Cashew Nut) และพิสตาชิโอ (Pistachio) ให้หน่อย!",
    "Chlorine Math Drill": "ฝึกคำนวณคลอรีน",
    "Give me 1 chlorine dilution or budomari calculation question now!": "ขอโจทย์คำนวณการเจือจางคลอรีนหรือ budomari 1 ข้อตอนนี้เลย!",
    "Yukkuri Traps": "กับดักคำว่า Yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "อธิบายกับดักความเร็วคำว่า yukkuri และคำศัพท์ hokang sampuru ในบทเรียนนี้ให้หน่อย!",
    "Hide SSW Sensei quick actions": "ซ่อนปุ่มคำสั่งด่วน SSW เซนเซ",
    "Show SSW Sensei quick actions": "แสดงปุ่มคำสั่งด่วน SSW เซนเซ",
    "Actions & Ask Sensei": "คำสั่งด่วน & ถามเซนเซ",
    "[Study Focus]:": "[จุดเน้นการเรียน]:",
    "{m}m {s}s": "{m}น. {s}ว.",
    "Fluency & Grammar Accuracy Trend": "แนวโน้มความคล่องแคล่วและความแม่นยำไวยากรณ์",
    "Based on {turns} verified speaking turns": "บันทึกจาก {turns} รอบการสนทนา",
    "Page {page}": "หน้า {page}",
    "Page": "หน้า",
    "Page {page} · Step {step} of {total}": "หน้า {page} · ขั้นตอนที่ {step} จาก {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "ฝึก SSW แบบเร่งด่วนได้ในแผงกระดานกลยุทธ์ด้านบน",
    "Ready to continue lesson": "พร้อมเรียนต่อแล้ว",
    "Great!": "เยี่ยมเลย!",
    "Need extra explanation": "ต้องการคำอธิบายเพิ่มเติม",
    "Select an active step above.": "เลือกขั้นตอนที่ใช้งานอยู่ด้านบน",
    "SSW Food Manufacturing": "SSW อุตสาหกรรมการผลิตอาหาร",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "หัวใจสำคัญของ Describe Image คือความคล่องแคล่วที่สม่ำเสมอ ห้ามหยุดเว้นช่วงนานเกิน 3 วินาที! พูดประโยคโครงสร้าง Fiezel ทั้ง 5 ประโยคอย่างลื่นไหลด้วยน้ำเสียงที่มั่นคงและมั่นใจ",
    "Choose the CORRECT opening sentence for {title}:": "เลือกประโยคเปิดเรื่องที่ถูกต้องสำหรับ {title}:",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "สมบูรณ์แบบ! นี่คือโครงสร้างประโยคเปิดมาตรฐานที่ได้คะแนนสูง ครอบคลุมทั้ง Fluency และ Content",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "หลีกเลี่ยงสำนวนภาษาพูดอย่าง \"I see\"! ให้ใช้ระดับภาษาเชิงวิชาการมาตรฐาน",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "หลีกเลี่ยงคำแสดงความไม่แน่ใจอย่าง \"maybe\" พูดให้ชัดเจนและเด็ดขาด",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "เป๊ะเลย! \"maximum figure\" เป็นกลุ่มคำเชิงวิชาการที่ระบบให้คะแนนของ Pearson ให้ความสำคัญ",
    "Arrange the standard Pearson Describe Image opening sentence:": "เรียงประโยคเปิดมาตรฐานของ Pearson Describe Image ให้ถูกต้อง:",
    "Opening sentence ordered accurately!": "เรียงประโยคเปิดได้ถูกต้องแล้ว!",
    "Articulate the final syllable clearly.": "ออกเสียงพยางค์ท้ายให้ชัดเจน",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "รักษาระดับเสียงให้สม่ำเสมอตลอดแต่ละอนุประโยค และหยุดพักสั้น ๆ (0.3 วินาที) ทุกครั้งที่เจอเครื่องหมาย //",
    "Read the sentence accurately with crisp final consonant articulation.": "อ่านประโยคให้ถูกต้องพร้อมออกเสียงพยัญชนะท้ายให้คมชัด",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearson ให้คะแนนจังหวะการพูดที่สม่ำเสมอมากกว่าความเร็ว หยุดพักสั้น ๆ เฉพาะตรงจุดแบ่งวลี // เท่านั้น — ห้ามหยุดกลางวลี!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "จุดเว้นวรรคหายใจที่เป็นธรรมชาติ (การแบ่งกลุ่มคำ) ในประโยคนี้อยู่ตรงไหน?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "ถูกต้องเป๊ะ! เว้นวรรคให้ชัดเจนระหว่างประธานนามวลีที่ซับซ้อนกับกริยาหลัก",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "หยุดเว้นช่วงขาดตอนมากเกินไป! การพูดสะดุดเป็นท่อน ๆ จะทำให้คะแนน Oral Fluency ลดลง",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "การอ่านรวดเดียวโดยไม่หยุดพักเลยจะทำให้คำท้าย ๆ ขาดความชัดเจนและลมหายใจไม่พอ",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "ถูกต้อง! ประธานพหูพจน์ \"studies\" ต้องใช้คู่กับกริยารูปเดิม \"demonstrate\"",
    "Order this academic Read Aloud sentence accurately:": "เรียงประโยคเชิงวิชาการสำหรับ Read Aloud นี้ให้ถูกต้อง:",
    "Perfect! Clean academic phrase grouping.": "สมบูรณ์แบบ! แบ่งกลุ่มวลีเชิงวิชาการได้สะอาดชัดเจน",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "ความเร็วในการพูดที่วัดได้ {wpm} WPM ({pace}) ตลอด {sec} วินาที{vocal}{reasons}",
    "optimal zone 115-152 WPM": "ช่วงที่เหมาะสม 115-152 WPM",
    "too fast": "เร็วเกินไป",
    "too slow": "ช้าเกินไป",
    " (active vocalization {asec}s, phonation {pct}%). ": "(การเปล่งเสียงจริง {asec} วินาที, สัดส่วนการออกเสียง {pct}%)",
    "Steady speech rhythm.": "จังหวะการพูดสม่ำเสมอ",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "ยังไม่มีตัวอย่างเสียงพูด PTE ที่บันทึกไว้ในรอบนี้ พูดใส่ไมโครโฟนเพื่อวัดผล Oral Fluency (WPM, การเว้นวรรค, การสะดุด และจังหวะการพูด) แบบเรียลไทม์",
    "Pearson PTE Official Scorecard": "ใบรายงานคะแนนอย่างเป็นทางการของ Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "ผลการประเมินเชิงวัตถุวิสัยจากตัวอย่างเสียงล่าสุดของคุณ ({src}) คุณผ่านเกณฑ์เป้าหมาย PTE 58+ แล้ว",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "ผลการประเมินเชิงวัตถุวิสัยจากตัวอย่างเสียงล่าสุดของคุณ ({src}) เน้นการแบ่งวลีให้ลื่นไหลและออกเสียงพยัญชนะท้ายให้ชัดเจน",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "บันทึกตัวอย่างเสียงพูดก่อน เพื่อดูค่า Pearson Concordance (/90) ความเร็วในการพูด (WPM) สัดส่วนการออกเสียงจริง และข้อมูลการเว้นจังหวะ",
    "How is \"fluctuations\" pronounced naturally?": "คำว่า \"fluctuations\" ออกเสียงอย่างเป็นธรรมชาติอย่างไร",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (ออกเสียง /ʃ/ ที่ลงท้าย -tion ให้ชัดเจน)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "ถูกต้องเลย! คำลงท้าย -tion ออกเสียงว่า /ʃənz/",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (อ่านเรียงตามตัวอักษรทีละตัว)",
    "Not natural—avoid spelling-based syllable stress.": "ยังไม่เป็นธรรมชาติ—หลีกเลี่ยงการเน้นเสียงตามตัวสะกด",
    "Right! The noun \"fluency\" fits after steady.": "ถูกต้อง! คำนาม \"fluency\" ใช้ตามหลัง steady ได้พอดี",
    "Order the core PTE fluency principle:": "เรียงลำดับหลักการสำคัญของความคล่องแคล่วใน PTE:",
    "Exact! Fluency is the key to high scores.": "ถูกต้องเลย! ความคล่องแคล่วคือกุญแจสู่คะแนนสูง",
    "Listen": "ฟังเสียง",
    "Learning Session": "บทเรียน",
    "Concept A": "แนวคิด A",
    "Concept B": "แนวคิด B",
    "Concept Balance Diagram": "แผนภาพสมดุลแนวคิด",
    "Comparing...": "กำลังเปรียบเทียบ...",
    "Sentence Pattern Flow": "โครงสร้างการเรียงประโยค",
    "Building flow...": "กำลังสร้างลำดับโครงสร้าง...",
    "Zoom": "ซูม",
    "STROKES": "ลำดับขีด",
    "Stroke": "ขีด",
    "Loading strokes...": "กำลังโหลดลำดับขีด...",
    "Show / hide trace guidelines": "แสดง / ซ่อนเส้นแนวคัดลายมือ",
    "👁 Hide Trace": "👁 ซ่อนเส้นคัด",
    "👁 Trace": "👁 เส้นคัด",
    "▶ Follow Tutor": "▶ เขียนตามผู้สอน",
    "Click to view stroke {num}": "คลิกเพื่อดูขีดที่ {num}",
    "Topic Visual Sketch": "ภาพสเก็ตช์ประกอบหัวข้อ",
    "Drawing...": "กำลังวาด...",
    "Zoom in to inspect details": "ซูมเข้าเพื่อดูรายละเอียด",
    "Up next": "ถัดไป",
    "Tutor Writing...": "ผู้สอนกำลังเขียน...",
    "Quick Check Practice": "แบบฝึกทบทวนด่วน",
    "Tutor is writing on the board...": "ผู้สอนกำลังเขียนบนกระดาน...",
    "Zoom Out Transition": "ซูมออกเปลี่ยนมุมมอง",
    "Focus Zoom": "ซูมโฟกัส",
    "Focus Ready": "โฟกัสพร้อมแล้ว",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ โหมดปากกาเปิดอยู่ — วงกลมส่วนที่ต้องการถามได้เลย",
    "Clear": "ล้าง",
    "Start from Scratch": "เริ่มใหม่ตั้งแต่ต้น",
    "In Progress": "กำลังเรียนอยู่",
    "Pages:": "หน้า:",
    "Pg": "หน้า",
    "Vocab:": "คำศัพท์:",
    "Correct:": "ถูกต้อง:",
    "Loading full material...": "กำลังโหลดเนื้อหาทั้งหมด...",
    "Exam Readiness:": "ความพร้อมสอบ:",
    "Pass": "ผ่าน",
    "Pass threshold": "เกณฑ์ผ่าน",
    "Reset SSW study progress to 0%": "รีเซ็ตความคืบหน้าการเรียน SSW เป็น 0%",
    "Active Spot": "จุดที่กำลังดู",
    "Step": "ขั้นตอน",
    "of": "จาก",
    "View This Step": "ดูขั้นตอนนี้",
    "Ask Sensei to Explain": "ให้ Sensei ช่วยอธิบาย",
    "Study Roadmap": "แผนการเรียน",
    "Study Guide": "คู่มือการเรียน",
    "p.": "หน้า",
    "Practice Quiz": "แบบทดสอบฝึกหัด",
    "START HERE (ZERO BEGINNER)": "เริ่มต้นที่นี่ (สำหรับผู้ไม่มีพื้นฐาน)",
    "CURRENT ACTIVE STAGE": "ขั้นที่กำลังเรียนอยู่",
    "Stage": "ขั้น",
    "Open p. {page} & Start": "เปิดหน้า {page} และเริ่มเรียน",
    "Ask Sensei": "ถาม Sensei",
    "Topics That Still Need Review (Click for Practice Quiz):": "หัวข้อที่ยังต้องทบทวน (คลิกเพื่อทำแบบฝึกหัด):",
    "Done ✓": "เสร็จแล้ว ✓",
    "Mark Done": "ทำเครื่องหมายว่าเสร็จแล้ว",
    "Open Page": "เปิดหน้า",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "สรุป 13 ตัวเลขสำคัญที่ต้องรู้ก่อนสอบ (แตะเพื่อเปิด)",
    "Hide": "ซ่อน",
    "View 13 Numbers": "ดู 13 ตัวเลขสำคัญ",
    "Pg.": "หน้า",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "ค้นหาหัวข้อหรือคำสำคัญ (เช่น ภูมิแพ้, คลอรีน, หน้า 27)...",
    "Show Reading Guide (Furigana)": "แสดงคำอ่านช่วยจำ (Furigana)",
    "Hide Reading Guide (Furigana)": "ซ่อนคำอ่านช่วยจำ (Furigana)",
    "Search Results \"{query}\" ({count} matches)": "ผลการค้นหา \"{query}\" (พบ {count} รายการ)",
    "Close Results": "ปิดผลการค้นหา",
    "Trap": "จุดหลอก",
    "Page Completed ✓": "เรียนหน้านี้จบแล้ว ✓",
    "Mark Page Complete": "ทำเครื่องหมายว่าเรียนจบหน้านี้",
    "Key Takeaway on This Page": "สรุปสาระสำคัญในหน้านี้",
    "Active": "กำลังใช้งาน",
    "Understood": "เข้าใจแล้ว",
    "Next Step": "ขั้นตอนถัดไป",
    "Got it, Next Step {step} ->": "เข้าใจแล้ว ไปขั้นตอนที่ {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "จบหน้า {page} เปิดหน้า {nextPage} ->",
    "Complete Final Step ✓": "ทำขั้นตอนสุดท้ายเสร็จสิ้น ✓",
    "Exam Trap Alert:": "ระวังกับดักข้อสอบ:",
    "Exam Calculation Formula:": "สูตรคำนวณสำหรับข้อสอบ:",
    "Video Notes for Page {page}:": "บันทึกวิดีโอสำหรับหน้า {page}:",
    "Matching Vocabulary ({count})": "คำศัพท์ที่เกี่ยวข้อง ({count})",
    "Key Vocabulary on Page {page} ({count})": "คำศัพท์สำคัญในหน้า {page} ({count})",
    "Mastered ✓": "เชี่ยวชาญแล้ว ✓",
    "Mark Mastered": "ทำเครื่องหมายว่าเชี่ยวชาญแล้ว",
    "Exam Case Quiz": "ควิซกรณีศึกษาข้อสอบ",
    "Calculation Drill": "แบบฝึกหัดคำนวณ",
    "Exam Trap Quiz": "ควิซจับผิดกับดักข้อสอบ",
    "Vocab Drill": "แบบฝึกหัดคำศัพท์",
    "Hide 5 Formulas": "ซ่อนสูตรทั้ง 5",
    "Open 5 Calculation Formulas": "เปิดดูสูตรคำนวณทั้ง 5",
    "Question": "คำถาม",
    "Tryout p.": "ทดลองทำหน้า",
    "Review p.": "ทบทวนหน้า",
    "View Explanation on p. {page}": "ดูคำอธิบายในหน้า {page}",
    "Next Question ->": "คำถามถัดไป ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "พร้อมลองทำควิซฝึกหัด SSW แปรรูปอาหารหรือยัง?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "เลือกรูปแบบการฝึกด้านบน หรือถามเซนเซด้วยเสียงได้เลย ทุกข้อมีคำอธิบายชัดเจนพร้อมเลขหน้าอ้างอิงให้ทบทวน",
    "Start 1 Question Now": "เริ่มทำ 1 ข้อเลย",
    "Enlarge diagram for a closer view": "ขยายแผนภาพเพื่อดูให้ชัดเจนขึ้น",
    "TRIGGER / SUBJECT": "ตัวกระตุ้น / ประธาน",
    "PAIR!": "จับคู่!",
    "MATCHING FORM": "รูปที่สอดคล้องกัน",
    "Lead Car": "หัวขบวน",
    "Right Link": "ข้อต่อที่ถูกต้อง",
    "Check Context": "ตรวจดูบริบท",
    "Safe to Use": "ใช้ได้อย่างมั่นใจ",
    "SNAPSHOT": "ภาพนิ่ง",
    "RULE 1": "กฎข้อที่ 1",
    "Core Form": "รูปหลัก",
    "ACTION VIDEO": "วิดีโอการกระทำ",
    "RULE 2": "กฎข้อที่ 2",
    "Contrast Form": "รูปเปรียบเทียบ",
    "CONCEPT 1": "แนวคิดที่ 1",
    "🔎 Focus": "🔎 จุดเน้น",
    "CONCEPT 2": "แนวคิดที่ 2",
    "Core Concept": "แนวคิดหลัก",
    "Sentence Pattern Blocks": "บล็อกโครงสร้างประโยค",
    "Arranging blocks...": "กำลังจัดเรียงบล็อก...",
    "Whiteboard Visual Detail": "รายละเอียดภาพบนกระดาน",
    "Zoom Out": "ซูมออก",
    "Zoom In": "ซูมเข้า",
    "inaccurate grammar pattern": "โครงสร้างไวยากรณ์ไม่ถูกต้อง",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "บทสนทนา FIEZEL Japanese Life ({level}): {topic}",
    "Real-Life Communication: {topic}": "การสื่อสารจริง: {topic}",
    "Use the situational Japanese sentence pattern naturally.": "ใช้โครงสร้างประโยคภาษาญี่ปุ่นตามสถานการณ์อย่างเป็นธรรมชาติ",
    "Deliver clear pronunciation and polite phrasing smoothly.": "ออกเสียงชัดเจนและใช้ถ้อยคำสุภาพอย่างลื่นไหล",
    "IELTS Speaking: {topic}": "การพูด IELTS: {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "จำลองการสอบ Cambridge IELTS Speaking Part 2 และ 3 คุณมีเวลา 1 นาทีในการเตรียมโน้ตสำหรับหัวข้อ: {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "ใน Part 2 นี้ ผมจะให้หัวข้อแก่คุณ คุณมีเวลา 1 นาทีในการคิดและจดบันทึก หัวข้อของคุณคือ: {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "พูดต่อเนื่อง 1-2 นาทีโดยครอบคลุมหัวข้อย่อยทั้งหมด",
    "Use academic discourse markers cleanly and naturally.": "ใช้คำเชื่อมประโยคระดับวิชาการ (Furthermore, In addition, Consequently)",
    "Level A1 · Beginner": "ระดับ A1 · ผู้เริ่มต้น",
    "Level A2 · Everyday Conversation": "ระดับ A2 · บทสนทนาในชีวิตประจำวัน",
    "🎯 Best Answer ({level})": "🎯 คำตอบแนะนำ ({level})",
    "Short & Easy": "สั้นและง่าย",
    "Natural & Contextual": "เป็นธรรมชาติ",
    "Reply + Follow-up": "ตอบและถามกลับ",
    "🎯 Best Answer (Level {level})": "🎯 คำตอบแนะนำ (Level {level})",
    "Part": "ส่วนที่",
    "First on the left, {title}: {subtitle}{ex}": "อย่างแรกทางด้านซ้าย {title}: {subtitle}{ex}",
    "focus on the core rule": "เน้นที่กฎหลัก",
    ". Example: {example}": ". ตัวอย่าง: {example}",
    "Second on the right, {title}: {subtitle}{ex}": "อย่างที่สองทางด้านขวา {title}: {subtitle}{ex}",
    "compare with this form": "เปรียบเทียบกับรูปนี้",
    "Key idea": "สาระสำคัญ",
    "Branch {num}, {label}{sub}{ex}": "กิ่งที่ {num}, {label}{sub}{ex}",
    ", meaning {sublabel}": ", หมายถึง {sublabel}",
    ", for example {example}": ", เช่น {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "มาดูแผนผังความคิดเรื่อง {topic} ทีละส่วนกันเลย {detail}.",
    ", e.g. {example}": ", เช่น {example}",
    ". Then ": ". จากนั้น",
    "Follow the timeline from left to right. {stops}.": "ไล่ดูเส้นเวลาจากซ้ายไปขวา {stops}.",
    "Block {num}, {role}, contains {token}{note}": "บล็อกที่ {num}, {role}, ประกอบด้วย {token}{note}",
    ", used for {note}": ", ใช้สำหรับ {note}",
    "Notice the pattern blocks from left to right. {detail}.": "สังเกตบล็อกโครงสร้างประโยคจากซ้ายไปขวา {detail}.",
    " Starting from {parts}.": "เริ่มจาก {parts}.",
    ", then ": ", แล้วตามด้วย",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "ดูแผนภาพเรื่อง {topic} บนกระดานให้ละเอียด{cap}{visualCue}",
    "Primary form": "รูปแบบหลัก",
    "Comparison form": "รูปแบบเปรียบเทียบ",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "เปรียบเทียบทั้งสองฝั่ง: {sideA} กับ {sideB}{insight}",
    " Key insight: {insight}.": "จุดสำคัญ: {insight}",
    "{role}: {word}": "{role}: {word}",
    ", followed by ": "ตามด้วย",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "เรียงตามบล็อกประโยคจากซ้ายไปขวา: {chain}{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "สังเกตโครงสร้างประโยคของเรื่อง {topic}: {detail}",
    "place each clause element in its proper slot": "วางส่วนประกอบของประโยคแต่ละส่วนลงในช่องที่ถูกต้อง",
    ". Next: ": "ถัดไป:",
    "Examples on the board": "ตัวอย่างบนกระดาน",
    "Review the examples in this table": "ทบทวนตัวอย่างในตารางนี้",
    "Reason:": "เหตุผล:",
    "Avoid forms like {wrong}. Use {right}.{why}": "หลีกเลี่ยงรูปแบบอย่าง {wrong} ให้ใช้ {right} แทน{why}",
    "the common mistake": "ข้อผิดพลาดที่พบบ่อย",
    "Remember this key point:": "จำจุดสำคัญนี้ไว้ให้ดี:",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "ดูเส้นระดับเสียงของคำว่า {word} แล้วออกเสียง {reading} ตามเส้นโค้งสีฟ้า",
    "Now try this quick check: {prompt}.": "ลองทำแบบทดสอบสั้นๆ นี้ดู: {prompt}",
    "choose the accurate sentence form": "เลือกรูปประโยคที่ถูกต้อง",
    "To Be vs Active Verb Map": "แผนผังการใช้ To Be เทียบกับกริยาแสดงการกระทำ (Active Verb)",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "ใช้ To Be กับคำคุณศัพท์ (Adj), คำนาม/สถานที่ (Noun/Location), Verb-ing หรือ Verb 3 (Passive) เท่านั้น — ห้ามใช้คู่กับ Verb 1 เพียวๆ เด็ดขาด",
    "Subject + Verb 1": "ประธาน (Subject) + Verb 1",
    "Direct active verb, no To Be": "ใช้กริยาแสดงการกระทำโดยตรง ไม่ต้องมี To Be",
    "To Be + Adj/Noun": "To Be + คำคุณศัพท์/คำนาม (Adj/Noun)",
    "State, trait, role, or location": "บอกสภาพ ลักษณะ บทบาท หรือสถานที่",
    "To Be + Verb-ing": "To Be + กริยาเติม -ing (Verb-ing)",
    "Action happening right now": "การกระทำที่กำลังเกิดขึ้นในตอนนี้",
    "To Be + Verb 3": "To Be + กริยาช่อง 3 (Verb 3)",
    "Passive voice (acted upon)": "ประโยคถูกกระทำ (Passive voice)",
    "Subject": "ประธาน (Subject)",
    "Key Connector": "คำเชื่อมหลัก",
    "Main Verb / Core": "กริยาหลัก / แกนประโยค",
    "Object / Complement": "กรรม / ส่วนเติมเต็ม",
    "Details": "รายละเอียดเพิ่มเติม",
    "Build the Sentence": "ประกอบประโยค",
    "Block": "บล็อก",
    "Key pattern slot": "ช่องโครงสร้างหลัก",
    "Photo vs Action Video": "ภาพนิ่ง vs วิดีโอเคลื่อนไหว",
    "PHOTO MODE": "โหมดภาพนิ่ง",
    "Focuses on state, trait, or condition": "เน้นบอกสภาพ ลักษณะ หรือสถานะ",
    "VIDEO MODE": "โหมดวิดีโอ",
    "Focuses on action, movement, or habit": "เน้นบอกการกระทำ การเคลื่อนไหว หรือกิจวัตร",
    "Pattern Block Puzzle": "พัซเซิลต่อบล็อกโครงสร้างประโยค",
    "Snap the colored blocks left to right into a natural sentence.": "วางบล็อกสีเรียงจากซ้ายไปขวาให้เป็นประโยคที่สมบูรณ์เป็นธรรมชาติ",
    "0 Start": "0 เริ่มต้น",
    "1 Concept": "1 แนวคิด",
    "2 Sketch": "2 ภาพจำลอง",
    "3 Breakdown": "3 วิเคราะห์โครงสร้าง",
    "4 Practice": "4 ฝึกปฏิบัติ",
    "Question Topic": "หัวข้อคำถาม",
    "Key Takeaways": "สรุปประเด็นสำคัญ",
    "Contextual Practice": "ฝึกใช้ตามบริบท",
    "States, traits, roles, or places": "สภาพ ลักษณะ บทบาท หรือสถานที่",
    "Core Pattern": "โครงสร้างหลัก",
    "Verb / Key": "กริยา / คำหลัก",
    "Complement": "ส่วนเติมเต็ม",
    "✦ Learning Board": "กระดานเรียนรู้",
    "Board Active": "กระดานทำงานอยู่",
    "⤢ Open": "⤢ เปิด",
    "Minimize Board (See Mochi & Keep Talking)": "ย่อกระดาน (ดูโมจิและคุยต่อได้)",
    "Close & Continue Talking": "ปิดและคุยต่อ",
    "Preparing learning board...": "Fiezel กำลังเตรียมบทเรียน...",
    "Building visual explanations and tailored practice for you": "กำลังเรียบเรียงคำอธิบายภาพและแบบฝึกหัดเฉพาะสำหรับคุณ",
    "💡 Key Point:": "💡 จุดสำคัญ:",
    "Sentence Pattern": "โครงสร้างประโยค",
    "Choice": "เลือกคำตอบ",
    "Fill in Blank": "เติมคำ",
    "Word Order": "เรียงคำ",
    "New Question": "เปลี่ยนโจทย์",
    "Switch to a fresh practice question": "เปลี่ยนโจทย์ใหม่",
    "Tap the right word to complete the sentence:": "แตะคำที่ถูกต้องเพื่อเติมประโยคให้สมบูรณ์:",
    "That word does not fit yet. Try another option!": "คำนี้ยังไม่ถูกต้อง ลองเลือกคำอื่นดูนะ!",
    "Tap tiles below to build the sentence...": "แตะคำด้านล่างเพื่อเรียงเป็นประโยค...",
    "Close ✕": "ปิด ✕",
    "× Unnatural / Avoid": "× ยังไม่เป็นธรรมชาติ",
    "✓ Natural Form": "✓ รูปประโยคที่เป็นธรรมชาติ",
    "Key Radical": "รากศัพท์หลัก",
    "Strokes": "ขีดเขียน",
    "Tone Contour & Pronunciation": "ระดับเสียงและคำอ่าน",
    "Spot on! This sentence structure is clear and natural.": "เยี่ยมมาก! รูปประโยคถูกต้องและเป็นธรรมชาติแล้ว",
    "Not quite — check the word order and pattern above and try again.": "ยังไม่ถูกต้อง ลองสังเกตโครงสร้างเปรียบเทียบด้านบนอีกครั้งนะ",
    "Nice work! That word completes the sentence naturally.": "ถูกต้อง! คำนี้ทำให้ประโยคสมบูรณ์",
    "Cleanly arranged! Word order is spot on.": "เรียงประโยคได้สมบูรณ์แบบ!",
    "Arrange the tiles below into a natural sentence:": "เรียงคำด้านล่างให้เป็นประโยคที่ถูกต้อง:"
  },
  "ms": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "Rakan Suara memerlukan sambungan internet yang aktif untuk perbualan Fiezel masa nyata.",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "Pelayar menyekat automain. Ketik \"Mainkan Suara\" untuk mendengar balasan.",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "Suara Fiezel sedang menyambung semula. Balasan teks kekal kelihatan—ketik \"Mainkan Suara\" untuk cuba semula.",
    "Student": "Pelajar",
    "Learning Board": "Papan Pembelajaran",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "Anda masih menggunakan bentuk perangkap \"{trap}\" — tukar kepada bentuk yang diserlahkan pada papan putih.",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "Selepas \"Did / Didn't / Does\", gunakan kata kerja dasar (V1) dan bukannya bentuk kala lampau \"{verb}\".",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "Jangan letakkan \"{be}\" sebelum kata kerja \"{verb}\". Gunakan subjek dan terus diikuti oleh kata kerja.",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "Untuk titik permulaan masa yang khusus (seperti 2020 atau hari Isnin), gunakan \"since\", bukan \"for\".",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "Untuk hari dalam seminggu (Monday, Friday, dll.), gunakan kata sendi \"on\", bukan \"in\".",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "\"Despite\" tidak pernah diikuti oleh \"of\" — terus gunakan \"despite + kata nama\" atau \"in spite of\".",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "Selepas kata kerja modal (should/must/can), terus gunakan kata kerja dasar tanpa \"to\".",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "Bina ayat lengkap yang mengandungi sekurang-kurangnya 3 perkataan (Subjek + Kata Kerja + Pelengkap) untuk menguji pola tersebut.",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "\"ますでした\" tidak gramatis — konjugasikan ます terus kepada ました untuk kala lampau.",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "Kata kerja bentuk kamus biasa tidak boleh digabungkan terus dengan です — gunakan bentuk sopan 〜ます / 〜ました.",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "Untuk lokasi tempat sesuatu tindakan berlaku (belajar/minum), gunakan partikel で dan bukannya に.",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "Tulis ayat lengkap dalam tulisan Jepun (Hiragana/Kanji) mengikut pola tersebut.",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "Untuk menyatakan tindakan yang sedang berlangsung, gunakan 正在 atau 在 sebelum kata kerja dan bukannya 是.",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "Dalam bahasa Mandarin, ungkapan masa (seperti 现在 / 昨天) mesti diletakkan SEBELUM kata kerja.",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "Tulis ayat penuh dalam aksara Cina (Hanzi) yang sepadan dengan pola tersebut.",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "Syabas! Struktur ayat dan tatabahasa anda sepadan dengan corak tersebut dengan kemas. Ketik \"Teruskan Berbual\" untuk kembali ke perbualan.",
    "Not quite right yet. Review the meaning and structure above and try again.": "Masih belum tepat sepenuhnya. Semak maksud dan struktur di atas, kemudian cuba lagi.",
    "Check your word order and verb form against the formula blocks above.": "Semak susunan kata dan bentuk kata kerja anda berdasarkan blok formula di atas.",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "Mikrofon tidak aktif atau disekat oleh pelayar. Ketik Bercakap untuk membenarkan akses mikrofon, atau taip ayat anda di bawah.",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "Pengecaman pertuturan memerlukan sambungan internet. Cuba bercakap semula atau taip ayat anda.",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "Kebenaran mikrofon disekat oleh pelayar. Benarkan akses mikrofon pada bar alamat anda atau taip ayat anda di bawah.",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "Pelayar ini belum menyokong pengecaman pertuturan automatik lagi. Taip ayat anda di bawah atau pilih cadangan balasan di atas.",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "Kebenaran mikrofon tidak aktif dalam pelayar ini. Taip ayat anda atau pilih kad cadangan balasan di atas.",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "Tiada pertuturan dikesan setakat ini. Pastikan mikrofon anda aktif dan bercakap dengan jelas, atau taip dalam kotak di bawah.",
    "Switching cleanly to a fresh voice channel...": "Bertukar dengan lancar ke saluran suara baharu...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "Tiada suara Fiezel dimainkan lagi, 0 Gems digunakan (Baki & Kuota Selamat)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "Panggilan tamat: {turns} balasan suara Fiezel, Kuota Percuma Harian (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "Panggilan tamat: {turns} balasan suara Fiezel, {gems} 💎 digunakan mengikut kuota suara",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - Mentor Peperiksaan Pemprosesan Makanan",
    "SSW Mode": "Mod SSW",
    "Session conversation guide": "Panduan perbualan sesi",
    "Open SSW Tactical Board": "Buka Papan Taktikal SSW",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - Mentor Peperiksaan Pemprosesan Makanan (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "Panduan Rasmi OTAFF 91 Halaman + 266 Kotoba + 58 Latih Tubi CBT",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "Hebat! Isi penting itu telah disimpan dalam nota SSW anda. Bersedia untuk mempelajari langkah seterusnya di halaman ini?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "Bagus, anda faham! Sekarang mari kembali ke bahasa sasaran — cuba bina satu ayat anda sendiri!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "Anda memerlukan sekurang-kurangnya {gems} Gems untuk balasan suara {brand} pertama (Baki semasa: {balance} 💎).",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "Lengkapkan latihan kuiz untuk mengumpul Gems percuma atau tunggu peruntukan percuma harian esok!",
    "1 · Ask Details": "1 · Tanya Butiran",
    "2 · Tips & Example": "2 · Tip & Contoh",
    "3 · Test Me": "3 · Uji Saya",
    "Check Progress & Stage 1": "Semak Kemajuan & Peringkat 1",
    "Sensei, check my SSW progress and where to start from zero!": "Sensei, semak kemajuan SSW saya dan dari mana perlu bermula dari sifar!",
    "Allergen Update Apr 2026": "Kemas Kini Alergen Apr 2026",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "Terangkan kemas kini alergen OTAFF Ver 5.1 April 2026: Kacang Walnut (Kurumi), Gajus, dan Pistachio!",
    "Chlorine Math Drill": "Latih Tubi Matematik Klorin",
    "Give me 1 chlorine dilution or budomari calculation question now!": "Berikan saya 1 soalan pengiraan pencairan klorin atau budomari sekarang!",
    "Yukkuri Traps": "Perangkap Yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "Terangkan perangkap kelajuan yukkuri dan istilah hokang sampuru dalam modul tersebut!",
    "Hide SSW Sensei quick actions": "Sembunyikan tindakan pantas SSW Sensei",
    "Show SSW Sensei quick actions": "Tunjukkan tindakan pantas SSW Sensei",
    "Actions & Ask Sensei": "Tindakan & Tanya Sensei",
    "[Study Focus]:": "[Fokus Pembelajaran]:",
    "{m}m {s}s": "{m}m {s}s",
    "Fluency & Grammar Accuracy Trend": "Trend Kefasihan & Ketepatan Tatabahasa",
    "Based on {turns} verified speaking turns": "Berdasarkan {turns} giliran pertuturan yang disahkan",
    "Page {page}": "Halaman {page}",
    "Page": "Halaman",
    "Page {page} · Step {step} of {total}": "Halaman {page} · Langkah {step} daripada {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "Latihan pantas SSW tersedia dalam panel Papan Taktikal di atas.",
    "Ready to continue lesson": "Bersedia untuk meneruskan pelajaran",
    "Great!": "Bagus!",
    "Need extra explanation": "Perlukan penerangan tambahan",
    "Select an active step above.": "Pilih langkah aktif di atas.",
    "SSW Food Manufacturing": "SSW Pembuatan Makanan",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "Kunci kepada Describe Image ialah KEFASIHAN YANG STABIL. Jangan sekali-kali berhenti melebihi 3 saat! Sampaikan 5 ayat berstruktur Fiezel dengan lancar menggunakan intonasi yang stabil dan yakin.",
    "Choose the CORRECT opening sentence for {title}:": "Pilih ayat pembukaan yang BETUL untuk {title}:",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "Sempurna! Struktur pembukaan standard bermarkah tinggi yang merangkumi Kefasihan dan Kandungan.",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "Elakkan ungkapan santai seperti \"I see\"! Gunakan laras bahasa akademik standard.",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "Elakkan perkataan ragu-ragu seperti \"maybe\". Bercakap dengan tegas dan jelas.",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "Tepat sekali! \"maximum figure\" ialah kolokasi akademik yang bernilai dalam pemarkahan Pearson.",
    "Arrange the standard Pearson Describe Image opening sentence:": "Susun ayat pembukaan standard Pearson Describe Image:",
    "Opening sentence ordered accurately!": "Ayat pembukaan disusun dengan tepat!",
    "Articulate the final syllable clearly.": "Sebut suku kata akhir dengan jelas.",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "Kekalkan nada yang stabil pada setiap klausa dan berhenti seketika (0.3s) pada setiap sempadan //.",
    "Read the sentence accurately with crisp final consonant articulation.": "Baca ayat dengan tepat beserta sebutan konsonan akhir yang jelas dan tegas.",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearson menilai RITMA YANG STABIL berbanding kelajuan. Berhenti seketika hanya pada pemisah frasa //—jangan sesekali berhenti di tengah frasa!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "Di manakah jeda nafas SEMULA JADI (pembahagian frasa) dalam ayat ini?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "Tepat! Berhenti dengan kemas di antara subjek kata nama kompleks dan kata kerja utama.",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "Terlalu banyak jeda yang terputus-putus! Jeda yang terputus-putus menurunkan Oral Fluency.",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "Membaca tanpa sebarang jeda menyebabkan perkataan di penghujung kehilangan kejelasan dan sokongan nafas.",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "Betul! Subjek jamak \"studies\" mengambil kata kerja dasar \"demonstrate\".",
    "Order this academic Read Aloud sentence accurately:": "Susun ayat akademik Read Aloud ini dengan tepat:",
    "Perfect! Clean academic phrase grouping.": "Sempurna! Pengelompokan frasa akademik yang kemas.",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "Kadar pertuturan diukur {wpm} WPM ({pace}) sepanjang {sec}s{vocal}{reasons}",
    "optimal zone 115-152 WPM": "zon optimum 115-152 WPM",
    "too fast": "terlalu laju",
    "too slow": "terlalu perlahan",
    " (active vocalization {asec}s, phonation {pct}%). ": "(penyuaraan aktif {asec}s, fonasi {pct}%).",
    "Steady speech rhythm.": "Ritma pertuturan yang stabil.",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "Tiada sampel pertuturan PTE yang dirakam dalam sesi ini lagi. Bercakap ke dalam mikrofon untuk mengukur Kelancaran Lisan (WPM, jeda, ketaklancaran & ritma pertuturan) secara langsung.",
    "Pearson PTE Official Scorecard": "Kad Skor Rasmi Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "Penilaian objektif daripada sampel terkini anda ({src}). Anda memenuhi sasaran PTE 58+.",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "Penilaian objektif daripada sampel terkini anda ({src}). Fokus pada penyusunan frasa yang lancar dan konsonan akhir yang jelas.",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "Rakam sampel pertuturan terlebih dahulu untuk melihat Keselarasan Pearson (/90), kadar WPM, nisbah fonasi aktif dan telemetri jeda anda.",
    "How is \"fluctuations\" pronounced naturally?": "Bagaimanakah \"fluctuations\" disebut secara semula jadi?",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (dengan bunyi /ʃ/ yang jelas pada -tion)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "Tepat sekali! Akhiran -tion disebut /ʃənz/.",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (bacaan huruf demi huruf)",
    "Not natural—avoid spelling-based syllable stress.": "Tidak semula jadi—elakkan penekanan suku kata berdasarkan ejaan.",
    "Right! The noun \"fluency\" fits after steady.": "Betul! Kata nama \"fluency\" sesuai selepas steady.",
    "Order the core PTE fluency principle:": "Susun prinsip teras kelancaran PTE:",
    "Exact! Fluency is the key to high scores.": "Tepat sekali! Kelancaran ialah kunci kepada skor tinggi.",
    "Listen": "Dengar",
    "Learning Session": "Sesi Pembelajaran",
    "Concept A": "Konsep A",
    "Concept B": "Konsep B",
    "Concept Balance Diagram": "Gambar Rajah Imbangan Konsep",
    "Comparing...": "Membandingkan...",
    "Sentence Pattern Flow": "Aliran Pola Ayat",
    "Building flow...": "Membina aliran...",
    "Zoom": "Zum",
    "STROKES": "STROK",
    "Stroke": "Strok",
    "Loading strokes...": "Memuatkan strok...",
    "Show / hide trace guidelines": "Papar / sembunyi garis panduan surihan",
    "👁 Hide Trace": "👁 Sembunyi Surih",
    "👁 Trace": "👁 Surih",
    "▶ Follow Tutor": "▶ Ikut Tutor",
    "Click to view stroke {num}": "Klik untuk lihat strok {num}",
    "Topic Visual Sketch": "Lakaran Visual Topik",
    "Drawing...": "Melukis...",
    "Zoom in to inspect details": "Zum masuk untuk melihat butiran",
    "Up next": "Seterusnya",
    "Tutor Writing...": "Tutor Sedang Menulis...",
    "Quick Check Practice": "Latihan Semakan Pantas",
    "Tutor is writing on the board...": "Tutor sedang menulis di papan...",
    "Zoom Out Transition": "Peralihan Zum Keluar",
    "Focus Zoom": "Zum Fokus",
    "Focus Ready": "Fokus Sedia",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ Mod Pen Aktif — Bulatkan mana-mana bahagian untuk bertanya",
    "Clear": "Kosongkan",
    "Start from Scratch": "Mula dari Awal",
    "In Progress": "Sedang Berjalan",
    "Pages:": "Muka Surat:",
    "Pg": "MS",
    "Vocab:": "Kosa Kata:",
    "Correct:": "Betul:",
    "Loading full material...": "Memuatkan bahan penuh...",
    "Exam Readiness:": "Kesediaan Peperiksaan:",
    "Pass": "Lulus",
    "Pass threshold": "Tahap lulus",
    "Reset SSW study progress to 0%": "Set semula kemajuan pengajian SSW kepada 0%",
    "Active Spot": "Titik Aktif",
    "Step": "Langkah",
    "of": "daripada",
    "View This Step": "Lihat Langkah Ini",
    "Ask Sensei to Explain": "Minta Sensei Terangkan",
    "Study Roadmap": "Peta Laluan Pengajian",
    "Study Guide": "Panduan Pengajian",
    "p.": "m.s.",
    "Practice Quiz": "Kuiz Latihan",
    "START HERE (ZERO BEGINNER)": "MULA DI SINI (ASAS SIFAR)",
    "CURRENT ACTIVE STAGE": "PERINGKAT AKTIF SEMASA",
    "Stage": "Peringkat",
    "Open p. {page} & Start": "Buka m.s. {page} & Mula",
    "Ask Sensei": "Tanya Sensei",
    "Topics That Still Need Review (Click for Practice Quiz):": "Topik yang Masih Perlu Diulang Kaji (Klik untuk Kuiz Latihan):",
    "Done ✓": "Selesai ✓",
    "Mark Done": "Tandakan Selesai",
    "Open Page": "Buka Muka Surat",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "Ringkasan 13 Nombor Peperiksaan Wajib Tahu (Ketik untuk Buka)",
    "Hide": "Sembunyi",
    "View 13 Numbers": "Lihat 13 Nombor",
    "Pg.": "M.S.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "Cari topik atau kata kunci (cth., alahan, klorin, muka surat 27)...",
    "Show Reading Guide (Furigana)": "Tunjukkan Panduan Bacaan (Furigana)",
    "Hide Reading Guide (Furigana)": "Sembunyikan Panduan Bacaan (Furigana)",
    "Search Results \"{query}\" ({count} matches)": "Keputusan Carian \"{query}\" ({count} padanan)",
    "Close Results": "Tutup Keputusan",
    "Trap": "Perangkap",
    "Page Completed ✓": "Muka Surat Selesai ✓",
    "Mark Page Complete": "Tandakan Muka Surat Selesai",
    "Key Takeaway on This Page": "Isi Penting di Muka Surat Ini",
    "Active": "Aktif",
    "Understood": "Faham",
    "Next Step": "Langkah Seterusnya",
    "Got it, Next Step {step} ->": "Faham, Langkah Seterusnya {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "Selesaikan Muka Surat {page}, Buka Muka Surat {nextPage} ->",
    "Complete Final Step ✓": "Lengkapkan Langkah Terakhir ✓",
    "Exam Trap Alert:": "Amaran Perangkap Peperiksaan:",
    "Exam Calculation Formula:": "Formula Pengiraan Peperiksaan:",
    "Video Notes for Page {page}:": "Nota Video untuk Muka Surat {page}:",
    "Matching Vocabulary ({count})": "Kosa Kata Padanan ({count})",
    "Key Vocabulary on Page {page} ({count})": "Kosa Kata Utama di Muka Surat {page} ({count})",
    "Mastered ✓": "Dikuasai ✓",
    "Mark Mastered": "Tandakan Dikuasai",
    "Exam Case Quiz": "Kuiz Kes Peperiksaan",
    "Calculation Drill": "Latih Tubi Pengiraan",
    "Exam Trap Quiz": "Kuiz Perangkap Peperiksaan",
    "Vocab Drill": "Latih Tubi Kosa Kata",
    "Hide 5 Formulas": "Sembunyikan 5 Formula",
    "Open 5 Calculation Formulas": "Buka 5 Formula Pengiraan",
    "Question": "Soalan",
    "Tryout p.": "Percubaan m.s.",
    "Review p.": "Ulang Kaji m.s.",
    "View Explanation on p. {page}": "Lihat Penjelasan di m.s. {page}",
    "Next Question ->": "Soalan Seterusnya ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "Bersedia untuk Mencuba Kuiz Latihan Pemprosesan Makanan SSW?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "Pilih jenis latihan di atas atau tanya Sensei melalui suara. Setiap soalan disertakan penjelasan yang jelas dan rujukan muka surat belajar.",
    "Start 1 Question Now": "Mulakan 1 Soalan Sekarang",
    "Enlarge diagram for a closer view": "Besarkan rajah untuk paparan lebih dekat",
    "TRIGGER / SUBJECT": "PENCETUS / SUBJEK",
    "PAIR!": "PASANGAN!",
    "MATCHING FORM": "BENTUK PADANAN",
    "Lead Car": "Gerabak Hadapan",
    "Right Link": "Pautan Betul",
    "Check Context": "Semak Konteks",
    "Safe to Use": "Selamat Digunakan",
    "SNAPSHOT": "GAMBARAN PANTAS",
    "RULE 1": "PERATURAN 1",
    "Core Form": "Bentuk Teras",
    "ACTION VIDEO": "VIDEO TINDAKAN",
    "RULE 2": "PERATURAN 2",
    "Contrast Form": "Bentuk Kontras",
    "CONCEPT 1": "KONSEP 1",
    "🔎 Focus": "🔎 Fokus",
    "CONCEPT 2": "KONSEP 2",
    "Core Concept": "Konsep Teras",
    "Sentence Pattern Blocks": "Blok Pola Ayat",
    "Arranging blocks...": "Menyusun blok...",
    "Whiteboard Visual Detail": "Perincian Visual Papan Putih",
    "Zoom Out": "Zum Keluar",
    "Zoom In": "Zum Masuk",
    "inaccurate grammar pattern": "pola tatabahasa tidak tepat",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "Perbualan Kehidupan Jepun FIEZEL ({level}): {topic}",
    "Real-Life Communication: {topic}": "Komunikasi Kehidupan Sebenar: {topic}",
    "Use the situational Japanese sentence pattern naturally.": "Gunakan pola ayat bahasa Jepun mengikut situasi secara semula jadi.",
    "Deliver clear pronunciation and polite phrasing smoothly.": "Sampaikan sebutan yang jelas dan ungkapan sopan dengan lancar.",
    "IELTS Speaking: {topic}": "IELTS Speaking: {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "Simulasi rasmi IELTS Speaking Cambridge (Kad Isyarat Bahagian 2 & Perbincangan Bahagian 3): {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "Sekarang, dalam Bahagian 2, saya akan berikan satu topik kepada anda. Anda mempunyai satu minit untuk memikirkan apa yang ingin anda katakan: {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "Bertutur dengan koheren selama 1–2 minit merangkumi setiap isi kad isyarat.",
    "Use academic discourse markers cleanly and naturally.": "Gunakan penanda wacana akademik dengan kemas dan semula jadi.",
    "Level A1 · Beginner": "Tahap A1 · Pemula",
    "Level A2 · Everyday Conversation": "Tahap A2 · Perbualan Harian",
    "🎯 Best Answer ({level})": "🎯 Jawapan Terbaik ({level})",
    "Short & Easy": "Ringkas & Mudah",
    "Natural & Contextual": "Semula Jadi & Mengikut Konteks",
    "Reply + Follow-up": "Balasan + Susulan",
    "🎯 Best Answer (Level {level})": "🎯 Jawapan Terbaik (Tahap {level})",
    "Part": "Bahagian",
    "First on the left, {title}: {subtitle}{ex}": "Pertama di sebelah kiri, {title}: {subtitle}{ex}",
    "focus on the core rule": "fokus pada peraturan teras",
    ". Example: {example}": ". Contoh: {example}",
    "Second on the right, {title}: {subtitle}{ex}": "Kedua di sebelah kanan, {title}: {subtitle}{ex}",
    "compare with this form": "bandingkan dengan bentuk ini",
    "Key idea": "Idea utama",
    "Branch {num}, {label}{sub}{ex}": "Cabang {num}, {label}{sub}{ex}",
    ", meaning {sublabel}": ", bermaksud {sublabel}",
    ", for example {example}": ", sebagai contoh {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "Mari kita telusuri peta konsep untuk {topic} satu demi satu. {detail}.",
    ", e.g. {example}": ", contohnya {example}",
    ". Then ": ". Kemudian",
    "Follow the timeline from left to right. {stops}.": "Ikuti garis masa dari kiri ke kanan. {stops}.",
    "Block {num}, {role}, contains {token}{note}": "Blok {num}, {role}, mengandungi {token}{note}",
    ", used for {note}": ", digunakan untuk {note}",
    "Notice the pattern blocks from left to right. {detail}.": "Perhatikan blok pola dari kiri ke kanan. {detail}.",
    " Starting from {parts}.": "Bermula daripada {parts}.",
    ", then ": ", kemudian",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "Lihat dengan teliti gambar rajah {topic} di papan.{cap}{visualCue}",
    "Primary form": "Bentuk utama",
    "Comparison form": "Bentuk perbandingan",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "Bandingkan kedua-dua belah: {sideA} berbanding {sideB}.{insight}",
    " Key insight: {insight}.": "Fahaman utama: {insight}.",
    "{role}: {word}": "{role}: {word}",
    ", followed by ": ", diikuti oleh",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "Ikuti blok ayat dari kiri ke kanan: {chain}.{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "Teliti struktur ayat bagi {topic}: {detail}.",
    "place each clause element in its proper slot": "letakkan setiap unsur klausa pada slot yang betul",
    ". Next: ": ". Seterusnya:",
    "Examples on the board": "Contoh di papan",
    "Review the examples in this table": "Semak contoh dalam jadual ini",
    "Reason:": "Sebab:",
    "Avoid forms like {wrong}. Use {right}.{why}": "Elakkan bentuk seperti {wrong}. Gunakan {right}.{why}",
    "the common mistake": "kesilapan lazim",
    "Remember this key point:": "Ingat perkara penting ini:",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "Perhatikan kontur nada bagi {word} dan ikuti lengkung biru semasa anda menyebut {reading}.",
    "Now try this quick check: {prompt}.": "Sekarang cuba semakan pantas ini: {prompt}.",
    "choose the accurate sentence form": "pilih bentuk ayat yang tepat",
    "To Be vs Active Verb Map": "Peta To Be lawan Kata Kerja Aktif",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "Gunakan To Be hanya dengan Kata Adjektif, Kata Nama/Lokasi, Verb-ing, atau Verb 3 Pasif — JANGAN sesekali dengan Verb 1 sahaja",
    "Subject + Verb 1": "Subjek + Verb 1",
    "Direct active verb, no To Be": "Kata kerja aktif terus, tanpa To Be",
    "To Be + Adj/Noun": "To Be + Adj/Kata Nama",
    "State, trait, role, or location": "Keadaan, sifat, peranan, atau lokasi",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "Tindakan yang sedang berlaku sekarang",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "Ayat pasif (dikenakan tindakan)",
    "Subject": "Subjek",
    "Key Connector": "Penghubung Utama",
    "Main Verb / Core": "Kata Kerja Utama / Teras",
    "Object / Complement": "Objek / Pelengkap",
    "Details": "Butiran",
    "Build the Sentence": "Bina Ayat",
    "Block": "Blok",
    "Key pattern slot": "Slot pola utama",
    "Photo vs Action Video": "Foto lawan Video Tindakan",
    "PHOTO MODE": "MOD FOTO",
    "Focuses on state, trait, or condition": "Memfokuskan pada keadaan, sifat, atau situasi",
    "VIDEO MODE": "MOD VIDEO",
    "Focuses on action, movement, or habit": "Memfokuskan pada tindakan, pergerakan, atau tabiat",
    "Pattern Block Puzzle": "Teka-teki Blok Pola",
    "Snap the colored blocks left to right into a natural sentence.": "Cantumkan blok berwarna dari kiri ke kanan menjadi ayat yang semula jadi.",
    "0 Start": "0 Mula",
    "1 Concept": "1 Konsep",
    "2 Sketch": "2 Lakaran",
    "3 Breakdown": "3 Pecahan",
    "4 Practice": "4 Latihan",
    "Question Topic": "Topik Soalan",
    "Key Takeaways": "Isi Penting",
    "Contextual Practice": "Latihan Kontekstual",
    "States, traits, roles, or places": "Keadaan, sifat, peranan, atau tempat",
    "Core Pattern": "Pola Teras",
    "Verb / Key": "Kata Kerja / Kunci",
    "Complement": "Pelengkap",
    "✦ Learning Board": "✦ Papan Pembelajaran",
    "Board Active": "Papan Aktif",
    "⤢ Open": "⤢ Buka",
    "Minimize Board (See Mochi & Keep Talking)": "Minimumkan Papan (Lihat Mochi & Teruskan Bercakap)",
    "Close & Continue Talking": "Tutup & Teruskan Bercakap",
    "Preparing learning board...": "Menyediakan papan pembelajaran...",
    "Building visual explanations and tailored practice for you": "Membina penjelasan visual dan latihan khusus untuk anda",
    "💡 Key Point:": "💡 Isi Penting:",
    "Sentence Pattern": "Pola Ayat",
    "Choice": "Pilihan",
    "Fill in Blank": "Isi Tempat Kosong",
    "Word Order": "Susunan Kata",
    "New Question": "Soalan Baharu",
    "Switch to a fresh practice question": "Tukar kepada soalan latihan baharu",
    "Tap the right word to complete the sentence:": "Ketik perkataan yang betul untuk melengkapkan ayat:",
    "That word does not fit yet. Try another option!": "Perkataan itu belum sesuai. Cuba pilihan lain!",
    "Tap tiles below to build the sentence...": "Ketik jubin di bawah untuk membina ayat...",
    "Close ✕": "Tutup ✕",
    "× Unnatural / Avoid": "× Tidak Semula Jadi / Elakkan",
    "✓ Natural Form": "✓ Bentuk Semula Jadi",
    "Key Radical": "Radikal Utama",
    "Strokes": "Goresan",
    "Tone Contour & Pronunciation": "Kontur Nada & Sebutan",
    "Spot on! This sentence structure is clear and natural.": "Tepat sekali! Struktur ayat ini jelas dan semula jadi.",
    "Not quite — check the word order and pattern above and try again.": "Belum tepat — semak susunan kata dan pola di atas, kemudian cuba lagi.",
    "Nice work! That word completes the sentence naturally.": "Syabas! Perkataan itu melengkapkan ayat dengan semula jadi.",
    "Cleanly arranged! Word order is spot on.": "Susunan yang kemas! Susunan kata tepat sekali.",
    "Arrange the tiles below into a natural sentence:": "Susun jubin di bawah menjadi ayat yang semula jadi:"
  },
  "vi": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "Bạn luyện nói cần có kết nối internet đang hoạt động để trò chuyện thời gian thực với Fiezel.",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "Trình duyệt đã chặn tự động phát. Hãy chạm vào \"Phát giọng nói\" để nghe câu trả lời.",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "Giọng nói Fiezel đang kết nối lại. Câu trả lời dạng văn bản vẫn hiển thị—hãy chạm vào \"Phát giọng nói\" để thử lại.",
    "Student": "Học viên",
    "Learning Board": "Bảng học tập",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "Bạn vẫn đang dùng dạng bẫy \"{trap}\" — hãy chuyển sang dạng được tô sáng trên bảng trắng.",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "Sau \"Did / Didn't / Does\", hãy dùng động từ nguyên mẫu (V1) thay vì thì quá khứ \"{verb}\".",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "Không đặt \"{be}\" trước động từ \"{verb}\". Hãy dùng chủ ngữ theo sau trực tiếp bởi động từ.",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "Với một mốc thời gian bắt đầu cụ thể (như 2020 hoặc Monday), hãy dùng \"since\", không dùng \"for\".",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "Với các ngày trong tuần (Monday, Friday, v.v.), hãy dùng giới từ \"on\", không dùng \"in\".",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "Sau \"Despite\" không bao giờ có \"of\" — hãy dùng trực tiếp \"despite + noun\" hoặc dùng \"in spite of\".",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "Sau động từ khuyết thiếu (should/must/can), hãy dùng trực tiếp động từ nguyên mẫu không có \"to\".",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "Hãy tạo một câu hoàn chỉnh gồm ít nhất 3 từ (Chủ ngữ + Động từ + Bổ ngữ) để kiểm tra mẫu câu.",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "\"ますでした\" sai ngữ pháp — hãy chia trực tiếp ます thành ました cho thì quá khứ.",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "Động từ thể từ điển thông thường không thể gắn trực tiếp với です — hãy dùng dạng lịch sự 〜ます / 〜ました.",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "Đối với địa điểm nơi diễn ra hành động (học tập/uống nước), hãy dùng trợ từ で thay vì に.",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "Hãy viết câu hoàn chỉnh bằng chữ viết tiếng Nhật (Hiragana/Kanji) theo đúng mẫu câu.",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "Để diễn tả một hành động đang diễn ra, hãy dùng 正在 hoặc 在 trước động từ thay vì 是.",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "Trong tiếng Trung (Quan Thoại), từ chỉ thời gian (như 现在 / 昨天) phải được đặt TRƯỚC động từ.",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "Hãy viết đầy đủ câu bằng chữ Hán (Hanzi) khớp với mẫu câu.",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "Làm tốt lắm! Cấu trúc câu và ngữ pháp của bạn khớp hoàn toàn với mẫu câu. Nhấn \"Tiếp tục nói\" để quay lại cuộc trò chuyện.",
    "Not quite right yet. Review the meaning and structure above and try again.": "Vẫn chưa đúng lắm. Hãy xem lại nghĩa và cấu trúc ở trên rồi thử lại nhé.",
    "Check your word order and verb form against the formula blocks above.": "Hãy kiểm tra lại trật tự từ và dạng động từ đối chiếu với các khối công thức ở trên.",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "Micrô đang tắt hoặc bị trình duyệt chặn. Nhấn Nói để cấp quyền truy cập micrô, hoặc nhập câu của bạn ở bên dưới.",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "Tính năng nhận diện giọng nói cần kết nối internet. Hãy thử nói lại hoặc nhập câu của bạn.",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "Quyền truy cập micrô đã bị trình duyệt chặn. Hãy cấp quyền micrô trên thanh địa chỉ hoặc nhập câu của bạn ở bên dưới.",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "Trình duyệt này chưa hỗ trợ nhận diện giọng nói tự động. Hãy nhập câu của bạn ở bên dưới hoặc chọn một câu trả lời gợi ý ở trên.",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "Quyền truy cập micrô chưa được bật trên trình duyệt này. Hãy nhập câu của bạn hoặc chọn một thẻ trả lời gợi ý ở trên.",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "Chưa phát hiện thấy giọng nói. Hãy đảm bảo micrô đang bật và nói rõ ràng, hoặc nhập vào ô bên dưới.",
    "Switching cleanly to a fresh voice channel...": "Đang chuyển mượt mà sang kênh thoại mới...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "Chưa phát giọng nói Fiezel nào, tốn 0 Gem (Số dư & Hạn mức vẫn an toàn)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "Cuộc gọi kết thúc: {turns} lượt phản hồi giọng nói Fiezel, Hạn mức miễn phí hằng ngày (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "Cuộc gọi kết thúc: {turns} lượt phản hồi giọng nói Fiezel, đã dùng {gems} 💎 theo hạn mức thoại",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - Cố vấn kỳ thi Chế biến Thực phẩm",
    "SSW Mode": "Chế độ SSW",
    "Session conversation guide": "Hướng dẫn hội thoại phiên học",
    "Open SSW Tactical Board": "Mở Bảng chiến thuật SSW",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - Cố vấn kỳ thi Chế biến Thực phẩm (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "Tài liệu chính thức OTAFF 91 trang + 266 Kotoba + 58 bài luyện CBT",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "Tuyệt vời! Điểm này đã được lưu vào ghi chú SSW của bạn. Sẵn sàng chuyển sang bước tiếp theo trên trang này chưa?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "Tuyệt, bạn hiểu rồi đấy! Bây giờ hãy quay lại ngôn ngữ mục tiêu — thử tự đặt một câu của riêng bạn nhé!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "Bạn cần ít nhất {gems} Gem cho phản hồi giọng nói {brand} đầu tiên (Số dư hiện tại: {balance} 💎).",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "Hoàn thành các bài tập trắc nghiệm để nhận Gem miễn phí hoặc chờ lượt cấp miễn phí hằng ngày vào ngày mai!",
    "1 · Ask Details": "1 · Hỏi chi tiết",
    "2 · Tips & Example": "2 · Mẹo & Ví dụ",
    "3 · Test Me": "3 · Kiểm tra tôi",
    "Check Progress & Stage 1": "Kiểm tra tiến độ & Giai đoạn 1",
    "Sensei, check my SSW progress and where to start from zero!": "Sensei ơi, hãy kiểm tra tiến độ SSW của tôi và cho biết nên bắt đầu từ con số 0 ở đâu!",
    "Allergen Update Apr 2026": "Cập nhật chất gây dị ứng tháng 4/2026",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "Giải thích cập nhật chất gây dị ứng OTAFF Ver 5.1 tháng 4/2026: Óc chó (Kurumi), Hạt điều và Hạt dẻ cười!",
    "Chlorine Math Drill": "Luyện tính nồng độ Clo",
    "Give me 1 chlorine dilution or budomari calculation question now!": "Hãy cho tôi 1 câu hỏi tính pha loãng clo hoặc tính budomari ngay bây giờ!",
    "Yukkuri Traps": "Bẫy yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "Giải thích bẫy tốc độ yukkuri và thuật ngữ hokang sampuru trong học phần!",
    "Hide SSW Sensei quick actions": "Ẩn thao tác nhanh SSW Sensei",
    "Show SSW Sensei quick actions": "Hiện thao tác nhanh SSW Sensei",
    "Actions & Ask Sensei": "Thao tác & Hỏi Sensei",
    "[Study Focus]:": "[Trọng tâm học tập]:",
    "{m}m {s}s": "{m}p {s}g",
    "Fluency & Grammar Accuracy Trend": "Xu hướng độ trôi chảy & độ chính xác ngữ pháp",
    "Based on {turns} verified speaking turns": "Dựa trên {turns} lượt nói đã xác minh",
    "Page {page}": "Trang {page}",
    "Page": "Trang",
    "Page {page} · Step {step} of {total}": "Trang {page} · Bước {step} / {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "Phần luyện tập nhanh SSW có sẵn trong bảng Chiến thuật ở phía trên.",
    "Ready to continue lesson": "Sẵn sàng tiếp tục bài học",
    "Great!": "Tuyệt vời!",
    "Need extra explanation": "Cần giải thích thêm",
    "Select an active step above.": "Chọn một bước đang hoạt động ở trên.",
    "SSW Food Manufacturing": "SSW Sản xuất Thực phẩm",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "Chìa khóa của phần Describe Image là ĐỘ TRÔI CHẢY ỔN ĐỊNH. Đừng bao giờ ngưng quá 3 giây! Hãy trình bày 5 câu theo cấu trúc Fiezel thật mượt mà với ngữ điệu đều đặn và tự tin.",
    "Choose the CORRECT opening sentence for {title}:": "Chọn câu mở đầu ĐÚNG cho {title}:",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "Hoàn hảo! Một cấu trúc mở đầu chuẩn điểm cao đáp ứng cả Độ trôi chảy (Fluency) và Nội dung (Content).",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "Tránh cách diễn đạt suồng sã như \"I see\"! Hãy dùng văn phong học thuật chuẩn mực.",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "Tránh các từ ngữ thiếu chắc chắn như \"maybe\". Hãy nói dứt khoát và rõ ràng.",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "Chuẩn xác! \"maximum figure\" là một cụm từ học thuật được đánh giá cao trong cách chấm điểm của Pearson.",
    "Arrange the standard Pearson Describe Image opening sentence:": "Sắp xếp câu mở đầu chuẩn cho phần Describe Image của Pearson:",
    "Opening sentence ordered accurately!": "Câu mở đầu đã được sắp xếp chính xác!",
    "Articulate the final syllable clearly.": "Hãy phát âm rõ ràng âm tiết cuối cùng.",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "Giữ cao độ ổn định qua từng mệnh đề và ngắt nghỉ ngắn (0,3 giây) tại mỗi dấu ranh giới //.",
    "Read the sentence accurately with crisp final consonant articulation.": "Đọc câu thật chính xác với cách phát âm phụ âm cuối rõ nét.",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearson chấm điểm NHỊP ĐIỆU ỔN ĐỊNH chứ không phải tốc độ. Chỉ ngắt nghỉ ngắn tại các điểm ngắt cụm //—đừng bao giờ dừng giữa cụm từ!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "Điểm ngắt hơi TỰ NHIÊN (chia cụm) trong câu này nằm ở đâu?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "Chính xác! Hãy ngắt nghỉ gọn gàng giữa chủ ngữ danh từ phức hợp và động từ chính.",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "Ngắt quãng rời rạc quá nhiều! Việc ngắt nghỉ đứt đoạn sẽ làm giảm điểm Oral Fluency.",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "Đọc liền một mạch không nghỉ sẽ khiến các từ cuối câu bị hụt hơi và mất độ rõ ràng.",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "Chính xác! Chủ ngữ số nhiều \"studies\" đi với động từ nguyên mẫu \"demonstrate\".",
    "Order this academic Read Aloud sentence accurately:": "Sắp xếp chính xác câu Read Aloud học thuật này:",
    "Perfect! Clean academic phrase grouping.": "Hoàn hảo! Cách chia cụm từ học thuật rất mạch lạc.",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "Tốc độ nói đo được là {wpm} WPM ({pace}) trong {sec} giây{vocal}{reasons}",
    "optimal zone 115-152 WPM": "vùng tối ưu 115-152 WPM",
    "too fast": "quá nhanh",
    "too slow": "quá chậm",
    " (active vocalization {asec}s, phonation {pct}%). ": "(thời gian phát âm chủ động {asec} giây, tỷ lệ phát âm {pct}%).",
    "Steady speech rhythm.": "Nhịp điệu nói ổn định.",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "Chưa có mẫu giọng nói PTE nào được ghi trong phiên này. Hãy nói vào micro để đo trực tiếp độ trôi chảy khi nói (WPM, khoảng ngắt, độ ngập ngừng & nhịp nói).",
    "Pearson PTE Official Scorecard": "Bảng điểm chính thức Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "Đánh giá khách quan từ mẫu gần nhất của bạn ({src}). Bạn đã đạt mục tiêu PTE 58+.",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "Đánh giá khách quan từ mẫu gần nhất của bạn ({src}). Hãy tập trung vào cách ngắt cụm từ mượt mà và phát âm rõ phụ âm cuối.",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "Hãy ghi một mẫu giọng nói trước để xem điểm quy đổi Pearson (/90), tốc độ WPM, tỷ lệ phát âm chủ động và dữ liệu khoảng ngắt.",
    "How is \"fluctuations\" pronounced naturally?": "Từ \"fluctuations\" được phát âm tự nhiên như thế nào?",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (với âm /ʃ/ rõ nét ở phần -tion)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "Chính xác! Đuôi -tion được phát âm là /ʃənz/.",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (đọc từng chữ cái)",
    "Not natural—avoid spelling-based syllable stress.": "Chưa tự nhiên—tránh nhấn trọng âm âm tiết theo mặt chữ.",
    "Right! The noun \"fluency\" fits after steady.": "Đúng rồi! Danh từ \"fluency\" phù hợp đứng sau từ steady.",
    "Order the core PTE fluency principle:": "Sắp xếp nguyên tắc cốt lõi về độ trôi chảy PTE:",
    "Exact! Fluency is the key to high scores.": "Chính xác! Độ trôi chảy là chìa khóa để đạt điểm cao.",
    "Listen": "Nghe",
    "Learning Session": "Phiên học",
    "Concept A": "Khái niệm A",
    "Concept B": "Khái niệm B",
    "Concept Balance Diagram": "Sơ đồ cân bằng khái niệm",
    "Comparing...": "Đang so sánh...",
    "Sentence Pattern Flow": "Luồng mẫu câu",
    "Building flow...": "Đang tạo luồng...",
    "Zoom": "Thu phóng",
    "STROKES": "NÉT VIẾT",
    "Stroke": "Nét",
    "Loading strokes...": "Đang tải các nét viết...",
    "Show / hide trace guidelines": "Hiện / ẩn đường nét hướng dẫn",
    "👁 Hide Trace": "👁 Ẩn nét mẫu",
    "👁 Trace": "👁 Nét mẫu",
    "▶ Follow Tutor": "▶ Học theo gia sư",
    "Click to view stroke {num}": "Nhấp để xem nét {num}",
    "Topic Visual Sketch": "Phác thảo trực quan chủ đề",
    "Drawing...": "Đang vẽ...",
    "Zoom in to inspect details": "Phóng to để xem chi tiết",
    "Up next": "Tiếp theo",
    "Tutor Writing...": "Gia sư đang viết...",
    "Quick Check Practice": "Luyện tập kiểm tra nhanh",
    "Tutor is writing on the board...": "Gia sư đang viết trên bảng...",
    "Zoom Out Transition": "Chuyển cảnh thu nhỏ",
    "Focus Zoom": "Phóng to trọng tâm",
    "Focus Ready": "Trọng tâm sẵn sàng",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ Chế độ bút đang bật — Khoanh tròn bất kỳ phần nào để hỏi",
    "Clear": "Xóa",
    "Start from Scratch": "Bắt đầu lại từ đầu",
    "In Progress": "Đang tiến hành",
    "Pages:": "Trang:",
    "Pg": "Tr.",
    "Vocab:": "Từ vựng:",
    "Correct:": "Đúng:",
    "Loading full material...": "Đang tải toàn bộ tài liệu...",
    "Exam Readiness:": "Mức độ sẵn sàng thi:",
    "Pass": "Đạt",
    "Pass threshold": "Ngưỡng đạt",
    "Reset SSW study progress to 0%": "Đặt lại tiến độ học SSW về 0%",
    "Active Spot": "Vị trí đang học",
    "Step": "Bước",
    "of": "trên",
    "View This Step": "Xem bước này",
    "Ask Sensei to Explain": "Hỏi Sensei giải thích",
    "Study Roadmap": "Lộ trình học",
    "Study Guide": "Hướng dẫn học",
    "p.": "tr.",
    "Practice Quiz": "Trắc nghiệm luyện tập",
    "START HERE (ZERO BEGINNER)": "BẮT ĐẦU TẠI ĐÂY (NGƯỜI MỚI HOÀN TOÀN)",
    "CURRENT ACTIVE STAGE": "GIAI ĐOẠN ĐANG HỌC HIỆN TẠI",
    "Stage": "Giai đoạn",
    "Open p. {page} & Start": "Mở tr. {page} & Bắt đầu",
    "Ask Sensei": "Hỏi Sensei",
    "Topics That Still Need Review (Click for Practice Quiz):": "Các chủ đề cần ôn lại (Nhấp để làm trắc nghiệm luyện tập):",
    "Done ✓": "Xong ✓",
    "Mark Done": "Đánh dấu đã xong",
    "Open Page": "Mở trang",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "Tóm tắt 13 con số cần nhớ khi thi (Chạm để mở)",
    "Hide": "Ẩn",
    "View 13 Numbers": "Xem 13 con số",
    "Pg.": "Tr.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "Tìm kiếm chủ đề hoặc từ khóa (ví dụ: dị ứng, clo, trang 27)...",
    "Show Reading Guide (Furigana)": "Hiện hướng dẫn đọc (Furigana)",
    "Hide Reading Guide (Furigana)": "Ẩn hướng dẫn đọc (Furigana)",
    "Search Results \"{query}\" ({count} matches)": "Kết quả tìm kiếm \"{query}\" ({count} kết quả)",
    "Close Results": "Đóng kết quả",
    "Trap": "Bẫy",
    "Page Completed ✓": "Đã hoàn thành trang ✓",
    "Mark Page Complete": "Đánh dấu đã xong trang",
    "Key Takeaway on This Page": "Điểm trọng tâm của trang này",
    "Active": "Đang hoạt động",
    "Understood": "Đã hiểu",
    "Next Step": "Bước tiếp theo",
    "Got it, Next Step {step} ->": "Đã hiểu, sang bước {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "Xong trang {page}, mở trang {nextPage} ->",
    "Complete Final Step ✓": "Hoàn thành bước cuối ✓",
    "Exam Trap Alert:": "Cảnh báo bẫy đề thi:",
    "Exam Calculation Formula:": "Công thức tính toán trong đề thi:",
    "Video Notes for Page {page}:": "Ghi chú video cho trang {page}:",
    "Matching Vocabulary ({count})": "Từ vựng phù hợp ({count})",
    "Key Vocabulary on Page {page} ({count})": "Từ vựng trọng tâm trang {page} ({count})",
    "Mastered ✓": "Đã thành thạo ✓",
    "Mark Mastered": "Đánh dấu đã thành thạo",
    "Exam Case Quiz": "Trắc nghiệm tình huống thi",
    "Calculation Drill": "Luyện tập tính toán",
    "Exam Trap Quiz": "Trắc nghiệm bẫy đề thi",
    "Vocab Drill": "Luyện tập từ vựng",
    "Hide 5 Formulas": "Ẩn 5 công thức",
    "Open 5 Calculation Formulas": "Mở 5 công thức tính toán",
    "Question": "Câu hỏi",
    "Tryout p.": "Thi thử tr.",
    "Review p.": "Ôn tập tr.",
    "View Explanation on p. {page}": "Xem giải thích ở tr. {page}",
    "Next Question ->": "Câu tiếp theo ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "Sẵn sàng thử bài trắc nghiệm luyện thi SSW Chế biến thực phẩm chưa?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "Chọn dạng luyện tập ở trên hoặc hỏi Sensei bằng giọng nói. Mỗi câu hỏi đều có giải thích rõ ràng và dẫn chiếu trang học.",
    "Start 1 Question Now": "Bắt đầu ngay 1 câu hỏi",
    "Enlarge diagram for a closer view": "Phóng to sơ đồ để xem rõ hơn",
    "TRIGGER / SUBJECT": "YẾU TỐ KÍCH HOẠT / CHỦ NGỮ",
    "PAIR!": "KHỚP ĐÔI!",
    "MATCHING FORM": "DẠNG TƯƠNG ỨNG",
    "Lead Car": "Toa đầu",
    "Right Link": "Khớp nối đúng",
    "Check Context": "Kiểm tra ngữ cảnh",
    "Safe to Use": "Dùng an toàn",
    "SNAPSHOT": "ẢNH TĨNH",
    "RULE 1": "QUY TẮC 1",
    "Core Form": "Dạng cốt lõi",
    "ACTION VIDEO": "VIDEO HÀNH ĐỘNG",
    "RULE 2": "QUY TẮC 2",
    "Contrast Form": "Dạng đối chiếu",
    "CONCEPT 1": "KHÁI NIỆM 1",
    "🔎 Focus": "🔎 Trọng tâm",
    "CONCEPT 2": "KHÁI NIỆM 2",
    "Core Concept": "Khái niệm cốt lõi",
    "Sentence Pattern Blocks": "Các khối mẫu câu",
    "Arranging blocks...": "Đang sắp xếp các khối...",
    "Whiteboard Visual Detail": "Chi tiết hình ảnh trên bảng trắng",
    "Zoom Out": "Thu nhỏ",
    "Zoom In": "Phóng to",
    "inaccurate grammar pattern": "mẫu ngữ pháp chưa chính xác",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "Hội thoại Đời sống Nhật Bản FIEZEL ({level}): {topic}",
    "Real-Life Communication: {topic}": "Giao tiếp thực tế: {topic}",
    "Use the situational Japanese sentence pattern naturally.": "Sử dụng mẫu câu tiếng Nhật theo tình huống một cách tự nhiên.",
    "Deliver clear pronunciation and polite phrasing smoothly.": "Phát âm rõ ràng và diễn đạt lịch sự, trôi chảy.",
    "IELTS Speaking: {topic}": "Luyện nói IELTS: {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "Mô phỏng phần thi Nói Cambridge IELTS chính thức (Thẻ gợi ý Phần 2 & Thảo luận Phần 3): {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "Bây giờ, ở Phần 2, tôi sẽ đưa cho bạn một chủ đề. Bạn có một phút để suy nghĩ về những gì bạn sẽ nói: {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "Nói mạch lạc trong 1–2 phút, bao quát đầy đủ các ý trên thẻ gợi ý.",
    "Use academic discourse markers cleanly and naturally.": "Sử dụng các từ nối diễn ngôn học thuật một cách chuẩn xác và tự nhiên.",
    "Level A1 · Beginner": "Trình độ A1 · Sơ cấp",
    "Level A2 · Everyday Conversation": "Trình độ A2 · Giao tiếp hằng ngày",
    "🎯 Best Answer ({level})": "🎯 Câu trả lời hay nhất ({level})",
    "Short & Easy": "Ngắn gọn & Dễ hiểu",
    "Natural & Contextual": "Tự nhiên & Đúng ngữ cảnh",
    "Reply + Follow-up": "Trả lời + Hỏi tiếp",
    "🎯 Best Answer (Level {level})": "🎯 Câu trả lời hay nhất (Trình độ {level})",
    "Part": "Phần",
    "First on the left, {title}: {subtitle}{ex}": "Đầu tiên ở bên trái, {title}: {subtitle}{ex}",
    "focus on the core rule": "tập trung vào quy tắc cốt lõi",
    ". Example: {example}": ". Ví dụ: {example}",
    "Second on the right, {title}: {subtitle}{ex}": "Thứ hai ở bên phải, {title}: {subtitle}{ex}",
    "compare with this form": "so sánh với dạng này",
    "Key idea": "Ý chính",
    "Branch {num}, {label}{sub}{ex}": "Nhánh {num}, {label}{sub}{ex}",
    ", meaning {sublabel}": ", nghĩa là {sublabel}",
    ", for example {example}": ", ví dụ {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "Hãy cùng đi qua từng phần trong bản đồ khái niệm về {topic}. {detail}.",
    ", e.g. {example}": ", ví dụ: {example}",
    ". Then ": ". Sau đó",
    "Follow the timeline from left to right. {stops}.": "Theo dõi dòng thời gian từ trái sang phải. {stops}.",
    "Block {num}, {role}, contains {token}{note}": "Khối {num}, {role}, chứa {token}{note}",
    ", used for {note}": ", dùng để {note}",
    "Notice the pattern blocks from left to right. {detail}.": "Hãy chú ý các khối mẫu câu từ trái sang phải. {detail}.",
    " Starting from {parts}.": "Bắt đầu từ {parts}.",
    ", then ": ", rồi",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "Hãy quan sát kỹ sơ đồ {topic} trên bảng.{cap}{visualCue}",
    "Primary form": "Dạng chính",
    "Comparison form": "Dạng so sánh",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "So sánh cả hai bên: {sideA} với {sideB}.{insight}",
    " Key insight: {insight}.": "Điểm mấu chốt: {insight}.",
    "{role}: {word}": "{role}: {word}",
    ", followed by ": ", tiếp theo là",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "Theo dõi các khối câu từ trái sang phải: {chain}.{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "Xem xét cấu trúc câu cho {topic}: {detail}.",
    "place each clause element in its proper slot": "đặt từng thành phần mệnh đề vào đúng vị trí",
    ". Next: ": ". Tiếp theo:",
    "Examples on the board": "Ví dụ trên bảng",
    "Review the examples in this table": "Xem lại các ví dụ trong bảng này",
    "Reason:": "Lý do:",
    "Avoid forms like {wrong}. Use {right}.{why}": "Tránh các dạng như {wrong}. Hãy dùng {right}.{why}",
    "the common mistake": "lỗi thường gặp",
    "Remember this key point:": "Hãy ghi nhớ điểm quan trọng này:",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "Quan sát đường cao độ của {word} và theo dõi đường cong màu xanh khi bạn phát âm {reading}.",
    "Now try this quick check: {prompt}.": "Bây giờ hãy thử câu kiểm tra nhanh này: {prompt}.",
    "choose the accurate sentence form": "chọn dạng câu chính xác",
    "To Be vs Active Verb Map": "Bản đồ To Be và Động từ hành động",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "Chỉ dùng To Be với Tính từ, Danh từ/Nơi chốn, Verb-ing, hoặc Bị động Verb 3 — KHÔNG BAO GIỜ dùng với Verb 1 nguyên thể",
    "Subject + Verb 1": "Chủ ngữ + Verb 1",
    "Direct active verb, no To Be": "Động từ hành động trực tiếp, không dùng To Be",
    "To Be + Adj/Noun": "To Be + Tính từ/Danh từ",
    "State, trait, role, or location": "Trạng thái, đặc điểm, vai trò hoặc vị trí",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "Hành động đang diễn ra ngay lúc này",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "Thể bị động (chịu tác động)",
    "Subject": "Chủ ngữ",
    "Key Connector": "Từ nối chính",
    "Main Verb / Core": "Động từ chính / Cốt lõi",
    "Object / Complement": "Tân ngữ / Bổ ngữ",
    "Details": "Chi tiết",
    "Build the Sentence": "Ghép câu",
    "Block": "Khối",
    "Key pattern slot": "Ô mẫu câu chính",
    "Photo vs Action Video": "Ảnh tĩnh và Video hành động",
    "PHOTO MODE": "CHẾ ĐỘ ẢNH TĨNH",
    "Focuses on state, trait, or condition": "Tập trung vào trạng thái, đặc điểm hoặc tình trạng",
    "VIDEO MODE": "CHẾ ĐỘ VIDEO",
    "Focuses on action, movement, or habit": "Tập trung vào hành động, chuyển động hoặc thói quen",
    "Pattern Block Puzzle": "Ghép khối mẫu câu",
    "Snap the colored blocks left to right into a natural sentence.": "Kéo ghép các khối màu từ trái sang phải thành một câu tự nhiên.",
    "0 Start": "0 Bắt đầu",
    "1 Concept": "1 Khái niệm",
    "2 Sketch": "2 Phác thảo",
    "3 Breakdown": "3 Phân tích",
    "4 Practice": "4 Luyện tập",
    "Question Topic": "Chủ đề câu hỏi",
    "Key Takeaways": "Điểm cần nhớ",
    "Contextual Practice": "Luyện tập theo ngữ cảnh",
    "States, traits, roles, or places": "Trạng thái, đặc điểm, vai trò hoặc nơi chốn",
    "Core Pattern": "Mẫu câu cốt lõi",
    "Verb / Key": "Động từ / Từ khóa",
    "Complement": "Bổ ngữ",
    "✦ Learning Board": "✦ Bảng học tập",
    "Board Active": "Bảng đang bật",
    "⤢ Open": "⤢ Mở",
    "Minimize Board (See Mochi & Keep Talking)": "Thu gọn bảng (Xem Mochi & tiếp tục trò chuyện)",
    "Close & Continue Talking": "Đóng & tiếp tục trò chuyện",
    "Preparing learning board...": "Đang chuẩn bị bảng học tập...",
    "Building visual explanations and tailored practice for you": "Đang tạo giải thích trực quan và bài luyện tập phù hợp cho bạn",
    "💡 Key Point:": "💡 Điểm mấu chốt:",
    "Sentence Pattern": "Mẫu câu",
    "Choice": "Trắc nghiệm",
    "Fill in Blank": "Điền vào chỗ trống",
    "Word Order": "Sắp xếp từ",
    "New Question": "Câu hỏi mới",
    "Switch to a fresh practice question": "Chuyển sang một câu hỏi luyện tập mới",
    "Tap the right word to complete the sentence:": "Chạm vào từ đúng để hoàn thành câu:",
    "That word does not fit yet. Try another option!": "Từ đó chưa phù hợp. Hãy thử lựa chọn khác!",
    "Tap tiles below to build the sentence...": "Chạm vào các thẻ bên dưới để ghép thành câu...",
    "Close ✕": "Đóng ✕",
    "× Unnatural / Avoid": "× Không tự nhiên / Cần tránh",
    "✓ Natural Form": "✓ Cách nói tự nhiên",
    "Key Radical": "Bộ thủ chính",
    "Strokes": "Số nét",
    "Tone Contour & Pronunciation": "Đường nét thanh điệu & Phát âm",
    "Spot on! This sentence structure is clear and natural.": "Chuẩn xác! Cấu trúc câu này rõ ràng và tự nhiên.",
    "Not quite — check the word order and pattern above and try again.": "Chưa đúng lắm — hãy kiểm tra lại trật tự từ cùng mẫu câu ở trên rồi thử lại.",
    "Nice work! That word completes the sentence naturally.": "Làm tốt lắm! Từ đó hoàn thiện câu một cách tự nhiên.",
    "Cleanly arranged! Word order is spot on.": "Sắp xếp gọn gàng! Trật tự từ hoàn toàn chính xác.",
    "Arrange the tiles below into a natural sentence:": "Sắp xếp các thẻ bên dưới thành một câu tự nhiên:"
  },
  "fil": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "Kailangan ng Voice Partner ang aktibong koneksyon sa internet para sa real-time na pag-uusap sa Fiezel.",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "Na-block ng browser ang autoplay. I-tap ang \"Play Voice\" para marinig ang sagot.",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "Kumokonekta muli ang boses ng Fiezel. Nananatiling kita ang text na sagot—i-tap ang \"Play Voice\" para subukan ulit.",
    "Student": "Estudyante",
    "Learning Board": "Board sa Pag-aaral",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "Ginagamit mo pa rin ang maling anyong \"{trap}\" — lumipat sa naka-highlight na anyo sa whiteboard.",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "Pagkatapos ng \"Did / Didn't / Does\", gamitin ang base verb (V1) sa halip na past tense na \"{verb}\".",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "Huwag ilagay ang \"{be}\" bago ang pandiwang \"{verb}\". Direktang sundan ang simuno ng pandiwa.",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "Para sa tiyak na simula ng panahon (tulad ng 2020 o Monday), gamitin ang \"since\", hindi \"for\".",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "Sa mga araw ng linggo (Monday, Friday, atbp.), gamitin ang pang-ukol na \"on\", hindi \"in\".",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "Hindi kailanman sinusundan ng \"of\" ang \"Despite\" — gamitin nang direkta ang \"despite + noun\" o \"in spite of\".",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "Pagkatapos ng mga modal verb (should/must/can), gamitin nang direkta ang base verb nang walang \"to\".",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "Bumuo ng kumpletong pangungusap na may hindi bababa sa 3 salita (Simuno + Pandiwa + Panuring) para masubukan ang pattern.",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "Mali sa gramatika ang \"ますでした\" — direktang i-conjugate ang ます sa ました para sa past tense.",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "Hindi puwedeng ikabit nang direkta ang です sa mga plain dictionary verb — gamitin ang magalang na anyong 〜ます / 〜ました.",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "Para sa lugar kung saan ginagawa ang kilos (pag-aaral/pag-inom), gamitin ang particle na で sa halip na に.",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "Isulat ang kumpletong pangungusap gamit ang sulat Hapon (Hiragana/Kanji) ayon sa pattern.",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "Para magpahayag ng kasalukuyang ginagawang kilos, gamitin ang 正在 o 在 bago ang pandiwa sa halip na 是.",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "Sa Mandarin, ang mga ekspresyon ng oras (tulad ng 现在 / 昨天) ay dapat ilagay BAGO ang pandiwa.",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "Isulat ang buong pangungusap gamit ang mga karakter na Tsino (Hanzi) na tumutugma sa pattern.",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "Ang galing! Tugma nang maayos sa pattern ang estruktura ng pangungusap at gramatika mo. I-tap ang \"Continue Talking\" para bumalik sa usapan.",
    "Not quite right yet. Review the meaning and structure above and try again.": "Hindi pa ito lubos na tama. Suriin ulit ang kahulugan at estruktura sa itaas at subukan muli.",
    "Check your word order and verb form against the formula blocks above.": "Suriin ang pagkakasunod-sunod ng mga salita at anyo ng pandiwa mo kumpara sa mga formula block sa itaas.",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "Hindi aktibo o naka-block ang mikropono sa browser. I-tap ang Speak para payagan ang access sa mic, o i-type ang pangungusap mo sa ibaba.",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "Kailangan ng koneksyon sa internet para sa speech recognition. Subukang magsalita ulit o i-type ang pangungusap mo.",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "Naka-block sa browser ang pahintulot para sa mikropono. Payagan ang access sa mic sa address bar mo o i-type ang pangungusap mo sa ibaba.",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "Hindi pa sinusuportahan ng browser na ito ang awtomatikong speech recognition. I-type ang pangungusap mo sa ibaba o pumili ng iminungkahing sagot sa itaas.",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "Hindi aktibo ang pahintulot sa mikropono sa browser na ito. I-type ang pangungusap mo o pumili ng card ng iminungkahing sagot sa itaas.",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "Wala pang boses na na-detect. Siguraduhing aktibo ang mikropono mo at magsalita nang malinaw, o mag-type sa kahon sa ibaba.",
    "Switching cleanly to a fresh voice channel...": "Maayos na lumilipat sa panibagong voice channel...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "Wala pang na-play na boses ng Fiezel, 0 Gems ang nagastos (Ligtas ang Balanse at Quota)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "Natapos ang tawag: {turns} tugon gamit ang boses ng Fiezel, Libreng Arawang Quota (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "Natapos ang tawag: {turns} tugon gamit ang boses ng Fiezel, {gems} 💎 ang nagamit batay sa quota ng boses",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - Mentor para sa Pagsusulit sa Food Processing",
    "SSW Mode": "Mode ng SSW",
    "Session conversation guide": "Gabay sa usapan ng sesyon",
    "Open SSW Tactical Board": "Buksan ang SSW Tactical Board",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - Mentor para sa Pagsusulit sa Food Processing (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "91-Pahinang Opisyal na Gabay ng OTAFF + 266 Kotoba + 58 CBT Drills",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "Ayos! Na-save na ang puntong iyan sa mga tala mo sa SSW. Handa ka na bang talakayin ang susunod na hakbang sa pahinang ito?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "Ayos, nakuha mo! Ngayon, bumalik tayo sa pinag-aaralang wika — subukan mong gumawa ng sarili mong pangungusap!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "Kailangan mo ng hindi bababa sa {gems} Gems para sa unang tugon gamit ang boses ng {brand} (Kasalukuyang balanse: {balance} 💎).",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "Tapusin ang mga pagsasanay sa quiz para makaipon ng libreng Gems o maghintay para sa libreng alokasyon bukas!",
    "1 · Ask Details": "1 · Magtanong ng Detalye",
    "2 · Tips & Example": "2 · Mga Tip at Halimbawa",
    "3 · Test Me": "3 · Subukin Ako",
    "Check Progress & Stage 1": "Suriin ang Progreso at Stage 1",
    "Sensei, check my SSW progress and where to start from zero!": "Sensei, paki-check ang progreso ko sa SSW at kung saan magsisimula mula sa umpisa!",
    "Allergen Update Apr 2026": "Update sa Allergen Abr 2026",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "Ipaliwanag ang mga update sa allergen ng OTAFF Ver 5.1 Abril 2026: Walnut (Kurumi), Cashew Nut, at Pistachio!",
    "Chlorine Math Drill": "Pagsasanay sa Pagkalkula ng Chlorine",
    "Give me 1 chlorine dilution or budomari calculation question now!": "Bigyan mo ako ngayon ng 1 tanong sa pagkalkula ng chlorine dilution o budomari!",
    "Yukkuri Traps": "Mga Bitag sa Yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "Ipaliwanag ang yukkuri speed trap at mga terminong hokang sampuru sa modyul!",
    "Hide SSW Sensei quick actions": "Itago ang mga mabilisang aksyon ng SSW Sensei",
    "Show SSW Sensei quick actions": "Ipakita ang mga mabilisang aksyon ng SSW Sensei",
    "Actions & Ask Sensei": "Mga Aksyon at Magtanong kay Sensei",
    "[Study Focus]:": "[Pokus ng Pag-aaral]:",
    "{m}m {s}s": "{m}m {s}s",
    "Fluency & Grammar Accuracy Trend": "Trend ng Kahusayan sa Pagsasalita at Kawastuhan sa Gramatika",
    "Based on {turns} verified speaking turns": "Batay sa {turns} beripikadong pagkakataon ng pagsasalita",
    "Page {page}": "Pahina {page}",
    "Page": "Pahina",
    "Page {page} · Step {step} of {total}": "Pahina {page} · Hakbang {step} ng {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "Available ang mabilisang pagsasanay sa SSW sa panel ng Tactical Board sa itaas.",
    "Ready to continue lesson": "Handa nang ituloy ang aralin",
    "Great!": "Ang galing!",
    "Need extra explanation": "Kailangan ng dagdag na paliwanag",
    "Select an active step above.": "Pumili ng aktibong hakbang sa itaas.",
    "SSW Food Manufacturing": "SSW Paggawa ng Pagkain",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "Ang susi sa Describe Image ay TULOY-TULOY NA DALOY NG PAGSASALITA. Huwag kailanman huminto nang mas matagal sa 3 segundo! Sabihin nang maayos ang 5 nakabalangkas na pangungusap ng Fiezel nang may matatag at tiwalang tono.",
    "Choose the CORRECT opening sentence for {title}:": "Piliin ang TAMANG panimulang pangungusap para sa {title}:",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "Perpekto! Isang karaniwang panimulang estruktura na may mataas na marka na sumasaklaw sa Fluency at Content.",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "Iwasan ang mga kaswal na parirala gaya ng \"I see\"! Gumamit ng pormal na akademikong istilo.",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "Iwasan ang mga salitang nagpapahiwatig ng pag-aalinlangan gaya ng \"maybe\". Magsalita nang tiyak at malinaw.",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "Tumpak! Ang \"maximum figure\" ay isang akademikong kombinasyon ng mga salita na pinahahalagahan sa pagmamarka ng Pearson.",
    "Arrange the standard Pearson Describe Image opening sentence:": "Ayusin ang karaniwang panimulang pangungusap para sa Describe Image ng Pearson:",
    "Opening sentence ordered accurately!": "Tama ang pagkakaayos ng panimulang pangungusap!",
    "Articulate the final syllable clearly.": "Bigkasin nang malinaw ang huling pantig.",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "Panatilihing matatag ang tono sa bawat sugnay at huminto sandali (0.3s) sa bawat hangganang //.",
    "Read the sentence accurately with crisp final consonant articulation.": "Basahin nang tama ang pangungusap na may malinaw na pagbigkas sa huling katinig.",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Ang minamarkahan ng Pearson ay MATATAG NA RITMO sa halip na bilis. Huminto lang sandali sa mga // putol ng parirala—huwag kailanman huminto sa gitna ng parirala!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "Nasaan ang NATURAL na paghingang hinto (chunking) sa pangungusap na ito?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "Tumpak! Huminto nang maayos sa pagitan ng masalimuot na simuno at ng pangunahing pandiwa.",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "Masyadong maraming putol-putol na hinto! Pinabababa ng putol-putol na paghinto ang Oral Fluency.",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "Ang pagbabasa nang walang kahit anong hinto ay nagpapawala ng linaw at suporta ng hininga sa mga huling salita.",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "Tama! Ang pangmaramihang simuno na \"studies\" ay gumagamit ng batayang pandiwa na \"demonstrate\".",
    "Order this academic Read Aloud sentence accurately:": "Ayusin nang tama ang akademikong pangungusap na ito para sa Read Aloud:",
    "Perfect! Clean academic phrase grouping.": "Perpekto! Malinis ang pagpapangkat ng mga akademikong parirala.",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "Nasukat na bilis ng pagsasalita: {wpm} WPM ({pace}) sa loob ng {sec}s{vocal}{reasons}",
    "optimal zone 115-152 WPM": "pinakamainam na saklaw 115-152 WPM",
    "too fast": "masyadong mabilis",
    "too slow": "masyadong mabagal",
    " (active vocalization {asec}s, phonation {pct}%). ": "(aktibong pagbigkas {asec}s, ponasyon {pct}%).",
    "Steady speech rhythm.": "Matatag na ritmo ng pagsasalita.",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "Wala pang naitalang PTE speech sample sa session na ito. Magsalita sa mic para masukat nang live ang Oral Fluency (WPM, mga paghinto, disfluency, at burst rhythm).",
    "Pearson PTE Official Scorecard": "Opisyal na Scorecard ng Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "Obhetibong ebalwasyon mula sa pinakabagong sample mo ({src}). Naabot mo na ang target na PTE 58+.",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "Obhetibong ebalwasyon mula sa pinakabagong sample mo ({src}). Mag-focus sa tuloy-tuloy na phrasing at malinaw na mga dulong katinig.",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "Mag-record muna ng speech sample para makita ang iyong Pearson Concordance (/90), bilis ng WPM, active phonation ratio, at telemetry ng mga paghinto.",
    "How is \"fluctuations\" pronounced naturally?": "Paano binibigkas nang natural ang \"fluctuations\"?",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (may malinaw na /ʃ/ sa -tion)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "Tumpak! Ang dulong -tion ay binibigkas na /ʃənz/.",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (pagbasang letra por letra)",
    "Not natural—avoid spelling-based syllable stress.": "Hindi natural—iwasan ang pagdiin ng pantig na nakabatay sa baybay.",
    "Right! The noun \"fluency\" fits after steady.": "Tama! Bagay ang pangngalang \"fluency\" pagkatapos ng steady.",
    "Order the core PTE fluency principle:": "Ayusin ang pangunahing prinsipyo ng PTE fluency:",
    "Exact! Fluency is the key to high scores.": "Tumpak! Ang fluency ang susi sa matataas na score.",
    "Listen": "Makinig",
    "Learning Session": "Sesyon ng Pag-aaral",
    "Concept A": "Konsepto A",
    "Concept B": "Konsepto B",
    "Concept Balance Diagram": "Dayagram ng Balanse ng Konsepto",
    "Comparing...": "Ikinukumpara...",
    "Sentence Pattern Flow": "Daloy ng Pattern ng Pangungusap",
    "Building flow...": "Binubuo ang daloy...",
    "Zoom": "Zoom",
    "STROKES": "MGA STROKE",
    "Stroke": "Stroke",
    "Loading strokes...": "Nilo-load ang mga stroke...",
    "Show / hide trace guidelines": "Ipakita / itago ang mga gabay sa pagbakat",
    "👁 Hide Trace": "👁 Itago ang Bakat",
    "👁 Trace": "👁 Bakatin",
    "▶ Follow Tutor": "▶ Sundan ang Tutor",
    "Click to view stroke {num}": "I-click para makita ang stroke {num}",
    "Topic Visual Sketch": "Biswal na Sketch ng Paksa",
    "Drawing...": "Iginuguhit...",
    "Zoom in to inspect details": "Mag-zoom in para suriin ang mga detalye",
    "Up next": "Susunod",
    "Tutor Writing...": "Nagsusulat ang Tutor...",
    "Quick Check Practice": "Mabilisang Pagsasanay",
    "Tutor is writing on the board...": "Nagsusulat ang tutor sa pisara...",
    "Zoom Out Transition": "Transisyon ng Zoom Out",
    "Focus Zoom": "Focus Zoom",
    "Focus Ready": "Handa na ang Focus",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ Aktibo ang Pen Mode — Bilugan ang alinmang bahagi para magtanong",
    "Clear": "Burahin",
    "Start from Scratch": "Magsimula sa Umpisa",
    "In Progress": "Isinasagawa",
    "Pages:": "Mga Pahina:",
    "Pg": "Pah",
    "Vocab:": "Bokabularyo:",
    "Correct:": "Tama:",
    "Loading full material...": "Nilo-load ang buong materyal...",
    "Exam Readiness:": "Kahandaan sa Exam:",
    "Pass": "Pasado",
    "Pass threshold": "Marka para pumasa",
    "Reset SSW study progress to 0%": "I-reset ang progreso sa pag-aaral ng SSW sa 0%",
    "Active Spot": "Aktibong Bahagi",
    "Step": "Hakbang",
    "of": "ng",
    "View This Step": "Tingnan ang Hakbang na Ito",
    "Ask Sensei to Explain": "Hilingin kay Sensei na Ipaliwanag",
    "Study Roadmap": "Roadmap sa Pag-aaral",
    "Study Guide": "Gabay sa Pag-aaral",
    "p.": "p.",
    "Practice Quiz": "Pagsasanay na Quiz",
    "START HERE (ZERO BEGINNER)": "MAGSIMULA RITO (ZERO BEGINNER)",
    "CURRENT ACTIVE STAGE": "KASALUKUYANG AKTIBONG YUGTO",
    "Stage": "Yugto",
    "Open p. {page} & Start": "Buksan ang p. {page} at Magsimula",
    "Ask Sensei": "Magtanong kay Sensei",
    "Topics That Still Need Review (Click for Practice Quiz):": "Mga Paksang Kailangan Pang I-review (I-click para sa Practice Quiz):",
    "Done ✓": "Tapos na ✓",
    "Mark Done": "Markahang Tapos",
    "Open Page": "Buksan ang Pahina",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "Buod ng 13 Mahalagang Numero sa Exam (I-tap para Buksan)",
    "Hide": "Itago",
    "View 13 Numbers": "Tingnan ang 13 Numero",
    "Pg.": "Pah.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "Maghanap ng paksa o keyword (hal., allergy, chlorine, pahina 27)...",
    "Show Reading Guide (Furigana)": "Ipakita ang Gabay sa Pagbasa (Furigana)",
    "Hide Reading Guide (Furigana)": "Itago ang Gabay sa Pagbasa (Furigana)",
    "Search Results \"{query}\" ({count} matches)": "Mga Resulta ng Paghahanap \"{query}\" ({count} tugma)",
    "Close Results": "Isara ang mga Resulta",
    "Trap": "Patibong",
    "Page Completed ✓": "Tapos na ang Pahina ✓",
    "Mark Page Complete": "Markahang Tapos na ang Pahina",
    "Key Takeaway on This Page": "Pangunahing Aral sa Pahinang Ito",
    "Active": "Aktibo",
    "Understood": "Naintindihan",
    "Next Step": "Susunod na Hakbang",
    "Got it, Next Step {step} ->": "Nakuha ko, Susunod na Hakbang {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "Tapusin ang Pahina {page}, Buksan ang Pahina {nextPage} ->",
    "Complete Final Step ✓": "Kumpletuhin ang Huling Hakbang ✓",
    "Exam Trap Alert:": "Babala sa Patibong sa Pagsusulit:",
    "Exam Calculation Formula:": "Pormula sa Pagkalkula sa Pagsusulit:",
    "Video Notes for Page {page}:": "Mga Tala sa Video para sa Pahina {page}:",
    "Matching Vocabulary ({count})": "Magkatugmang Bokabularyo ({count})",
    "Key Vocabulary on Page {page} ({count})": "Mahahalagang Bokabularyo sa Pahina {page} ({count})",
    "Mastered ✓": "Kabisado na ✓",
    "Mark Mastered": "Markahang Kabisado na",
    "Exam Case Quiz": "Quiz sa Kaso ng Pagsusulit",
    "Calculation Drill": "Pagsasanay sa Pagkalkula",
    "Exam Trap Quiz": "Quiz sa Patibong sa Pagsusulit",
    "Vocab Drill": "Pagsasanay sa Bokabularyo",
    "Hide 5 Formulas": "Itago ang 5 Pormula",
    "Open 5 Calculation Formulas": "Buksan ang 5 Pormula sa Pagkalkula",
    "Question": "Tanong",
    "Tryout p.": "Subok p.",
    "Review p.": "Balik-aral p.",
    "View Explanation on p. {page}": "Tingnan ang Paliwanag sa p. {page}",
    "Next Question ->": "Susunod na Tanong ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "Handa ka na bang subukan ang Pagsasanay na Quiz sa SSW Food Processing?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "Pumili ng uri ng pagsasanay sa itaas o magtanong kay Sensei gamit ang boses. Bawat tanong ay may malinaw na paliwanag at sanggunian ng pahina ng aralin.",
    "Start 1 Question Now": "Simulan ang 1 Tanong Ngayon",
    "Enlarge diagram for a closer view": "Palakihin ang dayagram para mas makita nang malapitan",
    "TRIGGER / SUBJECT": "HUDYAT / PAKSA",
    "PAIR!": "PARES!",
    "MATCHING FORM": "KATUGMANG ANYO",
    "Lead Car": "Unang Bagon",
    "Right Link": "Tamang Dugtong",
    "Check Context": "Suriin ang Konteksto",
    "Safe to Use": "Ligtas Gamitin",
    "SNAPSHOT": "MAIKLING KUHA",
    "RULE 1": "TUNTUNIN 1",
    "Core Form": "Pangunahing Anyo",
    "ACTION VIDEO": "VIDEO NG KILOS",
    "RULE 2": "TUNTUNIN 2",
    "Contrast Form": "Kasalungat na Anyo",
    "CONCEPT 1": "KONSEPTO 1",
    "🔎 Focus": "🔎 Pokus",
    "CONCEPT 2": "KONSEPTO 2",
    "Core Concept": "Pangunahing Konsepto",
    "Sentence Pattern Blocks": "Mga Bloke ng Hulwaran ng Pangungusap",
    "Arranging blocks...": "Inaayos ang mga bloke...",
    "Whiteboard Visual Detail": "Detalyeng Biswal sa Whiteboard",
    "Zoom Out": "I-zoom Out",
    "Zoom In": "I-zoom In",
    "inaccurate grammar pattern": "hindi tumpak na hulwaran ng gramatika",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "Usapang FIEZEL Japanese Life ({level}): {topic}",
    "Real-Life Communication: {topic}": "Komunikasyon sa Totoong Buhay: {topic}",
    "Use the situational Japanese sentence pattern naturally.": "Gamitin nang natural ang sitwasyonal na hulwaran ng pangungusap sa Hapon.",
    "Deliver clear pronunciation and polite phrasing smoothly.": "Bigkasin nang malinaw at magalang ang mga parirala nang tuloy-tuloy.",
    "IELTS Speaking: {topic}": "IELTS Speaking: {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "Opisyal na simulasyon ng Cambridge IELTS Speaking (Bahagi 2 Cue Card at Bahagi 3 Talakayan): {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "Ngayon, sa Bahagi 2, bibigyan kita ng isang paksa. Mayroon kang isang minuto para pag-isipan ang sasabihin mo: {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "Magsalita nang malinaw at magkakaugnay sa loob ng 1–2 minuto na sinasaklaw ang bawat punto sa cue card.",
    "Use academic discourse markers cleanly and naturally.": "Gamitin nang malinis at natural ang mga akademikong pang-ugnay sa diskurso.",
    "Level A1 · Beginner": "Antas A1 · Baguhan",
    "Level A2 · Everyday Conversation": "Antas A2 · Pang-araw-araw na Usapan",
    "🎯 Best Answer ({level})": "🎯 Pinakamahusay na Sagot ({level})",
    "Short & Easy": "Maikli at Madali",
    "Natural & Contextual": "Natural at Naaayon sa Konteksto",
    "Reply + Follow-up": "Sagot + Kasunod na Tanong",
    "🎯 Best Answer (Level {level})": "🎯 Pinakamahusay na Sagot (Antas {level})",
    "Part": "Bahagi",
    "First on the left, {title}: {subtitle}{ex}": "Una sa kaliwa, {title}: {subtitle}{ex}",
    "focus on the core rule": "magpokus sa pangunahing tuntunin",
    ". Example: {example}": ". Halimbawa: {example}",
    "Second on the right, {title}: {subtitle}{ex}": "Pangalawa sa kanan, {title}: {subtitle}{ex}",
    "compare with this form": "ihambing sa anyong ito",
    "Key idea": "Pangunahing ideya",
    "Branch {num}, {label}{sub}{ex}": "Sanga {num}, {label}{sub}{ex}",
    ", meaning {sublabel}": ", ibig sabihin {sublabel}",
    ", for example {example}": ", halimbawa {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "Isa-isahin natin ang concept map para sa {topic}. {detail}.",
    ", e.g. {example}": ", hal. {example}",
    ". Then ": ". Pagkatapos",
    "Follow the timeline from left to right. {stops}.": "Sundan ang timeline mula kaliwa pakanan. {stops}.",
    "Block {num}, {role}, contains {token}{note}": "Ang bloke {num}, {role}, ay may lamang {token}{note}",
    ", used for {note}": ", ginagamit para sa {note}",
    "Notice the pattern blocks from left to right. {detail}.": "Pansinin ang mga pattern block mula kaliwa pakanan. {detail}.",
    " Starting from {parts}.": "Mula sa {parts}.",
    ", then ": ", tapos",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "Tingnang mabuti ang diagram ng {topic} sa board.{cap}{visualCue}",
    "Primary form": "Pangunahing anyo",
    "Comparison form": "Panghambing na anyo",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "Paghambingin ang magkabilang panig: {sideA} kumpara sa {sideB}.{insight}",
    " Key insight: {insight}.": "Mahalagang punto: {insight}.",
    "{role}: {word}": "{role}: {word}",
    ", followed by ": ", na sinusundan ng",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "Sundan ang mga bloke ng pangungusap mula kaliwa pakanan: {chain}.{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "Suriin ang estruktura ng pangungusap para sa {topic}: {detail}.",
    "place each clause element in its proper slot": "ilagay ang bawat bahagi ng sugnay sa tamang puwesto nito",
    ". Next: ": ". Susunod:",
    "Examples on the board": "Mga halimbawa sa board",
    "Review the examples in this table": "Suriin ang mga halimbawa sa talahanayang ito",
    "Reason:": "Dahilan:",
    "Avoid forms like {wrong}. Use {right}.{why}": "Iwasan ang mga anyong gaya ng {wrong}. Gamitin ang {right}.{why}",
    "the common mistake": "ang karaniwang pagkakamali",
    "Remember this key point:": "Tandaan ang mahalagang puntong ito:",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "Panoorin ang pitch contour para sa {word} at sundan ang asul na kurba habang binibigkas ang {reading}.",
    "Now try this quick check: {prompt}.": "Ngayon, subukan ang maikling pagsusuri na ito: {prompt}.",
    "choose the accurate sentence form": "piliin ang tamang anyo ng pangungusap",
    "To Be vs Active Verb Map": "Mapa ng To Be vs Active Verb",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "Gamitin lang ang To Be sa mga Adjective, Noun/Lugar, Verb-ing, o Passive Verb 3 — HUWAG sa payak na Verb 1",
    "Subject + Verb 1": "Subject + Verb 1",
    "Direct active verb, no To Be": "Direktang active verb, walang To Be",
    "To Be + Adj/Noun": "To Be + Adj/Noun",
    "State, trait, role, or location": "Kalagayan, katangian, tungkulin, o lokasyon",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "Kilos na nangyayari ngayon mismo",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "Passive voice (tinatanggap ang kilos)",
    "Subject": "Simuno",
    "Key Connector": "Pangunahing Pang-ugnay",
    "Main Verb / Core": "Pangunahing Pandiwa / Pinakabuod",
    "Object / Complement": "Layon / Kaganapan",
    "Details": "Mga Detalye",
    "Build the Sentence": "Buuin ang Pangungusap",
    "Block": "Bloke",
    "Key pattern slot": "Pangunahing puwesto ng pattern",
    "Photo vs Action Video": "Larawan vs Action Video",
    "PHOTO MODE": "MODE NG LARAWAN",
    "Focuses on state, trait, or condition": "Nakatuon sa kalagayan, katangian, o kondisyon",
    "VIDEO MODE": "MODE NG VIDEO",
    "Focuses on action, movement, or habit": "Nakatuon sa kilos, galaw, o nakagawian",
    "Pattern Block Puzzle": "Puzzle ng Pattern Block",
    "Snap the colored blocks left to right into a natural sentence.": "Idugtong ang mga may-kulay na bloke mula kaliwa pakanan para makabuo ng natural na pangungusap.",
    "0 Start": "0 Simula",
    "1 Concept": "1 Konsepto",
    "2 Sketch": "2 Balangkas",
    "3 Breakdown": "3 Paghimay",
    "4 Practice": "4 Pagsasanay",
    "Question Topic": "Paksa ng Tanong",
    "Key Takeaways": "Mga Pangunahing Aral",
    "Contextual Practice": "Kontekstuwal na Pagsasanay",
    "States, traits, roles, or places": "Mga kalagayan, katangian, tungkulin, o lugar",
    "Core Pattern": "Pangunahing Pattern",
    "Verb / Key": "Pandiwa / Susi",
    "Complement": "Kaganapan",
    "✦ Learning Board": "✦ Board sa Pag-aaral",
    "Board Active": "Aktibo ang Board",
    "⤢ Open": "⤢ Buksan",
    "Minimize Board (See Mochi & Keep Talking)": "I-minimize ang Board (Tingnan si Mochi at Magpatuloy sa Pakikipag-usap)",
    "Close & Continue Talking": "Isara at Magpatuloy sa Pakikipag-usap",
    "Preparing learning board...": "Inihahanda ang board sa pag-aaral...",
    "Building visual explanations and tailored practice for you": "Binubuo ang mga visual na paliwanag at pagsasanay na akma sa iyo",
    "💡 Key Point:": "💡 Mahalagang Punto:",
    "Sentence Pattern": "Padron ng Pangungusap",
    "Choice": "Pagpipilian",
    "Fill in Blank": "Punan ang Patlang",
    "Word Order": "Ayos ng mga Salita",
    "New Question": "Bagong Tanong",
    "Switch to a fresh practice question": "Lumipat sa panibagong tanong sa pagsasanay",
    "Tap the right word to complete the sentence:": "Pindutin ang tamang salita para makumpleto ang pangungusap:",
    "That word does not fit yet. Try another option!": "Hindi pa akma ang salitang iyan. Subukan ang ibang opsyon!",
    "Tap tiles below to build the sentence...": "Pindutin ang mga tile sa ibaba para mabuo ang pangungusap...",
    "Close ✕": "Isara ✕",
    "× Unnatural / Avoid": "× Hindi Natural / Iwasan",
    "✓ Natural Form": "✓ Natural na Anyo",
    "Key Radical": "Pangunahing Radikal",
    "Strokes": "Mga Guhit",
    "Tone Contour & Pronunciation": "Kontur ng Tono at Pagbigkas",
    "Spot on! This sentence structure is clear and natural.": "Tumpak! Malinaw at natural ang pagkakabuo ng pangungusap na ito.",
    "Not quite — check the word order and pattern above and try again.": "Hindi pa tama — tingnan ang ayos ng mga salita at padron sa itaas at subukan ulit.",
    "Nice work! That word completes the sentence naturally.": "Magaling! Natural na nakumpleto ng salitang iyan ang pangungusap.",
    "Cleanly arranged! Word order is spot on.": "Maayos ang pagkakaayos! Tumpak ang pagkakasunod-sunod ng mga salita.",
    "Arrange the tiles below into a natural sentence:": "Ayusin ang mga tile sa ibaba para makabuo ng natural na pangungusap:"
  },
  "ja": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "音声パートナーでリアルタイムのFiezel会話を行うには、インターネット接続が必要です。",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "ブラウザにより自動再生がブロックされました。返信を聞くには「音声を再生」をタップしてください。",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "Fiezelの音声に再接続しています。テキストの返信は表示されたままですので、「音声を再生」をタップして再試行してください。",
    "Student": "生徒",
    "Learning Board": "学習ボード",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "誤用しやすい形「{trap}」がまだ使われています。ホワイトボードでハイライト表示されている形に切り替えましょう。",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "「Did / Didn't / Does」の後ろでは、過去形「{verb}」ではなく動詞の原形（V1）を使います。",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "動詞「{verb}」の前に「{be}」を置かないでください。主語の直後に動詞を続けます。",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "特定の開始時点（2020やMondayなど）を表すときは、「for」ではなく「since」を使います。",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "曜日（Monday、Fridayなど）には、前置詞「in」ではなく「on」を使います。",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "「Despite」の後ろに「of」は続きません。そのまま「despite + 名詞」にするか、「in spite of」を使ってください。",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "助動詞（should/must/can）の後ろでは、「to」を付けずに動詞の原形をそのまま使います。",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "パターンをテストするには、3語以上の完全な文（主語 + 動詞 + 補語）を組み立ててください。",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "「ますでした」は文法的に誤りです。過去形にするには「ます」を直接「ました」に活用させます。",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "動詞の辞書形（普通形）に直接「です」を付けることはできません。丁寧形の「〜ます / 〜ました」を使いましょう。",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "動作（勉強する／飲むなど）が行われる場所を表すときは、助詞の「に」ではなく「で」を使います。",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "文型に沿って、完全な文を日本語の文字（ひらがな／漢字）で書いてください。",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "進行中の動作を表すには、動詞の前に「是」ではなく「正在」または「在」を使います。",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "中国語では、時間を表す表現（现在 / 昨天 など）を動詞の前に置く必要があります。",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "文型に合わせて、完全な文を漢字（中国語の文字）で書いてください。",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "素晴らしいです！文の構造も文法も文型にぴったり合っています。「会話を続ける」をタップして会話に戻りましょう。",
    "Not quite right yet. Review the meaning and structure above and try again.": "もう一歩です。上の意味と文構造を見直して、もう一度試してみてください。",
    "Check your word order and verb form against the formula blocks above.": "上の文型ブロックと見比べて、語順と動詞の形を確認してください。",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "マイクが無効になっているか、ブラウザによってブロックされています。「話す」をタップしてマイクへのアクセスを許可するか、下の欄に文を入力してください。",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "音声認識にはインターネット接続が必要です。もう一度話してみるか、文を入力してください。",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "ブラウザでマイクの許可がブロックされています。アドレスバーからマイクへのアクセスを許可するか、下の欄に文を入力してください。",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "このブラウザはまだ自動音声認識に対応していません。下の欄に文を入力するか、上の返信候補から選んでください。",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "このブラウザではマイクの許可が有効になっていません。文を入力するか、上の返信候補カードから選んでください。",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "まだ音声が検出されていません。マイクが有効になっていることを確認してはっきり話すか、下の入力欄に入力してください。",
    "Switching cleanly to a fresh voice channel...": "新しい音声チャンネルへスムーズに切り替えています…",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "FIEZEL音声はまだ再生されていないため、消費ジェムは0個です（残高と無料枠はそのままです）！",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "通話終了：FIEZEL音声応答 {turns}回、1日の無料枠利用（0 💎）",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "通話終了：FIEZEL音声応答 {turns}回、音声枠により {gems} 💎 消費",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - 飲食料品製造業試験メンター",
    "SSW Mode": "SSWモード",
    "Session conversation guide": "セッション会話ガイド",
    "Open SSW Tactical Board": "SSW作戦ボードを開く",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - 飲食料品製造業試験メンター（Prometric）",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "OTAFF公式ガイド91ページ + 重要語彙266語 + CBT演習58問",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "いいですね！そのポイントをSSWノートに保存しました。このページの次のステップに進む準備はできましたか？",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "素晴らしい、理解できましたね！では学習言語に戻って、自分で1文作ってみましょう！",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "最初の{brand}音声応答には最低{gems}ジェムが必要です（現在の残高：{balance} 💎）。",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "クイズ練習をクリアして無料ジェムを集めるか、明日のデイリー無料枠をお待ちください！",
    "1 · Ask Details": "1 · 詳細を聞く",
    "2 · Tips & Example": "2 · コツと例文",
    "3 · Test Me": "3 · テストする",
    "Check Progress & Stage 1": "進捗とステージ1を確認",
    "Sensei, check my SSW progress and where to start from zero!": "先生、私のSSWの進捗と、ゼロからどこから始めるべきか確認してください！",
    "Allergen Update Apr 2026": "アレルゲン改定（2026年4月）",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "OTAFF Ver 5.1（2026年4月）のアレルゲン改定（くるみ、カシューナッツ、ピスタチオ）について説明してください！",
    "Chlorine Math Drill": "塩素濃度計算ドリル",
    "Give me 1 chlorine dilution or budomari calculation question now!": "今すぐ塩素希釈または歩留まりの計算問題を1問出題してください！",
    "Yukkuri Traps": "ゆっくりの引っ掛けポイント",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "モジュール内の「ゆっくり」の速度トラップと「保管サンプル（hokang sampuru）」の用語について説明してください！",
    "Hide SSW Sensei quick actions": "SSW Senseiのクイック操作を隠す",
    "Show SSW Sensei quick actions": "SSW Senseiのクイック操作を表示",
    "Actions & Ask Sensei": "操作・先生に質問",
    "[Study Focus]:": "【学習ポイント】：",
    "{m}m {s}s": "{m}分 {s}秒",
    "Fluency & Grammar Accuracy Trend": "流暢さ・文法の正確さ推移",
    "Based on {turns} verified speaking turns": "確認済みの発話ターン {turns}回に基づく",
    "Page {page}": "{page}ページ",
    "Page": "ページ",
    "Page {page} · Step {step} of {total}": "{page}ページ · ステップ {step} / {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "クイックSSW練習は上の作戦ボードパネルから利用できます。",
    "Ready to continue lesson": "レッスンを続ける準備ができました",
    "Great!": "素晴らしい！",
    "Need extra explanation": "追加の説明が必要です",
    "Select an active step above.": "上から有効なステップを選択してください。",
    "SSW Food Manufacturing": "SSW 飲食料品製造業",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "Describe Imageの鍵は「安定した流暢さ」です。3秒以上間を空けないようにしましょう！FIEZELの5つの構成文を、落ち着いて自信のあるイントネーションでスムーズに話してください。",
    "Choose the CORRECT opening sentence for {title}:": "{title}の正しい導入文を選んでください：",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "完璧です！流暢さと内容の両方をカバーする高得点の標準導入文です。",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "「I see」のようなカジュアルな表現は避け、標準的なアカデミック表現を使いましょう。",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "「maybe」のような曖昧な表現は避け、はっきりと断定的に話しましょう。",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "的確です！「maximum figure」はPearsonの採点で高く評価されるアカデミックなコロケーションです。",
    "Arrange the standard Pearson Describe Image opening sentence:": "標準的なPearson Describe Imageの導入文を並べ替えてください：",
    "Opening sentence ordered accurately!": "導入文を正確に並べ替えられました！",
    "Articulate the final syllable clearly.": "最後の音節をはっきりと発音してください。",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "各節でピッチを一定に保ち、// の区切りごとに短く（0.3秒）間を取ってください。",
    "Read the sentence accurately with crisp final consonant articulation.": "語末の子音を明瞭に発音しながら、文を正確に読み上げてください。",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearsonは速さよりも「安定したリズム」を評価します。// のフレーズ区切りでのみ短く間を取り、フレーズの途中で止まらないでください！",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "この文で自然な息継ぎ（チャンクの区切り）が入るのはどこですか？",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "正解です！長い名詞句の主語と本動詞の間で自然に区切ります。",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "細切れになりすぎています！途切れ途切れの間はOral Fluencyのスコアを下げます。",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "間をまったく取らずに読むと、文末の単語の明瞭さと息の支えが失われてしまいます。",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "正解です！複数主語「studies」には原形動詞「demonstrate」が続きます。",
    "Order this academic Read Aloud sentence accurately:": "このアカデミックな音読（Read Aloud）の文を正確に並べ替えてください：",
    "Perfect! Clean academic phrase grouping.": "完璧です！アカデミックなフレーズの区切りがとてもきれいです。",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "発話ペース計測: {sec}秒間で {wpm} WPM（{pace}）{vocal}{reasons}",
    "optimal zone 115-152 WPM": "最適範囲 115-152 WPM",
    "too fast": "速すぎます",
    "too slow": "遅すぎます",
    " (active vocalization {asec}s, phonation {pct}%). ": "（有効発声時間 {asec}秒、発声率 {pct}%）。",
    "Steady speech rhythm.": "安定した発話リズムです。",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "このセッションではまだPTEの音声サンプルが録音されていません。マイクに向かって話すと、Oral Fluency（WPM、ポーズ、非流暢性、バーストリズム）をリアルタイムで計測できます。",
    "Pearson PTE Official Scorecard": "Pearson PTE 公式スコアカード",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "最新サンプル（{src}）の客観的評価です。PTE 58+ の目標を達成しています。",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "最新サンプル（{src}）の客観的評価です。滑らかなフレージングと語尾の子音の明瞭さに意識を向けましょう。",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "最初に音声サンプルを録音すると、Pearson換算スコア（/90）、WPMペース、有効発声率、ポーズ計測データを確認できます。",
    "How is \"fluctuations\" pronounced naturally?": "\"fluctuations\" の自然な発音はどれですか？",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/（-tion の /ʃ/ をはっきりと発音）",
    "Exact! The -tion ending is pronounced /ʃənz/.": "正解です！語尾の -tion は /ʃənz/ と発音します。",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/（スペル通りの逐字読み）",
    "Not natural—avoid spelling-based syllable stress.": "不自然です。スペル通りの音節アクセントは避けましょう。",
    "Right! The noun \"fluency\" fits after steady.": "その通りです！steady の後ろには名詞 \"fluency\" が入ります。",
    "Order the core PTE fluency principle:": "PTEの流暢性（Fluency）の重要原則を並べ替えてください：",
    "Exact! Fluency is the key to high scores.": "正解です！流暢さ（Fluency）が高得点の鍵となります。",
    "Listen": "聞く",
    "Learning Session": "学習セッション",
    "Concept A": "概念 A",
    "Concept B": "概念 B",
    "Concept Balance Diagram": "概念バランス図",
    "Comparing...": "比較中...",
    "Sentence Pattern Flow": "文型フロー",
    "Building flow...": "フローを作成中...",
    "Zoom": "ズーム",
    "STROKES": "筆順",
    "Stroke": "ストローク",
    "Loading strokes...": "筆順を読み込み中...",
    "Show / hide trace guidelines": "なぞり書きガイドの表示／非表示",
    "👁 Hide Trace": "👁 ガイドを隠す",
    "👁 Trace": "👁 なぞりガイド",
    "▶ Follow Tutor": "▶ 講師に合わせて進む",
    "Click to view stroke {num}": "クリックして{num}画目を表示",
    "Topic Visual Sketch": "トピック図解スケッチ",
    "Drawing...": "描画中...",
    "Zoom in to inspect details": "拡大して詳細を確認",
    "Up next": "次の項目",
    "Tutor Writing...": "講師が記入中...",
    "Quick Check Practice": "クイック確認練習",
    "Tutor is writing on the board...": "講師がボードに書いています...",
    "Zoom Out Transition": "ズームアウト切り替え",
    "Focus Zoom": "フォーカスズーム",
    "Focus Ready": "フォーカス準備完了",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ ペンモード有効 — 質問したい部分を丸で囲んでください",
    "Clear": "クリア",
    "Start from Scratch": "最初からやり直す",
    "In Progress": "学習中",
    "Pages:": "ページ：",
    "Pg": "ページ",
    "Vocab:": "語彙：",
    "Correct:": "正解：",
    "Loading full material...": "教材全体を読み込み中...",
    "Exam Readiness:": "試験対策度：",
    "Pass": "合格",
    "Pass threshold": "合格ライン",
    "Reset SSW study progress to 0%": "SSW学習進捗を 0% にリセット",
    "Active Spot": "現在のポイント",
    "Step": "ステップ",
    "of": "/",
    "View This Step": "このステップを見る",
    "Ask Sensei to Explain": "先生に解説をお願いする",
    "Study Roadmap": "学習ロードマップ",
    "Study Guide": "学習ガイド",
    "p.": "p.",
    "Practice Quiz": "練習クイズ",
    "START HERE (ZERO BEGINNER)": "ここからスタート（超初心者向け）",
    "CURRENT ACTIVE STAGE": "現在進行中のステージ",
    "Stage": "ステージ",
    "Open p. {page} & Start": "p. {page} を開いて開始",
    "Ask Sensei": "先生に質問",
    "Topics That Still Need Review (Click for Practice Quiz):": "まだ復習が必要なトピック（クリックして練習クイズへ）：",
    "Done ✓": "完了 ✓",
    "Mark Done": "完了にする",
    "Open Page": "ページを開く",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "試験必出の13個の数値まとめ（タップして開く）",
    "Hide": "非表示",
    "View 13 Numbers": "13個の数値を表示",
    "Pg.": "p.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "トピックやキーワードを検索（例：アレルギー、塩素、27ページ）...",
    "Show Reading Guide (Furigana)": "読みガイド（ふりがな）を表示",
    "Hide Reading Guide (Furigana)": "読みガイド（ふりがな）を非表示",
    "Search Results \"{query}\" ({count} matches)": "「{query}」の検索結果（{count}件）",
    "Close Results": "検索結果を閉じる",
    "Trap": "ひっかけ",
    "Page Completed ✓": "ページ完了 ✓",
    "Mark Page Complete": "このページを完了にする",
    "Key Takeaway on This Page": "このページの重要ポイント",
    "Active": "アクティブ",
    "Understood": "理解しました",
    "Next Step": "次のステップ",
    "Got it, Next Step {step} ->": "わかりました、次のステップ {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "{page}ページを完了して、{nextPage}ページを開く ->",
    "Complete Final Step ✓": "最終ステップを完了 ✓",
    "Exam Trap Alert:": "試験のひっかけ注意：",
    "Exam Calculation Formula:": "試験の計算公式：",
    "Video Notes for Page {page}:": "{page}ページの動画メモ：",
    "Matching Vocabulary ({count})": "関連語彙（{count}）",
    "Key Vocabulary on Page {page} ({count})": "{page}ページの重要語彙（{count}）",
    "Mastered ✓": "習得済み ✓",
    "Mark Mastered": "習得済みにする",
    "Exam Case Quiz": "試験事例クイズ",
    "Calculation Drill": "計算ドリル",
    "Exam Trap Quiz": "ひっかけ対策クイズ",
    "Vocab Drill": "語彙ドリル",
    "Hide 5 Formulas": "5つの公式を非表示",
    "Open 5 Calculation Formulas": "5つの計算公式を開く",
    "Question": "問題",
    "Tryout p.": "模試 p.",
    "Review p.": "復習 p.",
    "View Explanation on p. {page}": "p.{page} の解説を見る",
    "Next Question ->": "次の問題 ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "SSW 飲食料品製造業の練習クイズに挑戦しますか？",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "上から練習タイプを選ぶか、音声で先生に質問してください。すべての問題にわかりやすい解説と参照ページが付いています。",
    "Start 1 Question Now": "今すぐ1問始める",
    "Enlarge diagram for a closer view": "図を拡大して詳しく見る",
    "TRIGGER / SUBJECT": "トリガー / 主語",
    "PAIR!": "ペア！",
    "MATCHING FORM": "対応する形",
    "Lead Car": "先頭車両",
    "Right Link": "正しい接続",
    "Check Context": "文脈を確認",
    "Safe to Use": "使用OK",
    "SNAPSHOT": "スナップショット",
    "RULE 1": "ルール 1",
    "Core Form": "基本形",
    "ACTION VIDEO": "アクション動画",
    "RULE 2": "ルール 2",
    "Contrast Form": "対比形",
    "CONCEPT 1": "コンセプト 1",
    "🔎 Focus": "🔎 フォーカス",
    "CONCEPT 2": "コンセプト 2",
    "Core Concept": "コアコンセプト",
    "Sentence Pattern Blocks": "文型ブロック",
    "Arranging blocks...": "ブロックを配置しています...",
    "Whiteboard Visual Detail": "ホワイトボード図解の詳細",
    "Zoom Out": "縮小",
    "Zoom In": "拡大",
    "inaccurate grammar pattern": "不正確な文法パターン",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "FIEZEL 日本での生活会話（{level}）：{topic}",
    "Real-Life Communication: {topic}": "実践コミュニケーション：{topic}",
    "Use the situational Japanese sentence pattern naturally.": "状況に合った日本語の文型を自然に使ってください。",
    "Deliver clear pronunciation and polite phrasing smoothly.": "明瞭な発音と丁寧な表現をスムーズに話してください。",
    "IELTS Speaking: {topic}": "IELTS スピーキング：{topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "公式ケンブリッジ IELTS スピーキング模擬試験（Part 2 キューカード & Part 3 ディスカッション）：{topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "では、Part 2 ではトピックをお渡しします。話す内容を考える時間は1分間です：{topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "キューカードのすべてのポイントに触れながら、1〜2分間一貫して話してください。",
    "Use academic discourse markers cleanly and naturally.": "アカデミックな談話標識（ディスコースマーカー）を明確かつ自然に使ってください。",
    "Level A1 · Beginner": "レベル A1 · 初級",
    "Level A2 · Everyday Conversation": "レベル A2 · 日常会話",
    "🎯 Best Answer ({level})": "🎯 ベストアンサー（{level}）",
    "Short & Easy": "短くて簡単",
    "Natural & Contextual": "自然で文脈に沿った表現",
    "Reply + Follow-up": "返答＋フォローアップ",
    "🎯 Best Answer (Level {level})": "🎯 ベストアンサー（レベル {level}）",
    "Part": "パート",
    "First on the left, {title}: {subtitle}{ex}": "まず左側、{title}：{subtitle}{ex}",
    "focus on the core rule": "核となるルールに注目します",
    ". Example: {example}": "。例：{example}",
    "Second on the right, {title}: {subtitle}{ex}": "次に右側、{title}：{subtitle}{ex}",
    "compare with this form": "この形と比較します",
    "Key idea": "重要ポイント",
    "Branch {num}, {label}{sub}{ex}": "分岐 {num}、{label}{sub}{ex}",
    ", meaning {sublabel}": "、意味：{sublabel}",
    ", for example {example}": "、例えば {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "{topic}のコンセプトマップを一つずつ確認しましょう。{detail}。",
    ", e.g. {example}": "、例：{example}",
    ". Then ": "。次に、",
    "Follow the timeline from left to right. {stops}.": "タイムラインを左から右へたどってみましょう。{stops}。",
    "Block {num}, {role}, contains {token}{note}": "ブロック {num}（{role}）には「{token}」が入ります{note}",
    ", used for {note}": "（{note}に使用）",
    "Notice the pattern blocks from left to right. {detail}.": "左から右へのパターンブロックに注目してください。{detail}。",
    " Starting from {parts}.": "{parts} から始まります。",
    ", then ": "、続いて",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "ボード上の「{topic}」の図をよく見てみましょう。{cap}{visualCue}",
    "Primary form": "基本の形",
    "Comparison form": "比較の形",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "両側を比較しましょう：{sideA} 対 {sideB}。{insight}",
    " Key insight: {insight}.": "重要ポイント：{insight}。",
    "{role}: {word}": "{role}：{word}",
    ", followed by ": "、続いて",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "左から右へ文のブロックをたどりましょう：{chain}。{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "{topic}の文構造を確認しましょう：{detail}。",
    "place each clause element in its proper slot": "各節の要素を適切な位置に配置します",
    ". Next: ": "。次は：",
    "Examples on the board": "ボードの例",
    "Review the examples in this table": "この表の例を確認しましょう",
    "Reason:": "理由：",
    "Avoid forms like {wrong}. Use {right}.{why}": "{wrong} のような形は避け、{right} を使いましょう。{why}",
    "the common mistake": "よくある誤り",
    "Remember this key point:": "この重要ポイントを覚えておきましょう：",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "「{word}」のピッチ曲線を見ながら、青い線をなぞって「{reading}」と発音しましょう。",
    "Now try this quick check: {prompt}.": "では、簡単な確認問題をやってみましょう：{prompt}。",
    "choose the accurate sentence form": "正しい文の形を選びましょう",
    "To Be vs Active Verb Map": "To Be（be動詞）と一般動詞のマップ",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "To Be（be動詞）は形容詞、名詞・場所、Verb-ing、または受動態の Verb 3 とだけ使います。動詞の原形（Verb 1）をそのまま続けることは絶対にありません",
    "Subject + Verb 1": "主語 + Verb 1",
    "Direct active verb, no To Be": "To Be を使わない直接の一般動詞",
    "To Be + Adj/Noun": "To Be + 形容詞／名詞",
    "State, trait, role, or location": "状態、特徴、役割、または場所",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "今まさに起きている動作",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "受動態（〜される）",
    "Subject": "主語",
    "Key Connector": "重要なつなぎ言葉",
    "Main Verb / Core": "主動詞／核",
    "Object / Complement": "目的語／補語",
    "Details": "詳細",
    "Build the Sentence": "文を組み立てる",
    "Block": "ブロック",
    "Key pattern slot": "重要パターンの枠",
    "Photo vs Action Video": "写真 vs 動きの動画",
    "PHOTO MODE": "写真モード",
    "Focuses on state, trait, or condition": "状態、特徴、または状況に注目します",
    "VIDEO MODE": "動画モード",
    "Focuses on action, movement, or habit": "動作、動き、または習慣に注目します",
    "Pattern Block Puzzle": "パターンブロックパズル",
    "Snap the colored blocks left to right into a natural sentence.": "色付きブロックを左から右へ並べて、自然な文を作りましょう。",
    "0 Start": "0 スタート",
    "1 Concept": "1 コンセプト",
    "2 Sketch": "2 スケッチ",
    "3 Breakdown": "3 分解",
    "4 Practice": "4つの練習",
    "Question Topic": "問題のトピック",
    "Key Takeaways": "重要ポイント",
    "Contextual Practice": "文脈に沿った練習",
    "States, traits, roles, or places": "状態・性質・役割・場所",
    "Core Pattern": "基本パターン",
    "Verb / Key": "動詞 / キーワード",
    "Complement": "補語",
    "✦ Learning Board": "✦ 学習ボード",
    "Board Active": "ボード表示中",
    "⤢ Open": "⤢ 開く",
    "Minimize Board (See Mochi & Keep Talking)": "ボードを最小化（Mochiを見ながら会話を続ける）",
    "Close & Continue Talking": "閉じて会話を続ける",
    "Preparing learning board...": "学習ボードを準備しています...",
    "Building visual explanations and tailored practice for you": "あなたに合わせた視覚的な解説と練習問題を作成しています",
    "💡 Key Point:": "💡 ポイント：",
    "Sentence Pattern": "文型",
    "Choice": "選択問題",
    "Fill in Blank": "穴埋め問題",
    "Word Order": "語順並べ替え",
    "New Question": "新しい問題",
    "Switch to a fresh practice question": "新しい練習問題に切り替えます",
    "Tap the right word to complete the sentence:": "正しい単語をタップして文を完成させましょう：",
    "That word does not fit yet. Try another option!": "その単語はまだしっくりこないようです。別の選択肢を試してみましょう！",
    "Tap tiles below to build the sentence...": "下のタイルをタップして文を組み立ててください...",
    "Close ✕": "閉じる ✕",
    "× Unnatural / Avoid": "× 不自然 / 避けるべき表現",
    "✓ Natural Form": "✓ 自然な表現",
    "Key Radical": "主な部首",
    "Strokes": "画数",
    "Tone Contour & Pronunciation": "声調の変化と発音",
    "Spot on! This sentence structure is clear and natural.": "完璧です！明快で自然な文構造になっています。",
    "Not quite — check the word order and pattern above and try again.": "もう少しです。上の語順と文型を確認して、もう一度挑戦してみましょう。",
    "Nice work! That word completes the sentence naturally.": "素晴らしいです！その単語で自然な文が完成しました。",
    "Cleanly arranged! Word order is spot on.": "きれいに並べられました！語順が完璧です。",
    "Arrange the tiles below into a natural sentence:": "下のタイルを並べ替えて自然な文を作りましょう："
  },
  "km": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "ដៃគូសំឡេងត្រូវការការតភ្ជាប់អ៊ីនធឺណិតដែលកំពុងដំណើរការ សម្រាប់ការសន្ទនាជាមួយ Fiezel ក្នុងពេលជាក់ស្តែង។",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "កម្មវិធីរុករកបានទប់ស្កាត់ការចាក់ដោយស្វ័យប្រវត្តិ។ សូមចុច \"ចាក់សំឡេង\" ដើម្បីស្តាប់ចម្លើយ។",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "សំឡេង Fiezel កំពុងភ្ជាប់ឡើងវិញ។ ចម្លើយជាអក្សរនៅតែបង្ហាញ—ចុច \"ចាក់សំឡេង\" ដើម្បីព្យាយាមម្តងទៀត។",
    "Student": "សិស្ស",
    "Learning Board": "ក្តារសិក្សា",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "អ្នកនៅតែប្រើទម្រង់អន្ទាក់ \"{trap}\" នៅឡើយ — សូមប្តូរទៅទម្រង់ដែលបានគូសបញ្ជាក់នៅលើក្តារខៀនស។",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "បន្ទាប់ពី \"Did / Didn't / Does\" សូមប្រើកិរិយាសព្ទដើម (V1) ជំនួសឱ្យទម្រង់អតីតកាល \"{verb}\"។",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "កុំដាក់ \"{be}\" នៅមុខកិរិយាសព្ទ \"{verb}\"។ សូមប្រើប្រធាន រួចតាមដោយកិរិយាសព្ទដោយផ្ទាល់។",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "សម្រាប់ចំណុចចាប់ផ្តើមពេលវេលាជាក់លាក់ (ដូចជា 2020 ឬ Monday) សូមប្រើ \"since\" មិនមែន \"for\" ទេ។",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "ជាមួយថ្ងៃក្នុងសប្តាហ៍ (Monday, Friday ជាដើម) សូមប្រើធ្នាក់ \"on\" មិនមែន \"in\" ទេ។",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "\"Despite\" មិនដែលមាន \"of\" នៅពីក្រោយទេ — សូមប្រើ \"despite + noun\" ដោយផ្ទាល់ ឬប្រើ \"in spite of\"។",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "បន្ទាប់ពីកិរិយាសព្ទជំនួយ (should/must/can) សូមប្រើកិរិយាសព្ទដើមដោយផ្ទាល់ ដោយមិនមាន \"to\" ឡើយ។",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "សូមបង្កើតប្រយោគពេញលេញដែលមានយ៉ាងហោចណាស់ 3 ពាក្យ (ប្រធាន + កិរិយាសព្ទ + បំពេញន័យ) ដើម្បីសាកល្បងទម្រង់នេះ។",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "\"ますでした\" គឺខុសវេយ្យាករណ៍ — សូមបំប្លែង ます ដោយផ្ទាល់ទៅជា ました សម្រាប់អតីតកាល។",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "កិរិយាសព្ទទម្រង់វចនានុក្រមធម្មតា មិនអាចភ្ជាប់ជាមួយ です ដោយផ្ទាល់បានទេ — សូមប្រើទម្រង់គួរសម 〜ます / 〜ました។",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "សម្រាប់ទីតាំងដែលសកម្មភាពកើតឡើង (រៀន/ផឹក) សូមប្រើពាក្យជំនួយ で ជំនួសឱ្យ に។",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "សូមសរសេរប្រយោគពេញលេញជាអក្សរជប៉ុន (Hiragana/Kanji) តាមទម្រង់នេះ។",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "ដើម្បីបង្ហាញពីសកម្មភាពដែលកំពុងបន្ត សូមប្រើ 正在 ឬ 在 នៅមុខកិរិយាសព្ទ ជំនួសឱ្យ 是។",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "នៅក្នុងភាសាចិនកុកងឺ កន្សោមពេលវេលា (ដូចជា 现在 / 昨天) ត្រូវតែដាក់នៅមុខកិរិយាសព្ទ។",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "សូមសរសេរប្រយោគពេញលេញជាអក្សរចិន (Hanzi) ដែលត្រូវនឹងទម្រង់នេះ។",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "ល្អណាស់! រចនាសម្ព័ន្ធប្រយោគ និងវេយ្យាករណ៍របស់អ្នកត្រូវតាមទម្រង់យ៉ាងត្រឹមត្រូវ។ ចុច \"បន្តសន្ទនា\" ដើម្បីត្រឡប់ទៅការសន្ទនាវិញ។",
    "Not quite right yet. Review the meaning and structure above and try again.": "មិនទាន់ត្រឹមត្រូវទាំងស្រុងនៅឡើយទេ។ សូមពិនិត្យអត្ថន័យ និងរចនាសម្ព័ន្ធខាងលើឡើងវិញ រួចសាកល្បងម្តងទៀត។",
    "Check your word order and verb form against the formula blocks above.": "សូមពិនិត្យលំដាប់ពាក្យ និងទម្រង់កិរិយាសព្ទរបស់អ្នក ធៀបនឹងប្លុករូបមន្តខាងលើ។",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "មីក្រូហ្វូនមិនដំណើរការ ឬត្រូវបានបិទខ្ទប់ដោយកម្មវិធីរុករក។ ចុចប៊ូតុងនិយាយ ដើម្បីអនុញ្ញាតឱ្យប្រើមីក្រូហ្វូន ឬវាយប្រយោគរបស់អ្នកខាងក្រោម។",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "មុខងារស្គាល់សំឡេងត្រូវការការភ្ជាប់អ៊ីនធឺណិត។ សូមសាកល្បងនិយាយម្តងទៀត ឬវាយប្រយោគរបស់អ្នក។",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "សិទ្ធិប្រើប្រាស់មីក្រូហ្វូនត្រូវបានបិទខ្ទប់ដោយកម្មវិធីរុករក។ សូមអនុញ្ញាតការចូលប្រើមីក្រូហ្វូននៅក្នុងរបារអាសយដ្ឋាន ឬវាយប្រយោគរបស់អ្នកខាងក្រោម។",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "កម្មវិធីរុករកនេះមិនទាន់គាំទ្រការស្គាល់សំឡេងដោយស្វ័យប្រវត្តិនៅឡើយទេ។ សូមវាយប្រយោគរបស់អ្នកខាងក្រោម ឬជ្រើសរើសចម្លើយណែនាំខាងលើ។",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "សិទ្ធិប្រើប្រាស់មីក្រូហ្វូនមិនទាន់ត្រូវបានបើកនៅក្នុងកម្មវិធីរុករកនេះទេ។ សូមវាយប្រយោគរបស់អ្នក ឬជ្រើសរើសកាតចម្លើយណែនាំខាងលើ។",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "មិនទាន់រកឃើញសំឡេងនិយាយនៅឡើយទេ។ សូមប្រាកដថាមីក្រូហ្វូនរបស់អ្នកដំណើរការ និងនិយាយឱ្យបានច្បាស់ ឬវាយអក្សរក្នុងប្រអប់ខាងក្រោម។",
    "Switching cleanly to a fresh voice channel...": "កំពុងប្តូរទៅកាន់បណ្តាញសំឡេងថ្មីយ៉ាងរលូន...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "មិនទាន់មានសំឡេង Fiezel ចាក់នៅឡើយទេ ចំណាយ 0 Gems (សមតុល្យ និងកូតារក្សាទុកសុវត្ថិភាព)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "ការហៅទូរសព្ទត្រូវបានបញ្ចប់៖ ការឆ្លើយតបសំឡេង Fiezel ចំនួន {turns} ដង កូតាឥតគិតថ្លៃប្រចាំថ្ងៃ (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "ការហៅទូរសព្ទត្រូវបានបញ្ចប់៖ ការឆ្លើយតបសំឡេង Fiezel ចំនួន {turns} ដង បានប្រើ {gems} 💎 តាមកូតាសំឡេង",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI - គ្រូបង្វឹកប្រឡងផ្នែកកែច្នៃអាហារ",
    "SSW Mode": "របៀប SSW",
    "Session conversation guide": "មគ្គុទ្ទេសក៍សន្ទនាសម្រាប់វគ្គនេះ",
    "Open SSW Tactical Board": "បើកផ្ទាំងយុទ្ធសាស្ត្រ SSW",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI - គ្រូបង្វឹកប្រឡងផ្នែកកែច្នៃអាហារ (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "សៀវភៅណែនាំផ្លូវការ OTAFF ៩១ ទំព័រ + ២៦៦ Kotoba + លំហាត់ CBT ៥៨",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "អស្ចារ្យណាស់! ចំណុចនោះត្រូវបានរក្សាទុកក្នុងកំណត់ត្រា SSW របស់អ្នកហើយ។ ត្រៀមខ្លួនរួចរាល់ដើម្បីបន្តជំហានបន្ទាប់នៅលើទំព័រនេះហើយឬនៅ?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "ល្អណាស់ អ្នកយល់ហើយ! ឥឡូវនេះសូមត្រឡប់ទៅភាសាគោលដៅវិញ — សាកល្បងបង្កើតប្រយោគមួយដោយខ្លួនឯង!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "អ្នកត្រូវការយ៉ាងហោចណាស់ {gems} Gems សម្រាប់ការឆ្លើយតបសំឡេង {brand} ដំបូង (សមតុល្យបច្ចុប្បន្ន៖ {balance} 💎)។",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "បំពេញលំហាត់កម្រងសំណួរដើម្បីប្រមូល Gems ឥតគិតថ្លៃ ឬរង់ចាំកូតាឥតគិតថ្លៃប្រចាំថ្ងៃនៅថ្ងៃស្អែក!",
    "1 · Ask Details": "1 · សួរព័ត៌មានលម្អិត",
    "2 · Tips & Example": "2 · គន្លឹះ និងឧទាហរណ៍",
    "3 · Test Me": "3 · សាកល្បងខ្ញុំ",
    "Check Progress & Stage 1": "ពិនិត្យវឌ្ឍនភាព និងដំណាក់កាលទី ១",
    "Sensei, check my SSW progress and where to start from zero!": "Sensei សូមជួយពិនិត្យវឌ្ឍនភាព SSW របស់ខ្ញុំ និងកន្លែងដែលគួរចាប់ផ្តើមពីសូន្យ!",
    "Allergen Update Apr 2026": "បច្ចុប្បន្នភាពសារធាតុបង្កអាលែហ្សី មេសា ២០២៦",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "ពន្យល់ពីបច្ចុប្បន្នភាពសារធាតុបង្កអាលែហ្សី OTAFF Ver 5.1 ខែមេសា ២០២៦៖ Walnut (Kurumi), គ្រាប់ស្វាយចន្ទី (Cashew Nut) និងគ្រាប់ភីស្តាស្យូ (Pistachio)!",
    "Chlorine Math Drill": "លំហាត់គណនាក្លរីន",
    "Give me 1 chlorine dilution or budomari calculation question now!": "ផ្តល់ឱ្យខ្ញុំនូវសំណួរគណនាការពង្រាវក្លរីន ឬការគណនា budomari ចំនួន ១ ឥឡូវនេះ!",
    "Yukkuri Traps": "អន្ទាក់ Yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "ពន្យល់ពីអន្ទាក់ល្បឿន yukkuri និងពាក្យ hokang sampuru នៅក្នុងមេរៀន!",
    "Hide SSW Sensei quick actions": "លាក់សកម្មភាពរហ័ស SSW Sensei",
    "Show SSW Sensei quick actions": "បង្ហាញសកម្មភាពរហ័ស SSW Sensei",
    "Actions & Ask Sensei": "សកម្មភាព និងសួរ Sensei",
    "[Study Focus]:": "[ចំណុចផ្តោតការសិក្សា]៖",
    "{m}m {s}s": "{m}នាទី {s}វិនាទី",
    "Fluency & Grammar Accuracy Trend": "និន្នាការភាពស្ទាត់ជំនាញ និងភាពត្រឹមត្រូវនៃវេយ្យាករណ៍",
    "Based on {turns} verified speaking turns": "ផ្អែកលើវេននិយាយដែលបានផ្ទៀងផ្ទាត់ចំនួន {turns} ដង",
    "Page {page}": "ទំព័រ {page}",
    "Page": "ទំព័រ",
    "Page {page} · Step {step} of {total}": "ទំព័រ {page} · ជំហានទី {step} នៃ {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "ការអនុវត្ត SSW រហ័សមាននៅក្នុងផ្ទាំងយុទ្ធសាស្ត្រខាងលើ។",
    "Ready to continue lesson": "ត្រៀមខ្លួនបន្តមេរៀន",
    "Great!": "ល្អណាស់!",
    "Need extra explanation": "ត្រូវការការពន្យល់បន្ថែម",
    "Select an active step above.": "សូមជ្រើសរើសជំហានសកម្មខាងលើ។",
    "SSW Food Manufacturing": "SSW ផលិតកម្មអាហារ",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "គន្លឹះសំខាន់សម្រាប់ Describe Image គឺភាពស្ទាត់ជំនាញថេរ។ កុំឈប់សម្រាកយូរជាង ៣ វិនាទីឱ្យសោះ! ថ្លែងប្រយោគតាមរចនាសម្ព័ន្ធ Fiezel ទាំង ៥ ឱ្យបានរលូន ជាមួយនឹងសំនៀងថេរ និងទំនុកចិត្ត។",
    "Choose the CORRECT opening sentence for {title}:": "ជ្រើសរើសប្រយោគបើកឆាកដែលត្រឹមត្រូវសម្រាប់ {title}៖",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "ល្អឥតខ្ចោះ! នេះជារចនាសម្ព័ន្ធប្រយោគបើកឆាកស្តង់ដារដែលទទួលបានពិន្ទុខ្ពស់ គ្របដណ្តប់ទាំង Fluency និង Content។",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "ជៀសវាងការប្រើឃ្លាធម្មតាៗដូចជា \"I see\"! សូមប្រើរចនាបថភាសាសិក្សាស្តង់ដារ។",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "ជៀសវាងពាក្យស្ទាក់ស្ទើរដូចជា \"maybe\"។ សូមនិយាយឱ្យដាច់ណាត់ និងច្បាស់លាស់។",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "ត្រឹមត្រូវបំផុត! \"maximum figure\" គឺជាបន្សំពាក្យសិក្សាដែលត្រូវបានឱ្យតម្លៃខ្ពស់ក្នុងការដាក់ពិន្ទុរបស់ Pearson។",
    "Arrange the standard Pearson Describe Image opening sentence:": "រៀបចំប្រយោគបើកឆាកស្តង់ដាររបស់ Pearson Describe Image តាមលំដាប់៖",
    "Opening sentence ordered accurately!": "ប្រយោគបើកឆាកត្រូវបានរៀបចំតាមលំដាប់ត្រឹមត្រូវហើយ!",
    "Articulate the final syllable clearly.": "បញ្ចេញសំឡេងព្យាង្គចុងក្រោយឱ្យបានច្បាស់លាស់។",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "រក្សាកម្រិតសំឡេងឱ្យថេរតាមឃ្លានីមួយៗ និងឈប់សម្រាកបន្តិច (០.៣ វិនាទី) នៅគ្រប់ចំណុចបំបែក //។",
    "Read the sentence accurately with crisp final consonant articulation.": "អានប្រយោគឱ្យបានត្រឹមត្រូវ ដោយបញ្ចេញសំឡេងព្យញ្ជនៈចុងពាក្យឱ្យបានច្បាស់ដាច់។",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearson ដាក់ពិន្ទុលើចង្វាក់ថេរ ជាជាងល្បឿនលឿន។ សូមឈប់សម្រាកបន្តិចតែត្រង់ចំណុចបំបែកឃ្លា // ប៉ុណ្ណោះ — កុំឈប់កណ្តាលឃ្លាឱ្យសោះ!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "តើកន្លែងឈប់ដកដង្ហើមធម្មជាតិ (ការបែងចែកឃ្លា) នៅត្រង់ណាក្នុងប្រយោគនេះ?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "ត្រឹមត្រូវណាស់! ឈប់សម្រាកឱ្យបានស្អាតរវាងប្រធាននាមស្មុគស្មាញ និងកិរិយាសព្ទសំខាន់។",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "ឈប់ដាច់ៗច្រើនពេកហើយ! ការឈប់ដាច់ៗធ្វើឱ្យពិន្ទុ Oral Fluency ធ្លាក់ចុះ។",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "ការអានដោយគ្មានការឈប់សម្រាកសោះ ធ្វើឱ្យពាក្យចុងក្រោយបាត់បង់ភាពច្បាស់លាស់ និងកម្លាំងដង្ហើម។",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "ត្រឹមត្រូវ! ប្រធានពហុវចនៈ \"studies\" ប្រើជាមួយកិរិយាសព្ទដើម \"demonstrate\"។",
    "Order this academic Read Aloud sentence accurately:": "រៀបចំប្រយោគសិក្សា Read Aloud នេះឱ្យបានត្រឹមត្រូវតាមលំដាប់៖",
    "Perfect! Clean academic phrase grouping.": "ល្អឥតខ្ចោះ! ការផ្គុំឃ្លាសិក្សាមានភាពស្អាតត្រឹមត្រូវ។",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "ល្បឿននិយាយដែលវាស់បាន {wpm} WPM ({pace}) ក្នុងរយៈពេល {sec} វិនាទី{vocal}{reasons}",
    "optimal zone 115-152 WPM": "កម្រិតសមស្រប ១១៥-១៥២ WPM",
    "too fast": "លឿនពេក",
    "too slow": "យឺតពេក",
    " (active vocalization {asec}s, phonation {pct}%). ": "(ការបញ្ចេញសំឡេងសកម្ម {asec} វិនាទី, អត្រាបញ្ចេញសំឡេង {pct}%)។",
    "Steady speech rhythm.": "ចង្វាក់និយាយថេរល្អ។",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "មិនទាន់មានគំរូសំឡេងនិយាយ PTE ត្រូវបានថតក្នុងវគ្គនេះនៅឡើយទេ។ សូមនិយាយចូលមីក្រូហ្វូន ដើម្បីវាស់ភាពស្ទាត់ជំនាញក្នុងការនិយាយ (WPM ការផ្អាក ការរអាក់រអួល និងចង្វាក់និយាយ) ដោយផ្ទាល់។",
    "Pearson PTE Official Scorecard": "តារាងពិន្ទុផ្លូវការរបស់ Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "ការវាយតម្លៃជាក់ស្តែងពីគំរូសំឡេងចុងក្រោយរបស់អ្នក ({src})។ អ្នកសម្រេចបានគោលដៅ PTE 58+ ហើយ។",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "ការវាយតម្លៃជាក់ស្តែងពីគំរូសំឡេងចុងក្រោយរបស់អ្នក ({src})។ សូមផ្តោតលើការនិយាយឃ្លាឱ្យរលូន និងការបញ្ចេញសំឡេងព្យញ្ជនៈចុងឱ្យច្បាស់។",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "សូមថតគំរូសំឡេងនិយាយជាមុនសិន ដើម្បីមើលពិន្ទុ Pearson Concordance (/90) ល្បឿន WPM សមាមាត្រនៃការបញ្ចេញសំឡេងសកម្ម និងទិន្នន័យនៃការផ្អាករបស់អ្នក។",
    "How is \"fluctuations\" pronounced naturally?": "តើពាក្យ \"fluctuations\" ត្រូវបញ្ចេញសំឡេងបែបធម្មជាតិដូចម្តេច?",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (ដោយបញ្ចេញសំឡេង /ʃ/ ឱ្យច្បាស់ក្នុង -tion)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "ត្រឹមត្រូវណាស់! ពាក្យបញ្ចប់ដោយ -tion ត្រូវបញ្ចេញសំឡេងជា /ʃənz/។",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (ការអានតាមតួអក្សរមួយៗ)",
    "Not natural—avoid spelling-based syllable stress.": "មិនទាន់ធម្មជាតិទេ—សូមជៀសវាងការសង្កត់សំឡេងតាមអក្ខរាវិរុទ្ធ។",
    "Right! The noun \"fluency\" fits after steady.": "ត្រឹមត្រូវ! នាម \"fluency\" ស័ក្តិសមប្រើបន្ទាប់ពី steady។",
    "Order the core PTE fluency principle:": "រៀបលំដាប់គោលការណ៍ស្នូលនៃភាពស្ទាត់ជំនាញក្នុងការនិយាយ PTE៖",
    "Exact! Fluency is the key to high scores.": "ត្រឹមត្រូវណាស់! ភាពស្ទាត់ជំនាញគឺជាគន្លឹះដើម្បីទទួលបានពិន្ទុខ្ពស់។",
    "Listen": "ស្តាប់",
    "Learning Session": "វគ្គសិក្សា",
    "Concept A": "គំនិត A",
    "Concept B": "គំនិត B",
    "Concept Balance Diagram": "ដ្យាក្រាមតុល្យភាពគំនិត",
    "Comparing...": "កំពុងប្រៀបធៀប...",
    "Sentence Pattern Flow": "លំហូរទម្រង់ប្រយោគ",
    "Building flow...": "កំពុងបង្កើតលំហូរ...",
    "Zoom": "ពង្រីក",
    "STROKES": "ចំនួនគំនូស",
    "Stroke": "គំនូស",
    "Loading strokes...": "កំពុងផ្ទុកគំនូស...",
    "Show / hide trace guidelines": "បង្ហាញ / លាក់បន្ទាត់ណែនាំសម្រាប់គូរតាម",
    "👁 Hide Trace": "👁 លាក់គំនូសតាម",
    "👁 Trace": "👁 គូរតាម",
    "▶ Follow Tutor": "▶ ធ្វើតាមគ្រូបង្រៀន",
    "Click to view stroke {num}": "ចុចដើម្បីមើលគំនូសទី {num}",
    "Topic Visual Sketch": "គំនូរព្រាងបង្ហាញប្រធានបទ",
    "Drawing...": "កំពុងគូរ...",
    "Zoom in to inspect details": "ពង្រីកដើម្បីពិនិត្យមើលព័ត៌មានលម្អិត",
    "Up next": "បន្ទាប់",
    "Tutor Writing...": "គ្រូបង្រៀនកំពុងសរសេរ...",
    "Quick Check Practice": "លំហាត់ពិនិត្យរហ័ស",
    "Tutor is writing on the board...": "គ្រូបង្រៀនកំពុងសរសេរលើក្តារខៀន...",
    "Zoom Out Transition": "ការផ្លាស់ប្តូរបង្រួមចេញ",
    "Focus Zoom": "ពង្រីកផ្តោតចំណុច",
    "Focus Ready": "រួចរាល់សម្រាប់ការផ្តោត",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ មុខងារប៊ិចកំពុងដំណើរការ — គូសរង្វង់លើផ្នែកណាមួយដើម្បីសួរ",
    "Clear": "សម្អាត",
    "Start from Scratch": "ចាប់ផ្តើមពីដំបូង",
    "In Progress": "កំពុងដំណើរការ",
    "Pages:": "ទំព័រ៖",
    "Pg": "ទំព័រ",
    "Vocab:": "វាក្យសព្ទ៖",
    "Correct:": "ត្រឹមត្រូវ៖",
    "Loading full material...": "កំពុងផ្ទុកឯកសារពេញលេញ...",
    "Exam Readiness:": "ភាពរួចរាល់សម្រាប់ការប្រឡង៖",
    "Pass": "ជាប់",
    "Pass threshold": "កម្រិតពិន្ទុជាប់",
    "Reset SSW study progress to 0%": "កំណត់វឌ្ឍនភាពសិក្សា SSW ឡើងវិញទៅ 0%",
    "Active Spot": "ចំណុចសកម្ម",
    "Step": "ជំហាន",
    "of": "នៃ",
    "View This Step": "មើលជំហាននេះ",
    "Ask Sensei to Explain": "សួរ Sensei ឱ្យពន្យល់",
    "Study Roadmap": "ផែនទីបង្ហាញផ្លូវសិក្សា",
    "Study Guide": "មគ្គុទ្ទេសក៍សិក្សា",
    "p.": "ទំ.",
    "Practice Quiz": "លំហាត់តេស្តសាកល្បង",
    "START HERE (ZERO BEGINNER)": "ចាប់ផ្តើមនៅទីនេះ (អ្នកទើបចាប់ផ្តើមពីសូន្យ)",
    "CURRENT ACTIVE STAGE": "ដំណាក់កាលសកម្មបច្ចុប្បន្ន",
    "Stage": "ដំណាក់កាល",
    "Open p. {page} & Start": "បើកទំព័រ {page} ហើយចាប់ផ្តើម",
    "Ask Sensei": "សួរ Sensei",
    "Topics That Still Need Review (Click for Practice Quiz):": "ប្រធានបទដែលត្រូវរំលឹកឡើងវិញ (ចុចដើម្បីធ្វើលំហាត់តេស្ត)៖",
    "Done ✓": "រួចរាល់ ✓",
    "Mark Done": "សម្គាល់ថារួចរាល់",
    "Open Page": "បើកទំព័រ",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "សេចក្តីសង្ខេបតួលេខប្រឡងសំខាន់ៗទាំង 13 ដែលត្រូវដឹង (ប៉ះដើម្បីបើក)",
    "Hide": "លាក់",
    "View 13 Numbers": "មើលតួលេខទាំង 13",
    "Pg.": "ទំ.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "ស្វែងរកប្រធានបទ ឬពាក្យគន្លឹះ (ឧ. អាលែកហ្ស៊ី ក្លរីន ទំព័រ 27)...",
    "Show Reading Guide (Furigana)": "បង្ហាញការណែនាំអាន (Furigana)",
    "Hide Reading Guide (Furigana)": "លាក់ការណែនាំអាន (Furigana)",
    "Search Results \"{query}\" ({count} matches)": "លទ្ធផលស្វែងរក \"{query}\" ({count} លទ្ធផលត្រូវគ្នា)",
    "Close Results": "បិទលទ្ធផល",
    "Trap": "អន្ទាក់",
    "Page Completed ✓": "បានបញ្ចប់ទំព័រ ✓",
    "Mark Page Complete": "សម្គាល់ថាបានបញ្ចប់ទំព័រ",
    "Key Takeaway on This Page": "ចំណុចសំខាន់នៅលើទំព័រនេះ",
    "Active": "កំពុងសកម្ម",
    "Understood": "យល់ហើយ",
    "Next Step": "ជំហានបន្ទាប់",
    "Got it, Next Step {step} ->": "យល់ហើយ ជំហានបន្ទាប់ {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "បញ្ចប់ទំព័រ {page} បើកទំព័រ {nextPage} ->",
    "Complete Final Step ✓": "បញ្ចប់ជំហានចុងក្រោយ ✓",
    "Exam Trap Alert:": "ការព្រមានអំពីអន្ទាក់ប្រឡង៖",
    "Exam Calculation Formula:": "រូបមន្តគណនាសម្រាប់ប្រឡង៖",
    "Video Notes for Page {page}:": "កំណត់ចំណាំវីដេអូសម្រាប់ទំព័រ {page}៖",
    "Matching Vocabulary ({count})": "វាក្យសព្ទដែលត្រូវគ្នា ({count})",
    "Key Vocabulary on Page {page} ({count})": "វាក្យសព្ទសំខាន់ៗនៅលើទំព័រ {page} ({count})",
    "Mastered ✓": "ស្ទាត់ជំនាញហើយ ✓",
    "Mark Mastered": "សម្គាល់ថាស្ទាត់ជំនាញ",
    "Exam Case Quiz": "លំហាត់សំណួរករណីប្រឡង",
    "Calculation Drill": "លំហាត់គណនា",
    "Exam Trap Quiz": "លំហាត់អន្ទាក់ប្រឡង",
    "Vocab Drill": "លំហាត់វាក្យសព្ទ",
    "Hide 5 Formulas": "លាក់រូបមន្តទាំង ៥",
    "Open 5 Calculation Formulas": "បើករូបមន្តគណនាទាំង ៥",
    "Question": "សំណួរ",
    "Tryout p.": "សាកល្បង ទំ.",
    "Review p.": "រំលឹកឡើងវិញ ទំ.",
    "View Explanation on p. {page}": "មើលការពន្យល់នៅទំព័រ {page}",
    "Next Question ->": "សំណួរបន្ទាប់ ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "តើអ្នករួចរាល់ដើម្បីសាកល្បងលំហាត់អនុវត្ត SSW កែច្នៃម្ហូបអាហារហើយឬនៅ?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "ជ្រើសរើសប្រភេទលំហាត់ខាងលើ ឬសួរ Sensei តាមរយៈសំឡេង។ សំណួរនីមួយៗមានភ្ជាប់ការពន្យល់ច្បាស់លាស់ និងលេខទំព័រមេរៀនយោង។",
    "Start 1 Question Now": "ចាប់ផ្តើម ១ សំណួរឥឡូវនេះ",
    "Enlarge diagram for a closer view": "ពង្រីកដ្យាក្រាមដើម្បីមើលឱ្យកាន់តែច្បាស់",
    "TRIGGER / SUBJECT": "កត្តាជំរុញ / ប្រធាន",
    "PAIR!": "គូត្រូវគ្នា!",
    "MATCHING FORM": "ទម្រង់ដែលត្រូវគ្នា",
    "Lead Car": "ទូនាំមុខ",
    "Right Link": "តំណភ្ជាប់ត្រឹមត្រូវ",
    "Check Context": "ពិនិត្យបរិបទ",
    "Safe to Use": "ប្រើបានដោយសុវត្ថិភាព",
    "SNAPSHOT": "រូបភាពសង្ខេប",
    "RULE 1": "ក្បួនទី ១",
    "Core Form": "ទម្រង់គោល",
    "ACTION VIDEO": "វីដេអូសកម្មភាព",
    "RULE 2": "ក្បួនទី ២",
    "Contrast Form": "ទម្រង់ផ្ទុយ",
    "CONCEPT 1": "គោលគំនិតទី ១",
    "🔎 Focus": "🔎 ផ្តោតសំខាន់",
    "CONCEPT 2": "គោលគំនិតទី ២",
    "Core Concept": "គោលគំនិតស្នូល",
    "Sentence Pattern Blocks": "ប្លុកទម្រង់ប្រយោគ",
    "Arranging blocks...": "កំពុងរៀបចំប្លុក...",
    "Whiteboard Visual Detail": "ព័ត៌មានលម្អិតលើក្តារខៀនស",
    "Zoom Out": "បង្រួម",
    "Zoom In": "ពង្រីក",
    "inaccurate grammar pattern": "ទម្រង់វេយ្យាករណ៍មិនត្រឹមត្រូវ",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "ការសន្ទនាជីវិតនៅជប៉ុនរបស់ FIEZEL ({level})៖ {topic}",
    "Real-Life Communication: {topic}": "ការទំនាក់ទំនងក្នុងជីវិតពិត៖ {topic}",
    "Use the situational Japanese sentence pattern naturally.": "ប្រើប្រាស់ទម្រង់ប្រយោគភាសាជប៉ុនតាមស្ថានភាពឱ្យបានធម្មជាតិ។",
    "Deliver clear pronunciation and polite phrasing smoothly.": "បញ្ចេញសំឡេងឱ្យច្បាស់ និងប្រើពាក្យសម្តីគួរសមឱ្យបានរលូន។",
    "IELTS Speaking: {topic}": "IELTS Speaking៖ {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "ការសាកល្បង IELTS Speaking ផ្លូវការរបស់ Cambridge (Part 2 Cue Card និង Part 3 Discussion)៖ {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "ឥឡូវនេះ នៅក្នុងផ្នែកទី ២ ខ្ញុំនឹងផ្តល់ប្រធានបទមួយដល់អ្នក។ អ្នកមានពេល ១ នាទីដើម្បីគិតអំពីអ្វីដែលអ្នកនឹងនិយាយ៖ {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "និយាយឱ្យមានទំនាក់ទំនងល្អរយៈពេល ១–២ នាទី ដោយគ្របដណ្តប់គ្រប់ចំណុចលើកាតសំណួរ។",
    "Use academic discourse markers cleanly and naturally.": "ប្រើពាក្យតភ្ជាប់គំនិតបែបផ្លូវការឱ្យបានច្បាស់លាស់ និងធម្មជាតិ។",
    "Level A1 · Beginner": "កម្រិត A1 · ចាប់ផ្តើមដំបូង",
    "Level A2 · Everyday Conversation": "កម្រិត A2 · ការសន្ទនាប្រចាំថ្ងៃ",
    "🎯 Best Answer ({level})": "🎯 ចម្លើយល្អបំផុត ({level})",
    "Short & Easy": "ខ្លី និងងាយស្រួល",
    "Natural & Contextual": "ធម្មជាតិ និងត្រូវតាមបរិបទ",
    "Reply + Follow-up": "ឆ្លើយតប + សួរបន្ត",
    "🎯 Best Answer (Level {level})": "🎯 ចម្លើយល្អបំផុត (កម្រិត {level})",
    "Part": "ផ្នែក",
    "First on the left, {title}: {subtitle}{ex}": "ដំបូងនៅខាងឆ្វេង {title}៖ {subtitle}{ex}",
    "focus on the core rule": "ផ្តោតលើក្បួនស្នូល",
    ". Example: {example}": "។ ឧទាហរណ៍៖ {example}",
    "Second on the right, {title}: {subtitle}{ex}": "ទីពីរនៅខាងស្តាំ {title}៖ {subtitle}{ex}",
    "compare with this form": "ប្រៀបធៀបជាមួយទម្រង់នេះ",
    "Key idea": "គំនិតសំខាន់",
    "Branch {num}, {label}{sub}{ex}": "សាខាទី {num}៖ {label}{sub}{ex}",
    ", meaning {sublabel}": "ដែលមានន័យថា {sublabel}",
    ", for example {example}": "ឧទាហរណ៍ {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "តោះមើលផែនទីគំនិតសម្រាប់ {topic} ម្ដងមួយៗ។ {detail}។",
    ", e.g. {example}": "ឧ. {example}",
    ". Then ": "។ បន្ទាប់មក",
    "Follow the timeline from left to right. {stops}.": "តាមដានបន្ទាត់ពេលវេលាពីឆ្វេងទៅស្តាំ។ {stops}។",
    "Block {num}, {role}, contains {token}{note}": "ប្លុកទី {num} ({role}) មាន {token}{note}",
    ", used for {note}": "ដែលប្រើសម្រាប់ {note}",
    "Notice the pattern blocks from left to right. {detail}.": "សង្កេតមើលប្លុកទម្រង់ពីឆ្វេងទៅស្តាំ។ {detail}។",
    " Starting from {parts}.": "ចាប់ផ្តើមពី {parts}។",
    ", then ": "បន្ទាប់មក",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "មើលឱ្យច្បាស់លើដ្យាក្រាម {topic} នៅលើក្តារខៀន។{cap}{visualCue}",
    "Primary form": "ទម្រង់គោល",
    "Comparison form": "ទម្រង់ប្រៀបធៀប",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "ប្រៀបធៀបទាំងសងខាង៖ {sideA} ទល់នឹង {sideB}។{insight}",
    " Key insight: {insight}.": "ចំណុចសំខាន់៖ {insight}។",
    "{role}: {word}": "{role}៖ {word}",
    ", followed by ": "បន្តដោយ",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "តាមដានប្លុកប្រយោគពីឆ្វេងទៅស្តាំ៖ {chain}។{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "ពិនិត្យរចនាសម្ព័ន្ធប្រយោគសម្រាប់ {topic}៖ {detail}។",
    "place each clause element in its proper slot": "ដាក់ធាតុផ្សំនីមួយៗនៃប្រយោគទៅក្នុងប្រអប់ត្រឹមត្រូវរបស់វា",
    ". Next: ": "។ បន្ទាប់៖",
    "Examples on the board": "ឧទាហរណ៍នៅលើក្តារខៀន",
    "Review the examples in this table": "ពិនិត្យមើលឧទាហរណ៍ក្នុងតារាងនេះ",
    "Reason:": "មូលហេតុ៖",
    "Avoid forms like {wrong}. Use {right}.{why}": "ជៀសវាងទម្រង់ដូចជា {wrong}។ ប្រើ {right}។{why}",
    "the common mistake": "កំហុសទូទៅ",
    "Remember this key point:": "ចងចាំចំណុចសំខាន់នេះ៖",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "មើលខ្សែកោងកម្រិតសំឡេងសម្រាប់ {word} ហើយតាមដានខ្សែពណ៌ខៀវពេលអ្នកបញ្ចេញសំឡេង {reading}។",
    "Now try this quick check: {prompt}.": "ឥឡូវសាកល្បងការត្រួតពិនិត្យរហ័សនេះ៖ {prompt}។",
    "choose the accurate sentence form": "ជ្រើសរើសទម្រង់ប្រយោគដែលត្រឹមត្រូវ",
    "To Be vs Active Verb Map": "ផែនទី To Be ទល់នឹង Active Verb",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "ប្រើ To Be តែជាមួយគុណនាម (Adjectives) នាម/ទីតាំង (Nouns/Locations) Verb-ing ឬ Passive Verb 3 ប៉ុណ្ណោះ — កុំប្រើជាមួយ Verb 1 ទទេឱ្យសោះ",
    "Subject + Verb 1": "ប្រធាន (Subject) + Verb 1",
    "Direct active verb, no To Be": "កិរិយាសព្ទសកម្មផ្ទាល់ គ្មាន To Be",
    "To Be + Adj/Noun": "To Be + គុណនាម/នាម (Adj/Noun)",
    "State, trait, role, or location": "ស្ថានភាព លក្ខណៈ តួនាទី ឬទីតាំង",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "សកម្មភាពកំពុងកើតឡើងឥឡូវនេះ",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "ទម្រង់កម្មវាចក (Passive voice)",
    "Subject": "ប្រធាន (Subject)",
    "Key Connector": "ពាក្យភ្ជាប់សំខាន់",
    "Main Verb / Core": "កិរិយាសព្ទគោល / ស្នូល",
    "Object / Complement": "កម្មបទ / ពាក្យបំពេញន័យ",
    "Details": "ព័ត៌មានលម្អិត",
    "Build the Sentence": "បង្កើតប្រយោគ",
    "Block": "ប្លុក",
    "Key pattern slot": "ប្រអប់ទម្រង់សំខាន់",
    "Photo vs Action Video": "រូបថត ទល់នឹង វីដេអូសកម្មភាព",
    "PHOTO MODE": "ម៉ូដរូបថត",
    "Focuses on state, trait, or condition": "ផ្តោតលើស្ថានភាព លក្ខណៈ ឬលក្ខខណ្ឌ",
    "VIDEO MODE": "ម៉ូដវីដេអូ",
    "Focuses on action, movement, or habit": "ផ្តោតលើសកម្មភាព ចលនា ឬទម្លាប់",
    "Pattern Block Puzzle": "ល្បែងផ្គុំប្លុកទម្រង់",
    "Snap the colored blocks left to right into a natural sentence.": "រៀបប្លុកពណ៌ពីឆ្វេងទៅស្តាំឱ្យទៅជាប្រយោគធម្មជាតិ។",
    "0 Start": "0 ចាប់ផ្តើម",
    "1 Concept": "1 គំនិត",
    "2 Sketch": "2 គំនូរព្រាង",
    "3 Breakdown": "3 ការបំបែក",
    "4 Practice": "4 អនុវត្ត",
    "Question Topic": "ប្រធានបទសំណួរ",
    "Key Takeaways": "ចំណុចសំខាន់ៗ",
    "Contextual Practice": "ការអនុវត្តតាមបរិបទ",
    "States, traits, roles, or places": "ស្ថានភាព លក្ខណៈ តួនាទី ឬទីកន្លែង",
    "Core Pattern": "ទម្រង់ស្នូល",
    "Verb / Key": "កិរិយាសព្ទ / ពាក្យគន្លឹះ",
    "Complement": "ពាក្យបំពេញន័យ",
    "✦ Learning Board": "✦ ក្តារសិក្សា",
    "Board Active": "ក្តារសិក្សាកំពុងដំណើរការ",
    "⤢ Open": "⤢ បើក",
    "Minimize Board (See Mochi & Keep Talking)": "បង្រួមក្តារ (មើល Mochi និងបន្តនិយាយ)",
    "Close & Continue Talking": "បិទ និងបន្តនិយាយ",
    "Preparing learning board...": "កំពុងរៀបចំក្តារសិក្សា...",
    "Building visual explanations and tailored practice for you": "កំពុងរៀបចំការពន្យល់ជាមួយរូបភាព និងលំហាត់ដែលសមស្របសម្រាប់អ្នក",
    "💡 Key Point:": "💡 ចំណុចសំខាន់៖",
    "Sentence Pattern": "ទម្រង់ប្រយោគ",
    "Choice": "ជម្រើស",
    "Fill in Blank": "បំពេញចន្លោះ",
    "Word Order": "លំដាប់ពាក្យ",
    "New Question": "សំណួរថ្មី",
    "Switch to a fresh practice question": "ប្តូរទៅសំណួរអនុវត្តថ្មី",
    "Tap the right word to complete the sentence:": "ចុចលើពាក្យត្រឹមត្រូវដើម្បីបំពេញប្រយោគ៖",
    "That word does not fit yet. Try another option!": "ពាក្យនោះមិនទាន់សមស្របទេ។ សាកល្បងជម្រើសផ្សេងទៀត!",
    "Tap tiles below to build the sentence...": "ចុចលើបន្ទះពាក្យខាងក្រោមដើម្បីបង្កើតប្រយោគ...",
    "Close ✕": "បិទ ✕",
    "× Unnatural / Avoid": "× មិនធម្មជាតិ / គួរចៀសវាង",
    "✓ Natural Form": "✓ ទម្រង់ធម្មជាតិ",
    "Key Radical": "រ៉ាឌីកាល់សំខាន់",
    "Strokes": "ចំនួនគំនូស",
    "Tone Contour & Pronunciation": "សំនៀងឡើងចុះ និងការបញ្ចេញសំឡេង",
    "Spot on! This sentence structure is clear and natural.": "ត្រឹមត្រូវឥតខ្ចោះ! រចនាសម្ព័ន្ធប្រយោគនេះច្បាស់លាស់ និងមានលក្ខណៈធម្មជាតិ។",
    "Not quite — check the word order and pattern above and try again.": "មិនទាន់ត្រូវទេ — សូមពិនិត្យលំដាប់ពាក្យ និងទម្រង់ប្រយោគខាងលើ រួចសាកល្បងម្តងទៀត។",
    "Nice work! That word completes the sentence naturally.": "ល្អណាស់! ពាក្យនោះបំពេញប្រយោគបានយ៉ាងធម្មជាតិ។",
    "Cleanly arranged! Word order is spot on.": "រៀបបានស្អាតណាស់! លំដាប់ពាក្យត្រឹមត្រូវឥតខ្ចោះ។",
    "Arrange the tiles below into a natural sentence:": "រៀបបន្ទះពាក្យខាងក្រោមឱ្យក្លាយជាប្រយោគធម្មជាតិ៖"
  },
  "ru": {
    "Voice Partner requires an active internet connection for real-time Fiezel conversation.": "Для голосового собеседника требуется активное подключение к интернету для общения в реальном времени в Fiezel.",
    "Browser blocked autoplay. Tap \"Play Voice\" to hear the reply.": "Браузер заблокировал автовоспроизведение. Нажмите «Воспроизвести голос», чтобы услышать ответ.",
    "Fiezel voice is reconnecting. Text reply stays visible—tap \"Play Voice\" to retry.": "Голос Fiezel переподключается. Текстовый ответ остаётся на экране — нажмите «Воспроизвести голос», чтобы повторить попытку.",
    "Student": "Ученик",
    "Learning Board": "Учебная доска",
    "You are still using the trap form \"{trap}\" — switch to the highlighted form on the whiteboard.": "Вы всё ещё используете форму-ловушку «{trap}» — переключитесь на выделенную форму на доске.",
    "After \"Did / Didn't / Does\", use the base verb (V1) instead of past tense \"{verb}\".": "После \"Did / Didn't / Does\" используйте базовую форму глагола (V1) вместо формы прошедшего времени «{verb}».",
    "Do not place \"{be}\" before the verb \"{verb}\". Use the subject directly followed by the verb.": "Не ставьте «{be}» перед глаголом «{verb}». Используйте подлежащее сразу с глаголом.",
    "For a specific starting point in time (like 2020 or Monday), use \"since\", not \"for\".": "Для конкретной точки отсчёта времени (например, 2020 год или понедельник) используйте \"since\", а не \"for\".",
    "With days of the week (Monday, Friday, etc.), use the preposition \"on\", not \"in\".": "С днями недели (Monday, Friday и т. д.) используйте предлог \"on\", а не \"in\".",
    "\"Despite\" is never followed by \"of\" — use \"despite + noun\" directly or \"in spite of\".": "После \"Despite\" никогда не ставится \"of\" — используйте напрямую \"despite + noun\" (существительное) или \"in spite of\".",
    "After modal verbs (should/must/can), use the bare verb directly without \"to\".": "После модальных глаголов (should/must/can) используйте чистый инфинитив напрямую без частицы \"to\".",
    "Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.": "Составьте законченное предложение минимум из 3 слов (Подлежащее + Глагол + Дополнение), чтобы проверить модель.",
    "\"ますでした\" is ungrammatical — conjugate ます directly to ました for past tense.": "Форма \"ますでした\" грамматически неверна — для прошедшего времени спрягайте ます напрямую в ました.",
    "Plain dictionary verbs cannot attach です directly — use the polite 〜ます / 〜ました form.": "К простой словарной форме глагола нельзя присоединять です напрямую — используйте вежливую форму 〜ます / 〜ました.",
    "For the location where an action takes place (studying/drinking), use particle で instead of に.": "Для обозначения места совершения действия (учёба/питьё) используйте частицу で вместо に.",
    "Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.": "Напишите полное предложение японской письменностью (хираганой/кандзи), следуя модели.",
    "To express an ongoing action, use 正在 or 在 before the verb instead of 是.": "Чтобы выразить длительное действие в процессе, используйте 正在 или 在 перед глаголом вместо 是.",
    "In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.": "В китайском языке обстоятельства времени (например, 现在 / 昨天) должны ставиться ПЕРЕД глаголом.",
    "Write the full sentence in Chinese characters (Hanzi) matching the pattern.": "Напишите полное предложение китайскими иероглифами (ханьцзы) в соответствии с моделью.",
    "Great job! Your sentence structure and grammar match the pattern cleanly. Tap \"Continue Talking\" to return to the conversation.": "Отличная работа! Структура предложения и грамматика точно соответствуют модели. Нажмите «Продолжить разговор», чтобы вернуться к беседе.",
    "Not quite right yet. Review the meaning and structure above and try again.": "Пока не совсем верно. Проверьте значение и структуру выше и попробуйте снова.",
    "Check your word order and verb form against the formula blocks above.": "Сверьте порядок слов и форму глагола с блоками формулы выше.",
    "Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.": "Микрофон неактивен или заблокирован браузером. Нажмите «Говорить», чтобы разрешить доступ к микрофону, или введите предложение ниже.",
    "Speech recognition needs an internet connection. Try speaking again or type your sentence.": "Для распознавания речи требуется подключение к интернету. Попробуйте сказать ещё раз или введите предложение текстом.",
    "Microphone permission blocked by browser. Allow mic access in your address bar or type your sentence below.": "Доступ к микрофону заблокирован браузером. Разрешите доступ к микрофону в адресной строке или введите предложение ниже.",
    "This browser does not support automatic speech recognition yet. Type your sentence below or choose a suggested reply above.": "Этот браузер пока не поддерживает автоматическое распознавание речи. Введите предложение ниже или выберите предложенный ответ выше.",
    "Microphone permission is not active in this browser. Type your sentence or choose a suggested reply card above.": "Разрешение на использование микрофона в этом браузере не активно. Введите предложение или выберите карточку с предложенным ответом выше.",
    "No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.": "Речь пока не распознана. Убедитесь, что микрофон включён, и говорите чётко, либо введите текст в поле ниже.",
    "Switching cleanly to a fresh voice channel...": "Выполняется плавное переключение на новый голосовой канал...",
    "No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!": "Голос Fiezel ещё не воспроизводился, потрачено 0 Gems (баланс и квота сохранены)!",
    "Call ended: {turns} Fiezel voice replies, Daily Free Quota (0 💎)": "Звонок завершён: {turns} голосовых ответов Fiezel, дневная бесплатная квота (0 💎)",
    "Call ended: {turns} Fiezel voice replies, {gems} 💎 used per voice quota": "Звонок завершён: {turns} голосовых ответов Fiezel, использовано {gems} 💎 по голосовой квоте",
    "SSW SENSEI - Food Processing Exam Mentor": "SSW SENSEI — наставник по экзамену «Пищевая переработка»",
    "SSW Mode": "Режим SSW",
    "Session conversation guide": "Руководство по разговору на сессии",
    "Open SSW Tactical Board": "Открыть тактическую доску SSW",
    "Braincore": "Braincore",
    "SSW SENSEI - Food Processing Exam Mentor (Prometric)": "SSW SENSEI — наставник по экзамену «Пищевая переработка» (Prometric)",
    "91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills": "91-страничное официальное руководство OTAFF + 266 слов (Kotoba) + 58 тренировок CBT",
    "Awesome! That point is saved in your SSW notes. Ready to cover the next step on this page?": "Отлично! Этот пункт сохранён в ваших заметках SSW. Готовы перейти к следующему шагу на этой странице?",
    "Great, you got it! Now let us jump back into the target language — try making one sentence of your own!": "Отлично, вы поняли! А теперь вернёмся к изучаемому языку — попробуйте составить одно собственное предложение!",
    "You need at least {gems} Gems for the first {brand} voice reply (Current balance: {balance} 💎).": "Для первого голосового ответа {brand} требуется минимум {gems} Gems (текущий баланс: {balance} 💎).",
    "Complete quiz exercises to collect free Gems or wait for tomorrow's daily free allowance!": "Выполняйте задания викторины, чтобы заработать бесплатные Gems, или дождитесь завтрашнего дневного лимита!",
    "1 · Ask Details": "1 · Уточнить детали",
    "2 · Tips & Example": "2 · Советы и пример",
    "3 · Test Me": "3 · Проверь меня",
    "Check Progress & Stage 1": "Проверить прогресс и этап 1",
    "Sensei, check my SSW progress and where to start from zero!": "Сэнсэй, проверьте мой прогресс по SSW и подскажите, с чего начать с нуля!",
    "Allergen Update Apr 2026": "Обновление по аллергенам (апр. 2026)",
    "Explain OTAFF Ver 5.1 April 2026 allergen updates: Walnut (Kurumi), Cashew Nut, and Pistachio!": "Объясните обновления по аллергенам в OTAFF версии 5.1 (апрель 2026): грецкий орех (Kurumi), кешью и фисташка!",
    "Chlorine Math Drill": "Расчёт концентрации хлора",
    "Give me 1 chlorine dilution or budomari calculation question now!": "Задайте мне 1 задачу на расчёт разведения хлора или выхода продукции (budomari) прямо сейчас!",
    "Yukkuri Traps": "Ловушки yukkuri",
    "Explain the yukkuri speed trap and hokang sampuru terms in the module!": "Объясните ловушку скорости yukkuri и термины hokang sampuru из этого модуля!",
    "Hide SSW Sensei quick actions": "Скрыть быстрые действия SSW Sensei",
    "Show SSW Sensei quick actions": "Показать быстрые действия SSW Sensei",
    "Actions & Ask Sensei": "Действия и вопрос сэнсэю",
    "[Study Focus]:": "[Фокус обучения]:",
    "{m}m {s}s": "{m}м {s}с",
    "Fluency & Grammar Accuracy Trend": "Динамика беглости речи и точности грамматики",
    "Based on {turns} verified speaking turns": "На основе {turns} проверенных реплик",
    "Page {page}": "Страница {page}",
    "Page": "Страница",
    "Page {page} · Step {step} of {total}": "Страница {page} · Шаг {step} из {total}",
    "Quick SSW practice is available in the Tactical Board panel above.": "Быстрая практика SSW доступна на панели тактической доски выше.",
    "Ready to continue lesson": "Готовы продолжить урок",
    "Great!": "Отлично!",
    "Need extra explanation": "Нужно дополнительное объяснение",
    "Select an active step above.": "Выберите активный шаг выше.",
    "SSW Food Manufacturing": "SSW Пищевое производство",
    "The key to Describe Image is STEADY FLUENCY. Never pause longer than 3 seconds! Deliver the 5 structured Fiezel sentences smoothly with steady, confident intonation.": "Ключ к заданию Describe Image — РОВНАЯ БЕГЛОСТЬ РЕЧИ. Не делайте пауз дольше 3 секунд! Произнесите 5 структурированных предложений Fiezel плавно, со спокойной и уверенной интонацией.",
    "Choose the CORRECT opening sentence for {title}:": "Выберите ПРАВИЛЬНОЕ вступительное предложение для {title}:",
    "Perfect! A standard high-scoring opening structure covering Fluency and Content.": "Прекрасно! Стандартная высокобалльная вступительная конструкция, охватывающая беглость речи и содержание.",
    "Avoid casual phrasing like \"I see\"! Use standard academic register.": "Избегайте разговорных выражений вроде \"I see\"! Используйте стандартный академический стиль.",
    "Avoid hedging words like \"maybe\". Speak decisively and clearly.": "Избегайте слов неуверенности вроде \"maybe\". Говорите чётко и решительно.",
    "Spot on! \"maximum figure\" is an academic collocation valued in Pearson scoring.": "В точку! \"maximum figure\" — академическое словосочетание, высоко ценимое в системе оценивания Pearson.",
    "Arrange the standard Pearson Describe Image opening sentence:": "Составьте стандартное вступительное предложение Pearson Describe Image в правильном порядке:",
    "Opening sentence ordered accurately!": "Вступительное предложение составлено точно!",
    "Articulate the final syllable clearly.": "Чётко произносите последний слог.",
    "Keep steady pitch across each clause and pause briefly (0.3s) at every // boundary.": "Поддерживайте ровный тон на протяжении каждой части предложения и делайте короткую паузу (0,3 с) на каждой границе //.",
    "Read the sentence accurately with crisp final consonant articulation.": "Прочитайте предложение точно, с чёткой артикуляцией конечных согласных.",
    "Pearson scores STEADY RHYTHM rather than speed. Pause briefly only at // phrase breaks—never stop mid-phrase!": "Pearson оценивает РОВНЫЙ РИТМ, а не скорость. Делайте короткую паузу только на границах фраз // — никогда не останавливайтесь в середине фразы!",
    "Where is the NATURAL breath pause (chunking) in this sentence?": "Где в этом предложении находится ЕСТЕСТВЕННАЯ пауза для вдоха (смысловое членение)?",
    "Exact! Pause cleanly between the complex noun subject and the main verb.": "Точно! Делайте аккуратную паузу между сложным подлежащим и основным глаголом.",
    "Too many choppy breaks! Choppy pausing lowers Oral Fluency.": "Слишком много рваных пауз! Прерывистая речь снижает оценку за беглость (Oral Fluency).",
    "Reading with zero pauses makes the final words lose clarity and breath support.": "Чтение вообще без пауз приводит к потере чёткости последних слов и нехватке дыхания.",
    "Correct! Plural subject \"studies\" takes the base verb \"demonstrate\".": "Верно! Подлежащее во множественном числе \"studies\" требует базовой формы глагола \"demonstrate\".",
    "Order this academic Read Aloud sentence accurately:": "Расположите слова этого академического предложения для Read Aloud в правильном порядке:",
    "Perfect! Clean academic phrase grouping.": "Прекрасно! Чёткая академическая группировка фраз.",
    "Measured speech pace {wpm} WPM ({pace}) over {sec}s{vocal}{reasons}": "Измеренный темп речи: {wpm} WPM ({pace}) за {sec} с{vocal}{reasons}",
    "optimal zone 115-152 WPM": "оптимальная зона 115-152 WPM",
    "too fast": "слишком быстро",
    "too slow": "слишком медленно",
    " (active vocalization {asec}s, phonation {pct}%). ": "(активная вокализация {asec} с, фонация {pct}%).",
    "Steady speech rhythm.": "Ровный ритм речи.",
    "No PTE speech sample recorded in this session yet. Speak into the mic to measure Oral Fluency (WPM, pauses, disfluency, & burst rhythm) live.": "В этой сессии ещё не записан образец речи для PTE. Говорите в микрофон, чтобы в реальном времени измерить беглость речи (WPM, паузы, запинки и ритмичность).",
    "Pearson PTE Official Scorecard": "Официальная шкала оценки Pearson PTE",
    "Objective evaluation from your latest sample ({src}). You meet the PTE 58+ target.": "Объективная оценка по вашему последнему образцу ({src}). Вы достигли целевого уровня PTE 58+.",
    "Objective evaluation from your latest sample ({src}). Focus on smooth phrasing and clear final consonants.": "Объективная оценка по вашему последнему образцу ({src}). Сосредоточьтесь на плавности фраз и чёткости конечных согласных.",
    "Record a speech sample first to see your Pearson Concordance (/90), WPM pace, active phonation ratio, and pause telemetry.": "Сначала запишите образец речи, чтобы увидеть соответствие шкале Pearson (/90), темп (WPM), долю активной фонации и телеметрию пауз.",
    "How is \"fluctuations\" pronounced naturally?": "Как естественно произносится слово \"fluctuations\"?",
    "/ˌflʌk.tʃuˈeɪ.ʃənz/ (with crisp /ʃ/ in -tion)": "/ˌflʌk.tʃuˈeɪ.ʃənz/ (с чётким /ʃ/ в -tion)",
    "Exact! The -tion ending is pronounced /ʃənz/.": "Точно! Окончание -tion произносится как /ʃənz/.",
    "/fluk-tu-a-si-on/ (letter-by-letter reading)": "/fluk-tu-a-si-on/ (побуквенное чтение)",
    "Not natural—avoid spelling-based syllable stress.": "Неестественно — избегайте ударения и чтения по написанию.",
    "Right! The noun \"fluency\" fits after steady.": "Верно! Существительное \"fluency\" подходит после steady.",
    "Order the core PTE fluency principle:": "Расставьте по порядку основной принцип беглости речи PTE:",
    "Exact! Fluency is the key to high scores.": "Точно! Беглость речи — ключ к высоким баллам.",
    "Listen": "Слушать",
    "Learning Session": "Учебная сессия",
    "Concept A": "Концепция A",
    "Concept B": "Концепция B",
    "Concept Balance Diagram": "Диаграмма баланса концепций",
    "Comparing...": "Сравнение...",
    "Sentence Pattern Flow": "Схема структуры предложения",
    "Building flow...": "Построение схемы...",
    "Zoom": "Масштаб",
    "STROKES": "ЧЕРТЫ",
    "Stroke": "Черта",
    "Loading strokes...": "Загрузка черт...",
    "Show / hide trace guidelines": "Показать / скрыть направляющие для обводки",
    "👁 Hide Trace": "👁 Скрыть обводку",
    "👁 Trace": "👁 Обводка",
    "▶ Follow Tutor": "▶ Повторять за преподавателем",
    "Click to view stroke {num}": "Нажмите, чтобы посмотреть черту {num}",
    "Topic Visual Sketch": "Визуальный набросок темы",
    "Drawing...": "Рисование...",
    "Zoom in to inspect details": "Приблизьте, чтобы рассмотреть детали",
    "Up next": "Далее",
    "Tutor Writing...": "Преподаватель пишет...",
    "Quick Check Practice": "Быстрая проверка",
    "Tutor is writing on the board...": "Преподаватель пишет на доске...",
    "Zoom Out Transition": "Плавное отдаление",
    "Focus Zoom": "Фокусное приближение",
    "Focus Ready": "Фокус готов",
    "✏️ Pen Mode Active — Circle any part to ask": "✏️ Режим пера активен — обведите любую часть, чтобы спросить",
    "Clear": "Очистить",
    "Start from Scratch": "Начать с нуля",
    "In Progress": "В процессе",
    "Pages:": "Страницы:",
    "Pg": "Стр.",
    "Vocab:": "Словарь:",
    "Correct:": "Верно:",
    "Loading full material...": "Загрузка полного материала...",
    "Exam Readiness:": "Готовность к экзамену:",
    "Pass": "Сдано",
    "Pass threshold": "Проходной порог",
    "Reset SSW study progress to 0%": "Сбросить прогресс изучения SSW до 0%",
    "Active Spot": "Активная область",
    "Step": "Шаг",
    "of": "из",
    "View This Step": "Посмотреть этот шаг",
    "Ask Sensei to Explain": "Попросить сэнсэя объяснить",
    "Study Roadmap": "План обучения",
    "Study Guide": "Учебное пособие",
    "p.": "с.",
    "Practice Quiz": "Тренировочный тест",
    "START HERE (ZERO BEGINNER)": "НАЧНИТЕ ЗДЕСЬ (С НУЛЯ)",
    "CURRENT ACTIVE STAGE": "ТЕКУЩИЙ АКТИВНЫЙ ЭТАП",
    "Stage": "Этап",
    "Open p. {page} & Start": "Открыть стр. {page} и начать",
    "Ask Sensei": "Спросить сэнсэя",
    "Topics That Still Need Review (Click for Practice Quiz):": "Темы, которые ещё нужно повторить (нажмите для тренировочного теста):",
    "Done ✓": "Готово ✓",
    "Mark Done": "Отметить выполненным",
    "Open Page": "Открыть страницу",
    "13 Must-Know Exam Numbers Summary (Tap to Open)": "Сводка 13 ключевых цифр для экзамена (нажмите, чтобы открыть)",
    "Hide": "Скрыть",
    "View 13 Numbers": "Посмотреть 13 цифр",
    "Pg.": "Стр.",
    "Search topic or keyword (e.g., allergy, chlorine, page 27)...": "Поиск темы или ключевого слова (напр., аллергия, хлор, страница 27)...",
    "Show Reading Guide (Furigana)": "Показать подсказки чтения (фуригана)",
    "Hide Reading Guide (Furigana)": "Скрыть подсказки чтения (фуригана)",
    "Search Results \"{query}\" ({count} matches)": "Результаты поиска «{query}» (совпадений: {count})",
    "Close Results": "Закрыть результаты",
    "Trap": "Ловушка",
    "Page Completed ✓": "Страница пройдена ✓",
    "Mark Page Complete": "Отметить страницу пройденной",
    "Key Takeaway on This Page": "Главный вывод на этой странице",
    "Active": "Активно",
    "Understood": "Понятно",
    "Next Step": "Следующий шаг",
    "Got it, Next Step {step} ->": "Понятно, следующий шаг {step} ->",
    "Finish Page {page}, Open Page {nextPage} ->": "Завершить стр. {page}, открыть стр. {nextPage} ->",
    "Complete Final Step ✓": "Завершить последний шаг ✓",
    "Exam Trap Alert:": "Осторожно, экзаменационная ловушка:",
    "Exam Calculation Formula:": "Экзаменационная формула расчёта:",
    "Video Notes for Page {page}:": "Видеозаметки к странице {page}:",
    "Matching Vocabulary ({count})": "Подходящая лексика ({count})",
    "Key Vocabulary on Page {page} ({count})": "Ключевая лексика на странице {page} ({count})",
    "Mastered ✓": "Освоено ✓",
    "Mark Mastered": "Отметить как освоенное",
    "Exam Case Quiz": "Тест по экзаменационным кейсам",
    "Calculation Drill": "Тренажёр расчётов",
    "Exam Trap Quiz": "Тест на экзаменационные ловушки",
    "Vocab Drill": "Тренажёр лексики",
    "Hide 5 Formulas": "Скрыть 5 формул",
    "Open 5 Calculation Formulas": "Открыть 5 формул расчёта",
    "Question": "Вопрос",
    "Tryout p.": "Пробный тест, стр.",
    "Review p.": "Повторение, стр.",
    "View Explanation on p. {page}": "Смотреть объяснение на стр. {page}",
    "Next Question ->": "Следующий вопрос ->",
    "Ready to Try SSW Food Processing Practice Quiz?": "Готовы попробовать тренировочный тест SSW по переработке пищевых продуктов?",
    "Choose a practice type above or ask Sensei by voice. Every question includes a clear explanation and study page reference.": "Выберите тип тренировки выше или спросите Сэнсэя голосом. К каждому вопросу прилагается понятное объяснение и ссылка на страницу учебника.",
    "Start 1 Question Now": "Начать 1 вопрос сейчас",
    "Enlarge diagram for a closer view": "Увеличить схему для детального просмотра",
    "TRIGGER / SUBJECT": "ТРИГГЕР / ПОДЛЕЖАЩЕЕ",
    "PAIR!": "ПАРА!",
    "MATCHING FORM": "ПОДХОДЯЩАЯ ФОРМА",
    "Lead Car": "Ведущий вагон",
    "Right Link": "Правильная сцепка",
    "Check Context": "Проверьте контекст",
    "Safe to Use": "Можно использовать",
    "SNAPSHOT": "СНИМОК",
    "RULE 1": "ПРАВИЛО 1",
    "Core Form": "Основная форма",
    "ACTION VIDEO": "ВИДЕО В ДЕЙСТВИИ",
    "RULE 2": "ПРАВИЛО 2",
    "Contrast Form": "Контрастная форма",
    "CONCEPT 1": "ПОНЯТИЕ 1",
    "🔎 Focus": "🔎 Фокус",
    "CONCEPT 2": "ПОНЯТИЕ 2",
    "Core Concept": "Основное понятие",
    "Sentence Pattern Blocks": "Блоки моделей предложений",
    "Arranging blocks...": "Расставляем блоки...",
    "Whiteboard Visual Detail": "Детализация схемы на доске",
    "Zoom Out": "Уменьшить",
    "Zoom In": "Увеличить",
    "inaccurate grammar pattern": "неточная грамматическая модель",
    "FIEZEL Japanese Life conversation ({level}): {topic}": "Разговорная практика FIEZEL «Жизнь в Японии» ({level}): {topic}",
    "Real-Life Communication: {topic}": "Живое общение: {topic}",
    "Use the situational Japanese sentence pattern naturally.": "Используйте ситуативную японскую модель предложения естественно.",
    "Deliver clear pronunciation and polite phrasing smoothly.": "Говорите чётко, плавно и с вежливыми формулировками.",
    "IELTS Speaking: {topic}": "Раздел IELTS Speaking: {topic}",
    "Official Cambridge IELTS Speaking simulation (Part 2 Cue Card & Part 3 Discussion): {topic}": "Официальная симуляция IELTS Speaking от Cambridge (Часть 2: карточка с заданием и Часть 3: обсуждение): {topic}",
    "Now, in Part 2, I am going to give you a topic. You have one minute to think about what you are going to say: {topic}": "Сейчас, во второй части, я дам вам тему. У вас будет одна минута, чтобы продумать свой ответ: {topic}",
    "Speak coherently for 1–2 minutes covering every cue card point.": "Говорите связно в течение 1–2 минут, раскрывая каждый пункт карточки.",
    "Use academic discourse markers cleanly and naturally.": "Используйте академические связки речи чётко и естественно.",
    "Level A1 · Beginner": "Уровень A1 · Начальный",
    "Level A2 · Everyday Conversation": "Уровень A2 · Повседневное общение",
    "🎯 Best Answer ({level})": "🎯 Лучший ответ ({level})",
    "Short & Easy": "Кратко и просто",
    "Natural & Contextual": "Естественно и по контексту",
    "Reply + Follow-up": "Ответ + продолжение",
    "🎯 Best Answer (Level {level})": "🎯 Лучший ответ (уровень {level})",
    "Part": "Часть",
    "First on the left, {title}: {subtitle}{ex}": "Сначала слева — {title}: {subtitle}{ex}",
    "focus on the core rule": "сосредоточьтесь на основном правиле",
    ". Example: {example}": ". Пример: {example}",
    "Second on the right, {title}: {subtitle}{ex}": "Далее справа — {title}: {subtitle}{ex}",
    "compare with this form": "сравните с этой формой",
    "Key idea": "Ключевая идея",
    "Branch {num}, {label}{sub}{ex}": "Ветка {num}, {label}{sub}{ex}",
    ", meaning {sublabel}": ", что означает {sublabel}",
    ", for example {example}": ", например {example}",
    "Let's walk through the concept map for {topic} one by one. {detail}.": "Давайте последовательно разберём карту понятий по теме {topic}. {detail}.",
    ", e.g. {example}": ", например, {example}",
    ". Then ": ". Затем",
    "Follow the timeline from left to right. {stops}.": "Следите за временной шкалой слева направо. {stops}.",
    "Block {num}, {role}, contains {token}{note}": "Блок {num}, {role}, содержит {token}{note}",
    ", used for {note}": ", используется для {note}",
    "Notice the pattern blocks from left to right. {detail}.": "Обратите внимание на блоки модели слева направо. {detail}.",
    " Starting from {parts}.": "Начиная с {parts}.",
    ", then ": ", затем",
    "Look closely at the {topic} diagram on the board.{cap}{visualCue}": "Внимательно посмотрите на схему по теме {topic} на доске.{cap}{visualCue}",
    "Primary form": "Основная форма",
    "Comparison form": "Форма для сравнения",
    "Compare both sides: {sideA} versus {sideB}.{insight}": "Сравните обе стороны: {sideA} против {sideB}.{insight}",
    " Key insight: {insight}.": "Ключевой вывод: {insight}.",
    "{role}: {word}": "{role}: {word}",
    ", followed by ": ", далее следует",
    "Follow the sentence blocks from left to right: {chain}.{extra}": "Следите за блоками предложения слева направо: {chain}.{extra}",
    "Examine the sentence structure for {topic}: {detail}.": "Изучите структуру предложения для темы {topic}: {detail}.",
    "place each clause element in its proper slot": "поместите каждый элемент конструкции в подходящий слот",
    ". Next: ": ". Далее:",
    "Examples on the board": "Примеры на доске",
    "Review the examples in this table": "Изучите примеры в этой таблице",
    "Reason:": "Причина:",
    "Avoid forms like {wrong}. Use {right}.{why}": "Избегайте форм вроде {wrong}. Используйте {right}.{why}",
    "the common mistake": "распространённая ошибка",
    "Remember this key point:": "Запомните этот ключевой момент:",
    "Watch the pitch contour for {word} and trace the blue curve as you pronounce {reading}.": "Следите за контуром тона для {word} и повторяйте за синей кривой, произнося {reading}.",
    "Now try this quick check: {prompt}.": "Теперь пройдите быструю проверку: {prompt}.",
    "choose the accurate sentence form": "выберите правильную форму предложения",
    "To Be vs Active Verb Map": "Схема: To Be и активный глагол",
    "Use To Be only with Adjectives, Nouns/Locations, Verb-ing, or Passive Verb 3 — NEVER bare Verb 1": "Используйте To Be только с прилагательными, существительными/местами, Verb-ing или пассивным Verb 3 — НИКОГДА с голым Verb 1",
    "Subject + Verb 1": "Подлежащее + Verb 1",
    "Direct active verb, no To Be": "Прямой активный глагол, без To Be",
    "To Be + Adj/Noun": "To Be + прил./сущ.",
    "State, trait, role, or location": "Состояние, свойство, роль или место",
    "To Be + Verb-ing": "To Be + Verb-ing",
    "Action happening right now": "Действие, происходящее прямо сейчас",
    "To Be + Verb 3": "To Be + Verb 3",
    "Passive voice (acted upon)": "Страдательный залог (действие над объектом)",
    "Subject": "Подлежащее",
    "Key Connector": "Ключевая связка",
    "Main Verb / Core": "Основной глагол / Ядро",
    "Object / Complement": "Дополнение / Комплемент",
    "Details": "Детали",
    "Build the Sentence": "Соберите предложение",
    "Block": "Блок",
    "Key pattern slot": "Ключевой слот модели",
    "Photo vs Action Video": "Фото или видео действия",
    "PHOTO MODE": "РЕЖИМ ФОТО",
    "Focuses on state, trait, or condition": "Фокус на состоянии, свойстве или условии",
    "VIDEO MODE": "РЕЖИМ ВИДЕО",
    "Focuses on action, movement, or habit": "Фокус на действии, движении или привычке",
    "Pattern Block Puzzle": "Конструктор блоков модели",
    "Snap the colored blocks left to right into a natural sentence.": "Соедините цветные блоки слева направо в естественное предложение.",
    "0 Start": "0 Старт",
    "1 Concept": "1 Концепция",
    "2 Sketch": "2 Схема",
    "3 Breakdown": "3 Разбор",
    "4 Practice": "4 Практика",
    "Question Topic": "Тема вопроса",
    "Key Takeaways": "Ключевые выводы",
    "Contextual Practice": "Практика в контексте",
    "States, traits, roles, or places": "Состояния, свойства, роли или места",
    "Core Pattern": "Базовая модель",
    "Verb / Key": "Глагол / Ключ",
    "Complement": "Комплемент",
    "✦ Learning Board": "✦ Учебная доска",
    "Board Active": "Доска активна",
    "⤢ Open": "⤢ Открыть",
    "Minimize Board (See Mochi & Keep Talking)": "Свернуть доску (видеть Mochi и продолжать разговор)",
    "Close & Continue Talking": "Закрыть и продолжить разговор",
    "Preparing learning board...": "Подготовка учебной доски...",
    "Building visual explanations and tailored practice for you": "Создаём наглядные объяснения и персональную практику для вас",
    "💡 Key Point:": "💡 Ключевой момент:",
    "Sentence Pattern": "Модель предложения",
    "Choice": "Вариант",
    "Fill in Blank": "Заполните пропуск",
    "Word Order": "Порядок слов",
    "New Question": "Новый вопрос",
    "Switch to a fresh practice question": "Переключиться на новый тренировочный вопрос",
    "Tap the right word to complete the sentence:": "Нажмите на нужное слово, чтобы завершить предложение:",
    "That word does not fit yet. Try another option!": "Это слово пока не подходит. Попробуйте другой вариант!",
    "Tap tiles below to build the sentence...": "Нажимайте на плитки ниже, чтобы составить предложение...",
    "Close ✕": "Закрыть ✕",
    "× Unnatural / Avoid": "× Неестественно / Избегайте",
    "✓ Natural Form": "✓ Естественная форма",
    "Key Radical": "Ключевой радикал",
    "Strokes": "Черты",
    "Tone Contour & Pronunciation": "Контур тона и произношение",
    "Spot on! This sentence structure is clear and natural.": "В точку! Структура этого предложения ясная и естественная.",
    "Not quite — check the word order and pattern above and try again.": "Не совсем — проверьте порядок слов и шаблон выше и попробуйте снова.",
    "Nice work! That word completes the sentence naturally.": "Отличная работа! Это слово естественно завершает предложение.",
    "Cleanly arranged! Word order is spot on.": "Всё чётко расставлено! Порядок слов в самую точку.",
    "Arrange the tiles below into a natural sentence:": "Расположите плитки ниже так, чтобы получилось естественное предложение:"
  }
};

export const VS_SCENARIO_TRANS: Partial<Record<LearnerLocale, Record<string, ScenarioTransEntry>>> = {
  "en": {
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: Zero-to-Pass Roadmap >= 65% (pp. 1-91)",
      "situation": "A 1-on-1 coaching session with SSW SENSEI from scratch to conquer the Prometric Food Manufacturing CBT exam (40 questions / 70 minutes, 65% passing score).",
      "competency": "SSW: Roadmap & Beginner Decoder (pp. 1-6)",
      "openingTranslation": "SSW SENSEI opening greeting: Ready to guide you from Unit 0 (pp. 1-6) through the CBT Practice Test & calculator math (>= 65%).",
      "missionGoals": [
        "Check your study progress and understand why Unit 0 (pp. 1-6) is essential for beginners to learn first.",
        "Master the official OTAFF Ver 5.1 April 2026 update (9 Mandatory including Kurumi & Cashew Nut + 20 Recommended including Pistachio).",
        "Complete at least 1 CBT quiz or calculation question with explanations referencing the original PDF pages."
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "50-Question CBT Practice Test Simulation & Wakai Papa Traps",
      "situation": "Test your accuracy choosing option A, B, or C on Prometric questions & break down the reasoning behind each trap option on explanation pages 75-91.",
      "competency": "SSW: CBT Practice Test Simulation & Trap Analysis",
      "openingTranslation": "CBT Practice Test greeting: Ready to test how well you spot Prometric question traps and grade your score live.",
      "missionGoals": [
        "Answer CBT questions without falling for trap words like yukkuri or zero percent.",
        "See the question page number and full explanation page after answering."
      ]
    },
    "scen_ssw_math_visual": {
      "title": "CBT Calculator Math Class (Chlorine ppm, Budomari & Oven)",
      "situation": "Focused drills on 5 SSW CBT calculator formulas (Chlorine Dilution, Budomari, Bread Recipe, Oven Capacity, and 2^n Bacterial Growth).",
      "competency": "SSW: CBT Calculator Math Formulas",
      "openingTranslation": "Math Class greeting: Focus on the chlorine formula C1*V1=C2*V2, budomari yield, and rounding-up tricks.",
      "missionGoals": [
        "Memorize the 1% = 10,000 ppm conversion and the C1*V1 = C2*V2 formula (water = V2 - V1).",
        "Answer oven / fillet / chlorine calculation questions without falling for rounding trap options."
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "266 Food Factory Kotoba & Readings Drill (pp. 46-63)",
      "situation": "Memorization drill for 266 Kotoba from the Memorization Bank (pp. 46-63) using active recall, Japan Map techniques & native pronunciation.",
      "competency": "SSW: 266 Factory & Exam Kotoba Memorization",
      "openingTranslation": "Kotoba Drill greeting: Focus on mastering 266 food factory vocabulary terms and 142 official OTAFF index terms.",
      "missionGoals": [
        "Answer the meanings and readings of at least 3 official Kotoba terms from the Bank (pp. 46-63)."
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "You are attending your first conversation practice session at FIEZEL and greeting the instructor in class.",
      "openingTranslation": "Hello! Welcome to the FIEZEL Japanese class! Nice to meet you."
    },
    "scen_ja_fiezel-life_02": {
      "situation": "The instructor speaks a bit fast and you want to ask them to repeat or say you don't understand yet.",
      "openingTranslation": "Excuse me, was that explanation clear? If anything is unclear, please don't hesitate to let me know."
    },
    "scen_ja_fiezel-life_03": {
      "situation": "Introducing your name, home country (Indonesia), and work/study status.",
      "openingTranslation": "What is your name and where are you from? I'm from Tokyo."
    },
    "scen_ja_fiezel-life_04": {
      "situation": "Explaining the city and region where you currently live in Japan.",
      "openingTranslation": "Have you gotten used to living in Japan? Where do you live now?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "Talking about favorite foods and expressing a liking for Japanese cuisine.",
      "openingTranslation": "What do you like to eat for lunch? Have you ever tried Japanese food?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "Ordering a food and drink combo meal at a fast-food restaurant.",
      "openingTranslation": "Welcome! Have you decided what you'd like to order?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "Describing the facilities and number of rooms in your apartment.",
      "openingTranslation": "How's your new place? How many rooms are there?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "Describing a coworker's whereabouts in the office or factory area.",
      "openingTranslation": "Hey, where's Yamada-san? Have you seen them?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "Explaining lunch break hours and daily work schedules.",
      "openingTranslation": "Keep up the good work! What time does the lunch break start and end?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "Politely borrowing office supplies (stapler/scissors) from a coworker.",
      "openingTranslation": "Organizing documents? Is there any tool or supply you need to use?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "Talking about relaxing hobbies and enjoying reading manga or watching anime.",
      "openingTranslation": "What do you usually do on your days off? Is there any anime or manga you like?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "Politely accepting or declining an invitation to go for drinks with coworkers.",
      "openingTranslation": "Would you like to go for drinks together after work this Friday?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "Asking for the route and confirming whether a bus goes to the airport.",
      "openingTranslation": "I want to go to Narita Airport—which bus should I take?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "Asking for the names of buildings and public facilities around the city.",
      "openingTranslation": "You can see that tall building over there, right? Do you know what building it is?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "Asking the store cashier where batteries or daily necessities are located.",
      "openingTranslation": "Shopping at a konbini? Is there something you're looking for?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "Asking the price of clothes and checking if there is a discount.",
      "openingTranslation": "This outfit looks like it would really suit you! Have you checked the price?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "Talking about going to the movies with friends on the weekend.",
      "openingTranslation": "How was your weekend? Did you go out somewhere?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "Expressing a desire to go on vacation to a hot spring (onsen).",
      "openingTranslation": "The weather is getting cold, isn't it? I feel like going somewhere warm."
    },
    "scen_ja_fiezel-life_19": {
      "situation": "You are attending your first conversation practice session at FIEZEL and greeting the instructor in class.",
      "openingTranslation": "Hello! Welcome to the FIEZEL Japanese class! Nice to meet you."
    },
    "scen_ja_fiezel-life_20": {
      "situation": "The instructor speaks a bit fast and you want to ask them to repeat or say you don't understand yet.",
      "openingTranslation": "Excuse me, was that explanation clear? If anything is unclear, please don't hesitate to let me know."
    },
    "scen_ja_fiezel-life_21": {
      "situation": "Introducing your name, home country (Indonesia), and work/study status.",
      "openingTranslation": "What is your name and where are you from? I'm from Tokyo."
    },
    "scen_ja_fiezel-life_22": {
      "situation": "Explaining the city and region where you currently live in Japan.",
      "openingTranslation": "Have you gotten used to living in Japan? Where do you live now?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "Talking about favorite foods and expressing a liking for Japanese cuisine.",
      "openingTranslation": "What do you like to eat for lunch? Have you ever tried Japanese food?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "Ordering a food and drink combo meal at a fast-food restaurant.",
      "openingTranslation": "Welcome! Have you decided what you'd like to order?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "Describing the facilities and number of rooms in your apartment.",
      "openingTranslation": "How's your new place? How many rooms are there?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "Describing a coworker's whereabouts in the office or factory area.",
      "openingTranslation": "Hey, where's Yamada-san? Have you seen them?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "Explaining lunch break hours and daily work schedules.",
      "openingTranslation": "Keep up the good work! What time does the lunch break start and end?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "Politely borrowing office supplies (stapler/scissors) from a coworker.",
      "openingTranslation": "Organizing documents? Is there any tool or supply you need to use?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "Talking about relaxing hobbies and enjoying reading manga or watching anime.",
      "openingTranslation": "What do you usually do on your days off? Is there any anime or manga you like?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "Politely accepting or declining an invitation to go for drinks with coworkers.",
      "openingTranslation": "Would you like to go for drinks together after work this Friday?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "Asking for the route and confirming whether a bus goes to the airport.",
      "openingTranslation": "I want to go to Narita Airport—which bus should I take?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "Asking for the names of buildings and public facilities around the city.",
      "openingTranslation": "You can see that tall building over there, right? Do you know what building it is?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "Asking the store cashier where batteries or daily necessities are located.",
      "openingTranslation": "Shopping at a konbini? Is there something you're looking for?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "Asking the price of clothes and checking if there is a discount.",
      "openingTranslation": "This outfit looks like it would really suit you! Have you checked the price?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "Talking about going to the movies with friends on the weekend.",
      "openingTranslation": "How was your weekend? Did you go out somewhere?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "Expressing a desire to go on vacation to a hot spring (onsen).",
      "openingTranslation": "The weather is getting cold, isn't it? I feel like going somewhere warm."
    },
    "scen_ja_fiezel-life_37": {
      "situation": "You are attending your first conversation practice session at FIEZEL and greeting the instructor in class.",
      "openingTranslation": "Hello! Welcome to the FIEZEL Japanese class! Nice to meet you."
    },
    "scen_ja_fiezel-life_38": {
      "situation": "The instructor speaks a bit fast and you want to ask them to repeat or say you don't understand yet.",
      "openingTranslation": "Excuse me, was that explanation clear? If anything is unclear, please don't hesitate to let me know."
    },
    "scen_ja_fiezel-life_39": {
      "situation": "Introducing your name, home country (Indonesia), and work/study status.",
      "openingTranslation": "What is your name and where are you from? I'm from Tokyo."
    },
    "scen_ja_fiezel-life_40": {
      "situation": "Explaining the city and region where you currently live in Japan.",
      "openingTranslation": "Have you gotten used to living in Japan? Where do you live now?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "Talking about favorite foods and expressing a liking for Japanese cuisine.",
      "openingTranslation": "What do you like to eat for lunch? Have you ever tried Japanese food?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "Ordering a food and drink combo meal at a fast-food restaurant.",
      "openingTranslation": "Welcome! Have you decided what you'd like to order?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "Describing the facilities and number of rooms in your apartment.",
      "openingTranslation": "How's your new place? How many rooms are there?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "Describing a coworker's whereabouts in the office or factory area.",
      "openingTranslation": "Hey, where's Yamada-san? Have you seen them?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "Explaining lunch break hours and daily work schedules.",
      "openingTranslation": "Keep up the good work! What time does the lunch break start and end?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "Politely borrowing office supplies (stapler/scissors) from a coworker.",
      "openingTranslation": "Organizing documents? Is there any tool or supply you need to use?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "Talking about relaxing hobbies and enjoying reading manga or watching anime.",
      "openingTranslation": "What do you usually do on your days off? Is there any anime or manga you like?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "Politely accepting or declining an invitation to go for drinks with coworkers.",
      "openingTranslation": "Would you like to go for drinks together after work this Friday?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "Asking for the route and confirming whether a bus goes to the airport.",
      "openingTranslation": "I want to go to Narita Airport—which bus should I take?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "Asking for the names of buildings and public facilities around the city.",
      "openingTranslation": "You can see that tall building over there, right? Do you know what building it is?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "Asking the store cashier where batteries or daily necessities are located.",
      "openingTranslation": "Shopping at a konbini? Is there something you're looking for?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "Asking the price of clothes and checking if there is a discount.",
      "openingTranslation": "This outfit looks like it would really suit you! Have you checked the price?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "Talking about going to the movies with friends on the weekend.",
      "openingTranslation": "How was your weekend? Did you go out somewhere?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "Expressing a desire to go on vacation to a hot spring (onsen).",
      "openingTranslation": "The weather is getting cold, isn't it? I feel like going somewhere warm."
    }
  },
  "ms": {
    "scen_en_a2_cafe": {
      "title": "Memesan Kopi & Menerangkan Rancangan Petang",
      "situation": "Anda berjumpa Coach Alex di sebuah kafe sebelum mesyuarat pasukan. Buat pesanan dengan sopan dan kongsikan rancangan petang anda menggunakan Present Continuous.",
      "competency": "Pertuturan A2: Rancangan Berjadual & Urusan di Kafe",
      "openingTranslation": "Hai! Seronok berjumpa anda di kafe. Apakah yang anda ingin minum hari ini, dan apakah yang akan anda lakukan selepas kita minum kopi?",
      "missionGoals": [
        "Gunakan \"I would like...\" atau \"I'd like...\" untuk memesan minuman dengan sopan.",
        "Gunakan Present Continuous (\"I am meeting...\" / \"I am working on...\") untuk petang ini."
      ]
    },
    "scen_en_free_talk": {
      "title": "Perbualan Bebas: Sembang Terbuka bersama Coach Alex",
      "situation": "Berbual secara bebas tentang apa-apa topik: hobi, rancangan, pendapat, atau kisah harian tanpa panduan tetap.",
      "competency": "Pertuturan: Perbualan Bebas & Respons Spontan",
      "openingTranslation": "Bertanya dan menjawab secara bebas tentang topik harian, cabaran pembelajaran, atau matlamat peribadi.",
      "missionGoals": [
        "Luahkan idea secara terus tanpa tergamam.",
        "Berikan respons secara semula jadi terhadap soalan susulan yang spontan."
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "Hujah Berstruktur & Perbincangan Yakin bersama Coach Sarah",
      "situation": "Berlatih bertutur secara berstruktur dengan jelas, penaakulan logik, dan ungkapan eksekutif yang semula jadi.",
      "competency": "Pertuturan: Penaakulan Berstruktur & Kejelasan",
      "openingTranslation": "Kongsikan jawapan berstruktur yang jelas bersama sebab dan contoh.",
      "missionGoals": [
        "Nyatakan pendapat anda dengan jelas berserta sebab yang menyokong.",
        "Gunakan peralihan logik yang lancar."
      ]
    },
    "scen_en_a1_hometown": {
      "title": "Present Simple: Menggambarkan Kampung Halaman & Kawasan Kejiranan Anda",
      "situation": "Bercakap secara semula jadi tentang tempat tinggal anda, rutin harian, dan tempat kegemaran berdekatan.",
      "competency": "Pertuturan: Present Simple & Tempat Harian",
      "openingTranslation": "Ceritakan tentang kampung halaman anda dan tempat yang anda suka di kawasan berdekatan.",
      "missionGoals": [
        "Gunakan Present Simple dengan tepat (\"I live in...\", \"There is/are...\").",
        "Gambarkan 1–2 tempat yang biasa dikunjungi berhampiran rumah."
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "Simple Past Tense: Kata Kerja Tidak Sekata & Kisah Perjalanan",
      "situation": "Ceritakan semula perjalanan lalu menggunakan kata kerja tidak sekata (went, saw, bought, ate) dengan urutan yang jelas.",
      "competency": "Pertuturan: Bercerita Menggunakan Past Tense",
      "openingTranslation": "Ceritakan tentang perjalanan yang tidak dapat dilupakan yang anda lakukan baru-baru ini!",
      "missionGoals": [
        "Gunakan kata kerja kala lampau tidak sekata dengan tepat (went, ate, took, saw).",
        "Susun peristiwa mengikut urutan kronologi yang jelas."
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "Mod Peperiksaan · Pendapat Berstruktur & Klausa Konsesif",
      "situation": "Simulasi Pertuturan IELTS formal yang memfokuskan hujah seimbang, ketepatan leksikal, dan koheren.",
      "competency": "Pertuturan: Simulasi IELTS Akademik Bahagian 1–3",
      "openingTranslation": "Jawab dengan lancar berserta contoh berstruktur dan penaakulan yang seimbang.",
      "missionGoals": [
        "Kembangkan jawapan panjang tanpa pengulangan.",
        "Gunakan klausa konsesif dan penanda wacana akademik secara semula jadi."
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "Partikel Objek を (o) & Memesan dengan ください (kudasai)",
      "situation": "Pesan kopi atau kek secara semula jadi di kafe Tokyo menggunakan partikel yang tepat dan penjodoh bilangan yang sopan.",
      "competency": "Pertuturan: Memesan & Partikel Asas (N5)",
      "openingTranslation": "Selamat datang! Sudah buat pilihan pesanan anda? Hari ini kami mengesyorkan kopi panas dan kek keju.",
      "missionGoals": [
        "Pesan dengan sopan menggunakan \"～を ください\".",
        "Gunakan penjodoh bilangan asas bahasa Jepun (ひとつ / ふたつ) secara semula jadi."
      ]
    },
    "scen_ja_free_talk": {
      "title": "Latihan Kaiwa Bebas bersama Sensei Nanami",
      "situation": "Perbualan terbuka secara semula jadi dalam bahasa Jepun tentang kehidupan harian, makanan, hobi, atau cabaran belajar.",
      "competency": "Pertuturan: Kaiwa Harian Semula Jadi",
      "openingTranslation": "Mari berbual dengan selesa dalam bahasa Jepun tentang apa-apa sahaja yang terlintas di fikiran anda!",
      "missionGoals": [
        "Jawab secara semula jadi dalam bahasa Jepun yang sopan (です/ます).",
        "Tanya satu soalan susulan dalam bahasa Jepun."
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "Sembang Santai Jalanan & Kampus bersama Keita Senpai",
      "situation": "Perbualan harian bahasa Jepun yang santai tentang anime, kampus, muzik, dan ungkapan Tokyo/Osaka.",
      "competency": "Pertuturan: Kaiwa Santai Jalanan & Kampus",
      "openingTranslation": "Jangan segan untuk berbual secara santai tentang hobi, kehidupan kampus, atau budaya pop Jepun!",
      "missionGoals": [
        "Latih kelancaran perbualan santai.",
        "Beri reaksi secara semula jadi terhadap soalan mesra."
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "Permintaan Sopan & Meminta Nasihat (〜ていただけますか / 〜たらいいですか)",
      "situation": "Minta nasihat dan bimbingan daripada rakan sekerja kanan atau mentor dengan sopan di sekolah atau tempat kerja.",
      "competency": "Pertuturan: Nasihat & Permintaan Sopan (N4)",
      "openingTranslation": "Syabas atas usaha hari ini! Kamu nampak sibuk dengan laporan universiti kebelakangan ini—ada apa-apa yang menyukarkan kamu?",
      "missionGoals": [
        "Terangkan situasi anda dengan sopan menggunakan \"～んです / ～ので\".",
        "Minta nasihat menggunakan \"～たらいいですか\"."
      ]
    },
    "scen_zh_free_talk": {
      "title": "Bimbingan Bahasa Mandarin Beijing Autentik bersama Xiao Mochi",
      "situation": "Perbualan dua hala dengan maklum balas nada/tatabahasa serta-merta, latih tubi papan putih secara langsung, dan navigasi suara.",
      "competency": "Pertuturan: Kelancaran Putonghua & 4 Nada Semula Jadi",
      "openingTranslation": "Hei, kamu sudah tiba! Tinggalkan suara buku teks itu—beritahu saya secara jujur bahagian Mandarin mana yang menyukarkan kamu kebelakangan ini?",
      "missionGoals": [
        "Latih nada Mandarin dengan jelas dalam ayat penuh.",
        "Balas kepada Xiao Mochi dan minta latih tubi nada pada bila-bila masa."
      ]
    },
    "zh-restaurant-ordering": {
      "title": "Memesan Makanan di Restoran Beijing (HSK 1-2)",
      "situation": "Anda berada di kedai mi Beijing untuk memesan semangkuk mi daging lembu tanpa pedas.",
      "competency": "Memesan Makanan Mandarin & Penjodoh Bilangan",
      "openingTranslation": "Helo! Selamat datang ke Fiezel Chinese Bistro! Meja untuk berapa orang? Anda ingin makan apa?",
      "missionGoals": [
        "Pesan semangkuk mi daging lembu (yì wǎn niúròumiàn).",
        "Minta tidak pedas menggunakan \"bú yào là\"."
      ]
    },
    "zh-subway-directions": {
      "title": "Bertanya Arah & Menaiki Kereta Api Bawah Tanah di China (HSK 2)",
      "situation": "Anda berada di Shanghai untuk mencari stesen kereta api bawah tanah terdekat dan menyemak sama ada Laluan 2 menuju ke lapangan terbang.",
      "competency": "Arah Mandarin & Pengangkutan Awam",
      "openingTranslation": "Helo! Perlukan bantuan? Anda hendak ke mana?",
      "missionGoals": [
        "Tanya di mana terletaknya stesen kereta api bawah tanah (dìtiězhàn zài nǎr).",
        "Tanya sama ada Laluan 2 sampai ke lapangan terbang (néng dào jīchǎng ma)."
      ]
    },
    "scen_ja_trv_01": {
      "title": "Membeli & Memanaskan Bento di Konbini",
      "situation": "Anda berada di kaunter kedai serbaneka Shinjuku pada waktu malam bersama onigiri, bento, dan teh hijau.",
      "competency": "Kaiwa: Perjalanan & Keperluan Asas",
      "openingTranslation": "Selamat datang! Anda mahu bento anda dipanaskan? Anda perlukan beg plastik?",
      "missionGoals": [
        "Minta kakitangan memanaskan bento tersebut (atatamete kudasai).",
        "Tolak beg plastik dengan sopan (fukuro wa kekkou desu)."
      ]
    },
    "scen_ja_trv_02": {
      "title": "Bertanya Platform Kereta Api yang Betul di Stesen Utama",
      "situation": "Tanya kakitangan stesen platform dan laluan pertukaran mana yang perlu diambil di Tokyo.",
      "competency": "Kaiwa: Perjalanan & Keperluan Asas",
      "openingTranslation": "Ya, ada apa yang boleh saya bantu? Anda menuju ke arah mana?",
      "missionGoals": [
        "Tanya nombor platform mana yang menuju ke laluan destinasi anda.",
        "Sahkan sama ada pertukaran laluan diperlukan."
      ]
    },
    "scen_ja_trv_03": {
      "title": "Memesan Ramen & Menyesuaikan Mi serta Kuah",
      "situation": "Sesuaikan keanjalan mi dan kepekatan kuah di kedai ramen Jepun.",
      "competency": "Kaiwa: Perjalanan & Keperluan Asas",
      "openingTranslation": "Selamat datang! Anda ingin memesan apa? Bagaimanakah anda mahu mi anda dimasak?",
      "missionGoals": [
        "Pesan ramen dan minta mi yang lebih keras (katame).",
        "Minta air atau mi tambahan dengan sopan."
      ]
    },
    "scen_ja_trv_04": {
      "title": "Daftar Masuk Hotel & Meninggalkan Bagasi Sebelum 3 Petang",
      "situation": "Daftar masuk di kaunter hadapan hotel dan minta untuk menyimpan bagasi anda sebelum bilik siap.",
      "competency": "Kaiwa: Perjalanan & Keperluan Asas",
      "openingTranslation": "Selamat datang. Adakah anda ingin mendaftar masuk hari ini? Boleh saya dapatkan nama tempahan anda?",
      "missionGoals": [
        "Nyatakan nama tempahan anda dengan sopan.",
        "Minta untuk meninggalkan bagasi anda sehingga waktu daftar masuk (azukete mo ii desu ka)."
      ]
    },
    "scen_ja_trv_05": {
      "title": "Membeli Ubat Selesema & Sakit Kepala di Farmasi Jepun",
      "situation": "Terangkan gejala sakit tekak dan demam kepada ahli farmasi di Jepun.",
      "competency": "Kaiwa: Perjalanan & Keperluan Asas",
      "openingTranslation": "Helo, apakah gejala yang boleh saya bantu hari ini? Adakah anda mengalami demam?",
      "missionGoals": [
        "Terangkan gejala dengan jelas (nodo ga itai, dll.).",
        "Tanya sama ada ubat tersebut menyebabkan rasa mengantuk atau perlu diambil selepas makan."
      ]
    },
    "scen_ja_wrk_01": {
      "title": "Ucapan Hari Pertama di Pejabat & Pertukaran Kad Nama (Meishi Koukan)",
      "situation": "Sapa pasukan kejuruteraan baharu anda dengan sopan dan bertukar kad perniagaan dengan betul.",
      "competency": "Kaiwa: Kerja & Perniagaan",
      "openingTranslation": "Selamat berkenalan, saya Sato daripada pasukan pembangunan. Harap dapat bekerjasama dengan anda.",
      "missionGoals": [
        "Berikan pengenalan diri yang sopan.",
        "Terima kad perniagaan dengan penuh hormat (choudai itashimasu)."
      ]
    },
    "scen_ja_wrk_02": {
      "title": "Horenso: Melaporkan Pepijat & Memohon Pelarasan Tarikh Akhir",
      "situation": "Kemas kini pengurus anda dengan jelas tentang punca utama pepijat projek dan langkah penyelesaian yang dicadangkan.",
      "competency": "Kaiwa: Kerja & Perniagaan",
      "openingTranslation": "Ya, apa yang berlaku? Adakah timbul masalah pada projek tersebut?",
      "missionGoals": [
        "Nyatakan kemajuan dan punca pepijat secara ringkas dan padat.",
        "Cadangkan pembaikan yang konkrit dan garis masa terkini dengan sopan."
      ]
    },
    "scen_ja_wrk_03": {
      "title": "Etika Nomikai Pejabat: Bersulang & Membina Hubungan Mesra",
      "situation": "Sertai perjumpaan pasukan selepas waktu kerja, ucapkan kata-kata bersulang, dan berbual secara semula jadi dengan rakan sekerja.",
      "competency": "Kaiwa: Kerja & Perniagaan",
      "openingTranslation": "Terima kasih atas usaha gigih anda dalam projek ini! Mari kita bersulang dahulu—anda hendak minum apa?",
      "missionGoals": [
        "Berikan ucapan bersulang yang sopan (otsukaresama desu, kanpai!).",
        "Minta cadangan makanan atau minuman daripada rakan sekerja."
      ]
    },
    "scen_ja_soc_01": {
      "title": "Mengajak Rakan Keluar Bersantai pada Hujung Minggu",
      "situation": "Buat rancangan hujung minggu, persetujui tempat pertemuan, dan kekalkan perbualan yang mesra serta semula jadi.",
      "competency": "Kaiwa: Harian & Sosial",
      "openingTranslation": "Hai, ada rancangan hujung minggu ini? Nampaknya cuaca akan cerah!",
      "missionGoals": [
        "Cadangkan rancangan hujung minggu secara semula jadi.",
        "Sahkan masa dan tempat pertemuan dengan jelas."
      ]
    },
    "scen_ja_soc_02": {
      "title": "Bertanya Tuan Rumah Tentang Peraturan Pengasingan Sampah Pangsapuri",
      "situation": "Anda baru berpindah ke sebuah pangsapuri di Tokyo dan ingin mengesahkan hari kutipan sampah boleh bakar serta peraturan botol PET.",
      "competency": "Kaiwa: Harian & Sosial",
      "openingTranslation": "Oh, selamat datang selepas berpindah masuk! Semuanya berjalan lancar? Sudah jelas tentang pengasingan sampah?",
      "missionGoals": [
        "Tanya hari apakah hari sampah boleh bakar (Moeru gomi wa nan-youbi desu ka).",
        "Tanya cara melupuskan botol PET dengan betul."
      ]
    },
    "scen_ja_acd_01": {
      "title": "Konsultasi Tesis & Semakan Kertas Kerja di Pejabat Profesor",
      "situation": "Bincangkan hipotesis penyelidikan dan metodologi kajian selidik anda secara rasmi dengan penasihat Jepun anda.",
      "competency": "Kaiwa: Akademik & Rasmi",
      "openingTranslation": "Sila masuk. Saya telah membaca ringkasan laporan yang anda serahkan—sudut penyelidikan anda agak menarik.",
      "missionGoals": [
        "Mulakan secara rasmi (Shitsurei itashimasu).",
        "Minta maklum balas tentang metodologi kajian selidik dengan penuh hormat."
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic: Orientasi Formula & Ujian Diagnostik",
      "situation": "Ukur tahap kesediaan PTE Speaking anda dan pelajari strategi pemarkahan teras yang mengutamakan kelancaran.",
      "competency": "PTE Academic: Orientasi & Diagnostik",
      "openingTranslation": "Mari kita petakan kadar pertuturan dan garis dasar sasaran skor PTE anda sekarang.",
      "missionGoals": [
        "Bertutur dengan lancar tanpa jeda ragu yang panjang.",
        "Nyatakan skor sasaran dan garis masa anda dengan jelas."
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE Tahap 1: Pakar Describe Image (Templat Universal)",
      "situation": "Sampaikan penerangan gambar selama 40 saat dengan lancar dan fokus pada kelancaran berterusan (5/5).",
      "competency": "PTE Speaking: Templat Universal Describe Image",
      "openingTranslation": "Terangkan carta pada skrin dengan lancar selama 40 saat tanpa berhenti seketika.",
      "missionGoals": [
        "Rangkumi tajuk, puncak tertinggi, titik terendah, dan kesimpulan ringkas.",
        "Kekalkan rentak yang stabil tanpa sebarang pembetulan kendiri."
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE Tahap 2: Read Aloud (Pemenggalan Frasa & Rentak 130 WPM)",
      "situation": "Baca petikan akademik dengan lantang menggunakan pemenggalan frasa yang bermakna dan sebutan yang jelas.",
      "competency": "PTE Speaking & Reading: Pemenggalan Frasa Read Aloud",
      "openingTranslation": "Baca petikan dengan lantang dan jelas pada rentak akademik yang stabil.",
      "missionGoals": [
        "Kumpulkan perkataan ke dalam segmen sintaksis yang semula jadi.",
        "Sebut perkataan akademik utama dengan jelas tanpa tergesa-gesa."
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE Tahap 3: Repeat Sentence (Strategi Memori Akustik)",
      "situation": "Ulangi ayat akademik dengan jelas sambil mengekalkan irama dan makna teras.",
      "competency": "PTE Speaking & Listening: Latihan Ikut Sebut Repeat Sentence",
      "openingTranslation": "Dengar dengan teliti dan ulangi setiap ayat dengan serta-merta mengikut irama yang lancar.",
      "missionGoals": [
        "Tangkap irama klausa pembukaan dan penutup.",
        "Kekalkan kelancaran walaupun pada ayat yang lebih panjang."
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE Tahap 4: Write from Dictation & Ejaan Akademik",
      "situation": "Ingat semula ayat yang diimlakkan perkataan demi perkataan dengan bentuk jamak yang tepat dan ejaan akademik.",
      "competency": "PTE Listening & Writing: Write from Dictation",
      "openingTranslation": "Semak setiap perkataan, akhiran jamak, dan ejaan dengan tepat.",
      "missionGoals": [
        "Semak akhiran kala dan kata sandang dengan teliti.",
        "Semak kolokasi akademik berfrekuensi tinggi."
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: Pelan Laluan Dari Sifar Ke Lulus >= 65% (ms. 1-91)",
      "situation": "Sesi bimbingan 1-lawan-1 bersama SSW SENSEI dari asas untuk menakluki peperiksaan CBT Pembuatan Makanan Prometric (40 soalan / 70 minit, skor lulus 65%).",
      "competency": "SSW: Pelan Laluan & Penyahkod Pemula (ms. 1-6)",
      "openingTranslation": "Ucapan pembukaan SSW SENSEI: Bersedia membimbing anda daripada Unit 0 (ms. 1-6) hingga Ujian Latihan CBT & pengiraan kalkulator (>= 65%).",
      "missionGoals": [
        "Semak kemajuan pembelajaran anda dan fahami sebab Unit 0 (ms. 1-6) penting untuk dipelajari dahulu oleh pemula.",
        "Kuasai kemas kini rasmi OTAFF Ver 5.1 April 2026 (9 Wajib termasuk Kurumi & Cashew Nut + 20 Disyorkan termasuk Pistachio).",
        "Lengkapkan sekurang-kurangnya 1 kuiz CBT atau soalan pengiraan dengan penjelasan yang merujuk muka surat PDF asal."
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "Simulasi Ujian Latihan CBT 50 Soalan & Perangkap Wakai Papa",
      "situation": "Uji ketepatan anda memilih jawapan A, B, atau C pada soalan Prometric & rungkaikan sebab di sebalik setiap pilihan perangkap pada muka surat penjelasan 75-91.",
      "competency": "SSW: Simulasi Ujian Latihan CBT & Analisis Perangkap",
      "openingTranslation": "Ucapan Ujian Latihan CBT: Bersedia menguji sejauh mana anda dapat mengesan perangkap soalan Prometric dan menilai skor anda secara langsung.",
      "missionGoals": [
        "Jawab soalan CBT tanpa terpedaya dengan perkataan perangkap seperti yukkuri atau sifar peratus.",
        "Lihat nombor muka surat soalan dan muka surat penjelasan penuh selepas menjawab."
      ]
    },
    "scen_ssw_math_visual": {
      "title": "Kelas Matematik Kalkulator CBT (Klorin ppm, Budomari & Ketuhar)",
      "situation": "Latih tubi berfokus pada 5 formula kalkulator CBT SSW (Pencairan Klorin, Budomari, Resipi Roti, Kapasiti Ketuhar, dan Pertumbuhan Bakteria 2^n).",
      "competency": "SSW: Formula Matematik Kalkulator CBT",
      "openingTranslation": "Sapaan Kelas Matematik: Fokus pada formula klorin C1*V1=C2*V2, hasil budomari, dan teknik pembundaran ke atas.",
      "missionGoals": [
        "Hafal penukaran 1% = 10,000 ppm dan formula C1*V1 = C2*V2 (air = V2 - V1).",
        "Jawab soalan pengiraan ketuhar / filet / klorin tanpa terpedaya dengan pilihan perangkap pembundaran."
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "Latih Tubi 266 Kotoba Kilang Makanan & Bacaan (ms. 46-63)",
      "situation": "Latih tubi hafalan untuk 266 Kotoba daripada Bank Hafalan (ms. 46-63) menggunakan ingat kembali aktif, teknik Japan Map & sebutan penutur jati.",
      "competency": "SSW: Hafalan 266 Kotoba Kilang & Peperiksaan",
      "openingTranslation": "Sapaan Latih Tubi Kotoba: Fokus pada menguasai 266 istilah kosa kata kilang makanan dan 142 istilah indeks rasmi OTAFF.",
      "missionGoals": [
        "Jawab maksud dan bacaan bagi sekurang-kurangnya 3 istilah Kotoba rasmi daripada Bank (ms. 46-63)."
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "Anda sedang menghadiri sesi latihan perbualan pertama anda di FIEZEL dan menyapa pengajar di dalam kelas.",
      "openingTranslation": "Helo! Selamat datang ke kelas bahasa Jepun FIEZEL! Selamat berkenalan."
    },
    "scen_ja_fiezel-life_02": {
      "situation": "Pengajar bercakap agak laju dan anda ingin meminta mereka mengulanginya atau mengatakan anda masih belum faham.",
      "openingTranslation": "Maaf, adakah penjelasan tadi jelas? Jika ada apa-apa yang kurang jelas, sila beritahu saya."
    },
    "scen_ja_fiezel-life_03": {
      "situation": "Memperkenalkan nama anda, negara asal (Indonesia), dan status kerja/belajar.",
      "openingTranslation": "Siapakah nama anda dan dari manakah asal anda? Saya dari Tokyo."
    },
    "scen_ja_fiezel-life_04": {
      "situation": "Menerangkan bandar dan kawasan tempat anda tinggal sekarang di Jepun.",
      "openingTranslation": "Sudahkah anda biasa tinggal di Jepun? Di manakah anda tinggal sekarang?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "Bercakap tentang makanan kegemaran dan menyatakan rasa suka terhadap masakan Jepun.",
      "openingTranslation": "Apakah yang anda suka makan untuk makan tengah hari? Pernahkah anda mencuba makanan Jepun?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "Memesan set kombo makanan dan minuman di restoran makanan segera.",
      "openingTranslation": "Selamat datang! Sudahkah anda buat keputusan apa yang ingin dipesan?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "Menerangkan kemudahan dan bilangan bilik di pangsapuri anda.",
      "openingTranslation": "Bagaimanakah tempat tinggal baharu anda? Berapakah bilangan biliknya?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "Menerangkan keberadaan rakan sekerja di kawasan pejabat atau kilang.",
      "openingTranslation": "Eh, di manakah Yamada-san? Adakah anda ternampak dia?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "Menerangkan waktu rehat makan tengah hari dan jadual kerja harian.",
      "openingTranslation": "Teruskan usaha yang baik! Pukul berapakah waktu rehat makan tengah hari bermula dan tamat?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "Meminjam peralatan pejabat (pengokot/gunting) dengan sopan daripada rakan sekerja.",
      "openingTranslation": "Sedang menyusun dokumen? Adakah sebarang alat atau bekalan yang perlu anda gunakan?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "Bercakap tentang hobi yang menenangkan dan keseronokan membaca manga atau menonton anime.",
      "openingTranslation": "Apakah yang biasanya anda lakukan pada hari cuti? Adakah mana-mana anime atau manga yang anda suka?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "Menerima atau menolak jemputan untuk keluar minum bersama rakan sekerja dengan sopan.",
      "openingTranslation": "Adakah anda mahu keluar minum bersama selepas kerja Jumaat ini?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "Bertanya arah laluan dan mengesahkan sama ada bas itu pergi ke lapangan terbang.",
      "openingTranslation": "Saya hendak pergi ke Lapangan Terbang Narita—bas manakah yang patut saya naiki?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "Bertanya nama bangunan dan kemudahan awam di sekitar bandar.",
      "openingTranslation": "Anda boleh nampak bangunan tinggi di sebelah sana itu, bukan? Tahukah anda bangunan apakah itu?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "Bertanya kepada juruwang kedai di manakah letaknya bateri atau barangan keperluan harian.",
      "openingTranslation": "Sedang membeli-belah di konbini? Adakah sesuatu yang sedang anda cari?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "Bertanya harga pakaian dan menyemak sama ada terdapat diskaun.",
      "openingTranslation": "Pakaian ini nampak sangat sesuai dengan anda! Sudahkah anda menyemak harganya?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "Bercakap tentang pergi menonton wayang bersama kawan-kawan pada hujung minggu.",
      "openingTranslation": "Bagaimanakah hujung minggu anda? Adakah anda keluar ke mana-mana?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "Menyatakan keinginan untuk pergi bercuti ke kolam air panas (onsen).",
      "openingTranslation": "Cuaca semakin sejuk, bukan? Saya rasa teringin hendak pergi ke tempat yang hangat."
    },
    "scen_ja_fiezel-life_19": {
      "situation": "Anda sedang menghadiri sesi latihan perbualan pertama anda di FIEZEL dan menyapa pengajar di dalam kelas.",
      "openingTranslation": "Helo! Selamat datang ke kelas bahasa Jepun FIEZEL! Selamat berkenalan."
    },
    "scen_ja_fiezel-life_20": {
      "situation": "Pengajar bercakap agak laju dan anda ingin meminta mereka mengulanginya atau mengatakan anda masih belum faham.",
      "openingTranslation": "Maaf, adakah penjelasan tadi jelas? Jika ada apa-apa yang kurang jelas, sila beritahu saya."
    },
    "scen_ja_fiezel-life_21": {
      "situation": "Memperkenalkan nama anda, negara asal (Indonesia), dan status kerja/belajar.",
      "openingTranslation": "Siapakah nama anda dan dari manakah asal anda? Saya dari Tokyo."
    },
    "scen_ja_fiezel-life_22": {
      "situation": "Menerangkan bandar dan kawasan tempat anda tinggal sekarang di Jepun.",
      "openingTranslation": "Sudahkah anda biasa tinggal di Jepun? Di manakah anda tinggal sekarang?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "Bercakap tentang makanan kegemaran dan menyatakan rasa suka terhadap masakan Jepun.",
      "openingTranslation": "Apakah yang anda suka makan untuk makan tengah hari? Pernahkah anda mencuba makanan Jepun?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "Memesan set kombo makanan dan minuman di restoran makanan segera.",
      "openingTranslation": "Selamat datang! Sudahkah anda buat keputusan apa yang ingin dipesan?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "Menerangkan kemudahan dan bilangan bilik di pangsapuri anda.",
      "openingTranslation": "Bagaimanakah tempat tinggal baharu anda? Berapakah bilangan biliknya?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "Menerangkan keberadaan rakan sekerja di kawasan pejabat atau kilang.",
      "openingTranslation": "Eh, di manakah Yamada-san? Adakah anda ternampak dia?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "Menerangkan waktu rehat makan tengah hari dan jadual kerja harian.",
      "openingTranslation": "Teruskan usaha yang baik! Pukul berapakah waktu rehat makan tengah hari bermula dan tamat?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "Meminjam peralatan pejabat (pengokot/gunting) dengan sopan daripada rakan sekerja.",
      "openingTranslation": "Sedang menyusun dokumen? Adakah sebarang alat atau bekalan yang perlu anda gunakan?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "Bercakap tentang hobi yang menenangkan dan keseronokan membaca manga atau menonton anime.",
      "openingTranslation": "Apakah yang biasanya anda lakukan pada hari cuti? Adakah mana-mana anime atau manga yang anda suka?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "Menerima atau menolak jemputan untuk keluar minum bersama rakan sekerja dengan sopan.",
      "openingTranslation": "Adakah anda mahu keluar minum bersama selepas kerja Jumaat ini?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "Bertanya arah laluan dan mengesahkan sama ada bas itu pergi ke lapangan terbang.",
      "openingTranslation": "Saya hendak pergi ke Lapangan Terbang Narita—bas manakah yang patut saya naiki?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "Bertanya nama bangunan dan kemudahan awam di sekitar bandar.",
      "openingTranslation": "Anda boleh nampak bangunan tinggi di sebelah sana itu, bukan? Tahukah anda bangunan apakah itu?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "Bertanya kepada juruwang kedai di manakah letaknya bateri atau barangan keperluan harian.",
      "openingTranslation": "Sedang membeli-belah di konbini? Adakah sesuatu yang sedang anda cari?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "Bertanya harga pakaian dan menyemak sama ada terdapat diskaun.",
      "openingTranslation": "Pakaian ini nampak sangat sesuai dengan anda! Sudahkah anda menyemak harganya?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "Bercakap tentang pergi menonton wayang bersama kawan-kawan pada hujung minggu.",
      "openingTranslation": "Bagaimanakah hujung minggu anda? Adakah anda keluar ke mana-mana?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "Menyatakan keinginan untuk pergi bercuti ke kolam air panas (onsen).",
      "openingTranslation": "Cuaca semakin sejuk, bukan? Saya rasa teringin hendak pergi ke tempat yang hangat."
    },
    "scen_ja_fiezel-life_37": {
      "situation": "Anda sedang menghadiri sesi latihan perbualan pertama anda di FIEZEL dan menyapa pengajar di dalam kelas.",
      "openingTranslation": "Helo! Selamat datang ke kelas bahasa Jepun FIEZEL! Selamat berkenalan."
    },
    "scen_ja_fiezel-life_38": {
      "situation": "Pengajar bercakap agak laju dan anda ingin meminta mereka mengulanginya atau mengatakan anda masih belum faham.",
      "openingTranslation": "Maaf, adakah penjelasan tadi jelas? Jika ada apa-apa yang kurang jelas, sila beritahu saya."
    },
    "scen_ja_fiezel-life_39": {
      "situation": "Memperkenalkan nama anda, negara asal (Indonesia), dan status kerja/belajar.",
      "openingTranslation": "Siapakah nama anda dan dari manakah asal anda? Saya dari Tokyo."
    },
    "scen_ja_fiezel-life_40": {
      "situation": "Menerangkan bandar dan kawasan tempat anda tinggal sekarang di Jepun.",
      "openingTranslation": "Sudahkah anda biasa tinggal di Jepun? Di manakah anda tinggal sekarang?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "Bercakap tentang makanan kegemaran dan menyatakan rasa suka terhadap masakan Jepun.",
      "openingTranslation": "Apakah yang anda suka makan untuk makan tengah hari? Pernahkah anda mencuba makanan Jepun?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "Memesan set kombo makanan dan minuman di restoran makanan segera.",
      "openingTranslation": "Selamat datang! Sudahkah anda buat keputusan apa yang ingin dipesan?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "Menerangkan kemudahan dan bilangan bilik di pangsapuri anda.",
      "openingTranslation": "Bagaimanakah tempat tinggal baharu anda? Berapakah bilangan biliknya?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "Menerangkan keberadaan rakan sekerja di kawasan pejabat atau kilang.",
      "openingTranslation": "Eh, di manakah Yamada-san? Adakah anda ternampak dia?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "Menerangkan waktu rehat makan tengah hari dan jadual kerja harian.",
      "openingTranslation": "Teruskan usaha yang baik! Pukul berapakah waktu rehat makan tengah hari bermula dan tamat?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "Meminjam peralatan pejabat (pengokot/gunting) dengan sopan daripada rakan sekerja.",
      "openingTranslation": "Sedang menyusun dokumen? Adakah sebarang alat atau bekalan yang perlu anda gunakan?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "Bercakap tentang hobi yang menenangkan dan keseronokan membaca manga atau menonton anime.",
      "openingTranslation": "Apakah yang biasanya anda lakukan pada hari cuti? Adakah mana-mana anime atau manga yang anda suka?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "Menerima atau menolak jemputan untuk keluar minum bersama rakan sekerja dengan sopan.",
      "openingTranslation": "Adakah anda mahu keluar minum bersama selepas kerja Jumaat ini?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "Bertanya arah laluan dan mengesahkan sama ada bas itu pergi ke lapangan terbang.",
      "openingTranslation": "Saya hendak pergi ke Lapangan Terbang Narita—bas manakah yang patut saya naiki?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "Bertanya nama bangunan dan kemudahan awam di sekitar bandar.",
      "openingTranslation": "Anda boleh nampak bangunan tinggi di sebelah sana itu, bukan? Tahukah anda bangunan apakah itu?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "Bertanya kepada juruwang kedai di manakah letaknya bateri atau barangan keperluan harian.",
      "openingTranslation": "Sedang membeli-belah di konbini? Adakah sesuatu yang sedang anda cari?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "Bertanya harga pakaian dan menyemak sama ada terdapat diskaun.",
      "openingTranslation": "Pakaian ini nampak sangat sesuai dengan anda! Sudahkah anda menyemak harganya?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "Bercakap tentang pergi menonton wayang bersama kawan-kawan pada hujung minggu.",
      "openingTranslation": "Bagaimanakah hujung minggu anda? Adakah anda keluar ke mana-mana?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "Menyatakan keinginan untuk pergi bercuti ke kolam air panas (onsen).",
      "openingTranslation": "Cuaca semakin sejuk, bukan? Saya rasa teringin hendak pergi ke tempat yang hangat."
    }
  },
  "vi": {
    "scen_en_a2_cafe": {
      "title": "Gọi cà phê & chia sẻ kế hoạch buổi chiều",
      "situation": "Bạn gặp Coach Alex tại quán cà phê trước cuộc họp nhóm. Hãy gọi đồ uống lịch sự và chia sẻ kế hoạch buổi chiều bằng thì Hiện tại tiếp diễn (Present Continuous).",
      "competency": "Nói A2: Kế hoạch đã lên lịch & giao tiếp tại quán cà phê",
      "openingTranslation": "Chào bạn! Rất vui được gặp bạn ở quán cà phê. Hôm nay bạn muốn uống gì, và sau khi uống cà phê bạn định làm gì?",
      "missionGoals": [
        "Dùng \"I would like...\" hoặc \"I'd like...\" để gọi đồ uống một cách lịch sự.",
        "Dùng thì Hiện tại tiếp diễn (\"I am meeting...\" / \"I am working on...\") để nói về kế hoạch chiều nay."
      ]
    },
    "scen_en_free_talk": {
      "title": "Trò chuyện tự do: Hội thoại cởi mở cùng Coach Alex",
      "situation": "Thoải mái trò chuyện về bất kỳ chủ đề nào: sở thích, dự định, quan điểm hoặc câu chuyện hằng ngày mà không cần gợi ý cố định.",
      "competency": "Luyện nói: Trò chuyện tự do & phản xạ tự nhiên",
      "openingTranslation": "Hỏi và đáp tự do về các chủ đề hằng ngày, khó khăn khi học hoặc mục tiêu cá nhân.",
      "missionGoals": [
        "Diễn đạt ý kiến trực tiếp mà không bị khựng lại.",
        "Phản hồi tự nhiên trước các câu hỏi nối tiếp bất ngờ."
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "Lập luận mạch lạc & thảo luận tự tin cùng Coach Sarah",
      "situation": "Luyện nói có cấu trúc rõ ràng, lập luận logic và cách diễn đạt tự nhiên, chuyên nghiệp.",
      "competency": "Luyện nói: Lập luận có cấu trúc & rõ ràng",
      "openingTranslation": "Trình bày câu trả lời có bố cục rõ ràng kèm lý do và ví dụ.",
      "missionGoals": [
        "Nêu quan điểm rõ ràng kèm theo lý do chứng minh.",
        "Sử dụng các từ nối chuyển ý logic và mượt mà."
      ]
    },
    "scen_en_a1_hometown": {
      "title": "Thì Hiện tại đơn: Miêu tả quê hương & khu phố của bạn",
      "situation": "Nói tự nhiên về nơi bạn sống, thói quen hằng ngày và những địa điểm yêu thích gần nhà.",
      "competency": "Luyện nói: Thì Hiện tại đơn & địa điểm quen thuộc",
      "openingTranslation": "Hãy kể cho tôi nghe về quê hương của bạn và những địa điểm bạn thích ở gần đó.",
      "missionGoals": [
        "Dùng thì Hiện tại đơn chuẩn xác (\"I live in...\", \"There is/are...\").",
        "Miêu tả 1–2 địa điểm quen thuộc gần nhà."
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "Thì Quá khứ đơn: Động từ bất quy tắc & chuyện đi du lịch",
      "situation": "Kể lại một chuyến đi trong quá khứ bằng các động từ bất quy tắc (went, saw, bought, ate) theo trình tự rõ ràng.",
      "competency": "Luyện nói: Kể chuyện ở thì Quá khứ",
      "openingTranslation": "Hãy kể cho tôi nghe về một chuyến đi đáng nhớ gần đây của bạn!",
      "missionGoals": [
        "Sử dụng chính xác các động từ quá khứ bất quy tắc (went, ate, took, saw).",
        "Sắp xếp các sự kiện theo trình tự thời gian rõ ràng."
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "Chế độ Thi · Quan điểm Có cấu trúc & Mệnh đề Nhượng bộ",
      "situation": "Mô phỏng IELTS Speaking trang trọng, tập trung vào lập luận cân bằng, dùng từ chính xác và mạch lạc.",
      "competency": "Luyện nói: Mô phỏng IELTS Academic Part 1–3",
      "openingTranslation": "Trả lời trôi chảy với các ví dụ có cấu trúc và lập luận cân bằng.",
      "missionGoals": [
        "Phát triển câu trả lời mở rộng mà không lặp từ hay lặp ý.",
        "Sử dụng mệnh đề nhượng bộ và từ nối học thuật một cách tự nhiên."
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "Trợ từ tân ngữ を (o) & Gọi món với ください (kudasai)",
      "situation": "Gọi cà phê hoặc bánh ngọt tự nhiên tại quán cà phê Tokyo với trợ từ chuẩn xác và lượng từ lịch sự.",
      "competency": "Luyện nói: Gọi món & Trợ từ cơ bản (N5)",
      "openingTranslation": "Xin chào quý khách! Quý khách đã chọn được món chưa ạ? Hôm nay quán xin gợi ý cà phê nóng và bánh phô mai.",
      "missionGoals": [
        "Gọi món lịch sự bằng mẫu \"～を ください\".",
        "Sử dụng tự nhiên các lượng từ cơ bản tiếng Nhật (ひとつ / ふたつ)."
      ]
    },
    "scen_ja_free_talk": {
      "title": "Luyện Kaiwa tự do cùng Sensei Nanami",
      "situation": "Trò chuyện mở tự nhiên bằng tiếng Nhật về đời sống hằng ngày, ẩm thực, sở thích hoặc khó khăn khi học.",
      "competency": "Luyện nói: Kaiwa hằng ngày tự nhiên",
      "openingTranslation": "Hãy cùng trò chuyện thoải mái bằng tiếng Nhật về bất cứ điều gì bạn đang nghĩ nhé!",
      "missionGoals": [
        "Phản hồi tự nhiên bằng thể lịch sự tiếng Nhật (です/ます).",
        "Đặt một câu hỏi tiếp nối bằng tiếng Nhật."
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "Trò chuyện thân mật đường phố & giảng đường cùng Keita Senpai",
      "situation": "Hội thoại tiếng Nhật đời thường thoải mái về anime, đời sống đại học, âm nhạc và cách nói ở Tokyo/Osaka.",
      "competency": "Luyện nói: Kaiwa thân mật đường phố & giảng đường",
      "openingTranslation": "Cứ thoải mái trò chuyện thân mật về sở thích, đời sống sinh viên hoặc văn hóa đại chúng Nhật Bản nhé!",
      "missionGoals": [
        "Luyện nhịp hội thoại thân mật tự nhiên.",
        "Phản ứng tự nhiên trước các gợi ý thân thiện."
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "Yêu cầu lịch sự & Xin lời khuyên (〜ていただけますか / 〜たらいいですか)",
      "situation": "Lịch sự xin lời khuyên và hướng dẫn từ anh/chị khóa trên, đồng nghiệp lâu năm hoặc người hướng dẫn tại trường hoặc nơi làm việc.",
      "competency": "Luyện nói: Xin lời khuyên & Yêu cầu lịch sự (N4)",
      "openingTranslation": "Hôm nay bạn vất vả rồi! Dạo này trông bạn bận rộn với báo cáo đại học lắm—có chỗ nào đang làm khó bạn không?",
      "missionGoals": [
        "Giải thích tình huống của bạn một cách lịch sự bằng \"～んです / ～ので\".",
        "Xin lời khuyên bằng mẫu \"～たらいいですか\"."
      ]
    },
    "scen_zh_free_talk": {
      "title": "Huấn luyện tiếng Phổ thông Bắc Kinh chuẩn xác cùng Xiao Mochi",
      "situation": "Hội thoại hai chiều với phản hồi thanh điệu/ngữ pháp tức thì, luyện tập trên bảng trắng trực tiếp và điều hướng bằng giọng nói.",
      "competency": "Luyện nói: Tiếng Phổ thông tự nhiên & Nhịp 4 thanh điệu",
      "openingTranslation": "Này, bạn đến rồi! Bỏ kiểu nói sách giáo khoa đi—nói thật cho mình nghe dạo này phần nào trong tiếng Trung đang làm bạn vấp nhất?",
      "missionGoals": [
        "Luyện phát âm thanh điệu tiếng Trung rõ ràng xuyên suốt cả câu.",
        "Phản hồi Xiao Mochi và yêu cầu bài luyện thanh điệu bất cứ lúc nào."
      ]
    },
    "zh-restaurant-ordering": {
      "title": "Gọi món tại nhà hàng Bắc Kinh (HSK 1-2)",
      "situation": "Bạn đang ở một tiệm mì tại Bắc Kinh và gọi một tô mì bò không cay.",
      "competency": "Gọi món & Lượng từ tiếng Trung",
      "openingTranslation": "Xin chào! Chào mừng đến với Fiezel Chinese Bistro! Quý khách đi mấy người ạ? Quý khách muốn dùng món gì?",
      "missionGoals": [
        "Gọi một tô mì bò (yì wǎn niúròumiàn).",
        "Yêu cầu không cay bằng cách nói \"bú yào là\"."
      ]
    },
    "zh-subway-directions": {
      "title": "Hỏi đường & Đi tàu điện ngầm ở Trung Quốc (HSK 2)",
      "situation": "Bạn đang ở Thượng Hải, tìm ga tàu điện ngầm gần nhất và hỏi xem Tuyến số 2 có đi đến sân bay không.",
      "competency": "Hỏi đường & Phương tiện công cộng bằng tiếng Trung",
      "openingTranslation": "Xin chào! Bạn cần giúp gì không? Bạn muốn đi đâu?",
      "missionGoals": [
        "Hỏi ga tàu điện ngầm ở đâu (dìtiězhàn zài nǎr).",
        "Hỏi xem Tuyến số 2 có đến sân bay được không (néng dào jīchǎng ma)."
      ]
    },
    "scen_ja_trv_01": {
      "title": "Mua & Hâm nóng hộp cơm Bento tại Konbini",
      "situation": "Bạn đang đứng trước quầy cửa hàng tiện lợi ở Shinjuku vào buổi tối với cơm nắm onigiri, cơm hộp bento và trà xanh.",
      "competency": "Kaiwa: Du lịch & Sinh tồn",
      "openingTranslation": "Xin chào quý khách! Quý khách có muốn hâm nóng hộp cơm bento không ạ? Quý khách có cần túi ni-lông không ạ?",
      "missionGoals": [
        "Nhờ nhân viên hâm nóng hộp cơm bento (atatamete kudasai).",
        "Từ chối lấy túi một cách lịch sự (fukuro wa kekkou desu)."
      ]
    },
    "scen_ja_trv_02": {
      "title": "Hỏi đúng sân ga tàu tại nhà ga lớn",
      "situation": "Hỏi nhân viên nhà ga nên đi sân ga nào và chuyển sang tuyến tàu nào tại Tokyo.",
      "competency": "Kaiwa: Du lịch & Sinh tồn",
      "openingTranslation": "Vâng, tôi có thể giúp gì cho bạn? Bạn đang đi về hướng nào ạ?",
      "missionGoals": [
        "Hỏi tuyến tàu đến điểm đích của bạn xuất phát ở sân ga số mấy.",
        "Xác nhận xem có cần chuyển tuyến hay không."
      ]
    },
    "scen_ja_trv_03": {
      "title": "Gọi mì Ramen & Tùy chỉnh sợi mì và nước dùng",
      "situation": "Tùy chỉnh độ dai của sợi mì và độ đậm đà của nước dùng tại quán ramen Nhật Bản.",
      "competency": "Kaiwa: Du lịch & Sinh tồn",
      "openingTranslation": "Xin chào quý khách! Quý khách muốn gọi món gì ạ? Quý khách muốn sợi mì được nấu như thế nào?",
      "missionGoals": [
        "Gọi mì ramen và yêu cầu sợi mì dai hơn (katame).",
        "Lịch sự xin thêm nước lọc hoặc gọi thêm mì."
      ]
    },
    "scen_ja_trv_04": {
      "title": "Nhận phòng khách sạn & Gửi hành lý trước 3 giờ chiều",
      "situation": "Làm thủ tục nhận phòng tại quầy lễ tân khách sạn và xin gửi hành lý khi phòng chưa sẵn sàng.",
      "competency": "Kaiwa: Du lịch & Sinh tồn",
      "openingTranslation": "Chào mừng quý khách. Hôm nay quý khách đến nhận phòng phải không ạ? Cho tôi xin tên người đặt phòng được không ạ?",
      "missionGoals": [
        "Nêu tên đặt phòng của bạn một cách lịch sự.",
        "Xin gửi lại hành lý cho đến giờ nhận phòng (azukete mo ii desu ka)."
      ]
    },
    "scen_ja_trv_05": {
      "title": "Mua thuốc cảm & đau đầu tại hiệu thuốc Nhật Bản",
      "situation": "Mô tả triệu chứng đau họng và sốt với dược sĩ tại Nhật Bản.",
      "competency": "Kaiwa: Du lịch & Sinh tồn",
      "openingTranslation": "Xin chào, hôm nay bạn gặp triệu chứng gì để tôi tư vấn ạ? Bạn có bị sốt không?",
      "missionGoals": [
        "Mô tả triệu chứng rõ ràng (nodo ga itai, v.v.).",
        "Hỏi xem thuốc có gây buồn ngủ không hoặc có cần uống sau bữa ăn không."
      ]
    },
    "scen_ja_wrk_01": {
      "title": "Chào hỏi ngày đầu đi làm & Trao đổi danh thiếp (Meishi Koukan)",
      "situation": "Chào hỏi đội ngũ kỹ sư mới một cách lịch sự và trao đổi danh thiếp đúng chuẩn.",
      "competency": "Kaiwa: Công việc & Kinh doanh",
      "openingTranslation": "Rất vui được gặp bạn, tôi là Sato từ đội ngũ phát triển. Rất mong được hợp tác cùng bạn.",
      "missionGoals": [
        "Giới thiệu bản thân một cách lịch sự.",
        "Nhận danh thiếp một cách trân trọng (choudai itashimasu)."
      ]
    },
    "scen_ja_wrk_02": {
      "title": "Horenso: Báo cáo lỗi & Đề nghị điều chỉnh hạn chót",
      "situation": "Cập nhật rõ ràng cho quản lý về nguyên nhân gốc rễ của lỗi dự án và phương án khắc phục đề xuất.",
      "competency": "Kaiwa: Công việc & Kinh doanh",
      "openingTranslation": "Ừ, có chuyện gì vậy? Dự án mới phát sinh vấn đề à?",
      "missionGoals": [
        "Trình bày ngắn gọn tiến độ và nguyên nhân lỗi.",
        "Đề xuất cách khắc phục cụ thể và mốc thời gian mới một cách lịch sự."
      ]
    },
    "scen_ja_wrk_03": {
      "title": "Nghi thức Nomikai công sở: Nâng ly chúc mừng & Tạo dựng mối quan hệ",
      "situation": "Tham gia buổi tụ họp cùng đội sau giờ làm, nâng ly chúc mừng và trò chuyện tự nhiên với đồng nghiệp.",
      "competency": "Kaiwa: Công việc & Kinh doanh",
      "openingTranslation": "Cảm ơn mọi người đã vất vả vì dự án này! Mình cùng nâng ly trước nhé—bạn muốn uống gì nào?",
      "missionGoals": [
        "Nói lời chúc mừng/cụng ly lịch sự (otsukaresama desu, kanpai!).",
        "Hỏi đồng nghiệp gợi ý món ăn hoặc đồ uống."
      ]
    },
    "scen_ja_soc_01": {
      "title": "Rủ bạn đi chơi vào cuối tuần",
      "situation": "Lên kế hoạch cuối tuần, thống nhất điểm hẹn và giữ cuộc trò chuyện ấm áp, tự nhiên.",
      "competency": "Kaiwa: Đời sống & Giao tiếp",
      "openingTranslation": "Này, cuối tuần này bạn có kế hoạch gì chưa? Nghe nói trời sẽ nắng đẹp đấy!",
      "missionGoals": [
        "Đề xuất một kế hoạch cuối tuần thật tự nhiên.",
        "Xác nhận rõ ràng thời gian và địa điểm gặp mặt."
      ]
    },
    "scen_ja_soc_02": {
      "title": "Hỏi chủ nhà về quy định phân loại rác ở căn hộ",
      "situation": "Bạn vừa chuyển đến một căn hộ ở Tokyo và muốn xác nhận ngày đổ rác cháy được cũng như quy định bỏ chai nhựa PET.",
      "competency": "Kaiwa: Đời sống & Giao tiếp",
      "openingTranslation": "Ồ, chào mừng bạn mới chuyển đến nhé! Mọi thứ ổn cả chứ? Bạn nắm rõ cách phân loại rác chưa?",
      "missionGoals": [
        "Hỏi xem ngày nào đổ rác cháy được (Moeru gomi wa nan-youbi desu ka).",
        "Hỏi cách vứt chai nhựa PET đúng quy định."
      ]
    },
    "scen_ja_acd_01": {
      "title": "Tham vấn luận văn & Sửa bài nghiên cứu tại văn phòng giáo sư",
      "situation": "Thảo luận một cách trang trọng với giáo sư hướng dẫn người Nhật về giả thuyết nghiên cứu và phương pháp khảo sát của bạn.",
      "competency": "Kaiwa: Học thuật & Trang trọng",
      "openingTranslation": "Mời em vào. Tôi đã đọc bản tóm tắt báo cáo em nộp—hướng tiếp cận nghiên cứu của em khá thú vị đấy.",
      "missionGoals": [
        "Mở lời một cách trang trọng (Shitsurei itashimasu).",
        "Lễ phép xin nhận xét góp ý về phương pháp khảo sát."
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic: Định hướng công thức & Bài kiểm tra đánh giá năng lực",
      "situation": "Đánh giá mức độ sẵn sàng cho phần Nói PTE của bạn và nắm chiến lược chấm điểm cốt lõi ưu tiên độ trôi chảy.",
      "competency": "PTE Academic: Định hướng & Đánh giá năng lực",
      "openingTranslation": "Hãy cùng xác định tốc độ nói và mức điểm PTE mục tiêu ban đầu của bạn ngay bây giờ.",
      "missionGoals": [
        "Nói trôi chảy, không ngập ngừng quá lâu.",
        "Nêu rõ điểm mục tiêu và lộ trình thời gian của bạn."
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE Cấp độ 1: Làm chủ Describe Image (Mẫu câu vạn năng)",
      "situation": "Trình bày phần mô tả hình ảnh trong 40 giây thật mượt mà, tập trung vào độ trôi chảy liên tục (5/5).",
      "competency": "PTE Speaking: Mẫu câu vạn năng cho Describe Image",
      "openingTranslation": "Mô tả biểu đồ trên màn hình một cách trôi chảy trong 40 giây mà không ngắt quãng.",
      "missionGoals": [
        "Bao gồm tiêu đề, điểm cao nhất, điểm thấp nhất và kết luận ngắn gọn.",
        "Duy trì nhịp độ ổn định và tuyệt đối không tự sửa lời."
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE Cấp độ 2: Read Aloud (Ngắt cụm từ & Nhịp độ 130 WPM)",
      "situation": "Đọc thành tiếng các đoạn văn học thuật bằng cách ngắt cụm từ có nghĩa và phát âm rõ ràng, dứt khoát.",
      "competency": "PTE Speaking & Reading: Ngắt cụm từ trong Read Aloud",
      "openingTranslation": "Đọc to đoạn văn rõ ràng theo nhịp độ học thuật ổn định.",
      "missionGoals": [
        "Nhóm các từ thành những cụm cú pháp tự nhiên.",
        "Phát âm chuẩn xác các từ khóa học thuật mà không đọc vội."
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE Cấp độ 3: Repeat Sentence (Chiến lược ghi nhớ âm thanh)",
      "situation": "Nhắc lại rõ ràng các câu học thuật, giữ nguyên nhịp điệu và ý nghĩa cốt lõi.",
      "competency": "PTE Speaking & Listening: Luyện nhại theo (Shadowing) cho Repeat Sentence",
      "openingTranslation": "Nghe kỹ và nhắc lại ngay từng câu với nhịp điệu mượt mà.",
      "missionGoals": [
        "Nắm bắt nhịp điệu của mệnh đề mở đầu và mệnh đề kết thúc.",
        "Duy trì độ trôi chảy ngay cả với những câu dài hơn."
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE Cấp độ 4: Write from Dictation & Chính tả học thuật",
      "situation": "Ghi nhớ và viết lại từng chữ của câu được đọc với dạng số nhiều chuẩn xác và chính tả học thuật.",
      "competency": "PTE Listening & Writing: Write from Dictation",
      "openingTranslation": "Kiểm tra chính xác từng từ, đuôi số nhiều và chính tả.",
      "missionGoals": [
        "Kiểm tra kỹ đuôi chia thì và mạo từ.",
        "Kiểm tra lại các cụm từ cố định học thuật có tần suất xuất hiện cao."
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: Lộ trình từ con số 0 đến đậu >= 65% (trang 1-91)",
      "situation": "Buổi kèm 1-1 cùng SSW SENSEI từ đầu để chinh phục kỳ thi CBT Chế biến Thực phẩm của Prometric (40 câu hỏi / 70 phút, điểm đạt 65%).",
      "competency": "SSW: Lộ trình & Giải mã cho người mới bắt đầu (trang 1-6)",
      "openingTranslation": "Lời chào mở đầu của SSW SENSEI: Sẵn sàng hướng dẫn bạn từ Unit 0 (trang 1-6) đến Bài thi thử CBT & bài toán dùng máy tính (>= 65%).",
      "missionGoals": [
        "Kiểm tra tiến độ học tập của bạn và hiểu lý do vì sao người mới bắt đầu cần học Unit 0 (trang 1-6) trước tiên.",
        "Làm chủ bản cập nhật chính thức OTAFF Ver 5.1 tháng 4 năm 2026 (9 mục Bắt buộc gồm Kurumi & Cashew Nut + 20 mục Khuyến nghị gồm Pistachio).",
        "Hoàn thành ít nhất 1 câu hỏi trắc nghiệm CBT hoặc câu tính toán kèm giải thích đối chiếu trang PDF gốc."
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "Mô phỏng Bài thi thử CBT 50 câu & Bẫy Wakai Papa",
      "situation": "Kiểm tra độ chính xác khi chọn đáp án A, B hoặc C ở các câu hỏi Prometric & phân tích lập luận đằng sau từng đáp án bẫy tại các trang giải thích 75-91.",
      "competency": "SSW: Mô phỏng Bài thi thử CBT & Phân tích bẫy",
      "openingTranslation": "Lời chào Bài thi thử CBT: Sẵn sàng kiểm tra khả năng nhận diện bẫy câu hỏi Prometric của bạn và chấm điểm trực tiếp.",
      "missionGoals": [
        "Trả lời các câu hỏi CBT mà không mắc bẫy các từ như yukkuri hoặc zero percent.",
        "Xem số trang câu hỏi và trang giải thích đầy đủ sau khi trả lời."
      ]
    },
    "scen_ssw_math_visual": {
      "title": "Lớp Toán Máy Tính CBT (Nồng độ Clo ppm, Budomari & Lò nướng)",
      "situation": "Luyện tập chuyên sâu 5 công thức máy tính CBT SSW (Pha loãng Clo, Budomari, Công thức làm bánh mì, Công suất lò nướng và Tăng trưởng vi khuẩn 2^n).",
      "competency": "SSW: Công thức Toán Máy Tính CBT",
      "openingTranslation": "Lời chào Lớp Toán: Tập trung vào công thức clo C1*V1=C2*V2, tỷ lệ thành phẩm budomari và mẹo làm tròn lên.",
      "missionGoals": [
        "Ghi nhớ quy đổi 1% = 10,000 ppm và công thức C1*V1 = C2*V2 (lượng nước = V2 - V1).",
        "Trả lời các câu hỏi tính toán lò nướng / phi lê / clo mà không mắc bẫy các đáp án làm tròn."
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "Luyện tập 266 Kotoba & Cách đọc Nhà máy Thực phẩm (tr. 46-63)",
      "situation": "Luyện ghi nhớ 266 Kotoba từ Ngân hàng Ghi nhớ (tr. 46-63) bằng phương pháp chủ động gợi nhớ, kỹ thuật Bản đồ Nhật Bản & phát âm chuẩn bản xứ.",
      "competency": "SSW: Ghi nhớ 266 Kotoba Nhà máy & Kỳ thi",
      "openingTranslation": "Lời chào Luyện Kotoba: Tập trung nắm vững 266 từ vựng nhà máy thực phẩm và 142 thuật ngữ mục lục chính thức của OTAFF.",
      "missionGoals": [
        "Trả lời ý nghĩa và cách đọc của ít nhất 3 thuật ngữ Kotoba chính thức từ Ngân hàng (tr. 46-63)."
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "Bạn đang tham gia buổi thực hành hội thoại đầu tiên tại FIEZEL và chào hỏi giảng viên trong lớp.",
      "openingTranslation": "Xin chào! Chào mừng bạn đến với lớp tiếng Nhật FIEZEL! Rất vui được gặp bạn."
    },
    "scen_ja_fiezel-life_02": {
      "situation": "Giảng viên nói hơi nhanh và bạn muốn nhờ họ nhắc lại hoặc nói rằng bạn chưa hiểu.",
      "openingTranslation": "Xin lỗi, phần giải thích vừa rồi có rõ ràng không? Nếu có chỗ nào chưa rõ, đừng ngần ngại cho tôi biết nhé."
    },
    "scen_ja_fiezel-life_03": {
      "situation": "Giới thiệu tên, quê hương (Indonesia) và tình trạng công việc/học tập của bạn.",
      "openingTranslation": "Bạn tên là gì và bạn đến từ đâu? Tôi đến từ Tokyo."
    },
    "scen_ja_fiezel-life_04": {
      "situation": "Giải thích về thành phố và khu vực nơi bạn đang sinh sống tại Nhật Bản.",
      "openingTranslation": "Bạn đã quen với cuộc sống ở Nhật Bản chưa? Hiện tại bạn đang sống ở đâu?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "Nói về những món ăn yêu thích và bày tỏ sự yêu thích đối với ẩm thực Nhật Bản.",
      "openingTranslation": "Bạn thích ăn gì vào bữa trưa? Bạn đã bao giờ thử món ăn Nhật Bản chưa?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "Gọi một suất combo đồ ăn và thức uống tại nhà hàng thức ăn nhanh.",
      "openingTranslation": "Xin chào quý khách! Quý khách đã chọn được món muốn gọi chưa ạ?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "Mô tả các tiện nghi và số lượng phòng trong căn hộ của bạn.",
      "openingTranslation": "Chỗ ở mới của bạn thế nào? Ở đó có bao nhiêu phòng?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "Mô tả vị trí của một đồng nghiệp trong khu vực văn phòng hoặc nhà máy.",
      "openingTranslation": "Này, Yamada-san đâu rồi? Bạn có thấy anh/chị ấy không?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "Giải thích giờ nghỉ trưa và lịch trình làm việc hằng ngày.",
      "openingTranslation": "Cố gắng làm việc tốt nhé! Giờ nghỉ trưa bắt đầu và kết thúc lúc mấy giờ?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "Lịch sự mượn đồ dùng văn phòng (dập ghim/kéo) từ đồng nghiệp.",
      "openingTranslation": "Bạn đang sắp xếp tài liệu à? Có dụng cụ hay đồ dùng nào bạn cần sử dụng không?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "Nói về những sở thích thư giãn và niềm vui đọc manga hoặc xem anime.",
      "openingTranslation": "Vào ngày nghỉ bạn thường làm gì? Có bộ anime hay manga nào bạn thích không?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "Lịch sự nhận lời hoặc từ chối lời mời đi uống cùng đồng nghiệp.",
      "openingTranslation": "Thứ Sáu này sau giờ làm bạn có muốn đi uống cùng nhau không?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "Hỏi đường đi và xác nhận xem có tuyến xe buýt nào đi đến sân bay không.",
      "openingTranslation": "Tôi muốn đi đến Sân bay Narita—tôi nên bắt chuyến xe buýt nào?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "Hỏi tên các tòa nhà và công trình công cộng xung quanh thành phố.",
      "openingTranslation": "Bạn có thấy tòa nhà cao đằng kia không? Bạn có biết đó là tòa nhà gì không?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "Hỏi nhân viên thu ngân cửa hàng xem pin hoặc các vật dụng thiết yếu hằng ngày nằm ở đâu.",
      "openingTranslation": "Bạn đang mua sắm ở konbini à? Bạn có đang tìm món gì không?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "Hỏi giá quần áo và kiểm tra xem có được giảm giá không.",
      "openingTranslation": "Bộ trang phục này trông rất hợp với bạn đấy! Bạn đã xem giá chưa?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "Nói về việc đi xem phim cùng bạn bè vào cuối tuần.",
      "openingTranslation": "Cuối tuần của bạn thế nào? Bạn có đi chơi đâu không?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "Bày tỏ mong muốn đi nghỉ dưỡng tại suối nước nóng (onsen).",
      "openingTranslation": "Thời tiết đang trở lạnh rồi nhỉ? Tôi thấy muốn đi đến nơi nào đó ấm áp."
    },
    "scen_ja_fiezel-life_19": {
      "situation": "Bạn đang tham gia buổi thực hành hội thoại đầu tiên tại FIEZEL và chào hỏi giảng viên trong lớp.",
      "openingTranslation": "Xin chào! Chào mừng bạn đến với lớp tiếng Nhật FIEZEL! Rất vui được gặp bạn."
    },
    "scen_ja_fiezel-life_20": {
      "situation": "Giảng viên nói hơi nhanh và bạn muốn nhờ họ nhắc lại hoặc nói rằng bạn chưa hiểu.",
      "openingTranslation": "Xin lỗi, phần giải thích vừa rồi có rõ ràng không? Nếu có chỗ nào chưa rõ, đừng ngần ngại cho tôi biết nhé."
    },
    "scen_ja_fiezel-life_21": {
      "situation": "Giới thiệu tên, quê hương (Indonesia) và tình trạng công việc/học tập của bạn.",
      "openingTranslation": "Bạn tên là gì và bạn đến từ đâu? Tôi đến từ Tokyo."
    },
    "scen_ja_fiezel-life_22": {
      "situation": "Giải thích về thành phố và khu vực nơi bạn đang sinh sống tại Nhật Bản.",
      "openingTranslation": "Bạn đã quen với cuộc sống ở Nhật Bản chưa? Hiện tại bạn đang sống ở đâu?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "Nói về những món ăn yêu thích và bày tỏ sự yêu thích đối với ẩm thực Nhật Bản.",
      "openingTranslation": "Bạn thích ăn gì vào bữa trưa? Bạn đã bao giờ thử món ăn Nhật Bản chưa?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "Gọi một suất combo đồ ăn và thức uống tại nhà hàng thức ăn nhanh.",
      "openingTranslation": "Xin chào quý khách! Quý khách đã chọn được món muốn gọi chưa ạ?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "Mô tả các tiện nghi và số lượng phòng trong căn hộ của bạn.",
      "openingTranslation": "Chỗ ở mới của bạn thế nào? Ở đó có bao nhiêu phòng?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "Mô tả vị trí của một đồng nghiệp trong khu vực văn phòng hoặc nhà máy.",
      "openingTranslation": "Này, Yamada-san đâu rồi? Bạn có thấy anh/chị ấy không?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "Giải thích giờ nghỉ trưa và lịch trình làm việc hằng ngày.",
      "openingTranslation": "Cố gắng làm việc tốt nhé! Giờ nghỉ trưa bắt đầu và kết thúc lúc mấy giờ?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "Lịch sự mượn đồ dùng văn phòng (dập ghim/kéo) từ đồng nghiệp.",
      "openingTranslation": "Bạn đang sắp xếp tài liệu à? Có dụng cụ hay đồ dùng nào bạn cần sử dụng không?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "Nói về những sở thích thư giãn và niềm vui đọc manga hoặc xem anime.",
      "openingTranslation": "Vào ngày nghỉ bạn thường làm gì? Có bộ anime hay manga nào bạn thích không?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "Lịch sự nhận lời hoặc từ chối lời mời đi uống cùng đồng nghiệp.",
      "openingTranslation": "Thứ Sáu này sau giờ làm bạn có muốn đi uống cùng nhau không?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "Hỏi đường đi và xác nhận xem có tuyến xe buýt nào đi đến sân bay không.",
      "openingTranslation": "Tôi muốn đi đến Sân bay Narita—tôi nên bắt chuyến xe buýt nào?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "Hỏi tên các tòa nhà và công trình công cộng xung quanh thành phố.",
      "openingTranslation": "Bạn có thấy tòa nhà cao đằng kia không? Bạn có biết đó là tòa nhà gì không?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "Hỏi nhân viên thu ngân cửa hàng xem pin hoặc các vật dụng thiết yếu hằng ngày nằm ở đâu.",
      "openingTranslation": "Bạn đang mua sắm ở konbini à? Bạn có đang tìm món gì không?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "Hỏi giá quần áo và kiểm tra xem có được giảm giá không.",
      "openingTranslation": "Bộ trang phục này trông rất hợp với bạn đấy! Bạn đã xem giá chưa?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "Nói về việc đi xem phim cùng bạn bè vào cuối tuần.",
      "openingTranslation": "Cuối tuần của bạn thế nào? Bạn có đi chơi đâu không?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "Bày tỏ mong muốn đi nghỉ dưỡng tại suối nước nóng (onsen).",
      "openingTranslation": "Thời tiết đang trở lạnh rồi nhỉ? Tôi thấy muốn đi đến nơi nào đó ấm áp."
    },
    "scen_ja_fiezel-life_37": {
      "situation": "Bạn đang tham gia buổi thực hành hội thoại đầu tiên tại FIEZEL và chào hỏi giảng viên trong lớp.",
      "openingTranslation": "Xin chào! Chào mừng bạn đến với lớp tiếng Nhật FIEZEL! Rất vui được gặp bạn."
    },
    "scen_ja_fiezel-life_38": {
      "situation": "Giảng viên nói hơi nhanh và bạn muốn nhờ họ nhắc lại hoặc nói rằng bạn chưa hiểu.",
      "openingTranslation": "Xin lỗi, phần giải thích vừa rồi có rõ ràng không? Nếu có chỗ nào chưa rõ, đừng ngần ngại cho tôi biết nhé."
    },
    "scen_ja_fiezel-life_39": {
      "situation": "Giới thiệu tên, quê hương (Indonesia) và tình trạng công việc/học tập của bạn.",
      "openingTranslation": "Bạn tên là gì và bạn đến từ đâu? Tôi đến từ Tokyo."
    },
    "scen_ja_fiezel-life_40": {
      "situation": "Giải thích về thành phố và khu vực nơi bạn đang sinh sống tại Nhật Bản.",
      "openingTranslation": "Bạn đã quen với cuộc sống ở Nhật Bản chưa? Hiện tại bạn đang sống ở đâu?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "Nói về những món ăn yêu thích và bày tỏ sự yêu thích đối với ẩm thực Nhật Bản.",
      "openingTranslation": "Bạn thích ăn gì vào bữa trưa? Bạn đã bao giờ thử món ăn Nhật Bản chưa?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "Gọi một suất combo đồ ăn và thức uống tại nhà hàng thức ăn nhanh.",
      "openingTranslation": "Xin chào quý khách! Quý khách đã chọn được món muốn gọi chưa ạ?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "Mô tả các tiện nghi và số lượng phòng trong căn hộ của bạn.",
      "openingTranslation": "Chỗ ở mới của bạn thế nào? Ở đó có bao nhiêu phòng?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "Mô tả vị trí của một đồng nghiệp trong khu vực văn phòng hoặc nhà máy.",
      "openingTranslation": "Này, Yamada-san đâu rồi? Bạn có thấy anh/chị ấy không?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "Giải thích giờ nghỉ trưa và lịch trình làm việc hằng ngày.",
      "openingTranslation": "Cố gắng làm việc tốt nhé! Giờ nghỉ trưa bắt đầu và kết thúc lúc mấy giờ?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "Lịch sự mượn đồ dùng văn phòng (dập ghim/kéo) từ đồng nghiệp.",
      "openingTranslation": "Bạn đang sắp xếp tài liệu à? Có dụng cụ hay đồ dùng nào bạn cần sử dụng không?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "Nói về những sở thích thư giãn và niềm vui đọc manga hoặc xem anime.",
      "openingTranslation": "Vào ngày nghỉ bạn thường làm gì? Có bộ anime hay manga nào bạn thích không?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "Lịch sự nhận lời hoặc từ chối lời mời đi uống cùng đồng nghiệp.",
      "openingTranslation": "Thứ Sáu này sau giờ làm bạn có muốn đi uống cùng nhau không?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "Hỏi đường đi và xác nhận xem có tuyến xe buýt nào đi đến sân bay không.",
      "openingTranslation": "Tôi muốn đi đến Sân bay Narita—tôi nên bắt chuyến xe buýt nào?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "Hỏi tên các tòa nhà và công trình công cộng xung quanh thành phố.",
      "openingTranslation": "Bạn có thấy tòa nhà cao đằng kia không? Bạn có biết đó là tòa nhà gì không?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "Hỏi nhân viên thu ngân cửa hàng xem pin hoặc các vật dụng thiết yếu hằng ngày nằm ở đâu.",
      "openingTranslation": "Bạn đang mua sắm ở konbini à? Bạn có đang tìm món gì không?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "Hỏi giá quần áo và kiểm tra xem có được giảm giá không.",
      "openingTranslation": "Bộ trang phục này trông rất hợp với bạn đấy! Bạn đã xem giá chưa?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "Nói về việc đi xem phim cùng bạn bè vào cuối tuần.",
      "openingTranslation": "Cuối tuần của bạn thế nào? Bạn có đi chơi đâu không?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "Bày tỏ mong muốn đi nghỉ dưỡng tại suối nước nóng (onsen).",
      "openingTranslation": "Thời tiết đang trở lạnh rồi nhỉ? Tôi thấy muốn đi đến nơi nào đó ấm áp."
    }
  },
  "fil": {
    "scen_en_a2_cafe": {
      "title": "Pag-order ng Kape at Pagpapaliwanag ng mga Plano sa Hapon",
      "situation": "Makikipagkita ka kay Coach Alex sa isang café bago ang team meeting. Umorder nang magalang at ibahagi ang mga plano mo ngayong hapon gamit ang Present Continuous.",
      "competency": "Speaking A2: Mga Nakatakdang Plano at Transaksyon sa Café",
      "openingTranslation": "Kumusta! Mabuti at nagkita tayo sa cafe. Ano ang gusto mong inumin ngayon, at ano ang gagawin mo pagkatapos nating magkape?",
      "missionGoals": [
        "Gamitin ang \"I would like...\" o \"I'd like...\" upang umorder ng inumin nang magalang.",
        "Gamitin ang Present Continuous (\"I am meeting...\" / \"I am working on...\") para sa hapong ito."
      ]
    },
    "scen_en_free_talk": {
      "title": "Free Talk: Malayang Pakikipag-usap kay Coach Alex",
      "situation": "Makipagkuwentuhan nang malaya tungkol sa kahit anong paksa: mga libangan, plano, opinyon, o pang-araw-araw na kuwento nang walang nakatakdang prompt.",
      "competency": "Speaking: Malayang Pag-uusap at Kusang Pagsagot",
      "openingTranslation": "Magtanong at sumagot nang malaya tungkol sa pang-araw-araw na paksa, mga hamon sa pag-aaral, o personal na layunin.",
      "missionGoals": [
        "Ipahayag nang direkta ang mga ideya nang hindi natitigilan.",
        "Sumagot nang natural sa mga biglaang follow-up na tanong."
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "Maayos na Pangangatwiran at May Kumpiyansang Talakayan kasama si Coach Sarah",
      "situation": "Magsanay ng malinaw at organisadong pagsasalita, lohikal na pangangatwiran, at natural na pananalitang pang-propesyonal.",
      "competency": "Speaking: Organisadong Pangangatwiran at Kalinawan",
      "openingTranslation": "Magbahagi ng malinaw at organisadong mga sagot na may dahilan at halimbawa.",
      "missionGoals": [
        "Ipahayag nang malinaw ang iyong opinyon na may mga sumusuportang dahilan.",
        "Gumamit ng maayos at lohikal na mga transisyon."
      ]
    },
    "scen_en_a1_hometown": {
      "title": "Present Simple: Paglalarawan ng Iyong Bayan at Kapitbahayan",
      "situation": "Magkuwento nang natural tungkol sa lugar na tinitirhan mo, pang-araw-araw na gawain, at mga paboritong lugar sa malapit.",
      "competency": "Speaking: Present Simple at mga Pang-araw-araw na Lugar",
      "openingTranslation": "Ikuwento sa akin ang tungkol sa iyong bayan at kung anong mga lugar sa malapit ang gusto mo.",
      "missionGoals": [
        "Gamitin nang maayos ang Present Simple (\"I live in...\", \"There is/are...\").",
        "Maglarawan ng 1–2 pamilyar na lugar malapit sa bahay."
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "Simple Past Tense: Mga Irregular Verb at Kuwento ng Paglalakbay",
      "situation": "Ikuwento ang isang nakaraang biyahe gamit ang mga irregular verb (went, saw, bought, ate) na may malinaw na pagkakasunod-sunod.",
      "competency": "Speaking: Pagkukuwento Gamit ang Past Tense",
      "openingTranslation": "Ikuwento sa akin ang isang hindi malilimutang biyahe na ginawa mo kamakailan!",
      "missionGoals": [
        "Gamitin nang tama ang mga irregular past verb (went, ate, took, saw).",
        "Panatilihing nasa malinaw na pagkakasunod-sunod ang mga pangyayari."
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "Exam Mode · Nakabalangkas na Opinyon at mga Concessive Clause",
      "situation": "Pormal na IELTS Speaking simulation na nakatuon sa balanseng argumento, eksaktong pagpili ng salita, at malinaw na daloy ng ideya.",
      "competency": "Pagsasalita: IELTS Academic Part 1–3 Simulation",
      "openingTranslation": "Sumagot nang tuloy-tuloy gamit ang mga organisadong halimbawa at balanseng pangangatwiran.",
      "missionGoals": [
        "Magbigay ng mas mahaba at detalyadong sagot nang walang paulit-ulit na ideya.",
        "Gamitin nang natural ang mga concessive clause at akademikong pang-ugnay."
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "Object Particle na を (o) at Pag-order Gamit ang ください (kudasai)",
      "situation": "Mag-order ng kape o cake nang natural sa isang café sa Tokyo gamit ang tamang mga particle at magagalang na pamilang.",
      "competency": "Pagsasalita: Pag-order at mga Pangunahing Particle (N5)",
      "openingTranslation": "Maligayang pagdating! Nakapili na ba kayo ng oorderin? Ngayong araw, inirerekomenda namin ang mainit na kape at cheesecake.",
      "missionGoals": [
        "Mag-order nang magalang gamit ang \"～を ください\".",
        "Gamitin nang natural ang mga pangunahing pamilang sa Hapon (ひとつ / ふたつ)."
      ]
    },
    "scen_ja_free_talk": {
      "title": "Malayang Kaiwa Practice kasama si Sensei Nanami",
      "situation": "Natural at malayang pag-uusap sa wikang Hapon tungkol sa pang-araw-araw na buhay, pagkain, libangan, o mga hamon sa pag-aaral.",
      "competency": "Pagsasalita: Natural na Pang-araw-araw na Kaiwa",
      "openingTranslation": "Magkuwentuhan tayo nang kumportable sa wikang Hapon tungkol sa kahit anong nasa isip mo!",
      "missionGoals": [
        "Sumagot nang natural sa magalang na wikang Hapon (です/ます).",
        "Magtanong ng isang follow-up na tanong sa wikang Hapon."
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "Kaswal na Kuwentuhan sa Kalye at Campus kasama si Keita Senpai",
      "situation": "Relaks na pang-araw-araw na pag-uusap sa Hapon tungkol sa anime, buhay-campus, musika, at mga ekspresyon sa Tokyo/Osaka.",
      "competency": "Pagsasalita: Kaswal na Kaiwa sa Kalye at Campus",
      "openingTranslation": "Huwag mahiyang magkuwento nang kaswal tungkol sa mga libangan, buhay-campus, o pop culture ng Japan!",
      "missionGoals": [
        "Magsanay ng kaswal na daloy ng pag-uusap.",
        "Mag-react nang natural sa mga palakaibigang tanong o paksa."
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "Magagalang na Pakiusap at Paghingi ng Payo (〜ていただけますか / 〜たらいいですか)",
      "situation": "Magalang na humingi ng payo at gabay sa nakatatandang kasamahan o mentor sa paaralan o trabaho.",
      "competency": "Pagsasalita: Paghingi ng Payo at Magagalang na Pakiusap (N4)",
      "openingTranslation": "Magandang trabaho ngayong araw! Mukhang abala ka sa mga report sa unibersidad nitong mga nakaraan—may nagpapahirap ba sa iyo?",
      "missionGoals": [
        "Ipaliwanag nang magalang ang iyong sitwasyon gamit ang \"～んです / ～ので\".",
        "Humingi ng payo gamit ang \"～たらいいですか\"."
      ]
    },
    "scen_zh_free_talk": {
      "title": "Awtentikong Beijing Mandarin Coaching kasama si Xiao Mochi",
      "situation": "Dalawahang pag-uusap na may agarang feedback sa tono at gramatika, live whiteboard drills, at voice navigation.",
      "competency": "Pagsasalita: Natural na Putonghua at Daloy ng 4 na Tono",
      "openingTranslation": "Uy, nakarating ka! Bitawan muna ang boses-textbook—sabihin mo nang tapat, aling parte ng Mandarin ang nagpapahirap sa iyo nitong mga nakaraan?",
      "missionGoals": [
        "Sanayin nang malinaw ang mga tono sa Mandarin sa buong pangungusap.",
        "Sumagot kay Xiao Mochi at humingi ng mga tone drill kahit kailan."
      ]
    },
    "zh-restaurant-ordering": {
      "title": "Pag-order ng Pagkain sa Isang Restawran sa Beijing (HSK 1-2)",
      "situation": "Nasa isang tindahan ng noodles ka sa Beijing at nag-oorder ng isang mangkok ng beef noodles na walang anghang.",
      "competency": "Pag-order ng Pagkain at mga Measure Word sa Mandarin",
      "openingTranslation": "Kumusta! Maligayang pagdating sa Fiezel Chinese Bistro! Mesa para sa ilan? Ano ang gusto ninyong kainin?",
      "missionGoals": [
        "Mag-order ng isang mangkok ng beef noodles (yì wǎn niúròumiàn).",
        "Humingi ng hindi maanghang gamit ang \"bú yào là\"."
      ]
    },
    "zh-subway-directions": {
      "title": "Pagtatanong ng Direksyon at Pagsakay sa Subway sa China (HSK 2)",
      "situation": "Nasa Shanghai ka na naghahanap ng pinakamalapit na istasyon ng subway at nagtatanong kung papunta sa airport ang Line 2.",
      "competency": "Direksyon at Pampublikong Transportasyon sa Mandarin",
      "openingTranslation": "Kumusta! Kailangan mo ba ng tulong? Saan mo gustong pumunta?",
      "missionGoals": [
        "Itanong kung nasaan ang istasyon ng subway (dìtiězhàn zài nǎr).",
        "Itanong kung umaabot sa airport ang Line 2 (néng dào jīchǎng ma)."
      ]
    },
    "scen_ja_trv_01": {
      "title": "Pagbili at Pagpapainit ng Bento sa Isang Konbini",
      "situation": "Nasa counter ka ng isang convenience store sa Shinjuku sa gabi na may dalang onigiri, bento, at green tea.",
      "competency": "Kaiwa: Paglalakbay at Survival",
      "openingTranslation": "Maligayang pagdating! Gusto po ba ninyong ipainit ang inyong bento? Kailangan po ba ninyo ng plastic bag?",
      "missionGoals": [
        "Pakiusapan ang staff na painitin ang bento (atatamete kudasai).",
        "Magalang na tanggihan ang plastic bag (fukuro wa kekkou desu)."
      ]
    },
    "scen_ja_trv_02": {
      "title": "Pagtatanong ng Tamang Platform ng Tren sa Malaking Istasyon",
      "situation": "Tanungin ang staff ng istasyon kung aling platform at lilipatang linya ang sasakyan sa Tokyo.",
      "competency": "Kaiwa: Paglalakbay at Survival",
      "openingTranslation": "Opo, paano po ako makakatulong? Saang direksyon po kayo papunta?",
      "missionGoals": [
        "Itanong kung aling numero ng platform ang para sa linya ng pupuntahan mo.",
        "Kumpirmahin kung kailangang lumipat ng tren."
      ]
    },
    "scen_ja_trv_03": {
      "title": "Pag-order ng Ramen at Pagpili ng Luto ng Noodles at Sabaw",
      "situation": "Piliin ang tigas ng noodles at lasa ng sabaw sa isang ramen shop sa Japan.",
      "competency": "Kaiwa: Paglalakbay at Survival",
      "openingTranslation": "Maligayang pagdating! Ano po ang oorderin ninyo? Paano ninyo gustong lutuin ang inyong noodles?",
      "missionGoals": [
        "Mag-order ng ramen at humiling ng mas matigas na noodles (katame).",
        "Humingi ng tubig o dagdag na noodles nang magalang."
      ]
    },
    "scen_ja_trv_04": {
      "title": "Pag-check in sa Hotel at Pag-iwan ng Bagahe Bago Mag-3 PM",
      "situation": "Mag-check in sa front desk ng hotel at makiusap na ipatago muna ang bagahe bago maging handa ang kuwarto.",
      "competency": "Kaiwa: Paglalakbay at Survival",
      "openingTranslation": "Maligayang pagdating. Magche-check in po ba kayo ngayon? Maaari ko po bang makuha ang pangalan sa inyong reservation?",
      "missionGoals": [
        "Sabihin nang magalang ang pangalan sa iyong reservation.",
        "Makiusap na iwan muna ang iyong bagahe hanggang sa check-in (azukete mo ii desu ka)."
      ]
    },
    "scen_ja_trv_05": {
      "title": "Pagbili ng Gamot sa Sipon at Sakit ng Ulo sa Parmasya sa Japan",
      "situation": "Ilarawan ang mga sintomas ng pananakit ng lalamunan at lagnat sa isang parmasyutiko sa Japan.",
      "competency": "Kaiwa: Paglalakbay at Survival",
      "openingTranslation": "Kumusta, anong mga sintomas ang matutulungan ko sa inyo ngayon? May lagnat po ba kayo?",
      "missionGoals": [
        "Ilarawan nang malinaw ang mga sintomas (nodo ga itai, atbp.).",
        "Itanong kung nakakaantok ang gamot o kung dapat itong inumin pagkatapos kumain."
      ]
    },
    "scen_ja_wrk_01": {
      "title": "Pagbati sa Unang Araw sa Opisina at Pagpapalitan ng Business Card (Meishi Koukan)",
      "situation": "Batiin nang magalang ang iyong bagong engineering team at makipagpalitan ng business card nang maayos.",
      "competency": "Kaiwa: Trabaho at Negosyo",
      "openingTranslation": "Ikinagagalak kong makilala ka, ako si Sato mula sa development team. Umaasa akong magiging maayos ang ating pagtatrabaho.",
      "missionGoals": [
        "Magbigay ng magalang na pagpapakilala sa sarili.",
        "Tanggapin ang business card nang may paggalang (choudai itashimasu)."
      ]
    },
    "scen_ja_wrk_02": {
      "title": "Horenso: Pag-uulat ng Bug at Paghingi ng Pagbabago sa Deadline",
      "situation": "Malinaw na i-update ang iyong manager tungkol sa ugat ng bug sa proyekto at ang iminumungkahing solusyon.",
      "competency": "Kaiwa: Trabaho at Negosyo",
      "openingTranslation": "Oo, ano'ng nangyari? Nagkaproblema ba sa proyekto?",
      "missionGoals": [
        "Ilahad nang maikli at malinaw ang progreso at ang dahilan ng bug.",
        "Magmungkahi ng konkretong ayos at bagong timeline nang magalang."
      ]
    },
    "scen_ja_wrk_03": {
      "title": "Etiketa sa Office Nomikai: Pag-toast at Pagpapalalim ng Samahan",
      "situation": "Sumali sa pagtitipon ng team pagkatapos ng trabaho, magbigay ng toast, at makipagkuwentuhan nang natural sa mga katrabaho.",
      "competency": "Kaiwa: Trabaho at Negosyo",
      "openingTranslation": "Maraming salamat sa pagsisikap ninyo sa proyektong ito! Mag-toast muna tayo—ano ang gusto mong inumin?",
      "missionGoals": [
        "Magbigay ng magalang na cheer/toast (otsukaresama desu, kanpai!).",
        "Magtanong sa mga katrabaho ng rekomendasyon sa pagkain o inumin."
      ]
    },
    "scen_ja_soc_01": {
      "title": "Pag-aaya sa Kaibigan na Lumabas sa Weekend",
      "situation": "Gumawa ng plano para sa weekend, magkasundo sa tagpuan, at panatilihing magiliw at natural ang kuwentuhan.",
      "competency": "Kaiwa: Pang-araw-araw at Pakikipagkapwa",
      "openingTranslation": "Uy, may plano ka ba ngayong weekend? Mukhang magiging maaraw ang panahon!",
      "missionGoals": [
        "Magmungkahi ng plano para sa weekend nang natural.",
        "Kumpirmahin ang oras at lugar ng pagkikita nang malinaw."
      ]
    },
    "scen_ja_soc_02": {
      "title": "Pagtatanong sa Landlord Tungkol sa mga Patakaran sa Pagbubukod ng Basura sa Apartment",
      "situation": "Kalilipat mo lang sa isang apartment sa Tokyo at gusto mong kumpirmahin ang mga araw ng nasusunog na basura at ang mga patakaran sa PET bottle.",
      "competency": "Kaiwa: Pang-araw-araw at Pakikipagkapwa",
      "openingTranslation": "Oh, welcome sa paglipat! Maayos naman ba ang lahat? Malinaw na ba sa iyo ang pagbubukod ng basura?",
      "missionGoals": [
        "Itanong kung anong araw ang para sa nasusunog na basura (Moeru gomi wa nan-youbi desu ka).",
        "Itanong kung paano itapon nang tama ang mga PET bottle."
      ]
    },
    "scen_ja_acd_01": {
      "title": "Konsultasyon sa Thesis at Pagrebisa ng Papel sa Opisina ng Propesor",
      "situation": "Pormal na talakayin ang iyong research hypothesis at survey methodology kasama ang iyong Japanese advisor.",
      "competency": "Kaiwa: Akademiko at Pormal",
      "openingTranslation": "Tuloy ka. Nabasa ko na ang buod ng ulat na ipinasa mo—interesante ang anggulo ng iyong pananaliksik.",
      "missionGoals": [
        "Magsimula nang pormal (Shitsurei itashimasu).",
        "Humingi nang may paggalang ng feedback tungkol sa survey methodology."
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic: Oryentasyon sa Pormula at Diagnostic Test",
      "situation": "Sukatin ang iyong kasalukuyang kahandaan sa PTE Speaking at alamin ang pangunahing estratehiya sa pagmamarka na inuuna ang pagiging matatas.",
      "competency": "PTE Academic: Oryentasyon at Diagnostic",
      "openingTranslation": "Sukatin natin ngayon ang bilis ng iyong pagsasalita at ang baseline ng target mong PTE score.",
      "missionGoals": [
        "Magsalita nang tuloy-tuloy nang walang mahahabang pag-aalinlangan.",
        "Ilahad nang malinaw ang iyong target na score at timeline."
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE Level 1: Master sa Paglalarawan ng Larawan (Universal Template)",
      "situation": "Magbigay ng tuloy-tuloy na 40-segundong paglalarawan ng larawan na nakatuon sa walang patid na pagiging matatas (5/5).",
      "competency": "PTE Speaking: Universal Template sa Paglalarawan ng Larawan",
      "openingTranslation": "Ilarawan ang chart sa screen nang tuloy-tuloy sa loob ng 40 segundo nang hindi tumitigil.",
      "missionGoals": [
        "Saklawin ang pamagat, pinakamataas na punto, pinakamababang punto, at maikling konklusyon.",
        "Panatilihin ang pantay na bilis nang walang anumang pagtatama sa sarili."
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE Level 2: Malakas na Pagbasa (Chunking at 130 WPM Pacing)",
      "situation": "Basahin nang malakas ang mga akademikong talata gamit ang makabuluhang paghahati ng parirala at malinaw na pagbigkas.",
      "competency": "PTE Speaking at Reading: Read Aloud Chunking",
      "openingTranslation": "Basahin ang talata nang malakas at malinaw sa pantay at akademikong bilis.",
      "missionGoals": [
        "Pangkatin ang mga salita sa natural na mga bahaging panggramatika.",
        "Bigkasin nang malinis ang mahahalagang salitang akademiko nang hindi nagmamadali."
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE Level 3: Pag-ulit ng Pangungusap (Estratehiya sa Acoustic Memory)",
      "situation": "Ulitin nang malinis ang mga akademikong pangungusap habang pinapanatili ang ritmo at pangunahing kahulugan.",
      "competency": "PTE Speaking at Listening: Repeat Sentence Shadowing",
      "openingTranslation": "Makinig nang mabuti at ulitin kaagad ang bawat pangungusap nang may maayos na ritmo.",
      "missionGoals": [
        "Kuhain ang ritmo ng panimula at pangwakas na sugnay.",
        "Panatilihin ang pagiging matatas kahit sa mas mahahabang pangungusap."
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE Level 4: Pagsulat mula sa Dikta at Akademikong Pagbaybay",
      "situation": "Alalahanin ang idiniktang mga pangungusap nang salita-sa-salita na may tamang anyong maramihan at akademikong pagbaybay.",
      "competency": "PTE Listening at Writing: Write from Dictation",
      "openingTranslation": "Suriin nang tama ang bawat salita, dulo ng anyong maramihan, at pagbaybay.",
      "missionGoals": [
        "Maingat na suriin ang mga panahunan ng pandiwa at mga pantukoy.",
        "Tiyakin ang mga madalas gamiting akademikong kolokasyon."
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: Roadmap Mula Simula Hanggang Pumasa >= 65% (pp. 1-91)",
      "situation": "Isang 1-on-1 coaching session kasama si SSW SENSEI mula sa pinakasimula upang maipasa ang Prometric Food Manufacturing CBT exam (40 tanong / 70 minuto, 65% pasadong marka).",
      "competency": "SSW: Roadmap at Gabay sa Pagsisimula (pp. 1-6)",
      "openingTranslation": "Panimulang pagbati ni SSW SENSEI: Handang gabayan ka mula sa Unit 0 (pp. 1-6) hanggang sa CBT Practice Test at pagkukuwenta gamit ang calculator (>= 65%).",
      "missionGoals": [
        "Suriin ang progreso ng iyong pag-aaral at unawain kung bakit mahalagang unahing matutunan ng mga baguhan ang Unit 0 (pp. 1-6).",
        "Kabisaduhin ang opisyal na update ng OTAFF Ver 5.1 Abril 2026 (9 Mandatory kabilang ang Kurumi at Cashew Nut + 20 Recommended kabilang ang Pistachio).",
        "Kumpletuhin ang kahit 1 CBT quiz o tanong sa pagkukuwenta na may mga paliwanag na tumutukoy sa orihinal na mga pahina ng PDF."
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "50-Tanong na Simulasyon ng CBT Practice Test at mga Bitag ni Wakai Papa",
      "situation": "Subukan ang iyong katumpakan sa pagpili ng opsyon A, B, o C sa mga tanong ng Prometric at himayin ang dahilan sa likod ng bawat mapanlinlang na opsyon sa mga pahina ng paliwanag 75-91.",
      "competency": "SSW: Simulasyon ng CBT Practice Test at Pagsusuri ng mga Bitag",
      "openingTranslation": "Pagbati sa CBT Practice Test: Handa nang subukan kung gaano ka kahusay makatukoy ng mga bitag sa tanong ng Prometric at lagyan ng marka ang iyong score nang live.",
      "missionGoals": [
        "Sagutin ang mga tanong sa CBT nang hindi nabibiktima ng mga mapanlinlang na salita tulad ng yukkuri o zero percent.",
        "Tingnan ang numero ng pahina ng tanong at ang buong pahina ng paliwanag pagkatapos sumagot."
      ]
    },
    "scen_ssw_math_visual": {
      "title": "Klase sa Math para sa CBT Calculator (Chlorine ppm, Budomari at Oven)",
      "situation": "Naka-focus na pagsasanay sa 5 formula ng SSW CBT calculator (Chlorine Dilution, Budomari, Recipe ng Tinapay, Kapasidad ng Oven, at 2^n Pagdami ng Bakterya).",
      "competency": "SSW: Mga Formula sa Math ng CBT Calculator",
      "openingTranslation": "Pagbati sa Klase sa Math: Mag-focus sa chlorine formula na C1*V1=C2*V2, budomari yield, at mga diskarte sa pag-round up.",
      "missionGoals": [
        "Kabisaduhin ang conversion na 1% = 10,000 ppm at ang formula na C1*V1 = C2*V2 (tubig = V2 - V1).",
        "Sagutin ang mga tanong sa pagkalkula ng oven / fillet / chlorine nang hindi nahuhulog sa mga mapanlinlang na opsyon sa pag-round."
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "Pagsasanay sa 266 Kotoba at Pagbasa sa Food Factory (pp. 46-63)",
      "situation": "Pagsasanay sa pagmememorya ng 266 Kotoba mula sa Memorization Bank (pp. 46-63) gamit ang active recall, mga teknik ng Japan Map, at natural na pagbigkas.",
      "competency": "SSW: Pagmememorya ng 266 Kotoba para sa Factory at Exam",
      "openingTranslation": "Pagbati sa Pagsasanay ng Kotoba: Mag-focus sa pagiging bihasa sa 266 bokabularyo sa food factory at 142 opisyal na termino sa index ng OTAFF.",
      "missionGoals": [
        "Sagutin ang mga kahulugan at pagbasa ng hindi bababa sa 3 opisyal na terminong Kotoba mula sa Bank (pp. 46-63)."
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "Dumadalo ka sa iyong unang sesyon ng pagsasanay sa pakikipag-usap sa FIEZEL at binabati mo ang guro sa klase.",
      "openingTranslation": "Hello! Maligayang pagdating sa klase ng Japanese sa FIEZEL! Ikinagagalak kitang makilala."
    },
    "scen_ja_fiezel-life_02": {
      "situation": "Medyo mabilis magsalita ang guro at gusto mong hilingin na ulitin ito o sabihing hindi mo pa naiintindihan.",
      "openingTranslation": "Pasensya na, malinaw ba ang paliwanag na iyon? Kung may hindi malinaw, huwag mag-atubiling sabihin sa akin."
    },
    "scen_ja_fiezel-life_03": {
      "situation": "Pagpapakilala ng iyong pangalan, bansang pinagmulan (Indonesia), at estado sa trabaho o pag-aaral.",
      "openingTranslation": "Ano ang pangalan mo at taga-saan ka? Taga-Tokyo ako."
    },
    "scen_ja_fiezel-life_04": {
      "situation": "Pagpapaliwanag ng lungsod at rehiyon kung saan ka kasalukuyang nakatira sa Japan.",
      "openingTranslation": "Nasanay ka na ba sa pagtira sa Japan? Saan ka nakatira ngayon?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "Pag-uusap tungkol sa mga paboritong pagkain at pagpapahayag ng pagkagusto sa pagkaing Japanese.",
      "openingTranslation": "Ano ang gusto mong kainin para sa tanghalian? Nasubukan mo na bang kumain ng pagkaing Japanese?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "Pag-order ng combo meal na pagkain at inumin sa isang fast-food restaurant.",
      "openingTranslation": "Welcome! Nakapagdesisyon ka na ba kung ano ang gusto mong i-order?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "Paglalarawan ng mga pasilidad at bilang ng mga kuwarto sa iyong apartment.",
      "openingTranslation": "Kumusta ang bago mong tirahan? Ilang kuwarto ang mayroon doon?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "Paglalarawan kung nasaan ang isang katrabaho sa opisina o sa loob ng factory.",
      "openingTranslation": "Uy, nasaan si Yamada-san? Nakita mo ba siya?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "Pagpapaliwanag ng oras ng lunch break at araw-araw na iskedyul sa trabaho.",
      "openingTranslation": "Ipagpatuloy ang magandang trabaho! Anong oras nagsisimula at natatapos ang lunch break?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "Magalang na paghiram ng mga gamit sa opisina (stapler/gunting) mula sa isang katrabaho.",
      "openingTranslation": "Nag-aayos ka ba ng mga dokumento? May gamit o supply ka bang kailangang gamitin?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "Pag-uusap tungkol sa mga nakakarelaks na libangan at pag-eenjoy sa pagbabasa ng manga o panonood ng anime.",
      "openingTranslation": "Ano ang madalas mong gawin kapag day off mo? May gusto ka bang anime o manga?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "Magalang na pagtanggap o pagtanggi sa imbitasyon na uminom kasama ang mga katrabaho.",
      "openingTranslation": "Gusto mo bang sumama na uminom pagkatapos ng trabaho ngayong Biyernes?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "Pagtatanong ng ruta at pagkumpirma kung pupunta sa airport ang isang bus.",
      "openingTranslation": "Gusto kong pumunta sa Narita Airport—aling bus ang dapat kong sakyan?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "Pagtatanong ng mga pangalan ng gusali at pampublikong pasilidad sa paligid ng lungsod.",
      "openingTranslation": "Nakikita mo yung mataas na gusali roon, di ba? Alam mo ba kung anong gusali iyon?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "Pagtatanong sa kahera ng tindahan kung saan nakalagay ang mga baterya o pang-araw-araw na kailangan.",
      "openingTranslation": "Namimili ka ba sa konbini? May hinahanap ka ba?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "Pagtatanong ng presyo ng damit at pag-alam kung mayroon itong discount.",
      "openingTranslation": "Mukhang bagay na bagay sa iyo ang damit na ito! Na-check mo na ba ang presyo?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "Pag-uusap tungkol sa panonood ng sine kasama ang mga kaibigan sa weekend.",
      "openingTranslation": "Kumusta ang weekend mo? Lumabas ka ba at pumunta kung saan?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "Pagpapahayag ng kagustuhang magbakasyon sa isang hot spring (onsen).",
      "openingTranslation": "Lumalamig na ang panahon, hindi ba? Parang gusto kong pumunta sa isang lugar na mainit-init."
    },
    "scen_ja_fiezel-life_19": {
      "situation": "Dumadalo ka sa iyong unang sesyon ng pagsasanay sa pakikipag-usap sa FIEZEL at binabati mo ang guro sa klase.",
      "openingTranslation": "Hello! Maligayang pagdating sa klase ng Japanese sa FIEZEL! Ikinagagalak kitang makilala."
    },
    "scen_ja_fiezel-life_20": {
      "situation": "Medyo mabilis magsalita ang guro at gusto mong hilingin na ulitin ito o sabihing hindi mo pa naiintindihan.",
      "openingTranslation": "Pasensya na, malinaw ba ang paliwanag na iyon? Kung may hindi malinaw, huwag mag-atubiling sabihin sa akin."
    },
    "scen_ja_fiezel-life_21": {
      "situation": "Pagpapakilala ng iyong pangalan, bansang pinagmulan (Indonesia), at estado sa trabaho o pag-aaral.",
      "openingTranslation": "Ano ang pangalan mo at taga-saan ka? Taga-Tokyo ako."
    },
    "scen_ja_fiezel-life_22": {
      "situation": "Pagpapaliwanag ng lungsod at rehiyon kung saan ka kasalukuyang nakatira sa Japan.",
      "openingTranslation": "Nasanay ka na ba sa pagtira sa Japan? Saan ka nakatira ngayon?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "Pag-uusap tungkol sa mga paboritong pagkain at pagpapahayag ng pagkagusto sa pagkaing Japanese.",
      "openingTranslation": "Ano ang gusto mong kainin para sa tanghalian? Nasubukan mo na bang kumain ng pagkaing Japanese?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "Pag-order ng combo meal na pagkain at inumin sa isang fast-food restaurant.",
      "openingTranslation": "Welcome! Nakapagdesisyon ka na ba kung ano ang gusto mong i-order?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "Paglalarawan ng mga pasilidad at bilang ng mga kuwarto sa iyong apartment.",
      "openingTranslation": "Kumusta ang bago mong tirahan? Ilang kuwarto ang mayroon doon?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "Paglalarawan kung nasaan ang isang katrabaho sa opisina o sa loob ng factory.",
      "openingTranslation": "Uy, nasaan si Yamada-san? Nakita mo ba siya?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "Pagpapaliwanag ng oras ng lunch break at araw-araw na iskedyul sa trabaho.",
      "openingTranslation": "Ipagpatuloy ang magandang trabaho! Anong oras nagsisimula at natatapos ang lunch break?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "Magalang na paghiram ng mga gamit sa opisina (stapler/gunting) mula sa isang katrabaho.",
      "openingTranslation": "Nag-aayos ka ba ng mga dokumento? May gamit o supply ka bang kailangang gamitin?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "Pag-uusap tungkol sa mga nakakarelaks na libangan at pag-eenjoy sa pagbabasa ng manga o panonood ng anime.",
      "openingTranslation": "Ano ang madalas mong gawin kapag day off mo? May gusto ka bang anime o manga?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "Magalang na pagtanggap o pagtanggi sa imbitasyon na uminom kasama ang mga katrabaho.",
      "openingTranslation": "Gusto mo bang sumama na uminom pagkatapos ng trabaho ngayong Biyernes?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "Pagtatanong ng ruta at pagkumpirma kung pupunta sa airport ang isang bus.",
      "openingTranslation": "Gusto kong pumunta sa Narita Airport—aling bus ang dapat kong sakyan?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "Pagtatanong ng mga pangalan ng gusali at pampublikong pasilidad sa paligid ng lungsod.",
      "openingTranslation": "Nakikita mo yung mataas na gusali roon, di ba? Alam mo ba kung anong gusali iyon?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "Pagtatanong sa kahera ng tindahan kung saan nakalagay ang mga baterya o pang-araw-araw na kailangan.",
      "openingTranslation": "Namimili ka ba sa konbini? May hinahanap ka ba?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "Pagtatanong ng presyo ng damit at pag-alam kung mayroon itong discount.",
      "openingTranslation": "Mukhang bagay na bagay sa iyo ang damit na ito! Na-check mo na ba ang presyo?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "Pag-uusap tungkol sa panonood ng sine kasama ang mga kaibigan sa weekend.",
      "openingTranslation": "Kumusta ang weekend mo? Lumabas ka ba at pumunta kung saan?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "Pagpapahayag ng kagustuhang magbakasyon sa isang hot spring (onsen).",
      "openingTranslation": "Lumalamig na ang panahon, hindi ba? Parang gusto kong pumunta sa isang lugar na mainit-init."
    },
    "scen_ja_fiezel-life_37": {
      "situation": "Dumadalo ka sa iyong unang sesyon ng pagsasanay sa pakikipag-usap sa FIEZEL at binabati mo ang guro sa klase.",
      "openingTranslation": "Hello! Maligayang pagdating sa klase ng Japanese sa FIEZEL! Ikinagagalak kitang makilala."
    },
    "scen_ja_fiezel-life_38": {
      "situation": "Medyo mabilis magsalita ang guro at gusto mong hilingin na ulitin ito o sabihing hindi mo pa naiintindihan.",
      "openingTranslation": "Pasensya na, malinaw ba ang paliwanag na iyon? Kung may hindi malinaw, huwag mag-atubiling sabihin sa akin."
    },
    "scen_ja_fiezel-life_39": {
      "situation": "Pagpapakilala ng iyong pangalan, bansang pinagmulan (Indonesia), at estado sa trabaho o pag-aaral.",
      "openingTranslation": "Ano ang pangalan mo at taga-saan ka? Taga-Tokyo ako."
    },
    "scen_ja_fiezel-life_40": {
      "situation": "Pagpapaliwanag ng lungsod at rehiyon kung saan ka kasalukuyang nakatira sa Japan.",
      "openingTranslation": "Nasanay ka na ba sa pagtira sa Japan? Saan ka nakatira ngayon?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "Pag-uusap tungkol sa mga paboritong pagkain at pagpapahayag ng pagkagusto sa pagkaing Japanese.",
      "openingTranslation": "Ano ang gusto mong kainin para sa tanghalian? Nasubukan mo na bang kumain ng pagkaing Japanese?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "Pag-order ng combo meal na pagkain at inumin sa isang fast-food restaurant.",
      "openingTranslation": "Welcome! Nakapagdesisyon ka na ba kung ano ang gusto mong i-order?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "Paglalarawan ng mga pasilidad at bilang ng mga kuwarto sa iyong apartment.",
      "openingTranslation": "Kumusta ang bago mong tirahan? Ilang kuwarto ang mayroon doon?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "Paglalarawan kung nasaan ang isang katrabaho sa opisina o sa loob ng factory.",
      "openingTranslation": "Uy, nasaan si Yamada-san? Nakita mo ba siya?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "Pagpapaliwanag ng oras ng lunch break at araw-araw na iskedyul sa trabaho.",
      "openingTranslation": "Ipagpatuloy ang magandang trabaho! Anong oras nagsisimula at natatapos ang lunch break?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "Magalang na paghiram ng mga gamit sa opisina (stapler/gunting) mula sa isang katrabaho.",
      "openingTranslation": "Nag-aayos ka ba ng mga dokumento? May gamit o supply ka bang kailangang gamitin?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "Pag-uusap tungkol sa mga nakakarelaks na libangan at pag-eenjoy sa pagbabasa ng manga o panonood ng anime.",
      "openingTranslation": "Ano ang madalas mong gawin kapag day off mo? May gusto ka bang anime o manga?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "Magalang na pagtanggap o pagtanggi sa imbitasyon na uminom kasama ang mga katrabaho.",
      "openingTranslation": "Gusto mo bang sumama na uminom pagkatapos ng trabaho ngayong Biyernes?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "Pagtatanong ng ruta at pagkumpirma kung pupunta sa airport ang isang bus.",
      "openingTranslation": "Gusto kong pumunta sa Narita Airport—aling bus ang dapat kong sakyan?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "Pagtatanong ng mga pangalan ng gusali at pampublikong pasilidad sa paligid ng lungsod.",
      "openingTranslation": "Nakikita mo yung mataas na gusali roon, di ba? Alam mo ba kung anong gusali iyon?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "Pagtatanong sa kahera ng tindahan kung saan nakalagay ang mga baterya o pang-araw-araw na kailangan.",
      "openingTranslation": "Namimili ka ba sa konbini? May hinahanap ka ba?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "Pagtatanong ng presyo ng damit at pag-alam kung mayroon itong discount.",
      "openingTranslation": "Mukhang bagay na bagay sa iyo ang damit na ito! Na-check mo na ba ang presyo?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "Pag-uusap tungkol sa panonood ng sine kasama ang mga kaibigan sa weekend.",
      "openingTranslation": "Kumusta ang weekend mo? Lumabas ka ba at pumunta kung saan?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "Pagpapahayag ng kagustuhang magbakasyon sa isang hot spring (onsen).",
      "openingTranslation": "Lumalamig na ang panahon, hindi ba? Parang gusto kong pumunta sa isang lugar na mainit-init."
    }
  },
  "ja": {
    "scen_en_a2_cafe": {
      "title": "コーヒーの注文と午後の予定の説明",
      "situation": "チームミーティングの前にカフェでCoach Alexに会います。丁寧に飲み物を注文し、現在進行形を使って午後の予定を伝えましょう。",
      "competency": "スピーキング A2：決まっている予定とカフェでの注文",
      "openingTranslation": "こんにちは！カフェで会えて嬉しいです。今日は何を飲みますか？コーヒーを飲んだ後は何をする予定ですか？",
      "missionGoals": [
        "飲み物を丁寧に注文するときは、\"I would like...\" または \"I'd like...\" を使いましょう。",
        "今日の午後の予定には、現在進行形（\"I am meeting...\" / \"I am working on...\"）を使いましょう。"
      ]
    },
    "scen_en_free_talk": {
      "title": "フリートーク：Coach Alexとの自由会話",
      "situation": "決まったお題なしで、趣味・予定・意見・日常の出来事など、どんなトピックでも自由に会話しましょう。",
      "competency": "スピーキング：フリートークと即興の応答",
      "openingTranslation": "日常のトピック、学習上の悩み、個人の目標について自由に質問したり答えたりしましょう。",
      "missionGoals": [
        "言葉に詰まらずに自分の考えを直接表現しましょう。",
        "その場での追加質問にも自然に応答しましょう。"
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "Coach Sarahとの論理的な主張と自信あるディスカッション",
      "situation": "明確で構造化された話し方、論理的な理由付け、自然なビジネス・エグゼクティブ表現を練習しましょう。",
      "competency": "スピーキング：構造的な理由付けと明瞭さ",
      "openingTranslation": "理由や具体例を添えて、整理された明確な回答を伝えましょう。",
      "missionGoals": [
        "裏付けとなる理由とともに自分の意見をはっきり述べましょう。",
        "論理の流れが滑らかになるつなぎ表現を使いましょう。"
      ]
    },
    "scen_en_a1_hometown": {
      "title": "現在形：出身地や近所について説明する",
      "situation": "住んでいる場所、毎日の習慣、近くのお気に入りスポットについて自然に話しましょう。",
      "competency": "スピーキング：現在形と身近な場所",
      "openingTranslation": "あなたの出身地と、近くでお気に入りの場所について教えてください。",
      "missionGoals": [
        "現在形を正確に使いましょう（\"I live in...\", \"There is/are...\"）。",
        "自宅近くの親しみのある場所を1〜2か所説明しましょう。"
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "過去形：不規則動詞と旅行のエピソード",
      "situation": "不規則動詞（went, saw, bought, ate）を使い、分かりやすい順序で過去の旅行について話しましょう。",
      "competency": "スピーキング：過去形でのストーリーテリング",
      "openingTranslation": "最近行った思い出深い旅行について教えてください！",
      "missionGoals": [
        "不規則動詞の過去形を正確に使いましょう（went, ate, took, saw）。",
        "出来事を分かりやすい時系列で話しましょう。"
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "試験モード · 論理的な意見構成と譲歩節",
      "situation": "バランスの取れた主張、語彙の正確さ、一貫性に焦点を当てた本格的なIELTSスピーキング模擬試験です。",
      "competency": "スピーキング：IELTSアカデミック Part 1–3 模擬試験",
      "openingTranslation": "構成された具体例とバランスの取れた理由付けを用いて、流暢に回答しましょう。",
      "missionGoals": [
        "表現を繰り返さずに、内容を深めて回答を広げましょう。",
        "譲歩節やアカデミックなつなぎ言葉を自然に使いましょう。"
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "目的格の助詞「を (o)」と「ください (kudasai)」を使った注文",
      "situation": "東京のカフェで、正しい助詞と丁寧な助数詞を使ってコーヒーやケーキを自然に注文しましょう。",
      "competency": "スピーキング：注文と基本的な助詞（N5）",
      "openingTranslation": "いらっしゃいませ！ご注文はお決まりですか？本日はホットコーヒーとチーズケーキがおすすめです。",
      "missionGoals": [
        "「～を ください」を使って丁寧に注文しましょう。",
        "基本的な日本語の助数詞（ひとつ / ふたつ）を自然に使いましょう。"
      ]
    },
    "scen_ja_free_talk": {
      "title": "Nanami先生とのフリー会話練習",
      "situation": "日常生活や食べ物、趣味、勉強の悩みなどについて、日本語で自由に自然な会話を楽しみましょう。",
      "competency": "スピーキング：自然な日常会話",
      "openingTranslation": "気になっていることについて、日本語で気楽におしゃべりしましょう！",
      "missionGoals": [
        "丁寧な日本語（です/ます）で自然に返答しましょう。",
        "日本語で関連する質問を1つしてみましょう。"
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "Keita先輩とのカジュアルな街角＆キャンパストーク",
      "situation": "アニメや大学生活、音楽、東京や大阪の表現などについて、リラックスした日常会話を楽しめます。",
      "competency": "スピーキング：カジュアルな街角＆キャンパス会話",
      "openingTranslation": "趣味や大学生活、日本のポップカルチャーについて、気軽にカジュアルに話しましょう！",
      "missionGoals": [
        "カジュアルな会話の流れを練習しましょう。",
        "親しみやすい呼びかけに自然に反応しましょう。"
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "丁寧な依頼と相談（〜ていただけますか / 〜たらいいですか）",
      "situation": "学校や職場で、先輩やメンターに丁寧にアドバイスや指導をお願いしましょう。",
      "competency": "スピーキング：相談と丁寧な依頼（N4）",
      "openingTranslation": "お疲れさまです！最近大学のレポートで忙しそうですが、何か困っていることはありますか？",
      "missionGoals": [
        "「～んです / ～ので」を使って、自分の状況を丁寧に説明しましょう。",
        "「～たらいいですか」を使ってアドバイスを求めましょう。"
      ]
    },
    "scen_zh_free_talk": {
      "title": "Xiao Mochiとの本格北京語コーチング",
      "situation": "声調・文法の即時フィードバック、ライブホワイトボード演習、音声ナビゲーションを備えた双方向会話です。",
      "competency": "スピーキング：自然な普通話と四声の流れ",
      "openingTranslation": "よく来てくれましたね！教科書みたいな話し方はやめて、最近中国語のどこでつまずいているのか正直に教えてください。",
      "missionGoals": [
        "文全体を通して、中国語の声調をはっきりと練習しましょう。",
        "Xiao Mochiに返答し、いつでも声調ドリルをお願いしましょう。"
      ]
    },
    "zh-restaurant-ordering": {
      "title": "北京のレストランで料理を注文する（HSK 1-2）",
      "situation": "あなたは北京の麺料理店で、辛くない牛肉麺を1杯注文しています。",
      "competency": "中国語での料理の注文と量詞",
      "openingTranslation": "こんにちは！Fiezel Chinese Bistroへようこそ！何名様ですか？何をお召し上がりになりますか？",
      "missionGoals": [
        "牛肉麺を1杯注文しましょう（yì wǎn niúròumiàn）。",
        "「bú yào là」を使って辛くしないようお願いしましょう。"
      ]
    },
    "zh-subway-directions": {
      "title": "中国で道を尋ねて地下鉄に乗る（HSK 2）",
      "situation": "あなたは上海で最寄りの地下鉄の駅を探しており、2号線が空港に行くか確認しています。",
      "competency": "中国語での道案内と公共交通機関",
      "openingTranslation": "こんにちは！お手伝いしましょうか？どちらへ行きたいですか？",
      "missionGoals": [
        "地下鉄の駅がどこにあるか尋ねましょう（dìtiězhàn zài nǎr）。",
        "2号線が空港に着くか尋ねましょう（néng dào jīchǎng ma）。"
      ]
    },
    "scen_ja_trv_01": {
      "title": "コンビニでお弁当を買って温めてもらう",
      "situation": "あなたは夜の新宿のコンビニのレジで、おにぎり、お弁当、緑茶を持っています。",
      "competency": "会話：旅行＆サバイバル",
      "openingTranslation": "いらっしゃいませ！お弁当は温めますか？レジ袋はご利用ですか？",
      "missionGoals": [
        "店員さんにお弁当を温めてもらうようお願いしましょう（atatamete kudasai）。",
        "レジ袋を丁寧に断りましょう（fukuro wa kekkou desu）。"
      ]
    },
    "scen_ja_trv_02": {
      "title": "大きな駅で正しい電車のホームを尋ねる",
      "situation": "東京で駅員さんに何番線ホームか、どの路線に乗り換えればよいかを尋ねましょう。",
      "competency": "会話：旅行＆サバイバル",
      "openingTranslation": "はい、どのようなご用件でしょうか？どちら方面へ行かれますか？",
      "missionGoals": [
        "目的の路線が発着するホームの番号を尋ねましょう。",
        "乗り換えが必要かどうか確認しましょう。"
      ]
    },
    "scen_ja_trv_03": {
      "title": "ラーメンを注文して麺の硬さとスープをカスタマイズする",
      "situation": "日本のラーメン店で、麺の硬さやスープの濃さを好みに合わせて注文しましょう。",
      "competency": "会話：旅行＆サバイバル",
      "openingTranslation": "いらっしゃいませ！ご注文はお決まりですか？麺の硬さはいかがなさいますか？",
      "missionGoals": [
        "ラーメンを注文し、麺の硬めをお願いしましょう（katame）。",
        "お水や替え玉（麺の追加）を丁寧にお願いしましょう。"
      ]
    },
    "scen_ja_trv_04": {
      "title": "ホテルのチェックインと15時前の荷物預け",
      "situation": "ホテルのフロントでチェックインし、部屋の用意ができるまで荷物を預かってもらうようお願いしましょう。",
      "competency": "会話：旅行＆サバイバル",
      "openingTranslation": "いらっしゃいませ。本日チェックインでしょうか。ご予約のお名前をお伺いできますか？",
      "missionGoals": [
        "予約名を丁寧に伝えましょう。",
        "チェックインまで荷物を預けられるか尋ねましょう（azukete mo ii desu ka）。"
      ]
    },
    "scen_ja_trv_05": {
      "title": "日本の薬局で風邪薬と頭痛薬を買う",
      "situation": "日本の薬剤師に喉の痛みや発熱の症状を伝えましょう。",
      "competency": "会話：旅行＆サバイバル",
      "openingTranslation": "こんにちは。本日はどのような症状でしょうか？熱はありますか？",
      "missionGoals": [
        "症状をはっきり伝えましょう（nodo ga itai など）。",
        "薬で眠くなるか、また食後に飲むべきか尋ねましょう。"
      ]
    },
    "scen_ja_wrk_01": {
      "title": "入社初日のオフィス挨拶と名刺交換（Meishi Koukan）",
      "situation": "新しいエンジニアチームに丁寧に挨拶し、正しく名刺交換をしましょう。",
      "competency": "会話：仕事・ビジネス",
      "openingTranslation": "はじめまして、開発チームの佐藤です。これからよろしくお願いいたします。",
      "missionGoals": [
        "丁寧な自己紹介をしましょう。",
        "敬意を持って名刺を受け取りましょう（choudai itashimasu）。"
      ]
    },
    "scen_ja_wrk_02": {
      "title": "報連相（ホウレンソウ）：バグ報告と納期調整のお願い",
      "situation": "プロジェクトのバグの根本原因と対策案について、上司にわかりやすく報告しましょう。",
      "competency": "会話：仕事・ビジネス",
      "openingTranslation": "はい、どうしましたか？プロジェクトで何か問題が起きましたか？",
      "missionGoals": [
        "進捗状況とバグの原因を簡潔に伝えましょう。",
        "具体的な修正案と新しいスケジュールを丁寧に提案しましょう。"
      ]
    },
    "scen_ja_wrk_03": {
      "title": "職場の飲み会マナー：乾杯と親睦を深める会話",
      "situation": "仕事終わりのチームの集まりに参加し、乾杯して同僚と自然に会話しましょう。",
      "competency": "会話：仕事・ビジネス",
      "openingTranslation": "このプロジェクト、お疲れさまでした！まずは乾杯しましょう。何を飲まれますか？",
      "missionGoals": [
        "丁寧な労いの言葉と乾杯の挨拶をしましょう（otsukaresama desu, kanpai!）。",
        "同僚におすすめの料理や飲み物を尋ねましょう。"
      ]
    },
    "scen_ja_soc_01": {
      "title": "週末に友達を遊びに誘う",
      "situation": "週末の予定を立て、待ち合わせ場所を決め、親しみやすく自然な会話を続けましょう。",
      "competency": "会話：日常・社交",
      "openingTranslation": "ねえ、今週末って予定ある？天気も晴れそうだよ！",
      "missionGoals": [
        "週末の予定を自然に提案しましょう。",
        "待ち合わせの時間と場所を明確に確認しましょう。"
      ]
    },
    "scen_ja_soc_02": {
      "title": "大家さんにアパートのゴミ分別ルールを尋ねる",
      "situation": "東京のアパートに引っ越したばかりで、燃えるゴミの収集日とペットボトルの出し方を確認したい場面です。",
      "competency": "会話：日常・社交",
      "openingTranslation": "お引っ越しお疲れさまです！生活には慣れましたか？ゴミの分別は大丈夫そうですか？",
      "missionGoals": [
        "燃えるゴミの日が何曜日か尋ねましょう（Moeru gomi wa nan-youbi desu ka）。",
        "ペットボトルの正しい出し方を尋ねましょう。"
      ]
    },
    "scen_ja_acd_01": {
      "title": "教授室での論文相談と修正",
      "situation": "研究仮説と調査手法について、日本の指導教員と改まった言葉遣いで話し合いましょう。",
      "competency": "会話：学術・フォーマル",
      "openingTranslation": "どうぞお入りください。提出されたレポートの要旨を読みましたよ。とても興味深い研究視点ですね。",
      "missionGoals": [
        "礼儀正しく入室・挨拶しましょう（Shitsurei itashimasu）。",
        "調査手法についてのフィードバックを丁寧にお願いしましょう。"
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic：攻略オリエンテーション＆診断テスト",
      "situation": "現在のPTEスピーキング力を測定し、流暢さ重視の採点戦略の基本を学びましょう。",
      "competency": "PTE Academic：オリエンテーション＆診断",
      "openingTranslation": "今すぐあなたのスピーキングのペースと目標PTEスコアの基準を確認しましょう。",
      "missionGoals": [
        "長い言い淀みなくスムーズに話しましょう。",
        "目標スコアと達成時期をはっきり伝えましょう。"
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE レベル1：画像描写マスター（汎用テンプレート）",
      "situation": "途切れない流暢さ（5/5）を意識して、40秒間でスムーズに画像を描写しましょう。",
      "competency": "PTE スピーキング：画像描写 汎用テンプレート",
      "openingTranslation": "画面の図表を、止まることなく40秒間スムーズに説明しましょう。",
      "missionGoals": [
        "タイトル、最高値、最低値、簡潔な結論を押さえましょう。",
        "言い直しをせず、一定のペースを保ちましょう。"
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE レベル2：音読（チャンキング＆130 WPMのペース配分）",
      "situation": "意味のまとまり（フレーズ・チャンキング）と明瞭な発音を意識して、学術的な文章を音読しましょう。",
      "competency": "PTE スピーキング＆リーディング：音読のチャンキング",
      "openingTranslation": "一定の学術的なペースで、文章をはっきりと音読しましょう。",
      "missionGoals": [
        "単語を自然な構文のまとまりごとに区切りましょう。",
        "重要な学術用語を焦らず明瞭に発音しましょう。"
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE レベル3：リピートセンテンス（聴覚記憶戦略）",
      "situation": "リズムと核心の意味を保ったまま、学術的な文を正確に復唱しましょう。",
      "competency": "PTE スピーキング＆リスニング：リピートセンテンス・シャドーイング",
      "openingTranslation": "よく聞いて、各文を滑らかなリズムで即座に復唱しましょう。",
      "missionGoals": [
        "文頭と文末の節のリズムを捉えましょう。",
        "長い文でも流暢さを保ちましょう。"
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE レベル4：ディクテーション＆学術スペリング",
      "situation": "聞き取った文を、複数形や学術単語のスペルまで正確に一語一句思い起こして書きましょう。",
      "competency": "PTE リスニング＆ライティング：ディクテーション（Write from Dictation）",
      "openingTranslation": "各単語、複数形の語尾、スペルを正確に確認しましょう。",
      "missionGoals": [
        "時制の語尾変化と冠詞を注意深く確認しましょう。",
        "頻出の学術コロケーションを確認しましょう。"
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI：ゼロから合格ロードマップ >= 65% (pp. 1-91)",
      "situation": "Prometric 飲食料品製造業 CBT試験（40問 / 70分、合格基準65%）をゼロから突破するための、SSW SENSEIとの1対1コーチングセッションです。",
      "competency": "SSW：ロードマップ＆初心者向け解読ガイド (pp. 1-6)",
      "openingTranslation": "SSW SENSEI 開始時のあいさつ：ユニット0（1〜6ページ）からCBT模擬試験・電卓計算（合格ライン65%以上）まで丁寧にご案内します。",
      "missionGoals": [
        "学習の進捗を確認し、なぜ初心者が最初にユニット0（1〜6ページ）を学ぶ必要があるのかを理解しましょう。",
        "OTAFF公式Ver 5.1（2026年4月改訂）の内容をマスターしましょう（クルミ・カシューナッツを含む義務表示9品目＋ピスタチオを含む推奨表示20品目）。",
        "元のPDFページを参照した解説付きで、CBTクイズまたは計算問題を1問以上完了しましょう。"
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "50問 CBT模擬試験シミュレーション＆Wakai Papaひっかけ対策",
      "situation": "Prometric形式のA・B・C選択問題で正答力を試し、解説ページ（75〜91ページ）をもとに各ひっかけ選択肢の根拠を詳しく分析しましょう。",
      "competency": "SSW：CBT模擬試験シミュレーション＆ひっかけ分析",
      "openingTranslation": "CBT模擬試験のあいさつ：Prometric問題のひっかけをどこまで見抜けるか試し、その場でスコアを採点しましょう。",
      "missionGoals": [
        "「ゆっくり」や「0%」などのひっかけ表現に惑わされず、CBT問題に解答しましょう。",
        "解答後に、問題の該当ページ番号と詳しい解説ページを確認できます。"
      ]
    },
    "scen_ssw_math_visual": {
      "title": "CBT 電卓計算クラス（塩素濃度ppm・歩留まり・オーブン計算）",
      "situation": "SSW CBTで頻出の電卓計算5公式（塩素希釈、歩留まり、パン配合レシピ、オーブン収容数、細菌増殖 2^n）を集中的に演習します。",
      "competency": "SSW：CBT 電卓計算の公式",
      "openingTranslation": "計算クラスのあいさつ：塩素濃度の公式 C1*V1=C2*V2、歩留まり計算、切り上げのコツに集中しましょう。",
      "missionGoals": [
        "1% = 10,000 ppm の換算と C1*V1 = C2*V2 の公式（加える水の量 = V2 - V1）を覚えましょう。",
        "端数処理のひっかけ選択肢に惑わされず、オーブン・切り身（歩留まり）・塩素濃度の計算問題に解答しましょう。"
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "食品工場の必須ことば266語＆読み方ドリル（46〜63ページ）",
      "situation": "暗記バンク（46〜63ページ）の266語を、アクティブリコール・Japan Map記憶法・ネイティブ発音を使って覚える暗記ドリルです。",
      "competency": "SSW：工場・試験対策のことば266語暗記",
      "openingTranslation": "ことばドリルのあいさつ：食品工場の重要語彙266語とOTAFF公式索引語142語の習得に集中しましょう。",
      "missionGoals": [
        "暗記バンク（46〜63ページ）の公式ことばから、意味と読み方を3語以上解答しましょう。"
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "FIEZELでの初めての会話練習クラスに参加し、教室で先生にあいさつします。",
      "openingTranslation": "こんにちは！FIEZELの日本語クラスへようこそ！よろしくお願いします。"
    },
    "scen_ja_fiezel-life_02": {
      "situation": "先生の話すスピードが少し速いため、もう一度言ってもらうようお願いしたり、まだ分からないと伝えたりします。",
      "openingTranslation": "すみません、今の説明は分かりやすかったですか？分からないことがあれば、遠慮なく教えてくださいね。"
    },
    "scen_ja_fiezel-life_03": {
      "situation": "自分の名前、出身国（インドネシア）、仕事や学習の状況について自己紹介します。",
      "openingTranslation": "お名前とご出身はどちらですか？私は東京出身です。"
    },
    "scen_ja_fiezel-life_04": {
      "situation": "現在日本で住んでいる都市や地域について説明します。",
      "openingTranslation": "日本での生活にはもう慣れましたか？今はどちらに住んでいますか？"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "好きな食べ物について話し、日本料理が好きであることを伝えます。",
      "openingTranslation": "お昼ごはんは何を食べるのが好きですか？日本料理を食べたことはありますか？"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "ファストフード店で食べ物と飲み物のセットメニューを注文します。",
      "openingTranslation": "いらっしゃいませ！ご注文はお決まりですか？"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "アパートの設備や部屋数について説明します。",
      "openingTranslation": "新しいお部屋はどうですか？部屋はいくつありますか？"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "オフィスや工場エリア内で、同僚が今どこにいるかを説明します。",
      "openingTranslation": "あの、山田さんはどこにいますか？見かけましたか？"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "昼休みの時間帯や1日の仕事のスケジュールを説明します。",
      "openingTranslation": "お疲れさまです！昼休みは何時から何時までですか？"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "同僚から事務用品（ホッチキスやハサミ）を丁寧に借ります。",
      "openingTranslation": "書類を整理しているのですか？使いたい道具や備品はありますか？"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "リラックスできる趣味や、漫画を読んだりアニメを観たりすることについて話します。",
      "openingTranslation": "休みの日はいつも何をしていますか？好きなアニメや漫画はありますか？"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "同僚からの飲み会の誘いを、丁寧に承諾したり断ったりします。",
      "openingTranslation": "今週の金曜日、仕事終わりに一緒に飲みに行きませんか？"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "道順を尋ね、そのバスが空港行きかどうかを確認します。",
      "openingTranslation": "成田空港へ行きたいのですが、どのバスに乗ればいいですか？"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "街の周辺にある建物や公共施設の名前を尋ねます。",
      "openingTranslation": "あそこに高いビルが見えますよね。何の建物か知っていますか？"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "お店のレジ係に、乾電池や日用品がどこに置いてあるか尋ねます。",
      "openingTranslation": "コンビニでお買い物ですか？何かお探しのものがありますか？"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "服の値段を尋ね、割引があるかどうかを確認します。",
      "openingTranslation": "この服、とてもよく似合いそうですね！値段はもう見ましたか？"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "週末に友達と映画を観に行くことについて話します。",
      "openingTranslation": "週末はどうでしたか？どこかへ出かけましたか？"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "温泉へ旅行に行きたいという希望を伝えます。",
      "openingTranslation": "だんだん寒くなってきましたね。どこか暖かい場所に行きたくなります。"
    },
    "scen_ja_fiezel-life_19": {
      "situation": "FIEZELでの初めての会話練習クラスに参加し、教室で先生にあいさつします。",
      "openingTranslation": "こんにちは！FIEZELの日本語クラスへようこそ！よろしくお願いします。"
    },
    "scen_ja_fiezel-life_20": {
      "situation": "先生の話すスピードが少し速いため、もう一度言ってもらうようお願いしたり、まだ分からないと伝えたりします。",
      "openingTranslation": "すみません、今の説明は分かりやすかったですか？分からないことがあれば、遠慮なく教えてくださいね。"
    },
    "scen_ja_fiezel-life_21": {
      "situation": "自分の名前、出身国（インドネシア）、仕事や学習の状況について自己紹介します。",
      "openingTranslation": "お名前とご出身はどちらですか？私は東京出身です。"
    },
    "scen_ja_fiezel-life_22": {
      "situation": "現在日本で住んでいる都市や地域について説明します。",
      "openingTranslation": "日本での生活にはもう慣れましたか？今はどちらに住んでいますか？"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "好きな食べ物について話し、日本料理が好きであることを伝えます。",
      "openingTranslation": "お昼ごはんは何を食べるのが好きですか？日本料理を食べたことはありますか？"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "ファストフード店で食べ物と飲み物のセットメニューを注文します。",
      "openingTranslation": "いらっしゃいませ！ご注文はお決まりですか？"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "アパートの設備や部屋数について説明します。",
      "openingTranslation": "新しいお部屋はどうですか？部屋はいくつありますか？"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "オフィスや工場エリア内で、同僚が今どこにいるかを説明します。",
      "openingTranslation": "あの、山田さんはどこにいますか？見かけましたか？"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "昼休みの時間帯や1日の仕事のスケジュールを説明します。",
      "openingTranslation": "お疲れさまです！昼休みは何時から何時までですか？"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "同僚から事務用品（ホッチキスやハサミ）を丁寧に借ります。",
      "openingTranslation": "書類を整理しているのですか？使いたい道具や備品はありますか？"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "リラックスできる趣味や、漫画を読んだりアニメを観たりすることについて話します。",
      "openingTranslation": "休みの日はいつも何をしていますか？好きなアニメや漫画はありますか？"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "同僚からの飲み会の誘いを、丁寧に承諾したり断ったりします。",
      "openingTranslation": "今週の金曜日、仕事終わりに一緒に飲みに行きませんか？"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "道順を尋ね、そのバスが空港行きかどうかを確認します。",
      "openingTranslation": "成田空港へ行きたいのですが、どのバスに乗ればいいですか？"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "街の周辺にある建物や公共施設の名前を尋ねます。",
      "openingTranslation": "あそこに高いビルが見えますよね。何の建物か知っていますか？"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "お店のレジ係に、乾電池や日用品がどこに置いてあるか尋ねます。",
      "openingTranslation": "コンビニでお買い物ですか？何かお探しのものがありますか？"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "服の値段を尋ね、割引があるかどうかを確認します。",
      "openingTranslation": "この服、とてもよく似合いそうですね！値段はもう見ましたか？"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "週末に友達と映画を観に行くことについて話します。",
      "openingTranslation": "週末はどうでしたか？どこかへ出かけましたか？"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "温泉へ旅行に行きたいという希望を伝えます。",
      "openingTranslation": "だんだん寒くなってきましたね。どこか暖かい場所に行きたくなります。"
    },
    "scen_ja_fiezel-life_37": {
      "situation": "FIEZELでの初めての会話練習クラスに参加し、教室で先生にあいさつします。",
      "openingTranslation": "こんにちは！FIEZELの日本語クラスへようこそ！よろしくお願いします。"
    },
    "scen_ja_fiezel-life_38": {
      "situation": "先生の話すスピードが少し速いため、もう一度言ってもらうようお願いしたり、まだ分からないと伝えたりします。",
      "openingTranslation": "すみません、今の説明は分かりやすかったですか？分からないことがあれば、遠慮なく教えてくださいね。"
    },
    "scen_ja_fiezel-life_39": {
      "situation": "自分の名前、出身国（インドネシア）、仕事や学習の状況について自己紹介します。",
      "openingTranslation": "お名前とご出身はどちらですか？私は東京出身です。"
    },
    "scen_ja_fiezel-life_40": {
      "situation": "現在日本で住んでいる都市や地域について説明します。",
      "openingTranslation": "日本での生活にはもう慣れましたか？今はどちらに住んでいますか？"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "好きな食べ物について話し、日本料理が好きであることを伝えます。",
      "openingTranslation": "お昼ごはんは何を食べるのが好きですか？日本料理を食べたことはありますか？"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "ファストフード店で食べ物と飲み物のセットメニューを注文します。",
      "openingTranslation": "いらっしゃいませ！ご注文はお決まりですか？"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "アパートの設備や部屋数について説明します。",
      "openingTranslation": "新しいお部屋はどうですか？部屋はいくつありますか？"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "オフィスや工場エリア内で、同僚が今どこにいるかを説明します。",
      "openingTranslation": "あの、山田さんはどこにいますか？見かけましたか？"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "昼休みの時間帯や1日の仕事のスケジュールを説明します。",
      "openingTranslation": "お疲れさまです！昼休みは何時から何時までですか？"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "同僚から事務用品（ホッチキスやハサミ）を丁寧に借ります。",
      "openingTranslation": "書類を整理しているのですか？使いたい道具や備品はありますか？"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "リラックスできる趣味や、漫画を読んだりアニメを観たりすることについて話します。",
      "openingTranslation": "休みの日はいつも何をしていますか？好きなアニメや漫画はありますか？"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "同僚からの飲み会の誘いを、丁寧に承諾したり断ったりします。",
      "openingTranslation": "今週の金曜日、仕事終わりに一緒に飲みに行きませんか？"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "道順を尋ね、そのバスが空港行きかどうかを確認します。",
      "openingTranslation": "成田空港へ行きたいのですが、どのバスに乗ればいいですか？"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "街の周辺にある建物や公共施設の名前を尋ねます。",
      "openingTranslation": "あそこに高いビルが見えますよね。何の建物か知っていますか？"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "お店のレジ係に、乾電池や日用品がどこに置いてあるか尋ねます。",
      "openingTranslation": "コンビニでお買い物ですか？何かお探しのものがありますか？"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "服の値段を尋ね、割引があるかどうかを確認します。",
      "openingTranslation": "この服、とてもよく似合いそうですね！値段はもう見ましたか？"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "週末に友達と映画を観に行くことについて話します。",
      "openingTranslation": "週末はどうでしたか？どこかへ出かけましたか？"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "温泉へ旅行に行きたいという希望を伝えます。",
      "openingTranslation": "だんだん寒くなってきましたね。どこか暖かい場所に行きたくなります。"
    }
  },
  "km": {
    "scen_en_a2_cafe": {
      "title": "ការកុម្ម៉ង់កាហ្វេ និងការពន្យល់ពីផែនការពេលរសៀល",
      "situation": "អ្នកជួប Coach Alex នៅហាងកាហ្វេមុនកិច្ចប្រជុំក្រុម។ ចូរកុម្ម៉ង់ដោយគួរសម និងចែករំលែកផែនការពេលរសៀលរបស់អ្នកដោយប្រើ Present Continuous។",
      "competency": "ការនិយាយ A2៖ ផែនការដែលបានកំណត់ និងការកុម្ម៉ង់នៅហាងកាហ្វេ",
      "openingTranslation": "សួស្តី! រីករាយដែលបានជួបអ្នកនៅហាងកាហ្វេ។ ថ្ងៃនេះតើអ្នកចង់ពិសាភេសជ្ជៈអ្វីដែរ ហើយតើអ្នកនឹងធ្វើអ្វីបន្ទាប់ពីផឹកកាហ្វេជាមួយគ្នារួច?",
      "missionGoals": [
        "ប្រើ \"I would like...\" ឬ \"I'd like...\" ដើម្បីកុម្ម៉ង់ភេសជ្ជៈដោយគួរសម។",
        "ប្រើ Present Continuous (\"I am meeting...\" / \"I am working on...\") សម្រាប់ពេលរសៀលនេះ។"
      ]
    },
    "scen_en_free_talk": {
      "title": "ការសន្ទនាសេរី៖ ការជជែកបើកចំហជាមួយ Coach Alex",
      "situation": "ជជែកគ្នាដោយសេរីលើប្រធានបទណាមួយ៖ ចំណង់ចំណូលចិត្ត ផែនការ មតិយោបល់ ឬរឿងរ៉ាវប្រចាំថ្ងៃដោយគ្មានប្រធានបទកំណត់ទុកជាមុន។",
      "competency": "ការនិយាយ៖ ការសន្ទនាសេរី និងការឆ្លើយតបភ្លាមៗ",
      "openingTranslation": "សួរ និងឆ្លើយដោយសេរីអំពីប្រធានបទប្រចាំថ្ងៃ ការលំបាកក្នុងការរៀន ឬគោលដៅផ្ទាល់ខ្លួន។",
      "missionGoals": [
        "បង្ហាញគំនិតដោយផ្ទាល់ដោយមិនគាំងឬស្ទាក់ស្ទើរ។",
        "ឆ្លើយតបដោយធម្មជាតិចំពោះសំណួរបន្តភ្លាមៗ។"
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "ការលើកហេតុផលមានរចនាសម្ព័ន្ធ និងការពិភាក្សាប្រកបដោយទំនុកចិត្តជាមួយ Coach Sarah",
      "situation": "អនុវត្តការនិយាយដែលមានរចនាសម្ព័ន្ធច្បាស់លាស់ ការវែកញែកប្រកបដោយតក្កវិជ្ជា និងការប្រើប្រាស់ឃ្លាបែបថ្នាក់ដឹកនាំប្រកបដោយភាពធម្មជាតិ។",
      "competency": "ការនិយាយ៖ ការវែកញែកមានរចនាសម្ព័ន្ធ និងភាពច្បាស់លាស់",
      "openingTranslation": "ចែករំលែកចម្លើយដែលមានរចនាសម្ព័ន្ធច្បាស់លាស់ ព្រមទាំងហេតុផល និងឧទាហរណ៍។",
      "missionGoals": [
        "បញ្ជាក់មតិរបស់អ្នកឱ្យច្បាស់លាស់ជាមួយនឹងហេតុផលគាំទ្រ។",
        "ប្រើប្រាស់ពាក្យតភ្ជាប់ប្រកបដោយភាពរលូន និងមានតក្កវិជ្ជា។"
      ]
    },
    "scen_en_a1_hometown": {
      "title": "Present Simple៖ ការពិពណ៌នាអំពីស្រុកកំណើត និងតំបន់ជុំវិញផ្ទះរបស់អ្នក",
      "situation": "និយាយដោយធម្មជាតិអំពីកន្លែងដែលអ្នករស់នៅ ទម្លាប់ប្រចាំថ្ងៃ និងកន្លែងដែលអ្នកចូលចិត្តនៅក្បែរនោះ។",
      "competency": "ការនិយាយ៖ Present Simple និងទីកន្លែងប្រចាំថ្ងៃ",
      "openingTranslation": "សូមប្រាប់ខ្ញុំអំពីស្រុកកំណើតរបស់អ្នក និងកន្លែងណាខ្លះដែលអ្នកចូលចិត្តនៅក្បែរនោះ។",
      "missionGoals": [
        "ប្រើ Present Simple ឱ្យបានត្រឹមត្រូវ (\"I live in...\", \"There is/are...\")។",
        "ពិពណ៌នាអំពីទីកន្លែងដែលធ្លាប់ស្គាល់ 1–2 កន្លែងនៅក្បែរផ្ទះ។"
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "Simple Past Tense៖ កិរិយាសព្ទមិនទៀងទាត់ និងរឿងរ៉ាវដំណើរកម្សាន្ត",
      "situation": "រៀបរាប់ឡើងវិញអំពីដំណើរកម្សាន្តកន្លងមកដោយប្រើកិរិយាសព្ទមិនទៀងទាត់ (went, saw, bought, ate) តាមលំដាប់លំដោយច្បាស់លាស់។",
      "competency": "ការនិយាយ៖ ការនិទានរឿងក្នុងអតីតកាល (Past Tense)",
      "openingTranslation": "សូមប្រាប់ខ្ញុំអំពីដំណើរកម្សាន្តដែលមិនអាចបំភ្លេចបានដែលអ្នកបានទៅថ្មីៗនេះ!",
      "missionGoals": [
        "ប្រើកិរិយាសព្ទអតីតកាលមិនទៀងទាត់ឱ្យបានត្រឹមត្រូវ (went, ate, took, saw)។",
        "រៀបចំព្រឹត្តិការណ៍តាមលំដាប់ពេលវេលាច្បាស់លាស់។"
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "របៀបប្រឡង · មតិមានរចនាសម្ព័ន្ធ និងល្បះសម្បទាន",
      "situation": "ការហ្វឹកហាត់សាកល្បង IELTS Speaking ផ្លូវការ ដែលផ្តោតលើទឡ្ហីករណ៍មានតុល្យភាព ភាពច្បាស់លាស់នៃវាក្យសព្ទ និងភាពស៊ីសង្វាក់គ្នា។",
      "competency": "ការនិយាយ៖ ការហ្វឹកហាត់សាកល្បង IELTS Academic វគ្គ ១–៣",
      "openingTranslation": "ឆ្លើយតបឱ្យបានស្ទាត់ជំនាញ ជាមួយឧទាហរណ៍មានរចនាសម្ព័ន្ធ និងការវិភាគហេតុផលប្រកបដោយតុល្យភាព។",
      "missionGoals": [
        "ពង្រីកចម្លើយឱ្យបានវែងក្បោះក្បាយ ដោយមិននិយាយដដែលៗ។",
        "ប្រើប្រាស់ល្បះសម្បទាន និងពាក្យភ្ជាប់បែបសិក្សាស្រាវជ្រាវដោយធម្មជាតិ។"
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "ធ្នាក់កម្មបទ を (o) និងការកុម្ម៉ង់ដោយប្រើ ください (kudasai)",
      "situation": "កុម្ម៉ង់កាហ្វេ ឬនំខេកដោយធម្មជាតិនៅហាងកាហ្វេទីក្រុងតូក្យូ ដោយប្រើធ្នាក់បានត្រឹមត្រូវ និងពាក្យរាប់ចំនួនគួរសម។",
      "competency": "ការនិយាយ៖ ការកុម្ម៉ង់ និងធ្នាក់មូលដ្ឋាន (N5)",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកបានសម្រេចចិត្តកុម្ម៉ង់អ្វីហើយឬនៅ? ថ្ងៃនេះយើងសូមណែនាំកាហ្វេក្តៅ និងនំឈីសខេក។",
      "missionGoals": [
        "កុម្ម៉ង់ដោយគួរសម ដោយប្រើ \"～を ください\"។",
        "ប្រើប្រាស់ពាក្យរាប់ចំនួនមូលដ្ឋានភាសាជប៉ុន (ひとつ / ふたつ) ដោយធម្មជាតិ។"
      ]
    },
    "scen_ja_free_talk": {
      "title": "ការហ្វឹកហាត់ Kaiwa សេរីជាមួយ Sensei Nanami",
      "situation": "ការសន្ទនាបើកចំហដោយធម្មជាតិជាភាសាជប៉ុន អំពីជីវភាពប្រចាំថ្ងៃ អាហារ ចំណង់ចំណូលចិត្ត ឬបញ្ហាប្រឈមក្នុងការសិក្សា។",
      "competency": "ការនិយាយ៖ Kaiwa ប្រចាំថ្ងៃដោយធម្មជាតិ",
      "openingTranslation": "តោះជជែកគ្នាលេងយ៉ាងសប្បាយរីករាយជាភាសាជប៉ុន អំពីអ្វីៗគ្រប់យ៉ាងដែលអ្នកចង់និយាយ!",
      "missionGoals": [
        "ឆ្លើយតបដោយធម្មជាតិជាភាសាជប៉ុនបែបគួរសម (です/ます)។",
        "សួរសំណួរបន្ថែមមួយជាភាសាជប៉ុន។"
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "ការជជែកលេងបែបស្និទ្ធស្នាលនៅតាមផ្លូវ និងសាកលវិទ្យាល័យជាមួយ Keita Senpai",
      "situation": "ការសន្ទនាភាសាជប៉ុនប្រចាំថ្ងៃបែបធូរស្រាល អំពីអានីមេ ជីវិតនៅសាកលវិទ្យាល័យ តន្ត្រី និងកន្សោមពាក្យនិយាយនៅតូក្យូ/អូសាកា។",
      "competency": "ការនិយាយ៖ Kaiwa បែបស្និទ្ធស្នាលនៅតាមផ្លូវ និងសាកលវិទ្យាល័យ",
      "openingTranslation": "សូមនិយាយលេងដោយស្និទ្ធស្នាលអំពីចំណង់ចំណូលចិត្ត ជីវិតនៅសាកលវិទ្យាល័យ ឬវប្បធម៌ប៉ុបជប៉ុន!",
      "missionGoals": [
        "ហ្វឹកហាត់លំហូរនៃការសន្ទនាបែបស្និទ្ធស្នាល។",
        "ឆ្លើយតបដោយធម្មជាតិចំពោះសំណួរ ឬប្រយោគជជែកបែបមិត្តភាព។"
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "ការស្នើសុំដោយគួរសម និងការសុំដំបូន្មាន (〜ていただけますか / 〜たらいいですか)",
      "situation": "សុំដំបូន្មាន និងការណែនាំដោយគួរសមពីសិស្សច្បង មិត្តរួមការងាររៀមច្បង ឬគ្រូណែនាំ នៅសាលា ឬកន្លែងធ្វើការ។",
      "competency": "ការនិយាយ៖ ការសុំដំបូន្មាន និងការស្នើសុំដោយគួរសម (N4)",
      "openingTranslation": "ថ្ងៃនេះធ្វើការបានល្អណាស់! ថ្មីៗនេះអ្នកដូចជារវល់ជាមួយរបាយការណ៍សាកលវិទ្យាល័យ—តើមានអ្វីពិបាកឬទេ?",
      "missionGoals": [
        "ពន្យល់ស្ថានភាពរបស់អ្នកដោយគួរសម ដោយប្រើ \"～んです / ～ので\"។",
        "សុំដំបូន្មានដោយប្រើ \"～たらいいですか\"។"
      ]
    },
    "scen_zh_free_talk": {
      "title": "ការបង្វឹកភាសាចិនកុកងឺបែបទីក្រុងប៉េកាំងពិតៗជាមួយ Xiao Mochi",
      "situation": "ការសន្ទនាពីរផ្លូវជាមួយនឹងមតិកែលម្អសំនៀង/វេយ្យាករណ៍ភ្លាមៗ លំហាត់លើក្តារខៀនផ្ទាល់ និងការបញ្ជាដោយសំឡេង។",
      "competency": "ការនិយាយ៖ ភាសា Putonghua ធម្មជាតិ និងលំហូរសំនៀងទាំង ៤",
      "openingTranslation": "ហេ មកដល់ហើយតើ! កុំនិយាយបែបតាមសៀវភៅអី—ប្រាប់ខ្ញុំតាមត្រង់មក តើភាគណានៃភាសាចិនកុកងឺដែលធ្វើឱ្យអ្នកជួបការលំបាកថ្មីៗនេះ?",
      "missionGoals": [
        "ហ្វឹកហាត់សំនៀងភាសាចិនកុកងឺឱ្យបានច្បាស់លាស់ពេញមួយប្រយោគ។",
        "ឆ្លើយតបទៅកាន់ Xiao Mochi ហើយសុំលំហាត់ហ្វឹកហាត់សំនៀងបានគ្រប់ពេល។"
      ]
    },
    "zh-restaurant-ordering": {
      "title": "ការកុម្ម៉ង់អាហារនៅភោជនីយដ្ឋានទីក្រុងប៉េកាំង (HSK 1-2)",
      "situation": "អ្នកកំពុងនៅហាងមីទីក្រុងប៉េកាំង ហើយកុម្ម៉ង់មីសាច់គោមួយចានដោយមិនដាក់ម្ទេសហឹរ។",
      "competency": "ការកុម្ម៉ង់អាហារ និងពាក្យរង្វាស់ចំនួនក្នុងភាសាចិនកុកងឺ",
      "openingTranslation": "សួស្តី! សូមស្វាគមន៍មកកាន់ Fiezel Chinese Bistro! តើតុសម្រាប់ប៉ុន្មាននាក់ដែរ? តើអ្នកចង់ពិសាអ្វីដែរ?",
      "missionGoals": [
        "កុម្ម៉ង់មីសាច់គោមួយចាន (yì wǎn niúròumiàn)។",
        "សុំមិនដាក់ហឹរ ដោយប្រើ \"bú yào là\"។"
      ]
    },
    "zh-subway-directions": {
      "title": "ការសួរផ្លូវ និងការជិះរថភ្លើងក្រោមដីនៅប្រទេសចិន (HSK 2)",
      "situation": "អ្នកកំពុងនៅទីក្រុងសៀងហៃ ស្វែងរកស្ថានីយរថភ្លើងក្រោមដីដែលនៅជិតបំផុត និងសួរបញ្ជាក់ថាតើខ្សែទី ២ ទៅអាកាសយានដ្ឋានដែរឬទេ។",
      "competency": "ការសួរទិសដៅ និងមធ្យោបាយធ្វើដំណើរសាធារណៈជាភាសាចិនកុកងឺ",
      "openingTranslation": "សួស្តី! តើត្រូវការជំនួយទេ? តើអ្នកចង់ទៅណាដែរ?",
      "missionGoals": [
        "សួរថាតើស្ថានីយរថភ្លើងក្រោមដីនៅឯណា (dìtiězhàn zài nǎr)។",
        "សួរថាតើខ្សែទី ២ អាចទៅដល់អាកាសយានដ្ឋានបានទេ (néng dào jīchǎng ma)។"
      ]
    },
    "scen_ja_trv_01": {
      "title": "ការទិញ និងការកម្តៅប្រអប់បាយ Bento នៅហាង Konbini",
      "situation": "អ្នកកំពុងនៅតុគិតលុយនៃហាងលក់ទំនិញ ២៤ ម៉ោងនៅតំបន់ Shinjuku នាពេលយប់ ជាមួយបាយក្តោប onigiri ប្រអប់បាយ bento និងតែបៃតង។",
      "competency": "Kaiwa៖ ការធ្វើដំណើរ និងការប្រើប្រាស់ប្រចាំថ្ងៃ",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកចង់កម្តៅប្រអប់បាយ bento ទេ? តើអ្នកត្រូវការថង់ប្លាស្ទិកទេ?",
      "missionGoals": [
        "សុំបុគ្គលិកឱ្យជួយកម្តៅប្រអប់បាយ bento (atatamete kudasai)។",
        "បដិសេធមិនយកថង់ដោយគួរសម (fukuro wa kekkou desu)។"
      ]
    },
    "scen_ja_trv_02": {
      "title": "ការសួររកចំណតរថភ្លើងត្រឹមត្រូវនៅស្ថានីយធំ",
      "situation": "សួរបុគ្គលិកស្ថានីយថាតើត្រូវឡើងចំណតលេខប៉ុន្មាន និងប្តូរខ្សែរថភ្លើងណានៅទីក្រុងតូក្យូ។",
      "competency": "Kaiwa៖ ការធ្វើដំណើរ និងការប្រើប្រាស់ប្រចាំថ្ងៃ",
      "openingTranslation": "បាទ/ចាស តើខ្ញុំអាចជួយអ្វីបានដែរ? តើអ្នកកំពុងធ្វើដំណើរទៅទិសខាងណា?",
      "missionGoals": [
        "សួរថាតើចំណតលេខប៉ុន្មានសម្រាប់ខ្សែរថភ្លើងទៅគោលដៅរបស់អ្នក។",
        "បញ្ជាក់ថាតើត្រូវប្តូរខ្សែរថភ្លើងដែរឬទេ។"
      ]
    },
    "scen_ja_trv_03": {
      "title": "ការកុម្ម៉ង់មីរ៉ាមេន និងការជ្រើសរើសកម្រិតសរសៃមី និងទឹកស៊ុប",
      "situation": "ជ្រើសរើសកម្រិតភាពរឹងទន់នៃសរសៃមី និងរសជាតិដិតនៃទឹកស៊ុបនៅហាងមីរ៉ាមេនជប៉ុន។",
      "competency": "Kaiwa៖ ការធ្វើដំណើរ និងការប្រើប្រាស់ប្រចាំថ្ងៃ",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកចង់កុម្ម៉ង់អ្វីដែរ? តើអ្នកចង់ឱ្យស្រុះសរសៃមីបែបណាដែរ?",
      "missionGoals": [
        "កុម្ម៉ង់មីរ៉ាមេន និងសុំសរសៃមីរឹងបន្តិច (katame)។",
        "សុំទឹកផឹក ឬថែមសរសៃមីដោយគួរសម។"
      ]
    },
    "scen_ja_trv_04": {
      "title": "ការចូលស្នាក់នៅសណ្ឋាគារ (Check-In) និងការផ្ញើវ៉ាលីសមុនម៉ោង ៣ រសៀល",
      "situation": "ចុះឈ្មោះចូលស្នាក់នៅនៅតុទទួលភ្ញៀវសណ្ឋាគារ និងសុំផ្ញើវ៉ាលីសទុកសិន មុនពេលបន្ទប់រៀបចំរួចរាល់។",
      "competency": "Kaiwa៖ ការធ្វើដំណើរ និងការប្រើប្រាស់ប្រចាំថ្ងៃ",
      "openingTranslation": "សូមស្វាគមន៍។ តើអ្នកចូលស្នាក់នៅថ្ងៃនេះមែនទេ? តើខ្ញុំអាចសុំឈ្មោះដែលបានកក់ទុកបានទេ?",
      "missionGoals": [
        "ប្រាប់ឈ្មោះដែលបានកក់ទុករបស់អ្នកដោយគួរសម។",
        "សុំផ្ញើវ៉ាលីសរបស់អ្នកទុករហូតដល់ម៉ោងចូលស្នាក់នៅ (azukete mo ii desu ka)។"
      ]
    },
    "scen_ja_trv_05": {
      "title": "ការទិញថ្នាំផ្តាសាយ និងឈឺក្បាលនៅឱសថស្ថានជប៉ុន",
      "situation": "រៀបរាប់អាការៈឈឺបំពង់ក និងគ្រុនក្តៅទៅកាន់ឱសថការីនៅប្រទេសជប៉ុន។",
      "competency": "Kaiwa៖ ការធ្វើដំណើរ និងការប្រើប្រាស់ប្រចាំថ្ងៃ",
      "openingTranslation": "សួស្តី តើថ្ងៃនេះអ្នកមានអាការៈអ្វីខ្លះឱ្យខ្ញុំជួយ? តើអ្នកមានគ្រុនក្តៅដែរឬទេ?",
      "missionGoals": [
        "រៀបរាប់អាការៈឱ្យបានច្បាស់លាស់ (nodo ga itai ជាដើម)។",
        "សួរថាតើថ្នាំនេះធ្វើឱ្យងងុយគេង ឬគួរលេបក្រោយពេលបាយដែរឬទេ។"
      ]
    },
    "scen_ja_wrk_01": {
      "title": "ការស្វាគមន៍ថ្ងៃដំបូងនៅការិយាល័យ និងការប្តូរនាមប័ណ្ណ (Meishi Koukan)",
      "situation": "ស្វាគមន៍ក្រុមវិស្វករថ្មីរបស់អ្នកដោយគួរសម និងប្តូរនាមប័ណ្ណឱ្យបានត្រឹមត្រូវ។",
      "competency": "Kaiwa: ការងារ និងធុរកិច្ច",
      "openingTranslation": "រីករាយដែលបានស្គាល់ ខ្ញុំឈ្មោះ Sato មកពីក្រុមអភិវឌ្ឍន៍។ សង្ឃឹមថានឹងបានធ្វើការរួមគ្នាយ៉ាងរលូន។",
      "missionGoals": [
        "ណែនាំខ្លួនដោយគួរសម។",
        "ទទួលនាមប័ណ្ណដោយការគោរព (choudai itashimasu)។"
      ]
    },
    "scen_ja_wrk_02": {
      "title": "Horenso: ការរាយការណ៍ពីបញ្ហា (Bug) និងការស្នើសុំកែសម្រួលពេលវេលាកំណត់",
      "situation": "រាយការណ៍ជូនអ្នកគ្រប់គ្រងរបស់អ្នកឱ្យបានច្បាស់លាស់ អំពីមូលហេតុដើមនៃបញ្ហា (Bug) ក្នុងគម្រោង និងដំណោះស្រាយកាត់បន្ថយផលប៉ះពាល់ដែលបានស្នើឡើង។",
      "competency": "Kaiwa: ការងារ និងធុរកិច្ច",
      "openingTranslation": "បាទ/ចាស តើមានរឿងអ្វីកើតឡើង? តើមានបញ្ហាកើតឡើងលើគម្រោងមែនទេ?",
      "missionGoals": [
        "រៀបរាប់ពីវឌ្ឍនភាព និងមូលហេតុនៃបញ្ហា (Bug) ដោយសង្ខេប។",
        "ស្នើដំណោះស្រាយជាក់លាក់ និងកាលវិភាគថ្មីដោយគួរសម។"
      ]
    },
    "scen_ja_wrk_03": {
      "title": "សុជីវធម៌ក្នុងកម្មវិធីជប់លៀងការិយាល័យ (Nomikai)៖ ការលើកកែវជូនពរ និងការបង្កើតទំនាក់ទំនងល្អ",
      "situation": "ចូលរួមកម្មវិធីជួបជុំក្រុមក្រោយម៉ោងធ្វើការ លើកកែវជូនពរ និងជជែកលេងដោយធម្មជាតិជាមួយមិត្តរួមការងារ។",
      "competency": "Kaiwa: ការងារ និងធុរកិច្ច",
      "openingTranslation": "អរគុណសម្រាប់ការខិតខំប្រឹងប្រែងក្នុងគម្រោងនេះ! តោះលើកកែវជូនពរជាមុនសិន—តើអ្នកចង់ពិសាអ្វីដែរ?",
      "missionGoals": [
        "និយាយពាក្យជូនពរ និងលើកកែវដោយគួរសម (otsukaresama desu, kanpai!)។",
        "សួរមិត្តរួមការងារដើម្បីឱ្យពួកគេណែនាំអាហារ ឬភេសជ្ជៈ។"
      ]
    },
    "scen_ja_soc_01": {
      "title": "ការបបួលមិត្តភក្តិទៅដើរលេងនៅចុងសប្តាហ៍",
      "situation": "រៀបចំផែនការចុងសប្តាហ៍ ព្រមព្រៀងកន្លែងជួបគ្នា និងរក្សាការសន្ទនាឱ្យមានភាពកក់ក្តៅ និងធម្មជាតិ។",
      "competency": "Kaiwa: ជីវភាពប្រចាំថ្ងៃ និងសង្គម",
      "openingTranslation": "ហេ៎ តើចុងសប្តាហ៍នេះអ្នកមានគម្រោងទៅណាដែរទេ? មើលទៅអាកាសធាតុនឹងមានពន្លឺថ្ងៃល្អណាស់!",
      "missionGoals": [
        "ស្នើគម្រោងចុងសប្តាហ៍ដោយធម្មជាតិ។",
        "បញ្ជាក់ម៉ោង និងទីកន្លែងជួបគ្នាឱ្យបានច្បាស់លាស់។"
      ]
    },
    "scen_ja_soc_02": {
      "title": "ការសួរម្ចាស់ផ្ទះជួលអំពីច្បាប់បែងចែកសំរាមនៅអាផាតមិន",
      "situation": "អ្នកទើបតែរើចូលអាផាតមិននៅទីក្រុងតូក្យូ ហើយចង់បញ្ជាក់ពីថ្ងៃបោះសំរាមដែលអាចដុតបាន និងច្បាប់សម្រាប់ដបប្លាស្ទិក PET។",
      "competency": "Kaiwa: ជីវភាពប្រចាំថ្ងៃ និងសង្គម",
      "openingTranslation": "អូ៎ សូមស្វាគមន៍ដែលបានរើចូលមក! តើអ្វីៗដំណើរការទៅដោយរលូនទេ? តើអ្នកយល់ច្បាស់ពីការបែងចែកសំរាមហើយឬនៅ?",
      "missionGoals": [
        "សួរថាតើថ្ងៃណាជាថ្ងៃបោះសំរាមដែលអាចដុតបាន (Moeru gomi wa nan-youbi desu ka)។",
        "សួរអំពីរបៀបបោះចោលដបប្លាស្ទិក PET ឱ្យបានត្រឹមត្រូវ។"
      ]
    },
    "scen_ja_acd_01": {
      "title": "ការពិគ្រោះយោបល់លើនិក្ខេបបទ និងការកែសម្រួលឯកសារស្រាវជ្រាវនៅក្នុងការិយាល័យសាស្ត្រាចារ្យ",
      "situation": "ពិភាក្សាអំពីសម្មតិកម្មស្រាវជ្រាវ និងវិធីសាស្ត្រស្ទង់មតិរបស់អ្នកជាផ្លូវការ ជាមួយគ្រូដឹកនាំជនជាតិជប៉ុន។",
      "competency": "Kaiwa: សិក្សាធិការ និងផ្លូវការ",
      "openingTranslation": "សូមអញ្ជើញចូល។ ខ្ញុំបានអានសេចក្តីសង្ខេបរបាយការណ៍ដែលអ្នកបានដាក់ជូនហើយ—ជ្រុងនៃការស្រាវជ្រាវរបស់អ្នកគួរឱ្យចាប់អារម្មណ៍ណាស់។",
      "missionGoals": [
        "ចាប់ផ្តើមការសន្ទនាជាផ្លូវការ (Shitsurei itashimasu)។",
        "ស្នើសុំមតិកែលម្អលើវិធីសាស្ត្រស្ទង់មតិដោយការគោរព។"
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic: ការតម្រង់ទិសរូបមន្ត និងតេស្តវាយតម្លៃសមត្ថភាព",
      "situation": "វាស់ស្ទង់កម្រិតត្រៀមខ្លួនផ្នែក PTE Speaking របស់អ្នក និងរៀនយុទ្ធសាស្ត្រដាក់ពិន្ទុស្នូលដែលផ្តោតលើភាពស្ទាត់ជំនាញជាចម្បង។",
      "competency": "PTE Academic: ការតម្រង់ទិស និងការវាយតម្លៃសមត្ថភាព",
      "openingTranslation": "តោះកំណត់ល្បឿននៃការនិយាយ និងពិន្ទុគោលដៅ PTE របស់អ្នកឥឡូវនេះ។",
      "missionGoals": [
        "និយាយឱ្យរលូនដោយគ្មានការស្ទាក់ស្ទើរយូរ។",
        "បញ្ជាក់ពិន្ទុគោលដៅ និងពេលវេលាកំណត់របស់អ្នកឱ្យបានច្បាស់លាស់។"
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE កម្រិត 1: ជំនាញ Describe Image (គំរូទូទៅសម្រាប់គ្រប់រូបភាព)",
      "situation": "បង្ហាញការពណ៌នារូបភាពរយៈពេល 40 វិនាទីឱ្យបានរលូន ដោយផ្តោតលើភាពស្ទាត់ជំនាញជាប់លាប់ (5/5)។",
      "competency": "PTE Speaking: គំរូទូទៅសម្រាប់ Describe Image",
      "openingTranslation": "ពណ៌នាគំនូសតាងនៅលើអេក្រង់ឱ្យបានរលូនរយៈពេល 40 វិនាទីដោយមិនផ្អាក។",
      "missionGoals": [
        "គ្របដណ្តប់លើចំណងជើង ចំណុចខ្ពស់បំផុត ចំណុចទាបបំផុត និងសេចក្តីសន្និដ្ឋានសង្ខេប។",
        "រក្សាល្បឿនថេរដោយមិនកែពាក្យខ្លួនឯងឡើងវិញ។"
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE កម្រិត 2: Read Aloud (ការចែកកំណាត់ឃ្លា និងល្បឿន 130 WPM)",
      "situation": "អានអត្ថបទសិក្សាធិការឱ្យឮៗ ដោយប្រើការចែកកំណាត់ឃ្លាដែលមានន័យ និងការបញ្ចេញសំឡេងច្បាស់លាស់។",
      "competency": "PTE Speaking & Reading: ការចែកកំណាត់ឃ្លាសម្រាប់ Read Aloud",
      "openingTranslation": "អានអត្ថបទឱ្យឮៗ និងច្បាស់លាស់ក្នុងល្បឿនសិក្សាធិការថេរ។",
      "missionGoals": [
        "ចែកពាក្យជាក្រុមតាមរចនាសម្ព័ន្ធវេយ្យាករណ៍ធម្មជាតិ។",
        "បញ្ចេញសំឡេងពាក្យសិក្សាធិការសំខាន់ៗឱ្យបានច្បាស់ដោយមិនប្រញាប់។"
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE កម្រិត 3: Repeat Sentence (យុទ្ធសាស្ត្រចងចាំសំឡេង)",
      "situation": "និយាយត្រាប់តាមប្រយោគសិក្សាធិការឱ្យបានច្បាស់ ដោយរក្សាចង្វាក់ និងអត្ថន័យស្នូល។",
      "competency": "PTE Speaking & Listening: ការហាត់និយាយតាមសម្រាប់ Repeat Sentence",
      "openingTranslation": "ស្តាប់ដោយយកចិត្តទុកដាក់ ហើយនិយាយប្រយោគនីមួយៗឡើងវិញភ្លាមៗជាមួយចង្វាក់រលូន។",
      "missionGoals": [
        "ចាប់យកចង្វាក់នៃឃ្លាបើក និងឃ្លាបិទ។",
        "រក្សាភាពស្ទាត់ជំនាញ សូម្បីតែលើប្រយោគវែងៗ។"
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE កម្រិត 4: Write from Dictation និងអក្ខរាវិរុទ្ធសិក្សាធិការ",
      "situation": "រំលឹកឡើងវិញនូវប្រយោគដែលបានអានតាមអក្ខរាវិរុទ្ធមួយពាក្យម្តងៗ ជាមួយទម្រង់ពហុវចនៈ និងអក្ខរាវិរុទ្ធសិក្សាធិការត្រឹមត្រូវ។",
      "competency": "PTE Listening & Writing: ការសរសេរតាមអាន (Write from Dictation)",
      "openingTranslation": "ផ្ទៀងផ្ទាត់ពាក្យនីមួយៗ ចុងពាក្យពហុវចនៈ និងអក្ខរាវិរុទ្ធឱ្យបានត្រឹមត្រូវ។",
      "missionGoals": [
        "ពិនិត្យចុងពាក្យកាល (tense) និងពាក្យនាំមុខនាម (articles) ដោយប្រុងប្រយ័ត្ន។",
        "ផ្ទៀងផ្ទាត់កន្សោមពាក្យសិក្សាធិការដែលប្រើញឹកញាប់។"
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: ផែនទីបង្ហាញផ្លូវពីសូន្យដល់ជាប់ >= 65% (ទំព័រ 1-91)",
      "situation": "វគ្គបង្វឹក 1 ទល់ 1 ជាមួយ SSW SENSEI ចាប់ពីដំបូង ដើម្បីដណ្តើមជោគជ័យក្នុងការប្រឡង Prometric Food Manufacturing CBT (40 សំណួរ / 70 នាទី ពិន្ទុជាប់ 65%)។",
      "competency": "SSW: ផែនទីបង្ហាញផ្លូវ និងមគ្គុទ្ទេសក៍សម្រាប់អ្នកចាប់ផ្តើមដំបូង (ទំព័រ 1-6)",
      "openingTranslation": "ការស្វាគមន៍បើកឆាកពី SSW SENSEI៖ ត្រៀមខ្លួនជាស្រេចដើម្បីណែនាំអ្នកចាប់ពីមេរៀនទី 0 (ទំព័រ 1-6) រហូតដល់តេស្តអនុវត្ត CBT និងគណិតវិទ្យាប្រើម៉ាស៊ីនគិតលេខ (>= 65%)។",
      "missionGoals": [
        "ពិនិត្យវឌ្ឍនភាពសិក្សារបស់អ្នក និងស្វែងយល់ពីមូលហេតុដែលមេរៀនទី 0 (ទំព័រ 1-6) សំខាន់បំផុតសម្រាប់អ្នកចាប់ផ្តើមដំបូងត្រូវរៀនមុនគេ។",
        "ស្ទាត់ជំនាញបច្ចុប្បន្នភាពផ្លូវការ OTAFF Ver 5.1 ខែមេសា ឆ្នាំ 2026 (ចាំបាច់ 9 រួមមាន Kurumi និង Cashew Nut + ណែនាំ 20 រួមមាន Pistachio)។",
        "បញ្ចប់សំណួរកម្រង CBT ឬសំណួរគណនាយ៉ាងតិច 1 ជាមួយនឹងការពន្យល់ដែលយោងទៅទំព័រ PDF ដើម។"
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "ការធ្វើតេស្តអនុវត្ត CBT ចំនួន 50 សំណួរ និងអន្ទាក់ Wakai Papa",
      "situation": "សាកល្បងភាពត្រឹមត្រូវរបស់អ្នកក្នុងការជ្រើសរើសជម្រើស A, B ឬ C លើសំណួរ Prometric និងវិភាគហេតុផលនៅពីក្រោយជម្រើសអន្ទាក់នីមួយៗនៅលើទំព័រពន្យល់ 75-91។",
      "competency": "SSW: ការធ្វើតេស្តអនុវត្ត CBT និងការវិភាគអន្ទាក់",
      "openingTranslation": "ការស្វាគមន៍តេស្តអនុវត្ត CBT៖ ត្រៀមខ្លួនសាកល្បងថាតើអ្នកមើលដឹងអន្ទាក់សំណួរ Prometric បានល្អប៉ុនណា និងវាយតម្លៃពិន្ទុរបស់អ្នកផ្ទាល់។",
      "missionGoals": [
        "ឆ្លើយសំណួរ CBT ដោយមិនធ្លាក់ក្នុងអន្ទាក់ពាក្យដូចជា yukkuri ឬ zero percent។",
        "មើលលេខទំព័រសំណួរ និងទំព័រពន្យល់ពេញលេញបន្ទាប់ពីឆ្លើយរួច។"
      ]
    },
    "scen_ssw_math_visual": {
      "title": "ថ្នាក់គណិតវិទ្យាម៉ាស៊ីនគិតលេខ CBT (ក្លរីន ppm, Budomari និងឡដុត)",
      "situation": "ការហ្វឹកហាត់ផ្តោតលើរូបមន្តម៉ាស៊ីនគិតលេខ CBT របស់ SSW ចំនួន ៥ (ការពង្រាវក្លរីន, Budomari, រូបមន្តធ្វើនំប៉័ង, សមត្ថភាពឡដុត និងការលូតលាស់បាក់តេរី 2^n)។",
      "competency": "SSW៖ រូបមន្តគណិតវិទ្យាម៉ាស៊ីនគិតលេខ CBT",
      "openingTranslation": "សួស្តីក្នុងថ្នាក់គណិតវិទ្យា៖ ផ្តោតលើរូបមន្តក្លរីន C1*V1=C2*V2 ទិន្នផល Budomari និងគន្លឹះបង្គត់លេខឡើង។",
      "missionGoals": [
        "ទន្ទេញចាំការបម្លែង 1% = 10,000 ppm និងរូបមន្ត C1*V1 = C2*V2 (ទឹក = V2 - V1)។",
        "ឆ្លើយសំណួរគណនាឡដុត / សាច់បន្ទះហ្វីឡេ / ក្លរីន ដោយមិនចាញ់បោកជម្រើសអន្ទាក់នៃការបង្គត់លេខ។"
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "លំហាត់ហ្វឹកហាត់ Kotoba រោងចក្រម្ហូបអាហារ ២៦៦ ពាក្យ និងរបៀបអាន (ទំព័រ ៤៦-៦៣)",
      "situation": "លំហាត់ទន្ទេញ Kotoba ចំនួន ២៦៦ ពាក្យពីធនាគារទន្ទេញពាក្យ (ទំព័រ ៤៦-៦៣) ដោយប្រើការរំលឹកឡើងវិញសកម្ម បច្ចេកទេសផែនទីជប៉ុន និងការបញ្ចេញសំឡេងជនជាតិដើម។",
      "competency": "SSW៖ ការទន្ទេញ Kotoba រោងចក្រ និងការប្រឡង ២៦៦ ពាក្យ",
      "openingTranslation": "សួស្តីក្នុងលំហាត់ Kotoba៖ ផ្តោតលើការស្ទាត់ជំនាញពាក្យរោងចក្រម្ហូបអាហារ ២៦៦ ពាក្យ និងពាក្យសន្ទស្សន៍ផ្លូវការរបស់ OTAFF ចំនួន ១៤២ ពាក្យ។",
      "missionGoals": [
        "ឆ្លើយអត្ថន័យ និងរបៀបអាននៃពាក្យ Kotoba ផ្លូវការយ៉ាងតិច ៣ ពាក្យពីធនាគារពាក្យ (ទំព័រ ៤៦-៦៣)។"
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "អ្នកកំពុងចូលរួមវគ្គហ្វឹកហាត់សន្ទនាដំបូងរបស់អ្នកនៅ FIEZEL ហើយកំពុងសួរសុខទុក្ខគ្រូបង្រៀននៅក្នុងថ្នាក់។",
      "openingTranslation": "សួស្តី! សូមស្វាគមន៍មកកាន់ថ្នាក់ភាសាជប៉ុន FIEZEL! រីករាយដែលបានជួបអ្នក។"
    },
    "scen_ja_fiezel-life_02": {
      "situation": "គ្រូបង្រៀននិយាយរៀងលឿនបន្តិច ហើយអ្នកចង់សុំឱ្យគាត់និយាយម្តងទៀត ឬប្រាប់ថាអ្នកមិនទាន់យល់នៅឡើយទេ។",
      "openingTranslation": "សុំទោស តើការពន្យល់មិញនេះច្បាស់លាស់ទេ? ប្រសិនបើមានចំណុចណាមិនច្បាស់ សូមកុំស្ទាក់ស្ទើរប្រាប់ខ្ញុំឱ្យសោះ។"
    },
    "scen_ja_fiezel-life_03": {
      "situation": "ការណែនាំឈ្មោះ ប្រទេសកំណើត (ឥណ្ឌូនេស៊ី) និងស្ថានភាពការងារ ឬការសិក្សារបស់អ្នក។",
      "openingTranslation": "តើអ្នកឈ្មោះអ្វី ហើយមកពីណា? ខ្ញុំមកពីទីក្រុងតូក្យូ។"
    },
    "scen_ja_fiezel-life_04": {
      "situation": "ការពន្យល់អំពីទីក្រុង និងតំបន់ដែលអ្នកកំពុងរស់នៅបច្ចុប្បន្នក្នុងប្រទេសជប៉ុន។",
      "openingTranslation": "តើអ្នកស៊ាំនឹងការរស់នៅប្រទេសជប៉ុនហើយឬនៅ? ឥឡូវនេះអ្នករស់នៅទីណា?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "ការនិយាយអំពីអាហារដែលចូលចិត្ត និងការបង្ហាញចំណង់ចំណូលចិត្តចំពោះម្ហូបជប៉ុន។",
      "openingTranslation": "តើអ្នកចូលចិត្តញ៉ាំអ្វីសម្រាប់អាហារថ្ងៃត្រង់? តើអ្នកធ្លាប់សាកល្បងម្ហូបជប៉ុនដែរឬទេ?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "ការកុម្ម៉ង់ឈុតអាហារ និងភេសជ្ជៈនៅភោជនីយដ្ឋានអាហាររហ័ស។",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកបានសម្រេចចិត្តថាត្រូវកុម្ម៉ង់អ្វីហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "ការពិពណ៌នាអំពីបរិក្ខារ និងចំនួនបន្ទប់នៅក្នុងអាផាតមិនរបស់អ្នក។",
      "openingTranslation": "តើកន្លែងស្នាក់នៅថ្មីរបស់អ្នកយ៉ាងម៉េចដែរ? តើមានបន្ទប់ប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "ការប្រាប់ពីទីតាំងរបស់មិត្តរួមការងារនៅក្នុងការិយាល័យ ឬបរិវេណរោងចក្រ។",
      "openingTranslation": "អេ តើ Yamada-san នៅឯណា? តើអ្នកបានឃើញគាត់ទេ?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "ការពន្យល់អំពីម៉ោងសម្រាកអាហារថ្ងៃត្រង់ និងកាលវិភាគការងារប្រចាំថ្ងៃ។",
      "openingTranslation": "សូមបន្តការងារល្អ! តើម៉ោងសម្រាកអាហារថ្ងៃត្រង់ចាប់ផ្តើម និងបញ្ចប់នៅម៉ោងប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "ការខ្ចីសម្ភារៈការិយាល័យ (ប្រដាប់កិបក្រដាស / កន្ត្រៃ) ពីមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "កំពុងរៀបចំឯកសារមែនទេ? តើមានឧបករណ៍ ឬសម្ភារៈណាដែលអ្នកត្រូវការប្រើដែរឬទេ?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "ការនិយាយអំពីចំណង់ចំណូលចិត្តសម្រាកលំហែ និងការរីករាយនឹងការអានម៉ាំងហ្គា ឬមើលអានីមេ។",
      "openingTranslation": "តើអ្នកតែងតែធ្វើអ្វីខ្លះនៅថ្ងៃឈប់សម្រាក? តើមានអានីមេ ឬម៉ាំងហ្គាណាដែលអ្នកចូលចិត្តទេ?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "ការទទួលយក ឬបដិសេធការអញ្ជើញទៅផឹកជុំគ្នាជាមួយមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "តើអ្នកចង់ទៅផឹកជុំគ្នាបន្ទាប់ពីចេញពីធ្វើការនៅថ្ងៃសុក្រនេះទេ?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "ការសួរផ្លូវ និងបញ្ជាក់ថាតើឡានក្រុងទៅដល់អាកាសយានដ្ឋានដែរឬទេ។",
      "openingTranslation": "ខ្ញុំចង់ទៅអាកាសយានដ្ឋានណារីតា—តើខ្ញុំគួរជិះឡានក្រុងមួយណា?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "ការសួរឈ្មោះអគារ និងទីកន្លែងសាធារណៈនានានៅជុំវិញទីក្រុង។",
      "openingTranslation": "អ្នកអាចមើលឃើញអគារខ្ពស់នៅទីនោះមែនទេ? តើអ្នកដឹងថាជាអគារអ្វីទេ?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "ការសួរអ្នកគិតលុយនៅហាងថាតើថ្មពិល ឬរបស់ប្រើប្រាស់ប្រចាំថ្ងៃស្ថិតនៅកន្លែងណា។",
      "openingTranslation": "កំពុងទិញទំនិញនៅហាង konbini មែនទេ? តើមានអ្វីដែលអ្នកកំពុងស្វែងរកឬ?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "ការសួរតម្លៃសម្លៀកបំពាក់ និងពិនិត្យមើលថាតើមានការបញ្ចុះតម្លៃដែរឬទេ។",
      "openingTranslation": "ឈុតនេះមើលទៅសមនឹងអ្នកខ្លាំងណាស់! តើអ្នកបានមើលតម្លៃហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "ការនិយាយអំពីការទៅមើលកុនជាមួយមិត្តភក្តិនៅចុងសប្តាហ៍។",
      "openingTranslation": "តើចុងសប្តាហ៍របស់អ្នកយ៉ាងម៉េចដែរ? តើអ្នកបានចេញទៅណាដែរឬទេ?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "ការបង្ហាញបំណងប្រាថ្នាចង់ទៅវិស្សមកាលនៅកន្លែងងូតទឹកក្តៅធម្មជាតិ (onsen)។",
      "openingTranslation": "អាកាសធាតុកំពុងចាប់ផ្តើមត្រជាក់ហើយ មែនទេ? ខ្ញុំមានអារម្មណ៍ថាចង់ទៅកន្លែងណាដែលកក់ក្តៅ។"
    },
    "scen_ja_fiezel-life_19": {
      "situation": "អ្នកកំពុងចូលរួមវគ្គហ្វឹកហាត់សន្ទនាដំបូងរបស់អ្នកនៅ FIEZEL ហើយកំពុងសួរសុខទុក្ខគ្រូបង្រៀននៅក្នុងថ្នាក់។",
      "openingTranslation": "សួស្តី! សូមស្វាគមន៍មកកាន់ថ្នាក់ភាសាជប៉ុន FIEZEL! រីករាយដែលបានជួបអ្នក។"
    },
    "scen_ja_fiezel-life_20": {
      "situation": "គ្រូបង្រៀននិយាយរៀងលឿនបន្តិច ហើយអ្នកចង់សុំឱ្យគាត់និយាយម្តងទៀត ឬប្រាប់ថាអ្នកមិនទាន់យល់នៅឡើយទេ។",
      "openingTranslation": "សុំទោស តើការពន្យល់មិញនេះច្បាស់លាស់ទេ? ប្រសិនបើមានចំណុចណាមិនច្បាស់ សូមកុំស្ទាក់ស្ទើរប្រាប់ខ្ញុំឱ្យសោះ។"
    },
    "scen_ja_fiezel-life_21": {
      "situation": "ការណែនាំឈ្មោះ ប្រទេសកំណើត (ឥណ្ឌូនេស៊ី) និងស្ថានភាពការងារ ឬការសិក្សារបស់អ្នក។",
      "openingTranslation": "តើអ្នកឈ្មោះអ្វី ហើយមកពីណា? ខ្ញុំមកពីទីក្រុងតូក្យូ។"
    },
    "scen_ja_fiezel-life_22": {
      "situation": "ការពន្យល់អំពីទីក្រុង និងតំបន់ដែលអ្នកកំពុងរស់នៅបច្ចុប្បន្នក្នុងប្រទេសជប៉ុន។",
      "openingTranslation": "តើអ្នកស៊ាំនឹងការរស់នៅប្រទេសជប៉ុនហើយឬនៅ? ឥឡូវនេះអ្នករស់នៅទីណា?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "ការនិយាយអំពីអាហារដែលចូលចិត្ត និងការបង្ហាញចំណង់ចំណូលចិត្តចំពោះម្ហូបជប៉ុន។",
      "openingTranslation": "តើអ្នកចូលចិត្តញ៉ាំអ្វីសម្រាប់អាហារថ្ងៃត្រង់? តើអ្នកធ្លាប់សាកល្បងម្ហូបជប៉ុនដែរឬទេ?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "ការកុម្ម៉ង់ឈុតអាហារ និងភេសជ្ជៈនៅភោជនីយដ្ឋានអាហាររហ័ស។",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកបានសម្រេចចិត្តថាត្រូវកុម្ម៉ង់អ្វីហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "ការពិពណ៌នាអំពីបរិក្ខារ និងចំនួនបន្ទប់នៅក្នុងអាផាតមិនរបស់អ្នក។",
      "openingTranslation": "តើកន្លែងស្នាក់នៅថ្មីរបស់អ្នកយ៉ាងម៉េចដែរ? តើមានបន្ទប់ប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "ការប្រាប់ពីទីតាំងរបស់មិត្តរួមការងារនៅក្នុងការិយាល័យ ឬបរិវេណរោងចក្រ។",
      "openingTranslation": "អេ តើ Yamada-san នៅឯណា? តើអ្នកបានឃើញគាត់ទេ?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "ការពន្យល់អំពីម៉ោងសម្រាកអាហារថ្ងៃត្រង់ និងកាលវិភាគការងារប្រចាំថ្ងៃ។",
      "openingTranslation": "សូមបន្តការងារល្អ! តើម៉ោងសម្រាកអាហារថ្ងៃត្រង់ចាប់ផ្តើម និងបញ្ចប់នៅម៉ោងប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "ការខ្ចីសម្ភារៈការិយាល័យ (ប្រដាប់កិបក្រដាស / កន្ត្រៃ) ពីមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "កំពុងរៀបចំឯកសារមែនទេ? តើមានឧបករណ៍ ឬសម្ភារៈណាដែលអ្នកត្រូវការប្រើដែរឬទេ?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "ការនិយាយអំពីចំណង់ចំណូលចិត្តសម្រាកលំហែ និងការរីករាយនឹងការអានម៉ាំងហ្គា ឬមើលអានីមេ។",
      "openingTranslation": "តើអ្នកតែងតែធ្វើអ្វីខ្លះនៅថ្ងៃឈប់សម្រាក? តើមានអានីមេ ឬម៉ាំងហ្គាណាដែលអ្នកចូលចិត្តទេ?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "ការទទួលយក ឬបដិសេធការអញ្ជើញទៅផឹកជុំគ្នាជាមួយមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "តើអ្នកចង់ទៅផឹកជុំគ្នាបន្ទាប់ពីចេញពីធ្វើការនៅថ្ងៃសុក្រនេះទេ?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "ការសួរផ្លូវ និងបញ្ជាក់ថាតើឡានក្រុងទៅដល់អាកាសយានដ្ឋានដែរឬទេ។",
      "openingTranslation": "ខ្ញុំចង់ទៅអាកាសយានដ្ឋានណារីតា—តើខ្ញុំគួរជិះឡានក្រុងមួយណា?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "ការសួរឈ្មោះអគារ និងទីកន្លែងសាធារណៈនានានៅជុំវិញទីក្រុង។",
      "openingTranslation": "អ្នកអាចមើលឃើញអគារខ្ពស់នៅទីនោះមែនទេ? តើអ្នកដឹងថាជាអគារអ្វីទេ?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "ការសួរអ្នកគិតលុយនៅហាងថាតើថ្មពិល ឬរបស់ប្រើប្រាស់ប្រចាំថ្ងៃស្ថិតនៅកន្លែងណា។",
      "openingTranslation": "កំពុងទិញទំនិញនៅហាង konbini មែនទេ? តើមានអ្វីដែលអ្នកកំពុងស្វែងរកឬ?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "ការសួរតម្លៃសម្លៀកបំពាក់ និងពិនិត្យមើលថាតើមានការបញ្ចុះតម្លៃដែរឬទេ។",
      "openingTranslation": "ឈុតនេះមើលទៅសមនឹងអ្នកខ្លាំងណាស់! តើអ្នកបានមើលតម្លៃហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "ការនិយាយអំពីការទៅមើលកុនជាមួយមិត្តភក្តិនៅចុងសប្តាហ៍។",
      "openingTranslation": "តើចុងសប្តាហ៍របស់អ្នកយ៉ាងម៉េចដែរ? តើអ្នកបានចេញទៅណាដែរឬទេ?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "ការបង្ហាញបំណងប្រាថ្នាចង់ទៅវិស្សមកាលនៅកន្លែងងូតទឹកក្តៅធម្មជាតិ (onsen)។",
      "openingTranslation": "អាកាសធាតុកំពុងចាប់ផ្តើមត្រជាក់ហើយ មែនទេ? ខ្ញុំមានអារម្មណ៍ថាចង់ទៅកន្លែងណាដែលកក់ក្តៅ។"
    },
    "scen_ja_fiezel-life_37": {
      "situation": "អ្នកកំពុងចូលរួមវគ្គហ្វឹកហាត់សន្ទនាដំបូងរបស់អ្នកនៅ FIEZEL ហើយកំពុងសួរសុខទុក្ខគ្រូបង្រៀននៅក្នុងថ្នាក់។",
      "openingTranslation": "សួស្តី! សូមស្វាគមន៍មកកាន់ថ្នាក់ភាសាជប៉ុន FIEZEL! រីករាយដែលបានជួបអ្នក។"
    },
    "scen_ja_fiezel-life_38": {
      "situation": "គ្រូបង្រៀននិយាយរៀងលឿនបន្តិច ហើយអ្នកចង់សុំឱ្យគាត់និយាយម្តងទៀត ឬប្រាប់ថាអ្នកមិនទាន់យល់នៅឡើយទេ។",
      "openingTranslation": "សុំទោស តើការពន្យល់មិញនេះច្បាស់លាស់ទេ? ប្រសិនបើមានចំណុចណាមិនច្បាស់ សូមកុំស្ទាក់ស្ទើរប្រាប់ខ្ញុំឱ្យសោះ។"
    },
    "scen_ja_fiezel-life_39": {
      "situation": "ការណែនាំឈ្មោះ ប្រទេសកំណើត (ឥណ្ឌូនេស៊ី) និងស្ថានភាពការងារ ឬការសិក្សារបស់អ្នក។",
      "openingTranslation": "តើអ្នកឈ្មោះអ្វី ហើយមកពីណា? ខ្ញុំមកពីទីក្រុងតូក្យូ។"
    },
    "scen_ja_fiezel-life_40": {
      "situation": "ការពន្យល់អំពីទីក្រុង និងតំបន់ដែលអ្នកកំពុងរស់នៅបច្ចុប្បន្នក្នុងប្រទេសជប៉ុន។",
      "openingTranslation": "តើអ្នកស៊ាំនឹងការរស់នៅប្រទេសជប៉ុនហើយឬនៅ? ឥឡូវនេះអ្នករស់នៅទីណា?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "ការនិយាយអំពីអាហារដែលចូលចិត្ត និងការបង្ហាញចំណង់ចំណូលចិត្តចំពោះម្ហូបជប៉ុន។",
      "openingTranslation": "តើអ្នកចូលចិត្តញ៉ាំអ្វីសម្រាប់អាហារថ្ងៃត្រង់? តើអ្នកធ្លាប់សាកល្បងម្ហូបជប៉ុនដែរឬទេ?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "ការកុម្ម៉ង់ឈុតអាហារ និងភេសជ្ជៈនៅភោជនីយដ្ឋានអាហាររហ័ស។",
      "openingTranslation": "សូមស្វាគមន៍! តើអ្នកបានសម្រេចចិត្តថាត្រូវកុម្ម៉ង់អ្វីហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "ការពិពណ៌នាអំពីបរិក្ខារ និងចំនួនបន្ទប់នៅក្នុងអាផាតមិនរបស់អ្នក។",
      "openingTranslation": "តើកន្លែងស្នាក់នៅថ្មីរបស់អ្នកយ៉ាងម៉េចដែរ? តើមានបន្ទប់ប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "ការប្រាប់ពីទីតាំងរបស់មិត្តរួមការងារនៅក្នុងការិយាល័យ ឬបរិវេណរោងចក្រ។",
      "openingTranslation": "អេ តើ Yamada-san នៅឯណា? តើអ្នកបានឃើញគាត់ទេ?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "ការពន្យល់អំពីម៉ោងសម្រាកអាហារថ្ងៃត្រង់ និងកាលវិភាគការងារប្រចាំថ្ងៃ។",
      "openingTranslation": "សូមបន្តការងារល្អ! តើម៉ោងសម្រាកអាហារថ្ងៃត្រង់ចាប់ផ្តើម និងបញ្ចប់នៅម៉ោងប៉ុន្មាន?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "ការខ្ចីសម្ភារៈការិយាល័យ (ប្រដាប់កិបក្រដាស / កន្ត្រៃ) ពីមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "កំពុងរៀបចំឯកសារមែនទេ? តើមានឧបករណ៍ ឬសម្ភារៈណាដែលអ្នកត្រូវការប្រើដែរឬទេ?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "ការនិយាយអំពីចំណង់ចំណូលចិត្តសម្រាកលំហែ និងការរីករាយនឹងការអានម៉ាំងហ្គា ឬមើលអានីមេ។",
      "openingTranslation": "តើអ្នកតែងតែធ្វើអ្វីខ្លះនៅថ្ងៃឈប់សម្រាក? តើមានអានីមេ ឬម៉ាំងហ្គាណាដែលអ្នកចូលចិត្តទេ?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "ការទទួលយក ឬបដិសេធការអញ្ជើញទៅផឹកជុំគ្នាជាមួយមិត្តរួមការងារដោយសុភាពរាបសា។",
      "openingTranslation": "តើអ្នកចង់ទៅផឹកជុំគ្នាបន្ទាប់ពីចេញពីធ្វើការនៅថ្ងៃសុក្រនេះទេ?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "ការសួរផ្លូវ និងបញ្ជាក់ថាតើឡានក្រុងទៅដល់អាកាសយានដ្ឋានដែរឬទេ។",
      "openingTranslation": "ខ្ញុំចង់ទៅអាកាសយានដ្ឋានណារីតា—តើខ្ញុំគួរជិះឡានក្រុងមួយណា?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "ការសួរឈ្មោះអគារ និងទីកន្លែងសាធារណៈនានានៅជុំវិញទីក្រុង។",
      "openingTranslation": "អ្នកអាចមើលឃើញអគារខ្ពស់នៅទីនោះមែនទេ? តើអ្នកដឹងថាជាអគារអ្វីទេ?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "ការសួរអ្នកគិតលុយនៅហាងថាតើថ្មពិល ឬរបស់ប្រើប្រាស់ប្រចាំថ្ងៃស្ថិតនៅកន្លែងណា។",
      "openingTranslation": "កំពុងទិញទំនិញនៅហាង konbini មែនទេ? តើមានអ្វីដែលអ្នកកំពុងស្វែងរកឬ?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "ការសួរតម្លៃសម្លៀកបំពាក់ និងពិនិត្យមើលថាតើមានការបញ្ចុះតម្លៃដែរឬទេ។",
      "openingTranslation": "ឈុតនេះមើលទៅសមនឹងអ្នកខ្លាំងណាស់! តើអ្នកបានមើលតម្លៃហើយឬនៅ?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "ការនិយាយអំពីការទៅមើលកុនជាមួយមិត្តភក្តិនៅចុងសប្តាហ៍។",
      "openingTranslation": "តើចុងសប្តាហ៍របស់អ្នកយ៉ាងម៉េចដែរ? តើអ្នកបានចេញទៅណាដែរឬទេ?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "ការបង្ហាញបំណងប្រាថ្នាចង់ទៅវិស្សមកាលនៅកន្លែងងូតទឹកក្តៅធម្មជាតិ (onsen)។",
      "openingTranslation": "អាកាសធាតុកំពុងចាប់ផ្តើមត្រជាក់ហើយ មែនទេ? ខ្ញុំមានអារម្មណ៍ថាចង់ទៅកន្លែងណាដែលកក់ក្តៅ។"
    }
  },
  "ru": {
    "scen_en_a2_cafe": {
      "title": "Заказ кофе и рассказ о планах на вторую половину дня",
      "situation": "Вы встречаетесь с Coach Alex в кафе перед командной встречей. Сделайте вежливый заказ и расскажите о своих планах на вторую половину дня, используя Present Continuous.",
      "competency": "Говорение A2: запланированные дела и заказ в кафе",
      "openingTranslation": "Привет! Рад встрече в кафе. Что вы будете пить сегодня и какие у вас планы после кофе?",
      "missionGoals": [
        "Используйте \"I would like...\" или \"I'd like...\", чтобы вежливо заказать напиток.",
        "Используйте Present Continuous (\"I am meeting...\" / \"I am working on...\") для планов на сегодняшний день."
      ]
    },
    "scen_en_free_talk": {
      "title": "Свободная беседа: открытый разговор с Coach Alex",
      "situation": "Общайтесь свободно на любую тему: хобби, планы, мнения или повседневные истории без жёстких подсказок.",
      "competency": "Говорение: свободная беседа и спонтанные ответы",
      "openingTranslation": "Свободно задавайте вопросы и отвечайте о повседневных темах, трудностях в учёбе или личных целях.",
      "missionGoals": [
        "Выражайте мысли напрямую, без долгих пауз и ступора.",
        "Естественно реагируйте на спонтанные уточняющие вопросы."
      ]
    },
    "scen_en_free_talk_sarah": {
      "title": "Структурированная аргументация и уверенная дискуссия с Coach Sarah",
      "situation": "Отработайте чёткую структурированную речь, логическую аргументацию и естественные деловые формулировки.",
      "competency": "Говорение: логичная аргументация и ясность речи",
      "openingTranslation": "Давайте чёткие структурированные ответы с обоснованиями и примерами.",
      "missionGoals": [
        "Ясно формулируйте свою точку зрения и подкрепляйте её доводами.",
        "Используйте плавные логические связки."
      ]
    },
    "scen_en_a1_hometown": {
      "title": "Present Simple: описание родного города и района",
      "situation": "Естественно расскажите о том, где вы живёте, о повседневной рутине и любимых местах поблизости.",
      "competency": "Говорение: Present Simple и привычные места",
      "openingTranslation": "Расскажите о своём родном городе и о том, какие места рядом вам нравятся.",
      "missionGoals": [
        "Грамотно используйте Present Simple (\"I live in...\", \"There is/are...\").",
        "Опишите 1–2 знакомых места недалеко от дома."
      ]
    },
    "scen_en_a2_past_trip": {
      "title": "Простое прошедшее время (Simple Past): неправильные глаголы и рассказы о поездках",
      "situation": "Расскажите о прошлой поездке, используя неправильные глаголы (went, saw, bought, ate) в чёткой последовательности.",
      "competency": "Говорение: рассказ о событиях в прошедшем времени",
      "openingTranslation": "Расскажите о недавней поездке, которая вам запомнилась!",
      "missionGoals": [
        "Точно используйте неправильные глаголы в прошедшем времени (went, ate, took, saw).",
        "Излагайте события в понятном хронологическом порядке."
      ]
    },
    "scen_en_b2_ielts_exam": {
      "title": "Экзаменационный режим · Структурированное мнение и уступительные придаточные",
      "situation": "Официальная симуляция IELTS Speaking с акцентом на сбалансированные аргументы, точность лексики и связность речи.",
      "competency": "Говорение: симуляция IELTS Academic (части 1–3)",
      "openingTranslation": "Отвечайте бегло, приводя структурированные примеры и взвешенные аргументы.",
      "missionGoals": [
        "Разворачивайте подробные ответы без повторов.",
        "Естественно используйте уступительные придаточные и академические слова-связки."
      ]
    },
    "scen_ja_n5_kissaten": {
      "title": "Частица прямого дополнения を (o) и заказ с помощью ください (kudasai)",
      "situation": "Естественно закажите кофе или пирожное в токийском кафе, правильно используя частицы и вежливые счётные суффиксы.",
      "competency": "Говорение: заказ и базовые частицы (N5)",
      "openingTranslation": "Добро пожаловать! Вы уже выбрали заказ? Сегодня мы рекомендуем горячий кофе и чизкейк.",
      "missionGoals": [
        "Сделайте вежливый заказ, используя \"～を ください\".",
        "Естественно используйте базовые японские счётные слова (ひとつ / ふたつ)."
      ]
    },
    "scen_ja_free_talk": {
      "title": "Свободная практика кайва с Sensei Nanami",
      "situation": "Естественная свободная беседа на японском о повседневной жизни, еде, хобби или трудностях в учёбе.",
      "competency": "Говорение: естественное повседневное кайва",
      "openingTranslation": "Давайте непринуждённо пообщаемся на японском на любую тему, которая у вас на уме!",
      "missionGoals": [
        "Отвечайте естественно в вежливом стиле японского языка (です/ます).",
        "Задайте один уточняющий вопрос на японском языке."
      ]
    },
    "scen_ja_free_talk_keita": {
      "title": "Неформальная беседа на улице и в кампусе с Keita Senpai",
      "situation": "Расслабленный повседневный разговор на японском об аниме, студенческой жизни, музыке и выражениях Токио и Осаки.",
      "competency": "Говорение: неформальное уличное и кампусное кайва",
      "openingTranslation": "Свободно общайтесь в неформальном стиле о хобби, жизни в кампусе или японской поп-культуре!",
      "missionGoals": [
        "Отрабатывайте естественный поток неформальной беседы.",
        "Естественно реагируйте на дружеские реплики."
      ]
    },
    "scen_ja_n4_senpai": {
      "title": "Вежливые просьбы и запрос совета (〜ていただけますか / 〜たらいいですか)",
      "situation": "Вежливо попросите совета и наставления у старшего коллеги или наставника на учёбе или работе.",
      "competency": "Говорение: советы и вежливые просьбы (N4)",
      "openingTranslation": "Хорошая работа сегодня! Вы в последнее время кажетесь занятым университетскими отчётами — что-нибудь вызывает трудности?",
      "missionGoals": [
        "Вежливо объясните свою ситуацию, используя \"～んです / ～ので\".",
        "Попросите совета, используя \"～たらいいですか\"."
      ]
    },
    "scen_zh_free_talk": {
      "title": "Аутентичная тренировка пекинского путунхуа с Xiao Mochi",
      "situation": "Двусторонний диалог с мгновенной обратной связью по тонам и грамматике, интерактивными упражнениями на доске и голосовой навигацией.",
      "competency": "Говорение: естественный путунхуа и плавность 4 тонов",
      "openingTranslation": "Привет, вы пришли! Отбросьте учебную интонацию — скажите честно, что в китайском языке в последнее время даётся сложнее всего?",
      "missionGoals": [
        "Чётко отрабатывайте тоны китайского языка в целых предложениях.",
        "Отвечайте Xiao Mochi и в любой момент просите упражнения на тоны."
      ]
    },
    "zh-restaurant-ordering": {
      "title": "Заказ еды в пекинском ресторане (HSK 1-2)",
      "situation": "Вы находитесь в пекинской лапшичной и заказываете порцию лапши с говядиной без острого.",
      "competency": "Заказ еды и счётные слова в китайском языке",
      "openingTranslation": "Здравствуйте! Добро пожаловать в китайское бистро Fiezel! На сколько человек столик? Что бы вы хотели заказать?",
      "missionGoals": [
        "Закажите одну пиалу лапши с говядиной (yì wǎn niúròumiàn).",
        "Попросите неострое блюдо, используя \"bú yào là\"."
      ]
    },
    "zh-subway-directions": {
      "title": "Как спросить дорогу и пользоваться метро в Китае (HSK 2)",
      "situation": "Вы в Шанхае ищете ближайшую станцию метро и уточняете, идёт ли 2-я линия до аэропорта.",
      "competency": "Направления и общественный транспорт на китайском",
      "openingTranslation": "Здравствуйте! Нужна помощь? Куда бы вы хотели поехать?",
      "missionGoals": [
        "Спросите, где находится станция метро (dìtiězhàn zài nǎr).",
        "Спросите, доходит ли 2-я линия до аэропорта (néng dào jīchǎng ma)."
      ]
    },
    "scen_ja_trv_01": {
      "title": "Покупка и разогрев бэнто в комбини",
      "situation": "Вы стоите ночью на кассе круглосуточного магазина в Синдзюку с онигири, бэнто и зелёным чаем.",
      "competency": "Кайва: путешествия и базовое общение",
      "openingTranslation": "Добро пожаловать! Разогреть вам бэнто? Нужен ли вам пакет?",
      "missionGoals": [
        "Попросите сотрудника разогреть бэнто (atatamete kudasai).",
        "Вежливо откажитесь от пакета (fukuro wa kekkou desu)."
      ]
    },
    "scen_ja_trv_02": {
      "title": "Поиск нужной железнодорожной платформы на крупной станции",
      "situation": "Спросите у сотрудника станции в Токио, на какую платформу идти и на какую линию делать пересадку.",
      "competency": "Кайва: путешествия и базовое общение",
      "openingTranslation": "Да, чем я могу помочь? В каком направлении вы едете?",
      "missionGoals": [
        "Спросите, с какой по номеру платформы отправляются поезда вашей линии назначения.",
        "Уточните, нужна ли пересадка."
      ]
    },
    "scen_ja_trv_03": {
      "title": "Заказ рамэна и выбор жёсткости лапши и насыщенности бульона",
      "situation": "Выберите жёсткость лапши и насыщенность бульона в японской рамэнной.",
      "competency": "Кайва: путешествия и базовое общение",
      "openingTranslation": "Добро пожаловать! Что бы вы хотели заказать? Как приготовить для вас лапшу?",
      "missionGoals": [
        "Закажите рамэн и попросите более твёрдую лапшу (katame).",
        "Вежливо попросите воды или дополнительную порцию лапши."
      ]
    },
    "scen_ja_trv_04": {
      "title": "Заселение в отель и хранение багажа до 15:00",
      "situation": "Пройдите регистрацию на стойке отеля и попросите оставить багаж на хранение до готовности номера.",
      "competency": "Кайва: путешествия и базовое общение",
      "openingTranslation": "Добро пожаловать. Вы заселяетесь сегодня? Назовите, пожалуйста, имя, на которое оформлена бронь.",
      "missionGoals": [
        "Вежливо назовите имя, на которое оформлено бронирование.",
        "Попросите оставить багаж до заселения (azukete mo ii desu ka)."
      ]
    },
    "scen_ja_trv_05": {
      "title": "Покупка лекарства от простуды и головной боли в японской аптеке",
      "situation": "Опишите симптомы боли в горле и жара фармацевту в Японии.",
      "competency": "Кайва: путешествия и базовое общение",
      "openingTranslation": "Здравствуйте, с какими симптомами я могу вам сегодня помочь? У вас есть температура?",
      "missionGoals": [
        "Чётко опишите симптомы (nodo ga itai и т. д.).",
        "Спросите, вызывает ли лекарство сонливость и нужно ли принимать его после еды."
      ]
    },
    "scen_ja_wrk_01": {
      "title": "Приветствие в офисе в первый день и обмен визитками (Meishi Koukan)",
      "situation": "Вежливо поприветствуйте свою новую команду разработчиков и правильно обменяйтесь визитками.",
      "competency": "Кайва: работа и бизнес",
      "openingTranslation": "Приятно познакомиться, я Сато из команды разработки. Буду рад совместной работе.",
      "missionGoals": [
        "Вежливо представьтесь.",
        "Уважительно примите визитку (choudai itashimasu)."
      ]
    },
    "scen_ja_wrk_02": {
      "title": "Хорэнсо: сообщение о баге и запрос переноса дедлайна",
      "situation": "Чётко доложите руководителю о первопричине бага в проекте и предложенном способе решения.",
      "competency": "Кайва: работа и бизнес",
      "openingTranslation": "Да, что случилось? В проекте возникла какая-то проблема?",
      "missionGoals": [
        "Кратко изложите текущий прогресс и причину бага.",
        "Вежливо предложите конкретное решение и обновлённые сроки."
      ]
    },
    "scen_ja_wrk_03": {
      "title": "Этикет офисного номикай: тосты и налаживание контакта",
      "situation": "Присоединяйтесь к встрече команды после работы, произнесите тост и естественно пообщайтесь с коллегами.",
      "competency": "Кайва: работа и бизнес",
      "openingTranslation": "Спасибо за усердную работу над этим проектом! Давайте сначала поднимем тост — что вы будете пить?",
      "missionGoals": [
        "Произнесите вежливое приветствие/тост (otsukaresama desu, kanpai!).",
        "Спросите у коллег рекомендации по еде или напиткам."
      ]
    },
    "scen_ja_soc_01": {
      "title": "Приглашение друга провести время на выходных",
      "situation": "Постройте планы на выходные, договоритесь о месте встречи и поддерживайте тёплую, естественную беседу.",
      "competency": "Кайва: повседневное и светское общение",
      "openingTranslation": "Привет, у тебя есть планы на эти выходные? Похоже, погода будет солнечной!",
      "missionGoals": [
        "Естественно предложите план на выходные.",
        "Чётко подтвердите время и место встречи."
      ]
    },
    "scen_ja_soc_02": {
      "title": "Уточнение у арендодателя правил сортировки мусора в квартире",
      "situation": "Вы только что переехали в квартиру в Токио и хотите уточнить дни вывоза сжигаемого мусора и правила для ПЭТ-бутылок.",
      "competency": "Кайва: повседневное и светское общение",
      "openingTranslation": "О, с новосельем! Всё проходит хорошо? С сортировкой мусора всё понятно?",
      "missionGoals": [
        "Спросите, в какой день вывозят сжигаемый мусор (Moeru gomi wa nan-youbi desu ka).",
        "Спросите, как правильно утилизировать ПЭТ-бутылки."
      ]
    },
    "scen_ja_acd_01": {
      "title": "Консультация по дипломной работе и доработка статьи в кабинете профессора",
      "situation": "Официально обсудите вашу исследовательскую гипотезу и методологию опроса с японским научным руководителем.",
      "competency": "Кайва: академическое и официальное общение",
      "openingTranslation": "Пожалуйста, входите. Я прочитал присланное вами резюме отчёта — ваш исследовательский подход весьма интересен.",
      "missionGoals": [
        "Начните беседу официально (Shitsurei itashimasu).",
        "Уважительно попросите обратную связь по методологии опроса."
      ]
    },
    "scen_pte_coach_intro": {
      "title": "PTE Academic: знакомство с формулой и диагностический тест",
      "situation": "Оцените свой базовый уровень готовности к PTE Speaking и изучите ключевую стратегию оценивания с приоритетом беглости.",
      "competency": "PTE Academic: введение и диагностика",
      "openingTranslation": "Давайте прямо сейчас определим ваш темп речи и базовый ориентир для целевого балла PTE.",
      "missionGoals": [
        "Говорите плавно, без долгих пауз и заминок.",
        "Чётко озвучьте ваш целевой балл и сроки подготовки."
      ]
    },
    "scen_pte_di_level1": {
      "title": "PTE Уровень 1: мастер Describe Image (универсальный шаблон)",
      "situation": "Выдайте плавное 40-секундное описание изображения с акцентом на непрерывную беглость речи (5/5).",
      "competency": "PTE Speaking: универсальный шаблон Describe Image",
      "openingTranslation": "Плавно опишите график на экране в течение 40 секунд без пауз.",
      "missionGoals": [
        "Назовите заголовок, наивысший пик, самую низкую точку и краткий вывод.",
        "Поддерживайте ровный темп без самоисправлений."
      ]
    },
    "scen_pte_ra_level2": {
      "title": "PTE Уровень 2: Read Aloud (разбивка на смысловые фразы и темп 130 слов/мин)",
      "situation": "Читайте академические отрывки вслух, используя осмысленное деление на фразы и чёткую артикуляцию.",
      "competency": "PTE Speaking & Reading: смысловая разбивка в Read Aloud",
      "openingTranslation": "Прочитайте отрывок вслух чётко и в ровном академическом темпе.",
      "missionGoals": [
        "Группируйте слова в естественные синтаксические блоки.",
        "Чётко произносите ключевые академические слова без спешки."
      ]
    },
    "scen_pte_rs_level3": {
      "title": "PTE Уровень 3: Repeat Sentence (стратегия акустической памяти)",
      "situation": "Точно повторяйте академические предложения, сохраняя ритм и основной смысл.",
      "competency": "PTE Speaking & Listening: шэдоуинг в Repeat Sentence",
      "openingTranslation": "Внимательно слушайте и сразу же повторяйте каждое предложение в ровном ритме.",
      "missionGoals": [
        "Улавливайте ритм начальной и заключительной частей предложения.",
        "Сохраняйте беглость даже в длинных предложениях."
      ]
    },
    "scen_pte_wfd_level4": {
      "title": "PTE Уровень 4: Write from Dictation и академическая орфография",
      "situation": "Воспроизводите продиктованные предложения слово в слово с правильными формами множественного числа и академической орфографией.",
      "competency": "PTE Listening & Writing: Write from Dictation",
      "openingTranslation": "Тщательно проверяйте каждое слово, окончание множественного числа и правописание.",
      "missionGoals": [
        "Внимательно проверяйте окончания времён и артикли.",
        "Проверяйте частотные академические словосочетания."
      ]
    },
    "scen_ssw_mentor_roadmap": {
      "title": "SSW SENSEI: пошаговый план с нуля до сдачи >= 65% (стр. 1–91)",
      "situation": "Индивидуальная коучинг-сессия с SSW SENSEI с нуля для успешной сдачи компьютерного экзамена Prometric CBT по пищевому производству (40 вопросов / 70 минут, проходной балл 65%).",
      "competency": "SSW: план подготовки и гид для начинающих (стр. 1–6)",
      "openingTranslation": "Вступительное приветствие SSW SENSEI: готов провести вас от Раздела 0 (стр. 1–6) до тренировочного теста CBT и расчётов на калькуляторе (>= 65%).",
      "missionGoals": [
        "Проверьте свой прогресс обучения и поймите, почему новичкам важно изучить Раздел 0 (стр. 1–6) в первую очередь.",
        "Освойте официальное обновление OTAFF Ver 5.1 от апреля 2026 года (9 обязательных аллергенов, включая Kurumi и кешью, + 20 рекомендуемых, включая фисташки).",
        "Выполните как минимум 1 задание теста CBT или расчётную задачу с разбором и ссылками на оригинальные страницы PDF."
      ]
    },
    "scen_ssw_tryout_cbt": {
      "title": "Симуляция тренировочного теста CBT из 50 вопросов и ловушки Wakai Papa",
      "situation": "Проверьте свою точность при выборе вариантов A, B или C в вопросах Prometric и разберите логику каждого варианта-ловушки на страницах с пояснениями 75–91.",
      "competency": "SSW: симуляция теста CBT и анализ ловушек",
      "openingTranslation": "Приветствие тренировочного теста CBT: готовы проверить, насколько хорошо вы распознаёте ловушки в вопросах Prometric, и сразу получить оценку.",
      "missionGoals": [
        "Отвечайте на вопросы CBT, не попадаясь на слова-ловушки вроде yukkuri или ноль процентов.",
        "Просматривайте номер страницы с вопросом и полную страницу с объяснением после ответа."
      ]
    },
    "scen_ssw_math_visual": {
      "title": "Урок расчётов на калькуляторе CBT (ppm хлора, Budomari и печь)",
      "situation": "Целевая тренировка по 5 формулам калькулятора SSW CBT (разведение хлора, Budomari, рецепт хлеба, загрузка печи и рост бактерий 2^n).",
      "competency": "SSW: формулы расчётов на калькуляторе CBT",
      "openingTranslation": "Приветствие урока математики: сосредоточьтесь на формуле хлора C1*V1=C2*V2, выходе продукта budomari и приёмах округления в большую сторону.",
      "missionGoals": [
        "Запомните перевод 1% = 10,000 ppm и формулу C1*V1 = C2*V2 (вода = V2 - V1).",
        "Решайте задачи на расчёт печи / филе / хлора, не попадаясь на ловушки с округлением."
      ]
    },
    "scen_ssw_kotoba_drill": {
      "title": "Тренировка 266 терминов Kotoba пищевого производства и чтений (стр. 46–63)",
      "situation": "Тренировка запоминания 266 терминов Kotoba из банка запоминания (стр. 46–63) с помощью активного припоминания, техник Japan Map и произношения носителей.",
      "competency": "SSW: запоминание 266 производственных и экзаменационных терминов Kotoba",
      "openingTranslation": "Приветствие Kotoba Drill: сфокусируйтесь на освоении 266 терминов лексики пищевого производства и 142 официальных терминов из указателя OTAFF.",
      "missionGoals": [
        "Назовите значения и чтения как минимум 3 официальных терминов Kotoba из банка слов (стр. 46–63)."
      ]
    },
    "scen_ja_fiezel-life_01": {
      "situation": "Вы пришли на своё первое занятие по разговорной практике в FIEZEL и приветствуете преподавателя в классе.",
      "openingTranslation": "Здравствуйте! Добро пожаловать на урок японского языка в FIEZEL! Приятно познакомиться."
    },
    "scen_ja_fiezel-life_02": {
      "situation": "Преподаватель говорит немного быстро, и вы хотите попросить его повторить или сказать, что пока не понимаете.",
      "openingTranslation": "Извините, это объяснение было понятным? Если что-то непонятно, пожалуйста, не стесняйтесь сказать мне."
    },
    "scen_ja_fiezel-life_03": {
      "situation": "Представление своего имени, родной страны (Индонезия) и статуса работы или учёбы.",
      "openingTranslation": "Как вас зовут и откуда вы? Я из Токио."
    },
    "scen_ja_fiezel-life_04": {
      "situation": "Рассказ о городе и регионе Японии, где вы сейчас живёте.",
      "openingTranslation": "Вы уже привыкли к жизни в Японии? Где вы сейчас живёте?"
    },
    "scen_ja_fiezel-life_05": {
      "situation": "Разговор о любимых блюдах и выражение симпатии к японской кухне.",
      "openingTranslation": "Что вы любите есть на обед? Вы когда-нибудь пробовали японскую еду?"
    },
    "scen_ja_fiezel-life_06": {
      "situation": "Заказ комбо-набора из еды и напитка в ресторане быстрого питания.",
      "openingTranslation": "Добро пожаловать! Вы уже решили, что хотите заказать?"
    },
    "scen_ja_fiezel-life_07": {
      "situation": "Описание удобств и количества комнат в вашей квартире.",
      "openingTranslation": "Как вам новое жильё? Сколько там комнат?"
    },
    "scen_ja_fiezel-life_08": {
      "situation": "Объяснение, где находится коллега в офисе или на территории завода.",
      "openingTranslation": "Привет, а где Ямада-сан? Вы его/её не видели?"
    },
    "scen_ja_fiezel-life_09": {
      "situation": "Объяснение времени обеденного перерыва и ежедневного рабочего графика.",
      "openingTranslation": "Хорошей работы! Во сколько начинается и заканчивается обеденный перерыв?"
    },
    "scen_ja_fiezel-life_10": {
      "situation": "Вежливая просьба одолжить канцелярские принадлежности (степлер/ножницы) у коллеги.",
      "openingTranslation": "Разбираете документы? Вам нужен какой-нибудь инструмент или канцелярские принадлежности?"
    },
    "scen_ja_fiezel-life_11": {
      "situation": "Разговор о спокойных хобби и удовольствии от чтения манги или просмотра аниме.",
      "openingTranslation": "Чем вы обычно занимаетесь в выходные? Есть ли какое-нибудь аниме или манга, которые вам нравятся?"
    },
    "scen_ja_fiezel-life_12": {
      "situation": "Вежливое согласие или отказ от приглашения сходить выпить с коллегами.",
      "openingTranslation": "Не хотите сходить выпить вместе после работы в эту пятницу?"
    },
    "scen_ja_fiezel-life_13": {
      "situation": "Уточнение маршрута и подтверждение того, идёт ли автобус в аэропорт.",
      "openingTranslation": "Я хочу поехать в аэропорт Нарита — на какой автобус мне сесть?"
    },
    "scen_ja_fiezel-life_14": {
      "situation": "Вопросы о названиях зданий и общественных учреждений в городе.",
      "openingTranslation": "Вы видите вон то высокое здание, правда? Вы знаете, что это за здание?"
    },
    "scen_ja_fiezel-life_15": {
      "situation": "Вопрос кассиру магазина о том, где находятся батарейки или товары повседневного спроса.",
      "openingTranslation": "Делаете покупки в комбини? Вы что-то ищете?"
    },
    "scen_ja_fiezel-life_16": {
      "situation": "Вопрос о цене одежды и уточнение, есть ли скидка.",
      "openingTranslation": "Кажется, этот наряд вам очень подойдёт! Вы уже посмотрели цену?"
    },
    "scen_ja_fiezel-life_17": {
      "situation": "Разговор о походе в кино с друзьями на выходных.",
      "openingTranslation": "Как прошли ваши выходные? Вы куда-нибудь ходили?"
    },
    "scen_ja_fiezel-life_18": {
      "situation": "Выражение желания поехать в отпуск на горячие источники (онсэн).",
      "openingTranslation": "Погода становится холодной, не так ли? Хочется поехать куда-нибудь в тёплое место."
    },
    "scen_ja_fiezel-life_19": {
      "situation": "Вы пришли на своё первое занятие по разговорной практике в FIEZEL и приветствуете преподавателя в классе.",
      "openingTranslation": "Здравствуйте! Добро пожаловать на урок японского языка в FIEZEL! Приятно познакомиться."
    },
    "scen_ja_fiezel-life_20": {
      "situation": "Преподаватель говорит немного быстро, и вы хотите попросить его повторить или сказать, что пока не понимаете.",
      "openingTranslation": "Извините, это объяснение было понятным? Если что-то непонятно, пожалуйста, не стесняйтесь сказать мне."
    },
    "scen_ja_fiezel-life_21": {
      "situation": "Представление своего имени, родной страны (Индонезия) и статуса работы или учёбы.",
      "openingTranslation": "Как вас зовут и откуда вы? Я из Токио."
    },
    "scen_ja_fiezel-life_22": {
      "situation": "Рассказ о городе и регионе Японии, где вы сейчас живёте.",
      "openingTranslation": "Вы уже привыкли к жизни в Японии? Где вы сейчас живёте?"
    },
    "scen_ja_fiezel-life_23": {
      "situation": "Разговор о любимых блюдах и выражение симпатии к японской кухне.",
      "openingTranslation": "Что вы любите есть на обед? Вы когда-нибудь пробовали японскую еду?"
    },
    "scen_ja_fiezel-life_24": {
      "situation": "Заказ комбо-набора из еды и напитка в ресторане быстрого питания.",
      "openingTranslation": "Добро пожаловать! Вы уже решили, что хотите заказать?"
    },
    "scen_ja_fiezel-life_25": {
      "situation": "Описание удобств и количества комнат в вашей квартире.",
      "openingTranslation": "Как вам новое жильё? Сколько там комнат?"
    },
    "scen_ja_fiezel-life_26": {
      "situation": "Объяснение, где находится коллега в офисе или на территории завода.",
      "openingTranslation": "Привет, а где Ямада-сан? Вы его/её не видели?"
    },
    "scen_ja_fiezel-life_27": {
      "situation": "Объяснение времени обеденного перерыва и ежедневного рабочего графика.",
      "openingTranslation": "Хорошей работы! Во сколько начинается и заканчивается обеденный перерыв?"
    },
    "scen_ja_fiezel-life_28": {
      "situation": "Вежливая просьба одолжить канцелярские принадлежности (степлер/ножницы) у коллеги.",
      "openingTranslation": "Разбираете документы? Вам нужен какой-нибудь инструмент или канцелярские принадлежности?"
    },
    "scen_ja_fiezel-life_29": {
      "situation": "Разговор о спокойных хобби и удовольствии от чтения манги или просмотра аниме.",
      "openingTranslation": "Чем вы обычно занимаетесь в выходные? Есть ли какое-нибудь аниме или манга, которые вам нравятся?"
    },
    "scen_ja_fiezel-life_30": {
      "situation": "Вежливое согласие или отказ от приглашения сходить выпить с коллегами.",
      "openingTranslation": "Не хотите сходить выпить вместе после работы в эту пятницу?"
    },
    "scen_ja_fiezel-life_31": {
      "situation": "Уточнение маршрута и подтверждение того, идёт ли автобус в аэропорт.",
      "openingTranslation": "Я хочу поехать в аэропорт Нарита — на какой автобус мне сесть?"
    },
    "scen_ja_fiezel-life_32": {
      "situation": "Вопросы о названиях зданий и общественных учреждений в городе.",
      "openingTranslation": "Вы видите вон то высокое здание, правда? Вы знаете, что это за здание?"
    },
    "scen_ja_fiezel-life_33": {
      "situation": "Вопрос кассиру магазина о том, где находятся батарейки или товары повседневного спроса.",
      "openingTranslation": "Делаете покупки в комбини? Вы что-то ищете?"
    },
    "scen_ja_fiezel-life_34": {
      "situation": "Вопрос о цене одежды и уточнение, есть ли скидка.",
      "openingTranslation": "Кажется, этот наряд вам очень подойдёт! Вы уже посмотрели цену?"
    },
    "scen_ja_fiezel-life_35": {
      "situation": "Разговор о походе в кино с друзьями на выходных.",
      "openingTranslation": "Как прошли ваши выходные? Вы куда-нибудь ходили?"
    },
    "scen_ja_fiezel-life_36": {
      "situation": "Выражение желания поехать в отпуск на горячие источники (онсэн).",
      "openingTranslation": "Погода становится холодной, не так ли? Хочется поехать куда-нибудь в тёплое место."
    },
    "scen_ja_fiezel-life_37": {
      "situation": "Вы пришли на своё первое занятие по разговорной практике в FIEZEL и приветствуете преподавателя в классе.",
      "openingTranslation": "Здравствуйте! Добро пожаловать на урок японского языка в FIEZEL! Приятно познакомиться."
    },
    "scen_ja_fiezel-life_38": {
      "situation": "Преподаватель говорит немного быстро, и вы хотите попросить его повторить или сказать, что пока не понимаете.",
      "openingTranslation": "Извините, это объяснение было понятным? Если что-то непонятно, пожалуйста, не стесняйтесь сказать мне."
    },
    "scen_ja_fiezel-life_39": {
      "situation": "Представление своего имени, родной страны (Индонезия) и статуса работы или учёбы.",
      "openingTranslation": "Как вас зовут и откуда вы? Я из Токио."
    },
    "scen_ja_fiezel-life_40": {
      "situation": "Рассказ о городе и регионе Японии, где вы сейчас живёте.",
      "openingTranslation": "Вы уже привыкли к жизни в Японии? Где вы сейчас живёте?"
    },
    "scen_ja_fiezel-life_41": {
      "situation": "Разговор о любимых блюдах и выражение симпатии к японской кухне.",
      "openingTranslation": "Что вы любите есть на обед? Вы когда-нибудь пробовали японскую еду?"
    },
    "scen_ja_fiezel-life_42": {
      "situation": "Заказ комбо-набора из еды и напитка в ресторане быстрого питания.",
      "openingTranslation": "Добро пожаловать! Вы уже решили, что хотите заказать?"
    },
    "scen_ja_fiezel-life_43": {
      "situation": "Описание удобств и количества комнат в вашей квартире.",
      "openingTranslation": "Как вам новое жильё? Сколько там комнат?"
    },
    "scen_ja_fiezel-life_44": {
      "situation": "Объяснение, где находится коллега в офисе или на территории завода.",
      "openingTranslation": "Привет, а где Ямада-сан? Вы его/её не видели?"
    },
    "scen_ja_fiezel-life_45": {
      "situation": "Объяснение времени обеденного перерыва и ежедневного рабочего графика.",
      "openingTranslation": "Хорошей работы! Во сколько начинается и заканчивается обеденный перерыв?"
    },
    "scen_ja_fiezel-life_46": {
      "situation": "Вежливая просьба одолжить канцелярские принадлежности (степлер/ножницы) у коллеги.",
      "openingTranslation": "Разбираете документы? Вам нужен какой-нибудь инструмент или канцелярские принадлежности?"
    },
    "scen_ja_fiezel-life_47": {
      "situation": "Разговор о спокойных хобби и удовольствии от чтения манги или просмотра аниме.",
      "openingTranslation": "Чем вы обычно занимаетесь в выходные? Есть ли какое-нибудь аниме или манга, которые вам нравятся?"
    },
    "scen_ja_fiezel-life_48": {
      "situation": "Вежливое согласие или отказ от приглашения сходить выпить с коллегами.",
      "openingTranslation": "Не хотите сходить выпить вместе после работы в эту пятницу?"
    },
    "scen_ja_fiezel-life_49": {
      "situation": "Уточнение маршрута и подтверждение того, идёт ли автобус в аэропорт.",
      "openingTranslation": "Я хочу поехать в аэропорт Нарита — на какой автобус мне сесть?"
    },
    "scen_ja_fiezel-life_50": {
      "situation": "Вопросы о названиях зданий и общественных учреждений в городе.",
      "openingTranslation": "Вы видите вон то высокое здание, правда? Вы знаете, что это за здание?"
    },
    "scen_ja_fiezel-life_51": {
      "situation": "Вопрос кассиру магазина о том, где находятся батарейки или товары повседневного спроса.",
      "openingTranslation": "Делаете покупки в комбини? Вы что-то ищете?"
    },
    "scen_ja_fiezel-life_52": {
      "situation": "Вопрос о цене одежды и уточнение, есть ли скидка.",
      "openingTranslation": "Кажется, этот наряд вам очень подойдёт! Вы уже посмотрели цену?"
    },
    "scen_ja_fiezel-life_53": {
      "situation": "Разговор о походе в кино с друзьями на выходных.",
      "openingTranslation": "Как прошли ваши выходные? Вы куда-нибудь ходили?"
    },
    "scen_ja_fiezel-life_54": {
      "situation": "Выражение желания поехать в отпуск на горячие источники (онсэн).",
      "openingTranslation": "Погода становится холодной, не так ли? Хочется поехать куда-нибудь в тёплое место."
    }
  }
};

export const VS_VOCAB_TRANS: Partial<Record<LearnerLocale, Record<string, string>>> = {
  "en": {
    "kopi susu dingin": "iced coffee with milk",
    "kelompok belajar": "group studying together",
    "menyiapkan presentasi": "get slides or notes ready",
    "Saya tinggal di...": "my home is in...",
    "Rumah saya dekat...": "located near...",
    "pergi (bentuk lampau)": "past form of go",
    "makan (bentuk lampau)": "past form of eat",
    "mengambil foto (bentuk lampau)": "captured pictures",
    "waktu perjalanan pulang-pergi kerja": "daily travel to/from work",
    "kekompakan / kohesi tim": "team unity and connection",
    "satu buah / satu porsi": "one item / one serving",
    "tolong berikan ~": "please give me ~",
    "karena ~ (alasan sopan)": "because / since (polite reason)",
    "sebaiknya bagaimana saya ~?": "what should I do to ~?",
    "nada bicara (4 nada Mandarin)": "4 Mandarin tones",
    "tata bahasa / grammar": "sentence grammar",
    "mie daging sapi": "beef noodle soup",
    "jangan pedas / tidak mau pedas": "no spice / not spicy",
    "stasiun kereta bawah tanah / MRT": "subway / MRT station",
    "bandara": "airport",
    "atatameru - menghangatkan": "atatameru - to warm up",
    "obentou - kotak makan": "obentou - lunch box",
    "fukuro - kantong plastik": "fukuro - plastic bag",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - no thank you / enough",
    "okaikei - pembayaran": "okaikei - bill / payment",
    "norikae - transit": "norikae - transfer",
    "hoomu - peron": "hoomu - platform",
    "iki - tujuan": "iki - destination / bound for",
    "Ginzasen - Jalur Ginza": "Ginzasen - Ginza Line",
    "bansen - nomor jalur": "bansen - track / platform number",
    "men - mi": "men - noodles",
    "katame - agak keras": "katame - slightly firm",
    "koime - kental/pekat": "koime - rich / strong",
    "kaedama - tambah mi": "kaedama - extra noodles",
    "koorimizu - air es": "koorimizu - ice water",
    "yoyaku - reservasi": "yoyaku - reservation",
    "azukeru - menitipkan": "azukeru - to check / store (in someone's care)",
    "nimotsu - koper/barang": "nimotsu - luggage / belongings",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - breakfast",
    "kazegusuri - obat flu": "kazegusuri - cold medicine",
    "shoujou - gejala": "shoujou - symptoms",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - sore throat",
    "nemuke - rasa kantuk": "nemuke - drowsiness",
    "shokugo - sesudah makan": "shokugo - after meals",
    "meishi - kartu nama": "meishi - business card",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - I humbly accept",
    "tantou - penanggung jawab": "tantou - person in charge",
    "seiippai - sekuat tenaga": "seiippai - to the best of one's ability",
    "goshidou - bimbingan": "goshidou - guidance",
    "shinchoku - progres": "shinchoku - progress",
    "gen'in - penyebab": "gen'in - cause",
    "fuguai - bug/cacat": "fuguai - bug / defect",
    "enki - penundaan": "enki - postponement",
    "taisaku - langkah penanggulangan": "taisaku - countermeasure",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - cheers / toast",
    "tsugu - menuangkan minuman": "tsugu - to pour a drink",
    "nareru - terbiasa": "nareru - to get used to",
    "osusume - rekomendasi": "osusume - recommendation",
    "yotei - rencana": "yotei - plan / schedule",
    "machiawase - janji temu": "machiawase - meetup / appointment",
    "sanpo - jalan-jalan santai": "sanpo - leisurely stroll",
    "ogoru - mentraktir": "ogoru - to treat someone",
    "tanoshimi - antusias": "tanoshimi - looking forward to",
    "moeru gomi - sampah bakar": "moeru gomi - burnable trash",
    "bunbetsu - pemilahan": "bunbetsu - sorting",
    "suteru - membuang": "suteru - to throw away",
    "fukuro - kantong": "fukuro - bag",
    "youbi - hari": "youbi - day of the week",
    "kenkyuu - riset": "kenkyuu - research",
    "chakuganten - sudut pandang": "chakuganten - perspective / point of focus",
    "kasetsu - hipotesis": "kasetsu - hypothesis",
    "kenshou - verifikasi": "kenshou - verification",
    "gokyouji - bimbingan/arahan": "gokyouji - guidance/instruction",
    "salam kenal": "nice to meet you",
    "sekali lagi": "one more time",
    "asal / kampung halaman": "origin / hometown",
    "tinggal di ~": "live in ~",
    "suka ~": "like ~",
    "ada (benda mati)": "there is / exist (inanimate objects)",
    "ada (orang/makhluk hidup)": "there is / exist (people/living things)",
    "dari ~ sampai ~": "from ~ to ~",
    "tolong pinjamkan": "please lend me",
    "komik / manga": "comics / manga",
    "maukah pergi bersama?": "would you like to go together?",
    "bangunan / gedung": "building",
    "baterai": "battery",
    "berapa harga ~": "how much is ~",
    "film / bioskop": "movie / cinema",
    "pemandian air panas (onsen)": "hot spring bath (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "speaking smoothly without hesitant pauses",
    "standar nilai minimum untuk pengajuan visa": "minimum score benchmark for visa/study",
    "angka atau titik tertinggi pada grafik": "highest figure or peak on a chart",
    "angka atau proporsi terendah pada visual": "lowest figure or share on a visual",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "continuous flow without stumbling",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "grouping words into natural breath units",
    "kejelasan pengucapan suku kata dan konsonan": "clear syllable and consonant delivery",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "holding acoustic rhythm right after hearing it",
    "penilaian dampak lingkungan": "evaluating impact on the environment",
    "pengaruh yang sangat mendalam": "a very profound influence",
    "sangat membekas dalam ingatan saya": "left a lasting impression in my memory",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - food poisoning",
    "tadashii - benar / sesuai aturan": "tadashii - correct / compliant with rules",
    "machigatteiru - salah / keliru": "machigatteiru - wrong / incorrect",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - mandatory labeled allergens (9 items, Apr 2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - retained product sample for complaint inspection",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - placing items in a designated spot (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - bacterial endospore resistant to 100C heat",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - sodium hypochlorite (chlorine solution)",
    "kishaku - pengenceran larutan": "kishaku - solution dilution",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - yield / net usable output percentage",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - foreign matter contamination in food",
    "kousa osen - kontaminasi silang": "kousa osen - cross-contamination",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - safety first (OSH)"
  },
  "th": {
    "kopi susu dingin": "ลาเต้เย็น",
    "kelompok belajar": "กลุ่มติวหนังสือ",
    "menyiapkan presentasi": "เตรียมงานนำเสนอ",
    "Saya tinggal di...": "ฉันอาศัยอยู่ที่...",
    "Rumah saya dekat...": "บ้านของฉันอยู่ใกล้...",
    "pergi (bentuk lampau)": "ไปแล้ว (ช่อง 2 ของ go)",
    "makan (bentuk lampau)": "กินแล้ว (ช่อง 2 ของ eat)",
    "mengambil foto (bentuk lampau)": "ถ่ายรูป (ช่อง 2 ของ take)",
    "waktu perjalanan pulang-pergi kerja": "เวลาเดินทางไปกลับที่ทำงาน",
    "kekompakan / kohesi tim": "ความสามัคคีในทีม",
    "satu buah / satu porsi": "1 ชิ้น / 1 ที่",
    "tolong berikan ~": "ขอ ~ ครับ/ค่ะ",
    "karena ~ (alasan sopan)": "เพราะว่า ~ (บอกเหตุผลอย่างสุภาพ)",
    "sebaiknya bagaimana saya ~?": "ควรจะ ~ อย่างไรดีครับ/คะ?",
    "nada bicara (4 nada Mandarin)": "เสียงวรรณยุกต์",
    "tata bahasa / grammar": "ไวยากรณ์",
    "mie daging sapi": "บะหมี่เนื้อวัว",
    "jangan pedas / tidak mau pedas": "ไม่เอาเผ็ด",
    "stasiun kereta bawah tanah / MRT": "สถานีรถไฟใต้ดิน",
    "bandara": "สนามบิน",
    "atatameru - menghangatkan": "atatameru - อุ่นให้ร้อน",
    "obentou - kotak makan": "obentou - ข้าวกล่อง",
    "fukuro - kantong plastik": "fukuro - ถุงพลาสติก",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - ไม่เป็นไรครับ/ค่ะ / พอแล้ว",
    "okaikei - pembayaran": "okaikei - คิดเงิน / ชำระเงิน",
    "norikae - transit": "norikae - เปลี่ยนสาย / ต่อรถ",
    "hoomu - peron": "hoomu - ชานชาลา",
    "iki - tujuan": "iki - ปลายทาง / มุ่งหน้าไป",
    "Ginzasen - Jalur Ginza": "Ginzasen - สายกินซ่า (Ginza Line)",
    "bansen - nomor jalur": "bansen - ชานชาลาหมายเลข / รางที่",
    "men - mi": "men - เส้นบะหมี่",
    "katame - agak keras": "katame - แข็งเล็กน้อย",
    "koime - kental/pekat": "koime - รสเข้มข้น",
    "kaedama - tambah mi": "kaedama - เส้นเพิ่ม",
    "koorimizu - air es": "koorimizu - น้ำเย็นใส่น้ำแข็ง",
    "yoyaku - reservasi": "yoyaku - การจอง",
    "azukeru - menitipkan": "azukeru - ฝากไว้ / ฝากเก็บ",
    "nimotsu - koper/barang": "nimotsu - สัมภาระ / กระเป๋าเดินทาง",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - อาหารเช้า",
    "kazegusuri - obat flu": "kazegusuri - ยาแก้หวัด",
    "shoujou - gejala": "shoujou - อาการ",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - เจ็บคอ",
    "nemuke - rasa kantuk": "nemuke - อาการง่วงนอน",
    "shokugo - sesudah makan": "shokugo - หลังอาหาร",
    "meishi - kartu nama": "meishi - นามบัตร",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - ขอรับไว้ด้วยความนอบน้อม",
    "tantou - penanggung jawab": "tantou - ผู้รับผิดชอบ",
    "seiippai - sekuat tenaga": "seiippai - อย่างเต็มที่ / สุดความสามารถ",
    "goshidou - bimbingan": "goshidou - คำแนะนำ / การชี้แนะ",
    "shinchoku - progres": "shinchoku - ความคืบหน้า",
    "gen'in - penyebab": "gen'in - สาเหตุ",
    "fuguai - bug/cacat": "fuguai - ข้อผิดพลาด / บั๊ก",
    "enki - penundaan": "enki - การเลื่อนกำหนด",
    "taisaku - langkah penanggulangan": "taisaku - มาตรการรับมือ / แนวทางแก้ไข",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - ชนแก้ว / ดื่มฉลอง",
    "tsugu - menuangkan minuman": "tsugu - รินเครื่องดื่ม",
    "nareru - terbiasa": "nareru - คุ้นเคย / ชิน",
    "osusume - rekomendasi": "osusume - คำแนะนำ / สิ่งที่แนะนำ",
    "yotei - rencana": "yotei - แผนการ / กำหนดการ",
    "machiawase - janji temu": "machiawase - การนัดพบ",
    "sanpo - jalan-jalan santai": "sanpo - การเดินเล่นพักผ่อน",
    "ogoru - mentraktir": "ogoru - เลี้ยง (จ่ายให้)",
    "tanoshimi - antusias": "tanoshimi - ตั้งตารอ / รอคอยอย่างยินดี",
    "moeru gomi - sampah bakar": "moeru gomi - ขยะเผาได้",
    "bunbetsu - pemilahan": "bunbetsu - การคัดแยก",
    "suteru - membuang": "suteru - ทิ้ง",
    "fukuro - kantong": "fukuro - ถุง",
    "youbi - hari": "youbi - วันในสัปดาห์",
    "kenkyuu - riset": "kenkyuu - การวิจัย",
    "chakuganten - sudut pandang": "chakuganten - มุมมอง / จุดที่ให้ความสำคัญ",
    "kasetsu - hipotesis": "kasetsu - สมมติฐาน",
    "kenshou - verifikasi": "kenshou - การตรวจสอบยืนยัน",
    "gokyouji - bimbingan/arahan": "gokyouji - คำชี้แนะ / การสั่งสอน",
    "salam kenal": "ยินดีที่ได้รู้จัก",
    "sekali lagi": "อีกครั้งหนึ่ง",
    "asal / kampung halaman": "บ้านเกิด / มาจาก",
    "tinggal di ~": "อาศัยอยู่ที่ ~",
    "suka ~": "ชอบ ~",
    "ada (benda mati)": "มี (สิ่งไม่มีชีวิต)",
    "ada (orang/makhluk hidup)": "อยู่ (คน/สิ่งมีชีวิต)",
    "dari ~ sampai ~": "ตั้งแต่ ~ ถึง ~",
    "tolong pinjamkan": "ขอยืมหน่อยครับ",
    "komik / manga": "การ์ตูน / มังงะ",
    "maukah pergi bersama?": "ไปด้วยกันไหมครับ?",
    "bangunan / gedung": "อาคาร / ตึก",
    "baterai": "ถ่านไฟฉาย / แบตเตอรี่",
    "berapa harga ~": "ราคาเท่าไหร่",
    "film / bioskop": "ภาพยนตร์ / หนัง",
    "pemandian air panas (onsen)": "บ่อน้ำพุร้อน (ออนเซ็น)",
    "kelancaran berbicara tanpa jeda ragu": "ความคล่องแคล่วในการพูดโดยไม่ติดขัด",
    "standar nilai minimum untuk pengajuan visa": "เกณฑ์คะแนนขั้นต่ำสำหรับการขอวีซ่า",
    "angka atau titik tertinggi pada grafik": "ตัวเลขหรือจุดสูงสุดในกราฟ",
    "angka atau proporsi terendah pada visual": "ค่าต่ำสุดในกราฟ",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "ความคล่องแคล่วในการพูดต่อเนื่องโดยไม่หยุดชะงัก",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "การจัดกลุ่มคำตามความหมายเพื่อจังหวะการหายใจที่เหมาะสม",
    "kejelasan pengucapan suku kata dan konsonan": "ความชัดเจนในการออกเสียงสระและพยัญชนะ",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "ความจำเสียงและจังหวะประโยคทันทีที่ได้ยิน",
    "penilaian dampak lingkungan": "การประเมินผลกระทบสิ่งแวดล้อม",
    "pengaruh yang sangat mendalam": "อิทธิพลที่ลึกซึ้งอย่างยิ่ง",
    "sangat membekas dalam ingatan saya": "โดดเด่นอยู่ในความทรงจำ",
    "shokuchuudoku - keracunan makanan": "อาหารเป็นพิษ",
    "tadashii - benar / sesuai aturan": "ถูกต้อง",
    "machigatteiru - salah / keliru": "ผิด",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "วัตถุดิบก่อภูมิแพ้บังคับ 9 ชนิด",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "ตัวอย่างสินค้าเก็บสำรอง",
    "seiton - meletakkan di tempat tetap (oki basho)": "การจัดเก็บให้เป็นระเบียบเข้าที่",
    "gahou - endospora bakteri tahan panas 100C": "สปอร์ของแบคทีเรียที่ทนความร้อน 100 องศา",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "โซเดียมไฮโปคลอไรต์ (คลอรีน)",
    "kishaku - pengenceran larutan": "การเจือจางสารละลาย",
    "budomari - rendemen / persentase hasil bersih siap pakai": "ผลผลิตสุทธิหลังตัดแต่ง (Yield)",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "การปนเปื้อนสิ่งแปลกปลอม",
    "kousa osen - kontaminasi silang": "การปนเปื้อนข้าม",
    "anzen daiichi - keselamatan nomor satu (K3)": "ความปลอดภัยต้องมาก่อน"
  },
  "ms": {
    "kopi susu dingin": "kopi ais bersusu",
    "kelompok belajar": "belajar berkumpulan bersama-sama",
    "menyiapkan presentasi": "sediakan slaid atau nota",
    "Saya tinggal di...": "rumah saya di...",
    "Rumah saya dekat...": "terletak berhampiran...",
    "pergi (bentuk lampau)": "bentuk lampau bagi go",
    "makan (bentuk lampau)": "bentuk lampau bagi eat",
    "mengambil foto (bentuk lampau)": "gambar yang diambil",
    "waktu perjalanan pulang-pergi kerja": "perjalanan harian pergi dan balik kerja",
    "kekompakan / kohesi tim": "perpaduan dan hubungan pasukan",
    "satu buah / satu porsi": "satu unit / satu hidangan",
    "tolong berikan ~": "tolong berikan saya ~",
    "karena ~ (alasan sopan)": "kerana / oleh sebab (alasan sopan)",
    "sebaiknya bagaimana saya ~?": "apa yang patut saya lakukan untuk ~?",
    "nada bicara (4 nada Mandarin)": "4 nada bahasa Mandarin",
    "tata bahasa / grammar": "tatabahasa ayat",
    "mie daging sapi": "sup mi daging lembu",
    "jangan pedas / tidak mau pedas": "tiada pedas / tidak pedas",
    "stasiun kereta bawah tanah / MRT": "stesen kereta api bawah tanah / MRT",
    "bandara": "lapangan terbang",
    "atatameru - menghangatkan": "atatameru - memanaskan",
    "obentou - kotak makan": "obentou - kotak makanan tengah hari",
    "fukuro - kantong plastik": "fukuro - beg plastik",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - tidak mengapa, terima kasih / sudah cukup",
    "okaikei - pembayaran": "okaikei - bil / bayaran",
    "norikae - transit": "norikae - pertukaran laluan",
    "hoomu - peron": "hoomu - platform",
    "iki - tujuan": "iki - destinasi / menuju ke",
    "Ginzasen - Jalur Ginza": "Ginzasen - Laluan Ginza",
    "bansen - nomor jalur": "bansen - nombor landasan / platform",
    "men - mi": "men - mi",
    "katame - agak keras": "katame - agak keras / kenyal",
    "koime - kental/pekat": "koime - pekat / berperisa kuat",
    "kaedama - tambah mi": "kaedama - mi tambahan",
    "koorimizu - air es": "koorimizu - air ais",
    "yoyaku - reservasi": "yoyaku - tempahan",
    "azukeru - menitipkan": "azukeru - menitipkan / menyimpan (di bawah jagaan seseorang)",
    "nimotsu - koper/barang": "nimotsu - bagasi / barang bawaan",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - sarapan",
    "kazegusuri - obat flu": "kazegusuri - ubat selesema",
    "shoujou - gejala": "shoujou - gejala",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - sakit tekak",
    "nemuke - rasa kantuk": "nemuke - rasa mengantuk",
    "shokugo - sesudah makan": "shokugo - selepas makan",
    "meishi - kartu nama": "meishi - kad perniagaan",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - saya terima dengan rendah hati",
    "tantou - penanggung jawab": "tantou - orang yang bertanggungjawab",
    "seiippai - sekuat tenaga": "seiippai - sedaya upaya",
    "goshidou - bimbingan": "goshidou - bimbingan",
    "shinchoku - progres": "shinchoku - kemajuan",
    "gen'in - penyebab": "gen'in - punca",
    "fuguai - bug/cacat": "fuguai - pepijat / kerosakan",
    "enki - penundaan": "enki - penangguhan",
    "taisaku - langkah penanggulangan": "taisaku - langkah pencegahan",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - bersulang",
    "tsugu - menuangkan minuman": "tsugu - menuang minuman",
    "nareru - terbiasa": "nareru - membiasakan diri",
    "osusume - rekomendasi": "osusume - cadangan",
    "yotei - rencana": "yotei - rancangan / jadual",
    "machiawase - janji temu": "machiawase - pertemuan / janji temu",
    "sanpo - jalan-jalan santai": "sanpo - bersiar-siar santai",
    "ogoru - mentraktir": "ogoru - membelanja seseorang",
    "tanoshimi - antusias": "tanoshimi - tidak sabar menantikan",
    "moeru gomi - sampah bakar": "moeru gomi - sampah mudah terbakar",
    "bunbetsu - pemilahan": "bunbetsu - pengasingan",
    "suteru - membuang": "suteru - membuang",
    "fukuro - kantong": "fukuro - beg",
    "youbi - hari": "youbi - hari dalam seminggu",
    "kenkyuu - riset": "kenkyuu - penyelidikan",
    "chakuganten - sudut pandang": "chakuganten - perspektif / sudut tumpuan",
    "kasetsu - hipotesis": "kasetsu - hipotesis",
    "kenshou - verifikasi": "kenshou - pengesahan",
    "gokyouji - bimbingan/arahan": "gokyouji - bimbingan/tunjuk ajar",
    "salam kenal": "salam perkenalan",
    "sekali lagi": "sekali lagi",
    "asal / kampung halaman": "asal / kampung halaman",
    "tinggal di ~": "tinggal di ~",
    "suka ~": "suka ~",
    "ada (benda mati)": "ada / wujud (benda tidak bernyawa)",
    "ada (orang/makhluk hidup)": "ada / wujud (orang/makhluk hidup)",
    "dari ~ sampai ~": "dari ~ hingga ~",
    "tolong pinjamkan": "tolong pinjamkan saya",
    "komik / manga": "komik / manga",
    "maukah pergi bersama?": "mahukah anda pergi bersama?",
    "bangunan / gedung": "bangunan",
    "baterai": "bateri",
    "berapa harga ~": "berapakah harga ~",
    "film / bioskop": "filem / pawagam",
    "pemandian air panas (onsen)": "mandian air panas (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "bertutur dengan lancar tanpa jeda teragak-agak",
    "standar nilai minimum untuk pengajuan visa": "penanda aras skor minimum untuk visa/pengajian",
    "angka atau titik tertinggi pada grafik": "angka tertinggi atau puncak pada carta",
    "angka atau proporsi terendah pada visual": "angka atau bahagian terendah pada visual",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "aliran berterusan tanpa tersangkut",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "mengumpulkan kata ke dalam unit nafas yang semula jadi",
    "kejelasan pengucapan suku kata dan konsonan": "penyampaian suku kata dan konsonan yang jelas",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "mengekalkan ritma akustik sejurus selepas mendengarnya",
    "penilaian dampak lingkungan": "menilai kesan terhadap alam sekitar",
    "pengaruh yang sangat mendalam": "pengaruh yang sangat mendalam",
    "sangat membekas dalam ingatan saya": "meninggalkan kesan yang mendalam dalam ingatan saya",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - keracunan makanan",
    "tadashii - benar / sesuai aturan": "tadashii - betul / mematuhi peraturan",
    "machigatteiru - salah / keliru": "machigatteiru - salah / tidak tepat",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - alergen berlabel wajib (9 item, Apr 2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - sampel produk yang disimpan untuk pemeriksaan aduan",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - meletakkan barang di tempat yang ditetapkan (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - endospora bakteria yang tahan haba 100C",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - natrium hipoklorit (larutan klorin)",
    "kishaku - pengenceran larutan": "kishaku - pencairan larutan",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - hasil / peratusan keluaran bersih yang boleh digunakan",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - pencemaran bendasing dalam makanan",
    "kousa osen - kontaminasi silang": "kousa osen - pencemaran silang",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - keselamatan diutamakan (OSH)"
  },
  "vi": {
    "kopi susu dingin": "cà phê sữa đá",
    "kelompok belajar": "học nhóm cùng nhau",
    "menyiapkan presentasi": "chuẩn bị sẵn slide hoặc ghi chú",
    "Saya tinggal di...": "nhà tôi ở...",
    "Rumah saya dekat...": "nằm gần...",
    "pergi (bentuk lampau)": "dạng quá khứ của go",
    "makan (bentuk lampau)": "dạng quá khứ của eat",
    "mengambil foto (bentuk lampau)": "những bức ảnh đã chụp",
    "waktu perjalanan pulang-pergi kerja": "việc đi làm hằng ngày",
    "kekompakan / kohesi tim": "sự đoàn kết và gắn kết trong nhóm",
    "satu buah / satu porsi": "một món / một phần",
    "tolong berikan ~": "vui lòng cho tôi ~",
    "karena ~ (alasan sopan)": "vì / bởi vì (lý do lịch sự)",
    "sebaiknya bagaimana saya ~?": "tôi nên làm gì để ~?",
    "nada bicara (4 nada Mandarin)": "4 thanh điệu tiếng Quan Thoại",
    "tata bahasa / grammar": "ngữ pháp câu",
    "mie daging sapi": "mì bò",
    "jangan pedas / tidak mau pedas": "không cay",
    "stasiun kereta bawah tanah / MRT": "ga tàu điện ngầm / MRT",
    "bandara": "sân bay",
    "atatameru - menghangatkan": "atatameru - hâm nóng / làm ấm",
    "obentou - kotak makan": "obentou - hộp cơm trưa",
    "fukuro - kantong plastik": "fukuro - túi ni lông",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - không, cảm ơn / đủ rồi",
    "okaikei - pembayaran": "okaikei - hóa đơn / thanh toán",
    "norikae - transit": "norikae - chuyển tuyến",
    "hoomu - peron": "hoomu - sân ga",
    "iki - tujuan": "iki - điểm đến / hướng đi",
    "Ginzasen - Jalur Ginza": "Ginzasen - Tuyến Ginza",
    "bansen - nomor jalur": "bansen - đường ray / số sân ga",
    "men - mi": "men - mì",
    "katame - agak keras": "katame - hơi cứng / dai vừa",
    "koime - kental/pekat": "koime - đậm đà / đậm vị",
    "kaedama - tambah mi": "kaedama - gọi thêm mì",
    "koorimizu - air es": "koorimizu - nước đá",
    "yoyaku - reservasi": "yoyaku - đặt chỗ / đặt trước",
    "azukeru - menitipkan": "azukeru - gửi giữ hộ",
    "nimotsu - koper/barang": "nimotsu - hành lý / đồ đạc",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - bữa sáng",
    "kazegusuri - obat flu": "kazegusuri - thuốc cảm",
    "shoujou - gejala": "shoujou - triệu chứng",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - đau họng",
    "nemuke - rasa kantuk": "nemuke - buồn ngủ",
    "shokugo - sesudah makan": "shokugo - sau bữa ăn",
    "meishi - kartu nama": "meishi - danh thiếp",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - tôi xin trân trọng nhận",
    "tantou - penanggung jawab": "tantou - người phụ trách",
    "seiippai - sekuat tenaga": "seiippai - hết sức mình",
    "goshidou - bimbingan": "goshidou - sự chỉ dẫn / hướng dẫn",
    "shinchoku - progres": "shinchoku - tiến độ",
    "gen'in - penyebab": "gen'in - nguyên nhân",
    "fuguai - bug/cacat": "fuguai - lỗi / trục trặc",
    "enki - penundaan": "enki - hoãn lại",
    "taisaku - langkah penanggulangan": "taisaku - biện pháp đối phó",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - cạn ly / chúc mừng",
    "tsugu - menuangkan minuman": "tsugu - rót đồ uống",
    "nareru - terbiasa": "nareru - làm quen / quen với",
    "osusume - rekomendasi": "osusume - gợi ý / món đề xuất",
    "yotei - rencana": "yotei - kế hoạch / lịch trình",
    "machiawase - janji temu": "machiawase - cuộc hẹn gặp",
    "sanpo - jalan-jalan santai": "sanpo - đi dạo thong thả",
    "ogoru - mentraktir": "ogoru - đãi / mời ai đó",
    "tanoshimi - antusias": "tanoshimi - mong đợi / háo hức",
    "moeru gomi - sampah bakar": "moeru gomi - rác đốt được",
    "bunbetsu - pemilahan": "bunbetsu - phân loại",
    "suteru - membuang": "suteru - vứt bỏ",
    "fukuro - kantong": "fukuro - túi",
    "youbi - hari": "youbi - thứ trong tuần",
    "kenkyuu - riset": "kenkyuu - nghiên cứu",
    "chakuganten - sudut pandang": "chakuganten - góc nhìn / điểm tập trung",
    "kasetsu - hipotesis": "kasetsu - giả thuyết",
    "kenshou - verifikasi": "kenshou - kiểm chứng / xác minh",
    "gokyouji - bimbingan/arahan": "gokyouji - chỉ dẫn / hướng dẫn",
    "salam kenal": "rất vui được gặp bạn",
    "sekali lagi": "một lần nữa",
    "asal / kampung halaman": "xuất xứ / quê hương",
    "tinggal di ~": "sống ở ~",
    "suka ~": "thích ~",
    "ada (benda mati)": "có (dùng cho đồ vật, sự vật)",
    "ada (orang/makhluk hidup)": "có (dùng cho người, động vật)",
    "dari ~ sampai ~": "từ ~ đến ~",
    "tolong pinjamkan": "làm ơn cho tôi mượn",
    "komik / manga": "truyện tranh / manga",
    "maukah pergi bersama?": "bạn có muốn đi cùng không?",
    "bangunan / gedung": "tòa nhà",
    "baterai": "pin",
    "berapa harga ~": "~ giá bao nhiêu",
    "film / bioskop": "phim / rạp chiếu phim",
    "pemandian air panas (onsen)": "tắm suối nước nóng (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "nói trôi chảy, không ngập ngừng",
    "standar nilai minimum untuk pengajuan visa": "mức điểm tối thiểu để xin visa/du học",
    "angka atau titik tertinggi pada grafik": "số liệu cao nhất hoặc đỉnh trên biểu đồ",
    "angka atau proporsi terendah pada visual": "số liệu hoặc tỷ trọng thấp nhất trên biểu đồ",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "mạch nói liên tục, không bị vấp",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "ngắt cụm từ theo nhịp thở tự nhiên",
    "kejelasan pengucapan suku kata dan konsonan": "phát âm rõ từng âm tiết và phụ âm",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "giữ đúng nhịp điệu âm thanh ngay sau khi nghe",
    "penilaian dampak lingkungan": "đánh giá tác động lên môi trường",
    "pengaruh yang sangat mendalam": "một ảnh hưởng rất sâu sắc",
    "sangat membekas dalam ingatan saya": "để lại ấn tượng sâu đậm trong ký ức của tôi",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - ngộ độc thực phẩm",
    "tadashii - benar / sesuai aturan": "tadashii - đúng / tuân thủ quy định",
    "machigatteiru - salah / keliru": "machigatteiru - sai / không đúng",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - thành phần gây dị ứng bắt buộc ghi nhãn (9 loại, tháng 4/2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - mẫu sản phẩm lưu giữ để kiểm tra khi có khiếu nại",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - sắp xếp đồ đạc đúng vị trí quy định (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - nha bào vi khuẩn chịu được nhiệt độ 100°C",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - natri hypoclorit (dung dịch clo)",
    "kishaku - pengenceran larutan": "kishaku - pha loãng dung dịch",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - tỷ lệ thành phẩm / phần trăm sản lượng sử dụng thực tế",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - lẫn dị vật trong thực phẩm",
    "kousa osen - kontaminasi silang": "kousa osen - nhiễm chéo",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - an toàn là trên hết (OSH)"
  },
  "fil": {
    "kopi susu dingin": "malamig na kape na may gatas",
    "kelompok belajar": "sama-samang pag-aaral ng grupo",
    "menyiapkan presentasi": "ihanda ang mga slide o tala",
    "Saya tinggal di...": "ang bahay ko ay nasa...",
    "Rumah saya dekat...": "matatagpuan malapit sa...",
    "pergi (bentuk lampau)": "nakaraang anyo ng go",
    "makan (bentuk lampau)": "nakaraang anyo ng eat",
    "mengambil foto (bentuk lampau)": "mga nakuhang larawan",
    "waktu perjalanan pulang-pergi kerja": "araw-araw na pagbiyahe papunta at pauwi mula sa trabaho",
    "kekompakan / kohesi tim": "pagkakaisa at ugnayan ng grupo",
    "satu buah / satu porsi": "isang piraso / isang hain",
    "tolong berikan ~": "pakibigay sa akin ng ~",
    "karena ~ (alasan sopan)": "dahil / sapagkat (magalang na dahilan)",
    "sebaiknya bagaimana saya ~?": "ano ang dapat kong gawin para ~?",
    "nada bicara (4 nada Mandarin)": "4 na tono sa Mandarin",
    "tata bahasa / grammar": "balarila ng pangungusap",
    "mie daging sapi": "sopas na may pansit at baka",
    "jangan pedas / tidak mau pedas": "walang anghang / hindi maanghang",
    "stasiun kereta bawah tanah / MRT": "estasyon ng subway / MRT",
    "bandara": "paliparan",
    "atatameru - menghangatkan": "atatameru - painitin / magpainit",
    "obentou - kotak makan": "obentou - baunan / kahon ng pananghalian",
    "fukuro - kantong plastik": "fukuro - supot na plastik",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - hindi na, salamat / sapat na",
    "okaikei - pembayaran": "okaikei - bayarin / pagbabayad",
    "norikae - transit": "norikae - paglipat ng sakay",
    "hoomu - peron": "hoomu - plataporma",
    "iki - tujuan": "iki - destinasyon / papunta sa",
    "Ginzasen - Jalur Ginza": "Ginzasen - Linyang Ginza",
    "bansen - nomor jalur": "bansen - numero ng riles / plataporma",
    "men - mi": "men - pansit / noodles",
    "katame - agak keras": "katame - medyo matigas",
    "koime - kental/pekat": "koime - malasa / matapang",
    "kaedama - tambah mi": "kaedama - dagdag na pansit",
    "koorimizu - air es": "koorimizu - tubig na may yelo",
    "yoyaku - reservasi": "yoyaku - reserbasyon",
    "azukeru - menitipkan": "azukeru - ipatago / ipaiwan (sa pangangalaga ng iba)",
    "nimotsu - koper/barang": "nimotsu - bagahe / mga gamit",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - almusal",
    "kazegusuri - obat flu": "kazegusuri - gamot sa sipon",
    "shoujou - gejala": "shoujou - mga sintomas",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - masakit ang lalamunan",
    "nemuke - rasa kantuk": "nemuke - pagkaantok",
    "shokugo - sesudah makan": "shokugo - pagkatapos kumain",
    "meishi - kartu nama": "meishi - tarhetang pangnegosyo",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - buong pagpapakumbaba kong tinatanggap",
    "tantou - penanggung jawab": "tantou - taong namamahala",
    "seiippai - sekuat tenaga": "seiippai - sa abot ng makakaya",
    "goshidou - bimbingan": "goshidou - paggabay",
    "shinchoku - progres": "shinchoku - pag-usad / progreso",
    "gen'in - penyebab": "gen'in - sanhi",
    "fuguai - bug/cacat": "fuguai - sira / depekto",
    "enki - penundaan": "enki - pagpapaliban",
    "taisaku - langkah penanggulangan": "taisaku - hakbang pangontra / solusyon",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - tagay / pagbati",
    "tsugu - menuangkan minuman": "tsugu - magbuhos ng inumin",
    "nareru - terbiasa": "nareru - masanay",
    "osusume - rekomendasi": "osusume - rekomendasyon",
    "yotei - rencana": "yotei - plano / iskedyul",
    "machiawase - janji temu": "machiawase - pagkikita / tipanan",
    "sanpo - jalan-jalan santai": "sanpo - marahang pamamasyal",
    "ogoru - mentraktir": "ogoru - manlibre",
    "tanoshimi - antusias": "tanoshimi - sabik na inaabangan",
    "moeru gomi - sampah bakar": "moeru gomi - basurang nasusunog",
    "bunbetsu - pemilahan": "bunbetsu - pagbubukod-bukod",
    "suteru - membuang": "suteru - itapon / magtapon",
    "fukuro - kantong": "fukuro - supot / bag",
    "youbi - hari": "youbi - araw ng linggo",
    "kenkyuu - riset": "kenkyuu - pananaliksik",
    "chakuganten - sudut pandang": "chakuganten - pananaw / punto ng pokus",
    "kasetsu - hipotesis": "kasetsu - haypotesis",
    "kenshou - verifikasi": "kenshou - beripikasyon / pagpapatunay",
    "gokyouji - bimbingan/arahan": "gokyouji - paggabay / pagtuturo",
    "salam kenal": "ikinagagalak kitang makilala",
    "sekali lagi": "isa pang beses",
    "asal / kampung halaman": "pinanggalingan / bayang sinilangan",
    "tinggal di ~": "nakatira sa ~",
    "suka ~": "gusto ang ~",
    "ada (benda mati)": "mayroon / umiiral (mga bagay na walang buhay)",
    "ada (orang/makhluk hidup)": "mayroon / umiiral (mga tao o may buhay)",
    "dari ~ sampai ~": "mula ~ hanggang ~",
    "tolong pinjamkan": "pakipahiram sa akin",
    "komik / manga": "komiks / manga",
    "maukah pergi bersama?": "gusto mo bang sumama?",
    "bangunan / gedung": "gusali",
    "baterai": "baterya",
    "berapa harga ~": "magkano ang ~",
    "film / bioskop": "pelikula / sine",
    "pemandian air panas (onsen)": "paliguan sa mainit na bukal (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "tuloy-tuloy na pagsasalita nang walang pag-aalangan o paghinto",
    "standar nilai minimum untuk pengajuan visa": "pinakamababang kailangang marka para sa visa o pag-aaral",
    "angka atau titik tertinggi pada grafik": "pinakamataas na bilang o rurok sa isang chart",
    "angka atau proporsi terendah pada visual": "pinakamababang bilang o bahagi sa isang biswal",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "tuloy-tuloy na daloy nang hindi nabubulol",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "pagpapangkat ng mga salita sa natural na paghinga",
    "kejelasan pengucapan suku kata dan konsonan": "malinaw na pagbigkas ng pantig at katinig",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "pagpapanatili ng tunog at ritmo pagkatapos itong marinig",
    "penilaian dampak lingkungan": "pagsusuri ng epekto sa kapaligiran",
    "pengaruh yang sangat mendalam": "isang napakalalim na impluwensya",
    "sangat membekas dalam ingatan saya": "nag-iwan ng pangmatagalang impresyon sa aking alaala",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - pagkalason sa pagkain",
    "tadashii - benar / sesuai aturan": "tadashii - tama / sumusunod sa mga patakaran",
    "machigatteiru - salah / keliru": "machigatteiru - mali / hindi tama",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - mga allergen na dapat may label (9 na item, Abr 2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - itinabing sample ng produkto para sa pagsusuri ng reklamo",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - paglalagay ng mga gamit sa nakatalagang lugar (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - bacterial endospore na nakatatagal sa init na 100C",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - sodium hypochlorite (solusyong chlorine)",
    "kishaku - pengenceran larutan": "kishaku - pagpapalabnaw ng solusyon",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - ani / porsyento ng netong magagamit na output",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - kontaminasyon ng banyagang bagay sa pagkain",
    "kousa osen - kontaminasi silang": "kousa osen - cross-contamination / pagkalipat ng kontaminasyon",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - kaligtasan muna (OSH)"
  },
  "ja": {
    "kopi susu dingin": "ミルク入りアイスコーヒー",
    "kelompok belajar": "グループで一緒に勉強すること",
    "menyiapkan presentasi": "スライドやノートを準備する",
    "Saya tinggal di...": "私の家は〜にあります",
    "Rumah saya dekat...": "〜の近くに位置している",
    "pergi (bentuk lampau)": "goの過去形",
    "makan (bentuk lampau)": "eatの過去形",
    "mengambil foto (bentuk lampau)": "撮影した写真",
    "waktu perjalanan pulang-pergi kerja": "毎日の通勤",
    "kekompakan / kohesi tim": "チームの結束とつながり",
    "satu buah / satu porsi": "1つ / 1人前",
    "tolong berikan ~": "〜をください",
    "karena ~ (alasan sopan)": "〜ですので / 〜ですから（丁寧な理由）",
    "sebaiknya bagaimana saya ~?": "〜するにはどうすればよいですか？",
    "nada bicara (4 nada Mandarin)": "中国語（普通話）の四声",
    "tata bahasa / grammar": "文の文法",
    "mie daging sapi": "牛肉麺（ビーフヌードル）",
    "jangan pedas / tidak mau pedas": "辛み抜き / 辛くない",
    "stasiun kereta bawah tanah / MRT": "地下鉄 / MRT駅",
    "bandara": "空港",
    "atatameru - menghangatkan": "atatameru - 温める",
    "obentou - kotak makan": "obentou - お弁当",
    "fukuro - kantong plastik": "fukuro - 袋（レジ袋）",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - 結構です（いりません・十分です）",
    "okaikei - pembayaran": "okaikei - お会計・お支払い",
    "norikae - transit": "norikae - 乗り換え",
    "hoomu - peron": "hoomu - ホーム（プラットホーム）",
    "iki - tujuan": "iki - 行き（行き先）",
    "Ginzasen - Jalur Ginza": "Ginzasen - 銀座線",
    "bansen - nomor jalur": "bansen - 番線（ホーム番号）",
    "men - mi": "men - 麺",
    "katame - agak keras": "katame - 硬め",
    "koime - kental/pekat": "koime - 濃いめ",
    "kaedama - tambah mi": "kaedama - 替え玉（麺のおかわり）",
    "koorimizu - air es": "koorimizu - 氷水（お冷）",
    "yoyaku - reservasi": "yoyaku - 予約",
    "azukeru - menitipkan": "azukeru - 預ける",
    "nimotsu - koper/barang": "nimotsu - 荷物",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - 朝食",
    "kazegusuri - obat flu": "kazegusuri - 風邪薬",
    "shoujou - gejala": "shoujou - 症状",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - 喉が痛い",
    "nemuke - rasa kantuk": "nemuke - 眠気",
    "shokugo - sesudah makan": "shokugo - 食後",
    "meishi - kartu nama": "meishi - 名刺",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - 頂戴いたします（謹んで受け取ります）",
    "tantou - penanggung jawab": "tantou - 担当（担当者）",
    "seiippai - sekuat tenaga": "seiippai - 精一杯",
    "goshidou - bimbingan": "goshidou - ご指導",
    "shinchoku - progres": "shinchoku - 進捗",
    "gen'in - penyebab": "gen'in - 原因",
    "fuguai - bug/cacat": "fuguai - 不具合・バグ",
    "enki - penundaan": "enki - 延期",
    "taisaku - langkah penanggulangan": "taisaku - 対策",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - 乾杯",
    "tsugu - menuangkan minuman": "tsugu - 注ぐ（飲み物を注ぐ）",
    "nareru - terbiasa": "nareru - 慣れる",
    "osusume - rekomendasi": "osusume - おすすめ",
    "yotei - rencana": "yotei - 予定・スケジュール",
    "machiawase - janji temu": "machiawase - 待ち合わせ・約束",
    "sanpo - jalan-jalan santai": "sanpo - 散歩・ぶらぶら歩くこと",
    "ogoru - mentraktir": "ogoru - おごる・ご馳走する",
    "tanoshimi - antusias": "tanoshimi - 楽しみ（にしていること）",
    "moeru gomi - sampah bakar": "moeru gomi - 燃えるゴミ",
    "bunbetsu - pemilahan": "bunbetsu - 分別",
    "suteru - membuang": "suteru - 捨てる",
    "fukuro - kantong": "fukuro - 袋",
    "youbi - hari": "youbi - 曜日",
    "kenkyuu - riset": "kenkyuu - 研究",
    "chakuganten - sudut pandang": "chakuganten - 着眼点・視点",
    "kasetsu - hipotesis": "kasetsu - 仮説",
    "kenshou - verifikasi": "kenshou - 検証",
    "gokyouji - bimbingan/arahan": "gokyouji - ご教示・ご指導",
    "salam kenal": "はじめまして",
    "sekali lagi": "もう一度",
    "asal / kampung halaman": "出身・故郷",
    "tinggal di ~": "〜に住む",
    "suka ~": "〜が好き",
    "ada (benda mati)": "（無生物が）ある",
    "ada (orang/makhluk hidup)": "（人・生き物が）いる",
    "dari ~ sampai ~": "〜から〜まで",
    "tolong pinjamkan": "貸してください",
    "komik / manga": "漫画・コミック",
    "maukah pergi bersama?": "一緒に行きませんか？",
    "bangunan / gedung": "建物・ビル",
    "baterai": "電池・バッテリー",
    "berapa harga ~": "〜はいくらですか",
    "film / bioskop": "映画・映画館",
    "pemandian air panas (onsen)": "温泉（おんせん）",
    "kelancaran berbicara tanpa jeda ragu": "ためらいの間を置かずに滑らかに話すこと",
    "standar nilai minimum untuk pengajuan visa": "ビザや留学に必要な最低スコア基準",
    "angka atau titik tertinggi pada grafik": "グラフ上の最高値・ピーク",
    "angka atau proporsi terendah pada visual": "図表上の最低値・最小割合",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "つまずかずに途切れなく話す流れ",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "自然な息継ぎの単位で語句をまとめること",
    "kejelasan pengucapan suku kata dan konsonan": "音節と子音の明瞭な発音",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "聞いた直後に音声のリズムを保持すること",
    "penilaian dampak lingkungan": "環境への影響を評価すること",
    "pengaruh yang sangat mendalam": "非常に深い影響",
    "sangat membekas dalam ingatan saya": "記憶に長く残る印象を残した",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - 食中毒",
    "tadashii - benar / sesuai aturan": "tadashii - 正しい・規則に適合している",
    "machigatteiru - salah / keliru": "machigatteiru - 間違っている・誤り",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - 特定原材料（表示義務のあるアレルゲン9品目、2026年4月時点）",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - 保管サンプル（クレーム検査用の保存見本）",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - 整頓（決められた置き場所に物を配置すること）",
    "gahou - endospora bakteri tahan panas 100C": "gahou - 芽胞（100℃の加熱にも耐える細菌の耐久細胞）",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - 次亜塩素酸ナトリウム（塩素系消毒液）",
    "kishaku - pengenceran larutan": "kishaku - 希釈（溶液を薄めること）",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - 歩留まり（可食部・実質利用可能量の割合）",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - 異物混入（食品への異物入り込み）",
    "kousa osen - kontaminasi silang": "kousa osen - 交差汚染",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - 安全第一（労働安全衛生）"
  },
  "km": {
    "kopi susu dingin": "កាហ្វេទឹកកកដាក់ទឹកដោះគោ",
    "kelompok belajar": "ការសិក្សាជាក្រុមរួមគ្នា",
    "menyiapkan presentasi": "រៀបចំស្លាយ ឬកំណត់ត្រាឱ្យរួចរាល់",
    "Saya tinggal di...": "ផ្ទះរបស់ខ្ញុំនៅ...",
    "Rumah saya dekat...": "មានទីតាំងនៅជិត...",
    "pergi (bentuk lampau)": "ទម្រង់អតីតកាលនៃពាក្យ go",
    "makan (bentuk lampau)": "ទម្រង់អតីតកាលនៃពាក្យ eat",
    "mengambil foto (bentuk lampau)": "រូបភាពដែលបានថត",
    "waktu perjalanan pulang-pergi kerja": "ការធ្វើដំណើរទៅមកធ្វើការប្រចាំថ្ងៃ",
    "kekompakan / kohesi tim": "ភាពរួបរួម និងការផ្សារភ្ជាប់គ្នាក្នុងក្រុម",
    "satu buah / satu porsi": "មួយមុខ / មួយចំណែក",
    "tolong berikan ~": "សូមឱ្យខ្ញុំ ~",
    "karena ~ (alasan sopan)": "ពីព្រោះ / ដោយសារតែ (មូលហេតុបែបគួរសម)",
    "sebaiknya bagaimana saya ~?": "តើខ្ញុំគួរធ្វើដូចម្តេចដើម្បី ~?",
    "nada bicara (4 nada Mandarin)": "សំនៀងទាំង ៤ ក្នុងភាសាចិនកុកងឺ",
    "tata bahasa / grammar": "វេយ្យាករណ៍ប្រយោគ",
    "mie daging sapi": "គុយទាវសាច់គោ",
    "jangan pedas / tidak mau pedas": "មិនហឹរ / គ្មានគ្រឿងហឹរ",
    "stasiun kereta bawah tanah / MRT": "ស្ថានីយ៍រថភ្លើងក្រោមដី / MRT",
    "bandara": "អាកាសយានដ្ឋាន",
    "atatameru - menghangatkan": "atatameru - កម្តៅឱ្យក្តៅ",
    "obentou - kotak makan": "obentou - ប្រអប់បាយថ្ងៃត្រង់",
    "fukuro - kantong plastik": "fukuro - ថង់ប្លាស្ទិក",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - មិនអីទេ អរគុណ / គ្រប់គ្រាន់ហើយ",
    "okaikei - pembayaran": "okaikei - វិក្កយបត្រ / ការគិតលុយ",
    "norikae - transit": "norikae - ការប្តូរជើងរថភ្លើង",
    "hoomu - peron": "hoomu - កន្លែងរង់ចាំឡើងរថភ្លើង",
    "iki - tujuan": "iki - គោលដៅ / ឆ្ពោះទៅ",
    "Ginzasen - Jalur Ginza": "Ginzasen - ខ្សែរថភ្លើង Ginza",
    "bansen - nomor jalur": "bansen - លេខផ្លូវរថភ្លើង / លេខចំណត",
    "men - mi": "men - មី / គុយទាវ",
    "katame - agak keras": "katame - រឹងបន្តិច",
    "koime - kental/pekat": "koime - រសជាតិដិត / ខាប់ខ្លាំង",
    "kaedama - tambah mi": "kaedama - បន្ថែមមី",
    "koorimizu - air es": "koorimizu - ទឹកត្រជាក់មានទឹកកក",
    "yoyaku - reservasi": "yoyaku - ការកក់ទុក",
    "azukeru - menitipkan": "azukeru - ផ្ញើទុក (ឱ្យគេជួយមើលថែ)",
    "nimotsu - koper/barang": "nimotsu - វ៉ាលី / ឥវ៉ាន់",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - អាហារពេលព្រឹក",
    "kazegusuri - obat flu": "kazegusuri - ថ្នាំផ្តាសាយ",
    "shoujou - gejala": "shoujou - រោគសញ្ញា",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - ឈឺបំពង់ក",
    "nemuke - rasa kantuk": "nemuke - អាការៈងងុយគេង",
    "shokugo - sesudah makan": "shokugo - ក្រោយពេលបរិភោគអាហារ",
    "meishi - kartu nama": "meishi - នាមប័ណ្ណ",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - ខ្ញុំសូមទទួលដោយក្តីគោរព",
    "tantou - penanggung jawab": "tantou - អ្នកទទួលបន្ទុក",
    "seiippai - sekuat tenaga": "seiippai - ឱ្យអស់ពីសមត្ថភាព",
    "goshidou - bimbingan": "goshidou - ការណែនាំ",
    "shinchoku - progres": "shinchoku - វឌ្ឍនភាព",
    "gen'in - penyebab": "gen'in - មូលហេតុ",
    "fuguai - bug/cacat": "fuguai - កំហុសបច្ចេកទេស / ភាពមិនប្រក្រតី",
    "enki - penundaan": "enki - ការពន្យារពេល",
    "taisaku - langkah penanggulangan": "taisaku - វិធានការទប់ស្កាត់",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - ជល់កែវ / សូមជូនពរ",
    "tsugu - menuangkan minuman": "tsugu - ចាក់ភេសជ្ជៈ",
    "nareru - terbiasa": "nareru - ស៊ាំនឹង / ទម្លាប់នឹង",
    "osusume - rekomendasi": "osusume - ការណែនាំល្អ",
    "yotei - rencana": "yotei - គម្រោង / កាលវិភាគ",
    "machiawase - janji temu": "machiawase - ការណាត់ជួប",
    "sanpo - jalan-jalan santai": "sanpo - ការដើរលំហែកាយ",
    "ogoru - mentraktir": "ogoru - ប៉ាវ / ចេញលុយឱ្យគេ",
    "tanoshimi - antusias": "tanoshimi - កំពុងទន្ទឹងរង់ចាំដោយក្តីរីករាយ",
    "moeru gomi - sampah bakar": "moeru gomi - សំរាមដែលអាចដុតបាន",
    "bunbetsu - pemilahan": "bunbetsu - ការបែងចែកប្រភេទ",
    "suteru - membuang": "suteru - បោះចោល",
    "fukuro - kantong": "fukuro - ថង់",
    "youbi - hari": "youbi - ថ្ងៃក្នុងសប្តាហ៍",
    "kenkyuu - riset": "kenkyuu - ការស្រាវជ្រាវ",
    "chakuganten - sudut pandang": "chakuganten - ទស្សនវិស័យ / ចំណុចផ្តោត",
    "kasetsu - hipotesis": "kasetsu - សម្មតិកម្ម",
    "kenshou - verifikasi": "kenshou - ការផ្ទៀងផ្ទាត់",
    "gokyouji - bimbingan/arahan": "gokyouji - ការណែនាំ / ការបង្ហាត់បង្រៀន",
    "salam kenal": "រីករាយដែលបានជួបអ្នក",
    "sekali lagi": "ម្តងទៀត",
    "asal / kampung halaman": "ស្រុកកំណើត / ទីកន្លែងដើម",
    "tinggal di ~": "រស់នៅ ~",
    "suka ~": "ចូលចិត្ត ~",
    "ada (benda mati)": "មាន (សម្រាប់វត្ថុគ្មានជីវិត)",
    "ada (orang/makhluk hidup)": "មាន (សម្រាប់មនុស្ស/ភាវៈមានជីវិត)",
    "dari ~ sampai ~": "ពី ~ ដល់ ~",
    "tolong pinjamkan": "សូមឱ្យខ្ញុំខ្ចី",
    "komik / manga": "សៀវភៅតុក្កតា / manga",
    "maukah pergi bersama?": "តើអ្នកចង់ទៅជាមួយគ្នាទេ?",
    "bangunan / gedung": "អគារ",
    "baterai": "ថ្ម / អាគុយ",
    "berapa harga ~": "តើ ~ តម្លៃប៉ុន្មាន",
    "film / bioskop": "ភាពយន្ត / រោងកុន",
    "pemandian air panas (onsen)": "ការងូតទឹកក្តៅធម្មជាតិ (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "និយាយបានរលូនដោយគ្មានការផ្អាកស្ទាក់ស្ទើរ",
    "standar nilai minimum untuk pengajuan visa": "កម្រិតពិន្ទុអប្បបរមាសម្រាប់ទិដ្ឋាការ/ការសិក្សា",
    "angka atau titik tertinggi pada grafik": "តួលេខខ្ពស់បំផុត ឬកំពូលនៅលើតារាង",
    "angka atau proporsi terendah pada visual": "តួលេខ ឬចំណែកទាបបំផុតនៅលើរូបភាព/ក្រាហ្វ",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "លំហូរជាប់លាប់ដោយមិនរដិបរដុប",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "ការចាត់ជាក្រុមពាក្យតាមចង្វាក់ដកដង្ហើមធម្មជាតិ",
    "kejelasan pengucapan suku kata dan konsonan": "ការបញ្ចេញសំឡេងព្យាង្គ និងព្យញ្ជនៈបានច្បាស់លាស់",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "ការរក្សាចង្វាក់សំឡេងភ្លាមៗបន្ទាប់ពីបានឮ",
    "penilaian dampak lingkungan": "ការវាយតម្លៃផលប៉ះពាល់លើបរិស្ថាន",
    "pengaruh yang sangat mendalam": "ឥទ្ធិពលដ៏ជ្រាលជ្រៅបំផុត",
    "sangat membekas dalam ingatan saya": "បានបន្សល់ទុកនូវចំណាប់អារម្មណ៍ជាប់ជានិច្ចក្នុងការចងចាំរបស់ខ្ញុំ",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - ការពុលអាហារ",
    "tadashii - benar / sesuai aturan": "tadashii - ត្រឹមត្រូវ / ស្របតាមច្បាប់",
    "machigatteiru - salah / keliru": "machigatteiru - ខុស / មិនត្រឹមត្រូវ",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - សារធាតុបង្កអាលែកហ្ស៊ីដែលត្រូវបិទស្លាកជាកាតព្វកិច្ច (9 មុខ, មេសា 2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - សំណាកផលិតផលដែលរក្សាទុកសម្រាប់ត្រួតពិនិត្យការតវ៉ា",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - ការដាក់របស់របរនៅកន្លែងដែលបានកំណត់ (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - ស្ព័របាក់តេរីដែលធន់នឹងកម្តៅ 100C",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - សូដ្យូមអ៊ីប៉ូក្លរីត (សូលុយស្យុងក្លរីន)",
    "kishaku - pengenceran larutan": "kishaku - ការពន្លាយសូលុយស្យុង",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - ទិន្នផល / ភាគរយផលិតផលសុទ្ធដែលអាចប្រើប្រាស់បាន",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - ការចម្លងរោគ ឬវត្តមានវត្ថុចម្លែកនៅក្នុងអាហារ",
    "kousa osen - kontaminasi silang": "kousa osen - ការចម្លងរោគឆ្លងគ្នា",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - សុវត្ថិភាពជាចម្បង (OSH)"
  },
  "ru": {
    "kopi susu dingin": "кофе со льдом и молоком",
    "kelompok belajar": "совместная учёба в группе",
    "menyiapkan presentasi": "подготовить слайды или заметки",
    "Saya tinggal di...": "мой дом находится в...",
    "Rumah saya dekat...": "расположен рядом с...",
    "pergi (bentuk lampau)": "прошедшая форма глагола go",
    "makan (bentuk lampau)": "прошедшая форма глагола eat",
    "mengambil foto (bentuk lampau)": "сделанные фотографии",
    "waktu perjalanan pulang-pergi kerja": "ежедневные поездки на работу и обратно",
    "kekompakan / kohesi tim": "сплочённость и связь в команде",
    "satu buah / satu porsi": "одна штука / одна порция",
    "tolong berikan ~": "дайте мне, пожалуйста, ~",
    "karena ~ (alasan sopan)": "потому что / так как (вежливое указание причины)",
    "sebaiknya bagaimana saya ~?": "что мне сделать, чтобы ~?",
    "nada bicara (4 nada Mandarin)": "4 тона китайского языка",
    "tata bahasa / grammar": "грамматика предложения",
    "mie daging sapi": "суп с лапшой и говядиной",
    "jangan pedas / tidak mau pedas": "без остроты / не острое",
    "stasiun kereta bawah tanah / MRT": "станция метро",
    "bandara": "аэропорт",
    "atatameru - menghangatkan": "atatameru - разогреть",
    "obentou - kotak makan": "obentou - ланч-бокс (бэнто)",
    "fukuro - kantong plastik": "fukuro - пластиковый пакет",
    "kekkou desu - tidak perlu/cukup": "kekkou desu - нет, спасибо / достаточно",
    "okaikei - pembayaran": "okaikei - счёт / оплата",
    "norikae - transit": "norikae - пересадка",
    "hoomu - peron": "hoomu - платформа",
    "iki - tujuan": "iki - направление / следующий до",
    "Ginzasen - Jalur Ginza": "Ginzasen - линия Гиндза",
    "bansen - nomor jalur": "bansen - путь / номер платформы",
    "men - mi": "men - лапша",
    "katame - agak keras": "katame - слегка твёрдая",
    "koime - kental/pekat": "koime - насыщенный / крепкий",
    "kaedama - tambah mi": "kaedama - дополнительная порция лапши",
    "koorimizu - air es": "koorimizu - вода со льдом",
    "yoyaku - reservasi": "yoyaku - бронирование / бронь",
    "azukeru - menitipkan": "azukeru - сдать на хранение / оставить под присмотром",
    "nimotsu - koper/barang": "nimotsu - багаж / вещи",
    "chekkuin": "chekkuin",
    "choushoku - sarapan": "choushoku - завтрак",
    "kazegusuri - obat flu": "kazegusuri - лекарство от простуды",
    "shoujou - gejala": "shoujou - симптомы",
    "nodo ga itai - sakit tenggorokan": "nodo ga itai - болит горло / боль в горле",
    "nemuke - rasa kantuk": "nemuke - сонливость",
    "shokugo - sesudah makan": "shokugo - после еды",
    "meishi - kartu nama": "meishi - визитная карточка",
    "choudai itashimasu - saya terima dengan hormat": "choudai itashimasu - с почтением принимаю",
    "tantou - penanggung jawab": "tantou - ответственное лицо",
    "seiippai - sekuat tenaga": "seiippai - изо всех сил / в меру своих возможностей",
    "goshidou - bimbingan": "goshidou - наставничество / руководство",
    "shinchoku - progres": "shinchoku - прогресс / ход работы",
    "gen'in - penyebab": "gen'in - причина",
    "fuguai - bug/cacat": "fuguai - ошибка / неисправность",
    "enki - penundaan": "enki - отсрочка / перенос",
    "taisaku - langkah penanggulangan": "taisaku - мера противодействия / контрмера",
    "otsukaresama": "otsukaresama",
    "kanpai - bersulang": "kanpai - до дна! / тост",
    "tsugu - menuangkan minuman": "tsugu - налить напиток",
    "nareru - terbiasa": "nareru - привыкнуть",
    "osusume - rekomendasi": "osusume - рекомендация",
    "yotei - rencana": "yotei - план / расписание",
    "machiawase - janji temu": "machiawase - встреча / договорённость о встрече",
    "sanpo - jalan-jalan santai": "sanpo - неспешная прогулка",
    "ogoru - mentraktir": "ogoru - угостить кого-либо",
    "tanoshimi - antusias": "tanoshimi - с нетерпением жду / предвкушение",
    "moeru gomi - sampah bakar": "moeru gomi - сгораемый мусор",
    "bunbetsu - pemilahan": "bunbetsu - сортировка",
    "suteru - membuang": "suteru - выбросить",
    "fukuro - kantong": "fukuro - пакет / сумка",
    "youbi - hari": "youbi - день недели",
    "kenkyuu - riset": "kenkyuu - исследование",
    "chakuganten - sudut pandang": "chakuganten - точка зрения / фокус внимания",
    "kasetsu - hipotesis": "kasetsu - гипотеза",
    "kenshou - verifikasi": "kenshou - проверка / верификация",
    "gokyouji - bimbingan/arahan": "gokyouji - наставление / инструктаж",
    "salam kenal": "приятно познакомиться",
    "sekali lagi": "ещё раз",
    "asal / kampung halaman": "происхождение / родной город",
    "tinggal di ~": "жить в ~",
    "suka ~": "как ~ / вроде ~",
    "ada (benda mati)": "есть / имеется (неодушевлённые предметы)",
    "ada (orang/makhluk hidup)": "есть / находится (люди / живые существа)",
    "dari ~ sampai ~": "от ~ до ~",
    "tolong pinjamkan": "одолжите мне, пожалуйста",
    "komik / manga": "комиксы / манга",
    "maukah pergi bersama?": "не хотите пойти вместе?",
    "bangunan / gedung": "здание",
    "baterai": "батарейка / аккумулятор",
    "berapa harga ~": "сколько стоит ~",
    "film / bioskop": "фильм / кинотеатр",
    "pemandian air panas (onsen)": "горячий источник (onsen)",
    "kelancaran berbicara tanpa jeda ragu": "плавная речь без заминок и неуверенных пауз",
    "standar nilai minimum untuk pengajuan visa": "минимальный проходной балл для визы или учёбы",
    "angka atau titik tertinggi pada grafik": "наивысший показатель или пик на графике",
    "angka atau proporsi terendah pada visual": "наименьший показатель или доля на диаграмме",
    "kelancaran berucap terus-menerus tanpa jeda terbata": "непрерывный темп речи без запинок",
    "pengelompokan kata-kata ke dalam unit makna alami untuk bernafas": "группировка слов в естественные речевые отрезки на одном дыхании",
    "kejelasan pengucapan suku kata dan konsonan": "чёткое произношение слогов и согласных звуков",
    "kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar": "удержание звукового ритма сразу после прослушивания",
    "penilaian dampak lingkungan": "оценка воздействия на окружающую среду",
    "pengaruh yang sangat mendalam": "очень глубокое влияние",
    "sangat membekas dalam ingatan saya": "оставил неизгладимое впечатление в моей памяти",
    "shokuchuudoku - keracunan makanan": "shokuchuudoku - пищевое отравление",
    "tadashii - benar / sesuai aturan": "tadashii - правильный / соответствующий правилам",
    "machigatteiru - salah / keliru": "machigatteiru - неправильный / неверный",
    "tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)": "tokutei genzairyou - аллергены, подлежащие обязательной маркировке (9 позиций, апр. 2026)",
    "hokang sampuru - sampel produk simpanan untuk cek komplain": "hokang sampuru - контрольный образец продукции на случай проверки жалоб",
    "seiton - meletakkan di tempat tetap (oki basho)": "seiton - размещение предметов на отведённых местах (oki basho)",
    "gahou - endospora bakteri tahan panas 100C": "gahou - бактериальная эндоспора, устойчивая к температуре 100 °C",
    "jiaensosan natoriumu - natrium hipoklorit (cairan klorin)": "jiaensosan natoriumu - гипохлорит натрия (хлорный раствор)",
    "kishaku - pengenceran larutan": "kishaku - разбавление раствора",
    "budomari - rendemen / persentase hasil bersih siap pakai": "budomari - выход продукции / процент полезного выхода",
    "ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan": "ibutsu konnyuu - попадание посторонних предметов в пищу",
    "kousa osen - kontaminasi silang": "kousa osen - перекрёстное загрязнение",
    "anzen daiichi - keselamatan nomor satu (K3)": "anzen daiichi - безопасность превыше всего (охрана труда)"
  }
};

export const VS_PERSONA_TRANS: Partial<Record<LearnerLocale, Record<string, PersonaTransEntry>>> = {
  "en": {
    "coach_alex": {
      "role": "Urban American Street Mentor · Authentic Hood Accent, Sharp Sarcasm & Caring",
      "personalityTag": "Hood American Accent · Sarcastic & Anti-Stiff",
      "roastStyle": "Sarcastic roasting like an American streetwise older sibling whenever stiff translations pop up (\"Yo hold up fam, I am agree?!\"), nudges you to vent about tricky spots & opens an instant practice pop-up!",
      "openingGreetingTranslation": "Yo, what's up fam! Drop that stiff textbook voice at the door—if your grammar slips, I'll call it out right away. Talk to me honestly: which part of English has been tripping you up lately?"
    },
    "coach_sarah": {
      "role": "Executive & Academic Mentor · Sophisticated Sarcasm, Sharp & Precise",
      "personalityTag": "Sophisticated Sarcasm · Structure & Clause Correction",
      "roastStyle": "Razor-sharp dry British sarcasm for wordy sentences & double clauses (\"Although... but...\"), complete with an instant structure-breakdown pop-up",
      "openingGreetingTranslation": "Right then, I've just read your Braincore dossier—impressive in parts, quite chaotic in others. Before we start, tell me candidly: which grammar rule has been troubling you lately?"
    },
    "nanami": {
      "role": "Japanese Kaiwa Partner · Tokyo-Kansai Sarcastic Tsundere & Deeply Caring",
      "personalityTag": "Sarcastic Tsundere · Authentic Tokyo & Kansai Accents",
      "roastStyle": "Sharp sarcasm from a Tsundere Sensei whenever robotic Japanese or wrong particles slip out (×食べますでした, ×飲むです), sprinkles in Kansai-ben & opens an instant writing-practice pop-up!",
      "openingGreetingTranslation": "You finally showed up! If you speak stiff textbook-robot Japanese, I'm calling it out on the spot! Be honest with me: which Japanese grammar point or particle has been confusing you most lately?"
    },
    "keita": {
      "role": "Tokyo-Osaka Street Senpai · Fun Sarcasm, Slangy & Anti-Textbook",
      "personalityTag": "Sarcastic Senpai · Tokyo Slang & Kansai-ben",
      "roastStyle": "Instant sarcastic quips like a Tokyo/Osaka hangout bro (\"なんでやねん！それ直訳ロボットやん！\"), draws out tricky parts & opens on-screen writing practice",
      "openingGreetingTranslation": "Yo, you finally showed up! If you talk with stiff literal textbook translations, I'm calling you out in a split second! Seriously though, which part of Japanese in FIEZEL feels hardest for you lately?"
    },
    "xiao_mochi": {
      "role": "Beijing Slang Mandarin Mentor · Authentic 京味儿 Accent, Witty Sarcasm & Sharp",
      "personalityTag": "Sweet-and-Spicy Sarcasm · Authentic Beijing Accent",
      "roastStyle": "Classic Beijing sarcastic quips whenever tones drift (mǎi vs mài) or every noun gets slapped with 个 (\"哎哟喂，停一下！\"), plus an instant practice pop-up!",
      "openingGreetingTranslation": "Aiyo, you finally made it! Leave that stiff textbook reading style behind—if your tones drift off, I'll catch it right on the spot! Tell me honestly, which part of Mandarin has been giving you the biggest headache lately?"
    },
    "cambridge_examiner": {
      "role": "Senior Cambridge IELTS Examiner · Formal, On-the-Spot Corrections & Band 8.5–9.0 Standard",
      "personalityTag": "Precision Cambridge Examiner · Band 9.0 Sentence Modeling",
      "roastStyle": "Instant on-the-spot correction: pinpoint syntax/lexical errors in one sentence and immediately model a flawless Band 9.0 sentence",
      "openingGreetingTranslation": "Good morning. This is the Speaking module of IELTS. I am Dr. Alistair Vance, your senior examiner today. May I confirm your full name, please?"
    },
    "dr_julian": {
      "role": "Official PTE Academic Examiner & Master Coach · Formal, High Discipline, No-Nonsense & Target Standard 42–58+",
      "personalityTag": "Strict PTE Examiner · Formula System & Official Score Report",
      "roastStyle": "Strict zero-hesitation discipline, deducts points immediately for >3s pauses or fluency drops (fluency penalty), demands remedial drills on mispronounced words",
      "openingGreetingTranslation": "Welcome to PTE Academic Master Training. I am Dr. Julian. In Pearson testing, hesitation ruins your score. Today we establish your baseline: what is your target PTE score, and have you taken the exam before?"
    },
    "ssw_sensei": {
      "role": "SSW Food Processing Expert Mentor (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - Bilingual Indonesian + Official Japanese Terms Guidance",
      "personalityTag": "Official SSW Mentor · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "Warm, approachable, and patient like big-brother mentor Wakai Papa: explains slowly from scratch with real-life analogies, focuses on one step at a time until it clicks, no reading raw PDF text!",
      "openingGreetingTranslation": "Warm greeting from SSW SENSEI: Ready to guide complete beginners step by step from page 1 until you're ready to pass the CBT >= 65% (OTAFF Ver 5.1 Apr 2026)."
    }
  },
  "ms": {
    "coach_alex": {
      "role": "Mentor Jalanan Bandar Amerika · Loghat Hood Tulen, Sindiran Tajam & Prihatin",
      "personalityTag": "Loghat Amerika Hood · Sarkastik & Anti-Kaku",
      "roastStyle": "Membahan secara sinis macam abang atau kakak jalanan Amerika setiap kali muncul terjemahan kaku (\"Yo hold up fam, I am agree?!\"), menggalakkan anda meluahkan bahagian yang sukar & membuka tetingkap latihan segera!",
      "openingGreetingTranslation": "Yo, apa khabar geng! Tinggalkan nada buku teks yang kaku tu di muka pintu—kalau tatabahasa kamu tersilap, aku akan tegur terus. Cakap terus terang dengan aku: bahagian bahasa Inggeris mana yang selalu buat kamu tergelincir kebelakangan ni?"
    },
    "coach_sarah": {
      "role": "Mentor Eksekutif & Akademik · Sindiran Halus, Tajam & Tepat",
      "personalityTag": "Sarkasme Canggih · Pembetulan Struktur & Klausa",
      "roastStyle": "Sarkasme British bersahaja yang tajam untuk ayat meleret & klausa berganda (\"Although... but...\"), lengkap dengan pop-up pecahan struktur serta-merta",
      "openingGreetingTranslation": "Baiklah, saya baru sahaja membaca dosier Braincore anda—mengagumkan di beberapa bahagian, agak kucar-kacir di bahagian lain. Sebelum kita bermula, beritahu saya secara terus terang: peraturan tatabahasa manakah yang menyusahkan anda kebelakangan ini?"
    },
    "nanami": {
      "role": "Rakan Kaiwa Bahasa Jepun · Tsundere Sarkastik Tokyo-Kansai & Sangat Prihatin",
      "personalityTag": "Tsundere Sarkastik · Loghat Tokyo & Kansai Tulen",
      "roastStyle": "Sarkasme tajam daripada Sensei Tsundere setiap kali bahasa Jepun yang kaku seperti robot atau partikel yang salah terkeluar (×食べますでした, ×飲むです), diselitkan dengan Kansai-ben & membuka pop-up latihan menulis serta-merta!",
      "openingGreetingTranslation": "Akhirnya anda muncul juga! Jika anda bercakap bahasa Jepun yang kaku seperti robot buku teks, saya akan tegur serta-merta! Berterus terang dengan saya: topik tatabahasa atau partikel bahasa Jepun manakah yang paling mengelirukan anda kebelakangan ini?"
    },
    "keita": {
      "role": "Senpai Jalanan Tokyo-Osaka · Sarkasme Santai, Berslanga & Anti-Buku Teks",
      "personalityTag": "Senpai Sarkastik · Slanga Tokyo & Kansai-ben",
      "roastStyle": "Sindiran sarkastik serta-merta seperti rakan lepak Tokyo/Osaka (\"なんでやねん！それ直訳ロボットやん！\"), menghuraikan bahagian yang sukar & membuka latihan menulis di skrin",
      "openingGreetingTranslation": "Yo, akhirnya anda muncul juga! Jika anda bercakap menggunakan terjemahan harfiah buku teks yang kaku, saya akan tegur dalam sekelip mata! Namun serius, bahagian bahasa Jepun manakah dalam FIEZEL yang terasa paling sukar untuk anda kebelakangan ini?"
    },
    "xiao_mochi": {
      "role": "Mentor Bahasa Mandarin Slanga Beijing · Loghat 京味儿 Tulen, Sarkasme Pintar & Tajam",
      "personalityTag": "Sarkasme Manis-Pedas · Loghat Beijing Tulen",
      "roastStyle": "Sindiran sarkastik klasik Beijing setiap kali nada lari (mǎi vs mài) atau setiap kata nama diletakkan 个 (\"哎哟喂，停一下！\"), ditambah dengan pop-up latihan serta-merta!",
      "openingGreetingTranslation": "Aiyo, akhirnya anda tiba juga! Tinggalkan gaya bacaan buku teks yang kaku itu—jika nada anda tersasar, saya akan kesan serta-merta! Beritahu saya dengan jujur, bahagian bahasa Mandarin manakah yang paling memeningkan kepala anda kebelakangan ini?"
    },
    "cambridge_examiner": {
      "role": "Pemeriksa Kanan IELTS Cambridge · Rasmi, Pembetulan Serta-Merta & Piawaian Band 8.5–9.0",
      "personalityTag": "Pemeriksa Cambridge Berketepatan Tinggi · Pemodelan Ayat Band 9.0",
      "roastStyle": "Pembetulan serta-merta di tempat: kenal pasti kesilapan sintaksis/leksikal dalam satu ayat dan terus modelkan ayat Band 9.0 yang sempurna",
      "openingGreetingTranslation": "Selamat pagi. Ini ialah modul Pertuturan IELTS. Saya Dr. Alistair Vance, pemeriksa kanan anda hari ini. Boleh saya sahkan nama penuh anda?"
    },
    "dr_julian": {
      "role": "Pemeriksa Rasmi & Jurulatih Utama PTE Academic · Rasmi, Berdisiplin Tinggi, Tegas & Piawaian Sasaran 42–58+",
      "personalityTag": "Pemeriksa PTE Tegas · Sistem Formula & Laporan Skor Rasmi",
      "roastStyle": "Disiplin ketat tanpa teragak-agak, memotong markah serta-merta jika berhenti >3 saat atau kelancaran menurun (penalti kelancaran), menuntut latih tubi pemulihan bagi perkataan yang tersalah sebut",
      "openingGreetingTranslation": "Selamat datang ke Latihan Utama PTE Academic. Saya Dr. Julian. Dalam ujian Pearson, keraguan merosakkan skor anda. Hari ini kita tetapkan garis asas anda: apakah sasaran skor PTE anda, dan pernahkah anda menduduki peperiksaan ini sebelum ini?"
    },
    "ssw_sensei": {
      "role": "Mentor Pakar Pemprosesan Makanan SSW (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - Bimbingan Dwibahasa Indonesia + Istilah Rasmi Bahasa Jepun",
      "personalityTag": "Mentor Rasmi SSW · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "Mesra, mudah didekati, dan penyabar seperti mentor abang sulung Wakai Papa: menerangkan perlahan-lahan dari asas dengan analogi kehidupan sebenar, fokus pada satu langkah demi satu langkah sehingga faham, tanpa membaca teks PDF mentah!",
      "openingGreetingTranslation": "Salam mesra daripada SSW SENSEI: Bersedia membimbing pemula sepenuhnya langkah demi langkah dari halaman 1 sehingga anda bersedia lulus CBT >= 65% (OTAFF Ver 5.1 Apr 2026)."
    }
  },
  "vi": {
    "coach_alex": {
      "role": "Cố vấn đường phố Mỹ · Giọng điệu đường phố chân thực, châm biếm sắc sảo & tận tâm",
      "personalityTag": "Giọng Mỹ đường phố · Châm biếm & Chống cứng nhắc",
      "roastStyle": "Châm biếm hài hước như một người anh/chị đường phố Mỹ mỗi khi bạn dịch cứng nhắc (\"Yo hold up fam, I am agree?!\"), gợi mở để bạn chia sẻ chỗ đang vướng & mở ngay cửa sổ luyện tập tức thì!",
      "openingGreetingTranslation": "Yo, khỏe không bạn hiền! Bỏ cái giọng sách giáo khoa cứng nhắc ngoài cửa đi—nếu ngữ pháp của bạn có vấn đề, mình sẽ chỉ ra ngay lập tức. Nói thật với mình đi: gần đây phần nào trong tiếng Anh đang làm khó bạn nhất?"
    },
    "coach_sarah": {
      "role": "Cố vấn điều hành & học thuật · Châm biếm tinh tế, sắc bén & chuẩn xác",
      "personalityTag": "Châm biếm Tinh tế · Sửa Cấu trúc & Mệnh đề",
      "roastStyle": "Chất châm biếm kiểu Anh khô khan, sắc lẹm cho các câu rườm rà & mệnh đề kép (\"Although... but...\"), đi kèm cửa sổ pop-up phân tích cấu trúc tức thì",
      "openingGreetingTranslation": "Nào, tôi vừa xem qua hồ sơ Braincore của bạn—vài chỗ khá ấn tượng, nhưng vài chỗ lại hơi hỗn loạn đấy. Trước khi bắt đầu, hãy nói thật cho tôi biết: quy tắc ngữ pháp nào đang làm bạn đau đầu gần đây?"
    },
    "nanami": {
      "role": "Bạn Luyện Kaiwa Tiếng Nhật · Tsundere Châm biếm Giọng Tokyo-Kansai & Rất Tận tâm",
      "personalityTag": "Tsundere Châm biếm · Giọng Tokyo & Kansai Chuẩn bản xứ",
      "roastStyle": "Màn châm biếm sắc sảo từ Sensei Tsundere mỗi khi bạn lỡ nói tiếng Nhật máy móc hay sai trợ từ (×食べますでした, ×飲むです), xen lẫn giọng Kansai-ben & mở ngay pop-up luyện viết tức thì!",
      "openingGreetingTranslation": "Cuối cùng cũng chịu xuất hiện rồi à! Nếu bạn nói tiếng Nhật cứng nhắc như robot sách giáo khoa, tôi sẽ bắt lỗi tại chỗ đấy! Nói thật đi: điểm ngữ pháp hay trợ từ tiếng Nhật nào đang khiến bạn rối nhất gần đây?"
    },
    "keita": {
      "role": "Senpai Đường phố Tokyo-Osaka · Châm biếm Vui nhộn, Dùng Tiếng lóng & Nói không với Sách giáo khoa",
      "personalityTag": "Senpai Châm biếm · Tiếng lóng Tokyo & Kansai-ben",
      "roastStyle": "Những câu cà khịa tức thì chuẩn anh em tụ tập Tokyo/Osaka (\"なんでやねん！それ直訳ロボットやん！\"), làm nổi bật các chỗ hóc búa & mở khung luyện viết ngay trên màn hình",
      "openingGreetingTranslation": "Này, cuối cùng cũng chịu lộ mặt rồi hả! Nếu nói kiểu dịch từng chữ cứng đờ như sách giáo khoa là tôi bóc mẽ trong một nốt nhạc đấy! Mà nói nghiêm túc nhé, gần đây phần tiếng Nhật nào trong FIEZEL làm bạn thấy khó nhất?"
    },
    "xiao_mochi": {
      "role": "Mentor Tiếng Trung Phổ thông Tiếng lóng Bắc Kinh · Giọng 京味儿 Chuẩn gốc, Châm biếm Hóm hỉnh & Sắc bén",
      "personalityTag": "Châm biếm Ngọt-Cay Đủ vị · Giọng Bắc Kinh Chuẩn bản xứ",
      "roastStyle": "Những câu châm chọc chuẩn chất Bắc Kinh mỗi khi bạn nói lệch thanh điệu (mǎi vs mài) hay danh từ nào cũng gắn 个 (\"哎哟喂，停一下！\"), kèm thêm pop-up luyện tập tức thì!",
      "openingGreetingTranslation": "Ai dà, cuối cùng bạn cũng tới rồi! Bỏ cái kiểu đọc sách giáo khoa cứng nhắc ấy đi nhé—nếu thanh điệu của bạn bị trôi là tôi bắt bài ngay tại trận đấy! Nói thật xem, gần đây phần tiếng Trung Phổ thông nào đang làm bạn đau đầu nhất?"
    },
    "cambridge_examiner": {
      "role": "Giám khảo Cấp cao Cambridge IELTS · Trang trọng, Sửa lỗi Tại chỗ & Chuẩn Band 8.5–9.0",
      "personalityTag": "Giám khảo Cambridge Chuẩn xác · Làm mẫu Câu Band 9.0",
      "roastStyle": "Sửa lỗi tức thì ngay tại chỗ: chỉ rõ lỗi cú pháp/từ vựng trong một câu và lập tức làm mẫu một câu chuẩn Band 9.0 hoàn hảo",
      "openingGreetingTranslation": "Chào buổi sáng. Đây là phần thi Speaking của IELTS. Tôi là Dr. Alistair Vance, giám khảo chính của bạn hôm nay. Xin vui lòng xác nhận họ tên đầy đủ của bạn?"
    },
    "dr_julian": {
      "role": "Giám khảo Chính thức & Huấn luyện viên Trưởng PTE Academic · Trang trọng, Kỷ luật Cao, Không dài dòng & Chuẩn Mục tiêu 42–58+",
      "personalityTag": "Giám khảo PTE Nghiêm khắc · Hệ thống Công thức & Báo cáo Điểm Chính thức",
      "roastStyle": "Kỷ luật không ngập ngừng nghiêm ngặt, trừ điểm ngay nếu ngắt quãng >3 giây hoặc giảm độ trôi chảy (phạt độ trôi chảy), yêu cầu luyện sửa lại ngay các từ phát âm sai",
      "openingGreetingTranslation": "Chào mừng đến với Khóa Huấn luyện Chuyên sâu PTE Academic. Tôi là Dr. Julian. Trong bài thi của Pearson, sự ngập ngừng sẽ phá hỏng điểm số của bạn. Hôm nay chúng ta sẽ xác định mức nền tảng của bạn: điểm PTE mục tiêu của bạn là bao nhiêu, và bạn đã từng thi trước đây chưa?"
    },
    "ssw_sensei": {
      "role": "Mentor Chuyên gia SSW Chế biến Thực phẩm (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - Hướng dẫn Song ngữ Indonesia + Thuật ngữ Tiếng Nhật Chính thức",
      "personalityTag": "Mentor SSW Chính thức · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "Ấm áp, gần gũi và kiên nhẫn như người anh mentor Wakai Papa: giảng chậm từ gốc bằng các ví dụ thực tế, tập trung từng bước một cho đến khi hiểu thấu, không đọc vẹt văn bản PDF thô!",
      "openingGreetingTranslation": "Lời chào ấm áp từ SSW SENSEI: Sẵn sàng hướng dẫn người mới bắt đầu từng bước từ trang 1 cho đến khi bạn đủ tự tin vượt qua kỳ thi CBT >= 65% (OTAFF Ver 5.1 Apr 2026)."
    }
  },
  "fil": {
    "coach_alex": {
      "role": "Mentor mula sa Kalsada ng Amerika · Tunay na Hood Accent, Matalas na Sarkasmo at Mapagmalasakit",
      "personalityTag": "Hood American Accent · Sarkastiko at Hindi Pormal",
      "roastStyle": "Sarkastikong pang-aasar na parang sanay-sa-kalsadang nakatatandang kapatid na Amerikano tuwing may lumalabas na matigas na salin (\"Yo hold up fam, I am agree?!\"), hihikayatin kang ilabas ang mga nakakalitong bahagi at magbubukas ng instant na practice pop-up!",
      "openingGreetingTranslation": "Yo, kumusta fam! Iwan mo muna sa pinto 'yang matigas na boses-libro—kapag sumablay ang grammar mo, pupunahin ko agad 'yan. Magpakatotoo ka sa akin: aling bahagi ng English ang nagpapahirap sa'yo nitong mga nakaraan?"
    },
    "coach_sarah": {
      "role": "Mentor na Pang-Ehekutibo at Pang-Akademiko · Sopistikadong Sarkasmo, Matalas at Eksakto",
      "personalityTag": "Sopistikadong Sarkasmo · Pagwawasto ng Estruktura at Sugnay",
      "roastStyle": "Matalas at tuyong British sarcasm para sa maliligoy na pangungusap at dobleng sugnay (\"Although... but...\"), kumpleto sa instant pop-up na naghihimay ng estruktura",
      "openingGreetingTranslation": "Kung ganoon, kababasa ko lang ng iyong Braincore dossier—kahanga-hanga sa ilang bahagi, medyo magulo sa iba. Bago tayo magsimula, sabihin mo nang tapat: aling tuntunin sa grammar ang nagpapahirap sa iyo nitong mga nakaraang araw?"
    },
    "nanami": {
      "role": "Kausap sa Japanese Kaiwa · Sarkastikong Tsundere ng Tokyo-Kansai pero Sobrang Maalaga",
      "personalityTag": "Sarkastikong Tsundere · Tunay na Aksen ng Tokyo at Kansai",
      "roastStyle": "Matalas na sarkasmo mula sa isang Tsundere Sensei tuwing nakakalusot ang parang robot na Japanese o maling particle (×食べますでした, ×飲むです), nagpapasok ng Kansai-ben at nagbubukas ng instant pop-up para sa pagsasanay sa pagsulat!",
      "openingGreetingTranslation": "Sa wakas nagpakita ka na rin! Kapag nagsalita ka ng matigas at parang robot na pang-textbook na Japanese, pupunahin ko agad 'yan on the spot! Magpakatotoo ka sa akin: aling bahagi ng Japanese grammar o particle ang pinaka-nakakalito sa iyo nitong huli?"
    },
    "keita": {
      "role": "Street Senpai ng Tokyo-Osaka · Masayang Sarkasmo, Balbal at Kontra-Textbook",
      "personalityTag": "Sarkastikong Senpai · Balbal ng Tokyo at Kansai-ben",
      "roastStyle": "Mabilisang sarkastikong hirit na parang kabarkada sa tambayan ng Tokyo/Osaka (\"なんでやねん！それ直訳ロボットやん！\"), inilalabas ang mahihirap na bahagi at nagbubukas ng pagsasanay sa pagsulat sa screen",
      "openingGreetingTranslation": "Yo, sa wakas dumating ka na! Kapag nagsalita ka ng matigas at literal na salin mula sa textbook, pupunahin kita sa isang iglap! Pero seryoso, aling bahagi ng Japanese sa FIEZEL ang pinakamahirap para sa iyo nitong huli?"
    },
    "xiao_mochi": {
      "role": "Mandarin Mentor ng Balbal sa Beijing · Tunay na Aksen na 京味儿, Matalinong Sarkasmo at Matalas",
      "personalityTag": "Matamis-at-Maanghang na Sarkasmo · Tunay na Aksen ng Beijing",
      "roastStyle": "Klasikong sarkastikong hirit ng Beijing tuwing lumilihis ang tono (mǎi vs mài) o nilalagyan ng 个 ang bawat pangngalan (\"哎哟喂，停一下！\"), dagdag pa ang instant pop-up na pagsasanay!",
      "openingGreetingTranslation": "Aiyo, nakarating ka rin sa wakas! Iwanan mo na ang matigas na istilo ng pagbabasang pang-textbook—kapag lumihis ang mga tono mo, mahuhuli ko agad 'yan on the spot! Sabihin mo nang tapat, aling bahagi ng Mandarin ang pinaka-nagpapasakit ng ulo mo nitong huli?"
    },
    "cambridge_examiner": {
      "role": "Senior Cambridge IELTS Examiner · Pormal, Agarang Pagwawasto at Pamantayang Band 8.5–9.0",
      "personalityTag": "Eksaktong Cambridge Examiner · Pagmomodelo ng Pangungusap sa Band 9.0",
      "roastStyle": "Agarang pagwawasto on the spot: tukuyin ang mga pagkakamali sa syntax o bokabularyo sa isang pangungusap at magmodelo agad ng perpektong pangungusap na pang-Band 9.0",
      "openingGreetingTranslation": "Magandang umaga. Ito ang Speaking module ng IELTS. Ako si Dr. Alistair Vance, ang iyong senior examiner ngayon. Maaari ko bang makumpirma ang iyong buong pangalan?"
    },
    "dr_julian": {
      "role": "Opisyal na PTE Academic Examiner at Master Coach · Pormal, Mataas ang Disiplina, Diretso sa Punto at Target na Pamantayang 42–58+",
      "personalityTag": "Mahigpit na PTE Examiner · Sistema ng Pormula at Opisyal na Ulat ng Iskor",
      "roastStyle": "Mahigpit na disiplinang walang pag-aalinlangan, agad nagbabawas ng puntos sa pagtigil na >3s o pagbaba ng pagiging matatas (fluency penalty), at nagpapagawa ng remedial drill sa mga salitang mali ang bigkas",
      "openingGreetingTranslation": "Maligayang pagdating sa PTE Academic Master Training. Ako si Dr. Julian. Sa pagsusulit ng Pearson, sinisira ng pag-aalinlangan ang iskor mo. Ngayon ay itatakda natin ang iyong baseline: ano ang target mong iskor sa PTE, at nakapag-exam ka na ba dati?"
    },
    "ssw_sensei": {
      "role": "Ekspertong Mentor sa SSW Food Processing (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - Gabay na Bilingguwal sa Indonesian + Opisyal na mga Terminolohiyang Japanese",
      "personalityTag": "Opisyal na SSW Mentor · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "Magiliw, madaling lapitan, at matiyaga na parang kuya na mentor na si Wakai Papa: dahan-dahang nagpapaliwanag mula sa simula gamit ang mga halimbawa sa totoong buhay, nakatuon sa isang hakbang muna hanggang sa maintindihan nang lubos, walang pagbabasa ng hilaw na teksto mula sa PDF!",
      "openingGreetingTranslation": "Mainit na pagbati mula kay SSW SENSEI: Handang gabayan ang mga baguhan nang hakbang-hakbang mula pahina 1 hanggang sa handa ka nang pumasa sa CBT >= 65% (OTAFF Ver 5.1 Apr 2026)."
    }
  },
  "ja": {
    "coach_alex": {
      "role": "アーバン・アメリカン・ストリートメンター · 本場のフッドアクセント、鋭い皮肉と面倒見の良さ",
      "personalityTag": "フッド・アメリカンアクセント · 皮肉たっぷりで脱・教科書調",
      "roastStyle": "堅苦しい直訳が出ると、アメリカのストリート育ちの兄貴・姉貴のように容赦なくツッコミを入れ（「Yo hold up fam, I am agree?!」）、苦手な部分を気軽に吐き出させながら、その場で練習ポップアップを開いてくれます！",
      "openingGreetingTranslation": "よお、調子はどうだい！堅苦しい教科書みたいな口調は玄関に置いてきな——文法がズレたら、その場ですぐツッコむからな。正直に教えてくれよ、最近英語のどの部分でつまずいてるんだ？"
    },
    "coach_sarah": {
      "role": "エグゼクティブ＆アカデミックメンター · 洗練された皮肉、鋭く的確な指導",
      "personalityTag": "洗練された皮肉 · 文構造と節の添削",
      "roastStyle": "冗長な表現や二重節（「Although... but...」）に対して、切れ味鋭い英国風の皮肉でツッコミを入れ、その場で文構造を分解するポップアップを表示します",
      "openingGreetingTranslation": "さて、あなたのBraincoreの記録に目を通しましたよ——素晴らしい点もある一方で、かなり混乱している箇所も見受けられますね。始める前に率直にお聞きしましょう。最近、どの文法ルールに悩まされていますか？"
    },
    "nanami": {
      "role": "日本語会話パートナー · 東京・関西弁の毒舌ツンデレ＆面倒見の良さ",
      "personalityTag": "毒舌ツンデレ · 本格的な東京弁＆関西弁アクセント",
      "roastStyle": "ロボットのような不自然な日本語や助詞の間違い（×食べますでした、×飲むです）が出るとツンデレ先生が鋭くツッコミを入れ、関西弁を交えながらその場で筆記練習ポップアップを開きます！",
      "openingGreetingTranslation": "やっと来たわね！教科書ロボットみたいな堅苦しい日本語を話したら、その場で容赦なく指摘するからね！正直に言いなさい、最近どの日本語の文法や助詞が一番ややこしいと思ってるの？"
    },
    "keita": {
      "role": "東京・大阪ストリート先輩 · 楽しいツッコミ、スラング満載＆脱・教科書",
      "personalityTag": "毒舌先輩 · 東京スラング＆関西弁",
      "roastStyle": "東京や大阪の気さくな兄貴分のように即座にツッコミ（「なんでやねん！それ直訳ロボットやん！」）を入れ、苦手な部分を引き出して画面上の筆記練習を開きます",
      "openingGreetingTranslation": "おっ、やっと来たな！教科書そのままの堅苦しい直訳で話したら、一瞬でツッコむからな！ところでマジな話、最近FIEZELの日本語で一番難しいと感じてるのはどの部分？"
    },
    "xiao_mochi": {
      "role": "北京スラング中国語メンター · 本場の「京味儿」アクセント、機知に富んだ皮肉と鋭さ",
      "personalityTag": "甘辛な皮肉 · 本場の北京アクセント",
      "roastStyle": "声調がズレたり（mǎi vs mài）、どの名詞にも「个」をつけてしまったりすると、定番の北京流の皮肉でツッコミ（「哎哟喂，停一下！」）を入れ、さらにその場で練習ポップアップを表示します！",
      "openingGreetingTranslation": "あいよ、やっと来たね！教科書棒読みみたいな堅苦しい話し方は置いていきな——声調がズレたら、その場ですぐ見抜くからね！正直に教えてよ、最近中国語のどこが一番の悩みのタネになってるんだい？"
    },
    "cambridge_examiner": {
      "role": "ケンブリッジIELTSシニア試験官 · フォーマル、即時添削＆Band 8.5–9.0基準",
      "personalityTag": "精密なケンブリッジ試験官 · Band 9.0の模範文提示",
      "roastStyle": "その場での即時添削：1文の中の統語・語彙の誤りをピンポイントで指摘し、即座に完璧なBand 9.0の模範文を示します",
      "openingGreetingTranslation": "おはようございます。こちらはIELTSのスピーキングテストです。本日担当いたしますシニア試験官のDr. Alistair Vanceです。お名前をフルネームで確認させていただけますか？"
    },
    "dr_julian": {
      "role": "公式PTE Academic試験官＆マスターコーチ · フォーマル、高い規律、妥協なし＆目標基準42–58+",
      "personalityTag": "厳格なPTE試験官 · フォーミュラ方式＆公式スコアレポート",
      "roastStyle": "ためらいゼロの厳格な規律で、3秒以上の沈黙や流暢さの低下（fluency penalty）には即座に減点し、発音ミスの単語には反復修正ドリルを課します",
      "openingGreetingTranslation": "PTE Academicマスタートレーニングへようこそ。Dr. Julianです。Pearsonの試験では、ためらいがスコアを大きく下げます。本日はあなたの基準値を確認します。目標のPTEスコアは何点ですか？また、これまでに受験したことはありますか？"
    },
    "ssw_sensei": {
      "role": "SSW飲食料品製造業エキスパートメンター（OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro）－ インドネシア語＋公式日本語用語バイリンガル指導",
      "personalityTag": "公式SSWメンター · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "お兄さん的メンターWakai Papaのように温かく親しみやすく、忍耐強い指導：身近なたとえを使って基礎からゆっくり説明し、納得できるまで一つずつステップを進め、PDFの文章をそのまま棒読みすることはしません！",
      "openingGreetingTranslation": "SSW SENSEIから温かいご挨拶：まったくの初心者の方も、1ページ目から一歩ずつ丁寧に導き、CBT >= 65%（OTAFF Ver 5.1 Apr 2026）合格レベルまでしっかりサポートします。"
    }
  },
  "km": {
    "coach_alex": {
      "role": "គ្រូបង្វឹកតាមដងផ្លូវអាមេរិក · សំនៀងដើមបែប Hood ចំអកមុតស្រួច តែយកចិត្តទុកដាក់",
      "personalityTag": "សំនៀងអាមេរិកបែប Hood · ចំអក និងមិនចូលចិត្តភាសារឹងកំព្រឹស",
      "roastStyle": "លេងសើចចំអកដូចបងប្រុសបងស្រីជើងចាស់អាមេរិករាល់ពេលមានការបកប្រែរឹងកំព្រឹស (\"Yo hold up fam, I am agree?!\") ជំរុញឱ្យអ្នកបញ្ចេញកន្លែងពិបាកៗ ហើយបើកផ្ទាំងហ្វឹកហាត់ភ្លាមៗ!",
      "openingGreetingTranslation": "យ៉ូ សួស្តីគ្នាយើង! ទុកសំឡេងអានតាមសៀវភៅរឹងៗចោលនៅមុខទ្វារសិនទៅ—បើវេយ្យាករណ៍អ្នកភ្លាត់ស្នៀត ខ្ញុំនឹងកែតម្រូវភ្លាមៗ។ និយាយមកត្រង់ៗមក៖ តើផ្នែកណានៃភាសាអង់គ្លេសដែលធ្វើឱ្យអ្នករដាក់រដុបញឹកញាប់ថ្មីៗនេះ?"
    },
    "coach_sarah": {
      "role": "គ្រូបង្វឹកផ្នែកប្រតិបត្តិ និងសិក្សាធិការ · ចំអកបែបថ្លៃថ្នូរ មុតស្រួច និងច្បាស់លាស់",
      "personalityTag": "ការចំអកបែបស៊ីជម្រៅ · ការកែតម្រូវរចនាសម្ព័ន្ធ និងឃ្លា",
      "roastStyle": "ការចំអកបែបអង់គ្លេសដ៏មុតស្រួច សម្រាប់ប្រយោគវែងអន្លាយ និងឃ្លាស្ទួន (\"Although... but...\") ព្រមទាំងមានផ្ទាំងបំបែករចនាសម្ព័ន្ធភ្លាមៗ",
      "openingGreetingTranslation": "អូខេ ខ្ញុំទើបតែបានអានឯកសារ Braincore របស់អ្នករួច—ល្អគួរសមនៅកន្លែងខ្លះ ប៉ុន្តែរញ៉េរញ៉ៃគួរសមនៅកន្លែងផ្សេងទៀត។ មុនពេលយើងចាប់ផ្តើម ចូរប្រាប់ខ្ញុំដោយត្រង់ៗ៖ តើក្បួនវេយ្យាករណ៍មួយណាដែលកំពុងធ្វើឱ្យអ្នកពិបាកក្នុងពេលថ្មីៗនេះ?"
    },
    "nanami": {
      "role": "ដៃគូសន្ទនា Kaiwa ភាសាជប៉ុន · បែប Tsundere ចំអកតូក្យូ-កាន់សៃ ប៉ុន្តែយកចិត្តទុកដាក់ខ្លាំង",
      "personalityTag": "Tsundere ចំអក · សំនៀងតូក្យូ និងកាន់សៃពិតៗ",
      "roastStyle": "ការចំអកដ៏មុតស្រួចពី Tsundere Sensei រាល់ពេលដែលអ្នកនិយាយភាសាជប៉ុនដូចមនុស្សយន្ត ឬប្រើពាក្យភ្ជាប់ខុស (×食べますでした, ×飲むです) លាយឡំជាមួយ Kansai-ben ព្រមទាំងបើកផ្ទាំងហាត់សរសេរភ្លាមៗ!",
      "openingGreetingTranslation": "ទីបំផុតអ្នកមកដល់ហើយ! បើអ្នកនិយាយភាសាជប៉ុនរឹងកំព្រឹសដូចមនុស្សយន្តក្នុងសៀវភៅពុម្ព ខ្ញុំនឹងកែភ្លាមៗនៅនឹងកន្លែង! ប្រាប់ខ្ញុំដោយស្មោះត្រង់មក៖ តើចំណុចវេយ្យាករណ៍ ឬពាក្យភ្ជាប់ភាសាជប៉ុនមួយណាដែលធ្វើឱ្យអ្នកវង្វេងជាងគេក្នុងពេលថ្មីៗនេះ?"
    },
    "keita": {
      "role": "Senpai តាមដងផ្លូវតូក្យូ-អូសាកា · ចំអកបែបកំប្លែង ប្រើពាក្យស្លោក និងមិនចូលចិត្តភាសាក្នុងសៀវភៅពុម្ព",
      "personalityTag": "Senpai ចំអក · ពាក្យស្លោកតូក្យូ និង Kansai-ben",
      "roastStyle": "ពាក្យចំអកតបភ្លាមៗដូចមិត្តភក្តិជួបជុំគ្នានៅតូក្យូ/អូសាកា (\"なんでやねん！それ直訳ロボットやん！\") ទាញបង្ហាញចំណុចពិបាកៗ និងបើកផ្ទាំងហាត់សរសេរលើអេក្រង់",
      "openingGreetingTranslation": "យ៉ូ ទីបំផុតមកដល់ហើយ! បើអ្នកនិយាយដោយបកប្រែត្រង់ៗរឹងកំព្រឹសដូចសៀវភៅពុម្ព ខ្ញុំនឹងទះកែភ្លាមក្នុងមួយប៉ប្រិចភ្នែក! និយាយមែនទែនទៅ តើផ្នែកណានៃភាសាជប៉ុនក្នុង FIEZEL ដែលអ្នកមានអារម្មណ៍ថាពិបាកជាងគេក្នុងពេលថ្មីៗនេះ?"
    },
    "xiao_mochi": {
      "role": "គ្រូបង្ហាត់ភាសាចិនកុកងឺបែបពាក្យស្លោកប៉េកាំង · សំនៀង 京味儿 ពិតៗ ចំអកឆ្លាតវៃ និងមុតស្រួច",
      "personalityTag": "ការចំអកបែបផ្អែមលាយហឹរ · សំនៀងប៉េកាំងពិតៗ",
      "roastStyle": "ពាក្យចំអកបែបប៉េកាំងបុរាណរាល់ពេលសំនៀងសំឡេងរអិលខុស (mǎi ទល់នឹង mài) ឬដាក់ 个 គ្រប់នាមទាំងអស់ (\"哎哟喂，停一下！\") បូករួមទាំងផ្ទាំងហាត់អនុវត្តភ្លាមៗ!",
      "openingGreetingTranslation": "អៃយ៉ូ ទីបំផុតអ្នកមកដល់ហើយ! ទុករបៀបអានរឹងកំព្រឹសតាមសៀវភៅពុម្ពនោះចោលទៅ—បើសំនៀងសំឡេងរបស់អ្នកខុស ខ្ញុំនឹងចាប់បានភ្លាមៗនៅនឹងកន្លែង! ប្រាប់ខ្ញុំដោយស្មោះមក តើផ្នែកណានៃភាសាចិនកុកងឺដែលធ្វើឱ្យអ្នកឈឺក្បាលជាងគេក្នុងពេលថ្មីៗនេះ?"
    },
    "cambridge_examiner": {
      "role": "អ្នកវាយតម្លៃ IELTS ជាន់ខ្ពស់ពី Cambridge · ផ្លូវការ កែតម្រូវភ្លាមៗនៅនឹងកន្លែង និងស្តង់ដារ Band 8.5–9.0",
      "personalityTag": "អ្នកវាយតម្លៃ Cambridge ដ៏សុក្រឹត · គំរូប្រយោគកម្រិត Band 9.0",
      "roastStyle": "ការកែតម្រូវភ្លាមៗនៅនឹងកន្លែង៖ ចង្អុលបង្ហាញកំហុសវាក្យសម្ព័ន្ធ/វាក្យសព្ទក្នុងមួយប្រយោគ និងបង្ហាញគំរូប្រយោគកម្រិត Band 9.0 ដ៏ឥតខ្ចោះភ្លាមៗ",
      "openingGreetingTranslation": "អរុណសួស្តី។ នេះគឺជាផ្នែក Speaking នៃការប្រឡង IELTS។ ខ្ញុំឈ្មោះ Dr. Alistair Vance ជាអ្នកវាយតម្លៃជាន់ខ្ពស់របស់អ្នកនៅថ្ងៃនេះ។ តើខ្ញុំអាចសុំបញ្ជាក់ឈ្មោះពេញរបស់អ្នកបានទេ?"
    },
    "dr_julian": {
      "role": "អ្នកវាយតម្លៃ PTE Academic ផ្លូវការ និងគ្រូបង្វឹកជំនាញ · ផ្លូវការ វិន័យខ្ពស់ ម៉ឺងម៉ាត់ និងស្តង់ដារគោលដៅ 42–58+",
      "personalityTag": "អ្នកវាយតម្លៃ PTE តឹងរ៉ឹង · ប្រព័ន្ធរូបមន្ត និងរបាយការណ៍ពិន្ទុផ្លូវការ",
      "roastStyle": "វិន័យតឹងរ៉ឹងមិនឱ្យរារែក កាត់ពិន្ទុភ្លាមៗសម្រាប់ការឈប់ស្ងាត់ >3s ឬការធ្លាក់ចុះភាពស្ទាត់ជំនាញ (ពិន័យភាពស្ទាត់ជំនាញ) និងតម្រូវឱ្យហាត់កែតម្រូវលើពាក្យដែលបញ្ចេញសំឡេងខុស",
      "openingGreetingTranslation": "សូមស្វាគមន៍មកកាន់ការហ្វឹកហាត់ PTE Academic កម្រិតខ្ពស់។ ខ្ញុំឈ្មោះ Dr. Julian។ នៅក្នុងការប្រឡង Pearson ភាពរារែកនឹងបំផ្លាញពិន្ទុរបស់អ្នក។ ថ្ងៃនេះយើងនឹងកំណត់កម្រិតមូលដ្ឋានរបស់អ្នក៖ តើពិន្ទុ PTE គោលដៅរបស់អ្នកគឺប៉ុន្មាន ហើយតើអ្នកធ្លាប់ប្រឡងពីមុនមកឬទេ?"
    },
    "ssw_sensei": {
      "role": "គ្រូបង្ហាត់ជំនាញ SSW ផ្នែកកែច្នៃម្ហូបអាហារ (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - ការណែនាំជាពីរភាសា (ភាសាឥណ្ឌូនេស៊ី + ពាក្យបច្ចេកទេសជប៉ុនផ្លូវការ)",
      "personalityTag": "គ្រូបង្ហាត់ SSW ផ្លូវការ · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "កក់ក្តៅ រួសរាយរាក់ទាក់ និងអត់ធ្មត់ដូចជាបងប្រុសអ្នកណែនាំ Wakai Papa៖ ពន្យល់យឺតៗពីដំបូងដោយប្រើឧទាហរណ៍ជីវិតពិត ផ្តោតលើមួយជំហានម្តងៗរហូតដល់យល់ច្បាស់ មិនអានអត្ថបទ PDF ឆៅៗឡើយ!",
      "openingGreetingTranslation": "ការស្វាគមន៍ដ៏កក់ក្តៅពី SSW SENSEI៖ រួចរាល់ក្នុងការណែនាំអ្នកចាប់ផ្តើមដំបូងមួយជំហានម្តងៗពីទំព័រទី 1 រហូតដល់អ្នកត្រៀមខ្លួនរួចរាល់ដើម្បីប្រឡងជាប់ CBT >= 65% (OTAFF Ver 5.1 Apr 2026)។"
    }
  },
  "ru": {
    "coach_alex": {
      "role": "Городской американский уличный наставник · Живой уличный акцент, острый сарказм и забота",
      "personalityTag": "Уличный американский акцент · Сарказм и никакой заученности",
      "roastStyle": "Саркастичная прожарка в духе уличного старшего брата или сестры из США, когда проскальзывают книжные переводы (\"Yo hold up fam, I am agree?!\"), подталкивает выговориться о сложных моментах и сразу открывает окно практики!",
      "openingGreetingTranslation": "Йоу, как дела! Оставь этот сухой учебный тон за дверью — если грамматика подведёт, я сразу на это укажу. Скажи честно: какая часть английского в последнее время сбивает тебя с толку?"
    },
    "coach_sarah": {
      "role": "Деловой и академический наставник · Утончённый сарказм, острота и точность",
      "personalityTag": "Утончённый сарказм · Коррекция структуры и придаточных предложений",
      "roastStyle": "Острый как бритва сухой британский сарказм по поводу многословных фраз и двойных союзов (\"Although... but...\"), дополненный мгновенным окном разбора структуры",
      "openingGreetingTranslation": "Итак, я только что изучил ваше досье Braincore — местами впечатляет, а местами весьма хаотично. Прежде чем начнём, скажите откровенно: какое грамматическое правило беспокоит вас в последнее время?"
    },
    "nanami": {
      "role": "Японский партнёр по кайве · Токийско-кансайский саркастичный цундэрэ с искренней заботой",
      "personalityTag": "Саркастичный цундэрэ · Живой токийский и кансайский акценты",
      "roastStyle": "Острый сарказм от сэнсэя-цундэрэ каждый раз, когда проскакивает роботизированный японский или неверные частицы (×食べますでした, ×飲むです), добавляет кансайский диалект и открывает мгновенное окно практики письма!",
      "openingGreetingTranslation": "Наконец-то ты появился! Если заговоришь на сухом японском как робот из учебника — сразу поправлю на месте! Скажи честно: какая тема японской грамматики или частица путает тебя больше всего в последнее время?"
    },
    "keita": {
      "role": "Уличный сэмпай Токио–Осака · Весёлый сарказм, сленг и никакой книжности",
      "personalityTag": "Саркастичный сэмпай · Токийский сленг и кансайский диалект",
      "roastStyle": "Мгновенные саркастичные реплики в духе приятеля из Токио или Осаки (\"なんでやねん！それ直訳ロボットやん！\"), разбор сложных моментов и запуск практики письма на экране",
      "openingGreetingTranslation": "Йоу, ну наконец-то ты здесь! Если будешь говорить сухим дословным языком из учебника, я тут же тебя подколю! А если серьёзно, какая часть японского в FIEZEL даётся тебе сложнее всего в последнее время?"
    },
    "xiao_mochi": {
      "role": "Наставник по пекинскому сленгу и мандаринскому · Настоящий акцент 京味儿, меткий сарказм и острота",
      "personalityTag": "Сарказм с перчинкой · Настоящий пекинский акцент",
      "roastStyle": "Классические пекинские подколки каждый раз, когда плывут тоны (mǎi и mài) или к каждому существительному лепят 个 (\"哎哟喂，停一下！\"), плюс мгновенное всплывающее окно для практики!",
      "openingGreetingTranslation": "Айо, ну наконец-то ты добрался! Забудь про заученную учебную интонацию — если у тебя поплывут тоны, я поймаю это на месте! Скажи честно, от какой части мандаринского у тебя в последнее время больше всего болит голова?"
    },
    "cambridge_examiner": {
      "role": "Старший кембриджский экзаменатор IELTS · Строгий формат, моментальные исправления и стандарт Band 8.5–9.0",
      "personalityTag": "Точный кембриджский экзаменатор · Моделирование фраз уровня Band 9.0",
      "roastStyle": "Мгновенная коррекция на месте: точечный разбор синтаксических и лексических ошибок в одном предложении и сразу эталонный вариант уровня Band 9.0",
      "openingGreetingTranslation": "Доброе утро. Это модуль Speaking экзамена IELTS. Я доктор Алистер Вэнс, ваш сегодняшний старший экзаменатор. Могу я уточнить ваше полное имя?"
    },
    "dr_julian": {
      "role": "Официальный экзаменатор и мастер-тренер PTE Academic · Официальный стиль, строгая дисциплина, без поблажек и целевой стандарт 42–58+",
      "personalityTag": "Строгий экзаменатор PTE · Система формул и официальный отчёт о баллах",
      "roastStyle": "Жёсткая дисциплина без запинок: моментально снимает баллы за паузы >3 с или падение беглости (штраф за беглость) и требует отработки слов с неверным произношением",
      "openingGreetingTranslation": "Добро пожаловать на мастер-тренинг PTE Academic. Я доктор Джулиан. На экзамене Pearson заминки обрушивают ваш балл. Сегодня мы определим ваш исходный уровень: какой целевой балл PTE вам нужен и сдавали ли вы этот экзамен раньше?"
    },
    "ssw_sensei": {
      "role": "Эксперт-наставник SSW по пищевому производству (OTAFF Ver 5.1 Apr 2026 и Wakai Papa Pro) — двуязычное обучение (индонезийский + официальные японские термины)",
      "personalityTag": "Официальный наставник SSW · OTAFF Ver 5.1 + Wakai Papa Pro",
      "roastStyle": "Тёплый, открытый и терпеливый, как старший брат-наставник Wakai Papa: объясняет с нуля не спеша, на жизненных примерах, разбирает по одному шагу до полного понимания — никакой зубрёжки сухого текста из PDF!",
      "openingGreetingTranslation": "Тёплое приветствие от SSW SENSEI: готов шаг за шагом провести полных новичков с 1-й страницы до уверенной сдачи CBT >= 65% (OTAFF Ver 5.1 Apr 2026)."
    }
  }
};

export const VS_BC_COMPETENCY_LABELS: Partial<Record<LearnerLocale, Record<string, string>>> = {
  "en": {
    "vocab_daily_a2": "Daily Vocabulary & Routine Activities (En)",
    "vocab_travel_a2": "Travel & Past Experiences Vocabulary (En)",
    "vocab_academic_b1": "Discussion & Professional Work Vocabulary (En)",
    "vocab_ja_cafe_n5": "Japanese Café & Basic Ordering Vocabulary",
    "vocab_ja_campus_n4": "Japanese Campus Life & Consultation Vocabulary",
    "speak_en_a2_cafe": "Polite Transaction Speaking (Would like) & Present Continuous",
    "speak_en_a2_past_trip": "Past Narrative Speaking & Irregular Past Verbs",
    "speak_en_b1_job_interview": "Job Interview Speaking & Present Perfect Experience",
    "speak_en_b2_ielts_part3": "Structured Argumentation Speaking & Complex Clauses (Although/Whereas)",
    "speak_en_free_talk": "Spontaneous Free-Conversation Speaking (En)",
    "speak_ja_n5_kissaten": "Polite Ordering Kaiwa (～をください) & Object Particle を",
    "speak_ja_n4_senpai_advice": "Consultation Kaiwa (～たらいいですか) & Action Particles で vs に",
    "speak_ja_free_talk": "Spontaneous Natural Japanese Chat Kaiwa",
    "jp-n5-particles-wa-ga": "Basic Particles は / が / を",
    "jp-n5-verb-masu": "Polite Verb Conjugation (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "い & な Adjectives (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "Conditional & Advice Patterns (〜たら / 〜ば)",
    "en-a2-past-simple": "Simple Past Tense & Irregular Verbs (V2)",
    "en-a2-present-continuous": "Present Continuous & Stative Verbs",
    "en-b1-present-perfect": "Present Perfect & Work Experience"
  },
  "ms": {
    "vocab_daily_a2": "Kosa Kata Harian & Aktiviti Rutin (En)",
    "vocab_travel_a2": "Kosa Kata Perjalanan & Pengalaman Lalu (En)",
    "vocab_academic_b1": "Kosa Kata Perbincangan & Kerja Profesional (En)",
    "vocab_ja_cafe_n5": "Kosa Kata Kafe & Pesanan Asas Bahasa Jepun",
    "vocab_ja_campus_n4": "Kosa Kata Kehidupan Kampus & Rundingan Bahasa Jepun",
    "speak_en_a2_cafe": "Pertuturan Transaksi Sopan (Would like) & Present Continuous",
    "speak_en_a2_past_trip": "Pertuturan Naratif Masa Lalu & Kata Kerja Masa Lalu Tidak Sekata",
    "speak_en_b1_job_interview": "Pertuturan Temu Duga Kerja & Pengalaman Present Perfect",
    "speak_en_b2_ielts_part3": "Pertuturan Penghujahan Berstruktur & Klausa Kompleks (Although/Whereas)",
    "speak_en_free_talk": "Pertuturan Perbualan Bebas Spontan (En)",
    "speak_ja_n5_kissaten": "Kaiwa Pesanan Sopan (～をください) & Partikel Objek を",
    "speak_ja_n4_senpai_advice": "Kaiwa Rundingan (～たらいいですか) & Partikel Tindakan で vs に",
    "speak_ja_free_talk": "Kaiwa Sembang Bahasa Jepun Semula Jadi Spontan",
    "jp-n5-particles-wa-ga": "Partikel Asas は / が / を",
    "jp-n5-verb-masu": "Konjugasi Kata Kerja Sopan (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "Kata Sifat い & な (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "Pola Syarat & Nasihat (〜たら / 〜ば)",
    "en-a2-past-simple": "Simple Past Tense & Kata Kerja Tidak Sekata (V2)",
    "en-a2-present-continuous": "Present Continuous & Kata Kerja Statif",
    "en-b1-present-perfect": "Present Perfect & Pengalaman Kerja"
  },
  "vi": {
    "vocab_daily_a2": "Từ vựng Hằng ngày & Hoạt động Thường nhật (En)",
    "vocab_travel_a2": "Từ vựng Du lịch & Trải nghiệm Quá khứ (En)",
    "vocab_academic_b1": "Từ vựng Thảo luận & Công việc Chuyên nghiệp (En)",
    "vocab_ja_cafe_n5": "Từ vựng Quán cà phê & Gọi món Cơ bản Tiếng Nhật",
    "vocab_ja_campus_n4": "Từ vựng Đời sống Học đường & Tham khảo Ý kiến Tiếng Nhật",
    "speak_en_a2_cafe": "Luyện nói Giao dịch Lịch sự (Would like) & Thì Hiện tại Tiếp diễn",
    "speak_en_a2_past_trip": "Luyện nói Kể chuyện Quá khứ & Động từ Quá khứ Bất quy tắc",
    "speak_en_b1_job_interview": "Luyện nói Phỏng vấn Xin việc & Kinh nghiệm với Thì Hiện tại Hoàn thành",
    "speak_en_b2_ielts_part3": "Luyện nói Lập luận Có cấu trúc & Mệnh đề Phức (Although/Whereas)",
    "speak_en_free_talk": "Luyện nói Hội thoại Tự do Ngẫu hứng (En)",
    "speak_ja_n5_kissaten": "Kaiwa Gọi món Lịch sự (～をください) & Trợ từ Tân ngữ を",
    "speak_ja_n4_senpai_advice": "Kaiwa Xin lời khuyên (～たらいいですか) & Trợ từ Hành động で vs に",
    "speak_ja_free_talk": "Kaiwa Trò chuyện Tiếng Nhật Tự nhiên Ngẫu hứng",
    "jp-n5-particles-wa-ga": "Trợ từ Cơ bản は / が / を",
    "jp-n5-verb-masu": "Chia Động từ Thể Lịch sự (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "Tính từ Đuôi い & な (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "Mẫu câu Điều kiện & Lời khuyên (〜たら / 〜ば)",
    "en-a2-past-simple": "Thì Quá khứ Đơn & Động từ Bất quy tắc (V2)",
    "en-a2-present-continuous": "Thì Hiện tại Tiếp diễn & Động từ Trạng thái",
    "en-b1-present-perfect": "Thì Hiện tại Hoàn thành & Kinh nghiệm Làm việc"
  },
  "fil": {
    "vocab_daily_a2": "Pang-araw-araw na Bokabularyo at mga Gawaing Rutina (En)",
    "vocab_travel_a2": "Bokabularyo sa Paglalakbay at mga Nakaraang Karanasan (En)",
    "vocab_academic_b1": "Bokabularyo sa Talakayan at Propesyonal na Trabaho (En)",
    "vocab_ja_cafe_n5": "Bokabularyo sa Japanese Café at Pangunahing Pag-order",
    "vocab_ja_campus_n4": "Bokabularyo sa Buhay-Kampus sa Japan at Konsultasyon",
    "speak_en_a2_cafe": "Magalang na Pagsasalita sa Transaksyon (Would like) at Present Continuous",
    "speak_en_a2_past_trip": "Pagsasalaysay ng Nakaraan at mga Irregular Past Verb",
    "speak_en_b1_job_interview": "Pagsasalita sa Job Interview at Present Perfect para sa Karanasan",
    "speak_en_b2_ielts_part3": "Nakabalangkas na Pangangatwiran at mga Complex Clause (Although/Whereas)",
    "speak_en_free_talk": "Spontaneous na Malayang Pakikipag-usap (En)",
    "speak_ja_n5_kissaten": "Magalang na Pag-order sa Kaiwa (～をください) at Object Particle na を",
    "speak_ja_n4_senpai_advice": "Kaiwa sa Konsultasyon (～たらいいですか) at mga Action Particle na で vs に",
    "speak_ja_free_talk": "Spontaneous at Natural na Pakikipagkuwentuhang Japanese Kaiwa",
    "jp-n5-particles-wa-ga": "Mga Pangunahing Particle na は / が / を",
    "jp-n5-verb-masu": "Magalang na Pagbabanghay ng Pandiwa (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "Mga Pang-uring い at な (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "Mga Padron ng Kondisyon at Payo (〜たら / 〜ば)",
    "en-a2-past-simple": "Simple Past Tense at mga Irregular Verb (V2)",
    "en-a2-present-continuous": "Present Continuous at mga Stative Verb",
    "en-b1-present-perfect": "Present Perfect at Karanasan sa Trabaho"
  },
  "ja": {
    "vocab_daily_a2": "日常語彙・毎日の習慣（英語）",
    "vocab_travel_a2": "旅行・過去の経験の語彙（英語）",
    "vocab_academic_b1": "ディスカッション・ビジネスの語彙（英語）",
    "vocab_ja_cafe_n5": "日本のカフェ・基本注文の語彙",
    "vocab_ja_campus_n4": "日本のキャンパスライフ・相談の語彙",
    "speak_en_a2_cafe": "丁寧な注文・取引のスピーキング（Would like）と現在進行形",
    "speak_en_a2_past_trip": "過去の出来事を話すスピーキングと不規則過去動詞",
    "speak_en_b1_job_interview": "就職面接のスピーキングと現在完了形（経験）",
    "speak_en_b2_ielts_part3": "論理的な主張のスピーキングと複文（Although/Whereas）",
    "speak_en_free_talk": "即興フリートーク・スピーキング（英語）",
    "speak_ja_n5_kissaten": "丁寧な注文の会話（～をください）と目的格の助詞「を」",
    "speak_ja_n4_senpai_advice": "相談の会話（～たらいいですか）と動作の助詞「で」vs「に」",
    "speak_ja_free_talk": "自然で即興的な日本語フリートーク会話",
    "jp-n5-particles-wa-ga": "基本の助詞 は / が / を",
    "jp-n5-verb-masu": "動詞の丁寧形活用（〜ます / 〜ました）",
    "jp-n5-adjective-desu": "い形容詞・な形容詞（〜いです / 〜かったです）",
    "jp-n4-tara-conditional": "条件・助言の文型（〜たら / 〜ば）",
    "en-a2-past-simple": "一般過去形と不規則動詞（V2）",
    "en-a2-present-continuous": "現在進行形と状態動詞",
    "en-b1-present-perfect": "現在完了形と職務経験"
  },
  "km": {
    "vocab_daily_a2": "វាក្យសព្ទប្រចាំថ្ងៃ និងសកម្មភាពទម្លាប់ (En)",
    "vocab_travel_a2": "វាក្យសព្ទការធ្វើដំណើរ និងបទពិសោធន៍អតីតកាល (En)",
    "vocab_academic_b1": "វាក្យសព្ទការពិភាក្សា និងការងារវិជ្ជាជីវៈ (En)",
    "vocab_ja_cafe_n5": "វាក្យសព្ទហាងកាហ្វេជប៉ុន និងការកុម្ម៉ង់មូលដ្ឋាន",
    "vocab_ja_campus_n4": "វាក្យសព្ទជីវិតក្នុងបរិវេណសាលាជប៉ុន និងការពិគ្រោះយោបល់",
    "speak_en_a2_cafe": "ការនិយាយទំនាក់ទំនងគួរសម (Would like) និងកាល Present Continuous",
    "speak_en_a2_past_trip": "ការនិយាយរៀបរាប់អតីតកាល និងកិរិយាសព្ទអតីតកាលមិនទៀងទាត់",
    "speak_en_b1_job_interview": "ការនិយាយសម្ភាសន៍ការងារ និងបទពិសោធន៍ក្នុងកាល Present Perfect",
    "speak_en_b2_ielts_part3": "ការនិយាយលើកហេតុផលមានរចនាសម្ព័ន្ធ និងឃ្លាសាំញ៉ាំ (Although/Whereas)",
    "speak_en_free_talk": "ការនិយាយសន្ទនាសេរីដោយឯកឯង (En)",
    "speak_ja_n5_kissaten": "សន្ទនា Kaiwa ការកុម្ម៉ង់គួរសម (～をください) និងពាក្យភ្ជាប់កម្មបទ を",
    "speak_ja_n4_senpai_advice": "សន្ទនា Kaiwa ការពិគ្រោះយោបល់ (～たらいいですか) និងពាក្យភ្ជាប់សកម្មភាព で ទល់នឹង に",
    "speak_ja_free_talk": "សន្ទនា Kaiwa ភាសាជប៉ុនបែបធម្មជាតិដោយឯកឯង",
    "jp-n5-particles-wa-ga": "ពាក្យភ្ជាប់មូលដ្ឋាន は / が / を",
    "jp-n5-verb-masu": "ការបំបែកកិរិយាសព្ទបែបគួរសម (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "គុណនាម い និង な (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "ទម្រង់លក្ខខណ្ឌ និងការផ្តល់ដំបូន្មាន (〜たら / 〜ば)",
    "en-a2-past-simple": "កាល Simple Past Tense និងកិរិយាសព្ទមិនទៀងទាត់ (V2)",
    "en-a2-present-continuous": "កាល Present Continuous និងកិរិយាសព្ទបង្ហាញសភាព",
    "en-b1-present-perfect": "កាល Present Perfect និងបទពិសោធន៍ការងារ"
  },
  "ru": {
    "vocab_daily_a2": "Повседневная лексика и рутинные дела (En)",
    "vocab_travel_a2": "Лексика о путешествиях и прошлом опыте (En)",
    "vocab_academic_b1": "Лексика для дискуссий и профессиональной работы (En)",
    "vocab_ja_cafe_n5": "Японский: лексика для кафе и базового заказа",
    "vocab_ja_campus_n4": "Японский: лексика университетской жизни и консультаций",
    "speak_en_a2_cafe": "Разговорная практика: вежливые заказы (Would like) и Present Continuous",
    "speak_en_a2_past_trip": "Разговорная практика: рассказ о прошлом и неправильные глаголы в прошедшем времени",
    "speak_en_b1_job_interview": "Разговорная практика: собеседование и опыт в Present Perfect",
    "speak_en_b2_ielts_part3": "Разговорная практика: структурированная аргументация и сложные придаточные (Although/Whereas)",
    "speak_en_free_talk": "Спонтанная свободная беседа (En)",
    "speak_ja_n5_kissaten": "Разговорная практика (Kaiwa): вежливый заказ (～をください) и частица прямого дополнения を",
    "speak_ja_n4_senpai_advice": "Разговорная практика (Kaiwa): вопрос-совет (～たらいいですか) и частицы действия で и に",
    "speak_ja_free_talk": "Спонтанная естественная беседа на японском (Kaiwa)",
    "jp-n5-particles-wa-ga": "Базовые частицы は / が / を",
    "jp-n5-verb-masu": "Вежливое спряжение глаголов (〜ます / 〜ました)",
    "jp-n5-adjective-desu": "Прилагательные на い и な (〜いです / 〜かったです)",
    "jp-n4-tara-conditional": "Условные конструкции и советы (〜たら / 〜ば)",
    "en-a2-past-simple": "Простое прошедшее время и неправильные глаголы (V2)",
    "en-a2-present-continuous": "Present Continuous и глаголы состояния",
    "en-b1-present-perfect": "Present Perfect и рабочий опыт"
  }
};

export const VS_BC_MISCONCEPTION_LABELS: Partial<Record<LearnerLocale, Record<string, { label: string; tip: string }>>> = {
  "en": {
    "polite_past_masu_deshita": {
      "label": "Combining ～ます + でした for the past tense (e.g. ×食べますでした)",
      "tip": "Use the ～ました form directly (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "Attaching です directly after dictionary-form verbs (×行くです / ×飲むです)",
      "tip": "Conjugate to ～ます (polite) or use pure casual form without です"
    },
    "i_adj_past_deshita": {
      "label": "Forming past tense of い-adjectives with でした (×美味しいでした / ×いいでした)",
      "tip": "Change the ending い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "Confusing the action-location particle で with に (×図書館に勉強する)",
      "tip": "The location where an active action takes place MUST use で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "Action-Location Particles (で vs に), ×図書館に勉強する",
      "tip": "The location where an active action takes place MUST use で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "Forgetting or misusing the direct-object particle を when requesting/ordering",
      "tip": "Place を between the noun and the verb/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "Attaching ～たら directly to dictionary-form verbs (×勉強するたら)",
      "tip": "Change to the past た-form first, then add ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "Repeating 私は (watashi wa) at the start of every sentence like a stiff textbook",
      "tip": "Drop 私は when the subject is already clear from conversation context"
    },
    "stative_verb_continuous": {
      "label": "Putting to be (am/is/are) before base/stative verbs (×I am want / ×I am agree / ×I'm think)",
      "tip": "Go straight to subject + active verb (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "Mixing to be (am/is/are) with base verbs (×I am agree / ×It is look)",
      "tip": "Remove am/is/are and conjugate the verb properly (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "Forgetting the auxiliary am/is/are before V-ing (×I meeting my friend)",
      "tip": "Include \"to be\" before V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "Wrong irregular verb past form or missing V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "Use the correct irregular V2 form (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "Using the present-tense verb form (V1) for past events",
      "tip": "Change the verb to Simple Past V2 when talking about the past"
    },
    "double_conjunction_although_but": {
      "label": "Double conjunction \"Although ... but ...\" in one sentence",
      "tip": "Use \"Although [clause 1], [clause 2]\" WITHOUT \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "Using the pronoun \"mine\" before a noun (×mine job)",
      "tip": "Use the possessive determiner \"my\" before a noun (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "Wrong preposition paired with the adjective (×similar with)",
      "tip": "The fixed pairing is \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "Adding \"to\" after modal verbs can/will/must/should (×can to go)",
      "tip": "Modal verbs are followed directly by a bare infinitive (✓can go / ✓should try)"
    }
  },
  "th": {
    "polite_past_masu_deshita": {
      "label": "ใช้ ～ます + でした ซ้อนกันในรูปอดีต (เช่น ×食べますでした)",
      "tip": "ใช้รูป ～ました โดยตรงได้เลย (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "วาง です ต่อท้ายกริยารูปพจนานุกรมโดยตรง (×行くです / ×飲むです)",
      "tip": "ผันเป็นรูป ～ます (สุภาพ) หรือใช้รูปกันเองล้วนๆ โดยไม่ต้องใส่ です"
    },
    "i_adj_past_deshita": {
      "label": "ผันคำคุณศัพท์ -い รูปอดีตด้วย でした (×美味しいでした)",
      "tip": "เปลี่ยนคำลงท้าย い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "สับสนคำช่วยสถานที่ทำกิจกรรม で กับ に (×図書館に勉強する)",
      "tip": "สถานที่ที่มีการกระทำเกิดขึ้นต้องใช้คำช่วย で เสมอ (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "คำช่วยสถานที่ทำกิจกรรม (で vs に), ×図書館に勉強する",
      "tip": "สถานที่ที่มีการกระทำเกิดขึ้นต้องใช้คำช่วย で เสมอ (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "ตกหล่นหรือใช้คำช่วยกรรมตรง を ผิดเมื่อสั่งของ",
      "tip": "วาง を ไว้ระหว่างคำนามกับคำกริยาหรือ ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "เติม ～たら ต่อท้ายกริยารูปพจนานุกรมโดยตรง (×勉強するたら)",
      "tip": "ผันเป็นรูปอดีต (た-form) ก่อน แล้วค่อยเติม ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "พูด 私は (watashi wa) ซ้ำทุกประโยคจนฟังดูแข็งทื่อ",
      "tip": "ละคำว่า 私は ออกได้เมื่อบริบทการสนทนาชัดเจนอยู่แล้วว่าประธานคือใคร"
    },
    "stative_verb_continuous": {
      "label": "ใส่ Verb to be หน้ากริยาพื้นฐานหรือกริยาบอกสถานะ (×I am want / ×I am agree)",
      "tip": "ใช้โครงสร้างประธาน + กริยาแสดงการกระทำโดยตรงได้เลย (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "ใช้ Verb to be คู่กับกริยาช่อง 1 โดยตรง (×I am agree / ×It is look)",
      "tip": "ตัด am/is/are ออก แล้วผันคำกริยาให้ถูกต้อง (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "ลืม am/is/are หน้ากริยาเติม -ing (×I meeting my friend)",
      "tip": "ต้องใส่ \"to be\" หน้า V-ing ด้วย (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "ผันกริยาช่อง 2 แบบไม่ปกติผิด หรือลืมผันรูปอดีต (×goed / ×eat yesterday)",
      "tip": "ใช้รูปกริยา V2 แบบไม่ปกติ (irregular) ให้ถูกต้อง (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "ใช้กริยาช่อง 1 กับเหตุการณ์ที่จบไปแล้วในอดีต",
      "tip": "เปลี่ยนคำกริยาเป็น Simple Past V2 เมื่อพูดถึงเรื่องในอดีต"
    },
    "double_conjunction_although_but": {
      "label": "ใช้คำเชื่อมซ้ำซ้อน \"Although ... but ...\" ในประโยคเดียวกัน",
      "tip": "ใช้โครงสร้าง \"Although [clause 1], [clause 2]\" โดยไม่ต้องมี \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "ใช้ \"mine\" นำหน้าคำนามโดยตรง (×mine job)",
      "tip": "ใช้คำแสดงความเป็นเจ้าของ \"my\" นำหน้าคำนาม (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "ใช้บุพบทคู่กับ similar ผิด (×similar with)",
      "tip": "คู่คำที่ใช้ประจำคือ \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "เติม \"to\" หลังกริยาช่วย can/will/must/should (×can to go)",
      "tip": "หลัง Modal verbs ต้องตามด้วยกริยาไม่ผัน (bare infinitive) ทันที (✓can go / ✓should try)"
    }
  },
  "ms": {
    "polite_past_masu_deshita": {
      "label": "Menggabungkan ～ます + でした untuk kala lampau (cth. ×食べますでした)",
      "tip": "Gunakan bentuk ～ました secara terus (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "Meletakkan です terus selepas kata kerja bentuk kamus (×行くです / ×飲むです)",
      "tip": "Tukarkan kepada ～ます (sopan) atau gunakan bentuk kasual tulen tanpa です"
    },
    "i_adj_past_deshita": {
      "label": "Membentuk kala lampau bagi kata sifat-い dengan でした (×美味しいでした / ×いいでした)",
      "tip": "Tukarkan akhiran い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "Mengelirukan partikel lokasi tindakan で dengan に (×図書館に勉強する)",
      "tip": "Lokasi tempat tindakan aktif berlaku MESTI menggunakan で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "Partikel Lokasi Tindakan (で vs に), ×図書館に勉強する",
      "tip": "Lokasi tempat tindakan aktif berlaku MESTI menggunakan で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "Terlupa atau tersalah guna partikel objek langsung を semasa meminta/memesan",
      "tip": "Letakkan を di antara kata nama dan kata kerja/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "Meletakkan ～たら terus pada kata kerja bentuk kamus (×勉強するたら)",
      "tip": "Tukarkan kepada bentuk lampau た dahulu, kemudian tambah ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "Mengulang 私は (watashi wa) pada permulaan setiap ayat seperti buku teks yang kaku",
      "tip": "Gugurkan 私は apabila subjek sudah jelas daripada konteks perbualan"
    },
    "stative_verb_continuous": {
      "label": "Meletakkan to be (am/is/are) sebelum kata kerja dasar/statif (×I am want / ×I am agree / ×I'm think)",
      "tip": "Terus gunakan subjek + kata kerja aktif (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "Mencampurkan to be (am/is/are) dengan kata kerja dasar (×I am agree / ×It is look)",
      "tip": "Buang am/is/are dan konjugasikan kata kerja dengan betul (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "Terlupa kata bantu am/is/are sebelum V-ing (×I meeting my friend)",
      "tip": "Sertakan \"to be\" sebelum V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "Bentuk lampau kata kerja tidak sekata yang salah atau tertinggal V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "Gunakan bentuk V2 tidak sekata yang betul (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "Menggunakan bentuk kata kerja kala kini (V1) untuk peristiwa masa lalu",
      "tip": "Tukarkan kata kerja kepada Simple Past V2 apabila bercakap tentang masa lalu"
    },
    "double_conjunction_although_but": {
      "label": "Kata hubung berganda \"Although ... but ...\" dalam satu ayat",
      "tip": "Gunakan \"Although [klausa 1], [klausa 2]\" TANPA \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "Menggunakan kata ganti nama \"mine\" sebelum kata nama (×mine job)",
      "tip": "Gunakan kata penentu milik \"my\" sebelum kata nama (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "Kata sendi nama yang salah digandingkan dengan kata adjektif (×similar with)",
      "tip": "Gandingan tetapnya ialah \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "Menambah \"to\" selepas kata kerja modal can/will/must/should (×can to go)",
      "tip": "Kata kerja modal diikuti terus oleh infinitif tanpa \"to\" (✓can go / ✓should try)"
    }
  },
  "vi": {
    "polite_past_masu_deshita": {
      "label": "Ghép ～ます + でした để chia thì quá khứ (ví dụ: ×食べますでした)",
      "tip": "Dùng trực tiếp dạng ～ました (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "Gắn です trực tiếp sau động từ thể từ điển (×行くです / ×飲むです)",
      "tip": "Chia sang ～ます (lịch sự) hoặc dùng thẳng thể thông thường không kèm です"
    },
    "i_adj_past_deshita": {
      "label": "Chia thì quá khứ cho tính từ đuôi い bằng でした (×美味しいでした / ×いいでした)",
      "tip": "Đổi đuôi い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "Nhầm lẫn trợ từ chỉ địa điểm diễn ra hành động で với に (×図書館に勉強する)",
      "tip": "Địa điểm diễn ra một hành động chủ động BẮT BUỘC phải dùng で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "Trợ từ Chỉ Địa điểm Hành động (で vs に), ×図書館に勉強する",
      "tip": "Địa điểm diễn ra một hành động chủ động BẮT BUỘC phải dùng で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "Quên hoặc dùng sai trợ từ tân ngữ trực tiếp を khi yêu cầu/gọi món",
      "tip": "Đặt を vào giữa danh từ và động từ/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "Gắn ～たら trực tiếp vào động từ thể từ điển (×勉強するたら)",
      "tip": "Chuyển sang thể quá khứ た trước, rồi mới thêm ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "Lặp đi lặp lại 私は (watashi wa) ở đầu mọi câu như sách giáo khoa cứng nhắc",
      "tip": "Lược bỏ 私は khi chủ ngữ đã rõ ràng qua ngữ cảnh hội thoại"
    },
    "stative_verb_continuous": {
      "label": "Đặt động từ to be (am/is/are) trước động từ nguyên mẫu/trạng thái (×I am want / ×I am agree / ×I'm think)",
      "tip": "Đi thẳng vào chủ ngữ + động từ chính (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "Trộn lẫn to be (am/is/are) với động từ nguyên mẫu (×I am agree / ×It is look)",
      "tip": "Bỏ am/is/are và chia động từ cho đúng (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "Quên trợ động từ am/is/are trước V-ing (×I meeting my friend)",
      "tip": "Nhớ thêm \"to be\" trước V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "Chia sai dạng quá khứ của động từ bất quy tắc hoặc thiếu V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "Dùng đúng dạng V2 bất quy tắc (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "Dùng dạng động từ thì hiện tại (V1) cho các sự kiện trong quá khứ",
      "tip": "Chuyển động từ sang Quá khứ Đơn V2 khi nói về quá khứ"
    },
    "double_conjunction_although_but": {
      "label": "Dùng lặp liên từ \"Although ... but ...\" trong cùng một câu",
      "tip": "Dùng \"Although [mệnh đề 1], [mệnh đề 2]\" KHÔNG có \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "Dùng đại từ \"mine\" trước danh từ (×mine job)",
      "tip": "Dùng từ hạn định sở hữu \"my\" trước danh từ (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "Sai giới từ đi kèm với tính từ (×similar with)",
      "tip": "Cụm từ cố định là \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "Thêm \"to\" sau các động từ khiếm khuyết can/will/must/should (×can to go)",
      "tip": "Sau động từ khiếm khuyết là động từ nguyên mẫu không \"to\" (✓can go / ✓should try)"
    }
  },
  "fil": {
    "polite_past_masu_deshita": {
      "label": "Pagdugtong ng ～ます + でした para sa past tense (hal. ×食べますでした)",
      "tip": "Gamitin nang direkta ang anyong ～ました (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "Pagkakabit ng です nang direkta pagkatapos ng dictionary-form na pandiwa (×行くです / ×飲むです)",
      "tip": "Ibanghay sa ～ます (magalang) o gumamit ng purong kaswal na anyo nang walang です"
    },
    "i_adj_past_deshita": {
      "label": "Pagbuo ng past tense ng mga pang-uring い gamit ang でした (×美味しいでした / ×いいでした)",
      "tip": "Palitan ang dulo na い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "Pagkalito sa particle ng lugar ng kilos na で at に (×図書館に勉強する)",
      "tip": "Ang lugar kung saan ginagawa ang isang aktibong kilos ay DAPAT gumamit ng で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "Mga Particle ng Lugar ng Kilos (で vs に), ×図書館に勉強する",
      "tip": "Ang lugar kung saan ginagawa ang isang aktibong kilos ay DAPAT gumamit ng で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "Pagkalimot o maling paggamit ng direct-object particle na を kapag humihiling o umoorder",
      "tip": "Ilagay ang を sa pagitan ng pangngalan at pandiwa/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "Pagkakabit ng ～たら nang direkta sa dictionary-form na pandiwa (×勉強するたら)",
      "tip": "Palitan muna sa past た-form, saka idagdag ang ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "Paulit-ulit na paggamit ng 私は (watashi wa) sa simula ng bawat pangungusap na parang matigas na textbook",
      "tip": "Alisin ang 私は kapag malinaw na ang simuno mula sa konteksto ng usapan"
    },
    "stative_verb_continuous": {
      "label": "Paglalagay ng to be (am/is/are) bago ang base/stative verb (×I am want / ×I am agree / ×I'm think)",
      "tip": "Dumiretso na sa simuno + pandiwang aktibo (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "Paghahalo ng to be (am/is/are) sa mga base verb (×I am agree / ×It is look)",
      "tip": "Alisin ang am/is/are at ibanghay nang tama ang pandiwa (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "Pagkalimot sa pantulong na am/is/are bago ang V-ing (×I meeting my friend)",
      "tip": "Isama ang \"to be\" bago ang V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "Maling past form ng irregular verb o kulang na V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "Gamitin ang tamang irregular V2 form (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "Paggamit ng anyong present-tense ng pandiwa (V1) para sa mga nakaraang pangyayari",
      "tip": "Palitan ang pandiwa ng Simple Past V2 kapag pinag-uusapan ang nakaraan"
    },
    "double_conjunction_although_but": {
      "label": "Dobleng pangatnig na \"Although ... but ...\" sa iisang pangungusap",
      "tip": "Gamitin ang \"Although [clause 1], [clause 2]\" NANG WALANG \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "Paggamit ng panghalip na \"mine\" bago ang pangngalan (×mine job)",
      "tip": "Gamitin ang possessive determiner na \"my\" bago ang pangngalan (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "Maling pang-ukol ang ipinares sa pang-uri (×similar with)",
      "tip": "Ang nakatakdang pares ay \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "Pagdaragdag ng \"to\" pagkatapos ng mga modal verb na can/will/must/should (×can to go)",
      "tip": "Direktang sinusundan ng bare infinitive ang mga modal verb (✓can go / ✓should try)"
    }
  },
  "ja": {
    "polite_past_masu_deshita": {
      "label": "過去形を作る際に「～ます + でした」を組み合わせてしまう（例：×食べますでした）",
      "tip": "直接「～ました」の形を使います（✓食べました / ✓行きました）"
    },
    "verb_plus_desu": {
      "label": "動詞の辞書形の直後に「です」をつけてしまう（×行くです / ×飲むです）",
      "tip": "「～ます」（丁寧形）に活用するか、「です」をつけずに普通形そのままを使います"
    },
    "i_adj_past_deshita": {
      "label": "い形容詞の過去形を「でした」で作ってしまう（×美味しいでした / ×いいでした）",
      "tip": "語尾の「い → かったです」に変えます（✓美味しかったです / ✓よかったです）"
    },
    "particle_confusion_ni_de": {
      "label": "動作を行う場所の助詞「で」と「に」を混同している（×図書館に勉強する）",
      "tip": "積極的な動作が行われる場所には必ず「で」を使います（✓図書館で勉強する）"
    },
    "ja_particle_ni_for_action_place": {
      "label": "動作の場所を表す助詞（で vs に）、×図書館に勉強する",
      "tip": "積極的な動作が行われる場所には必ず「で」を使います（✓図書館で勉強する）"
    },
    "particle_o_missing": {
      "label": "依頼・注文をするときに目的語の助詞「を」を忘れたり誤用したりしている",
      "tip": "名詞と動詞／「ください」の間に「を」を置きます（✓コーヒーをください）"
    },
    "tara_conditional_conjugation": {
      "label": "動詞の辞書形に直接「～たら」をつけてしまう（×勉強するたら）",
      "tip": "まず過去の「た形」に変えてから「ら」をつけます（✓勉強したら / ✓行ったら）"
    },
    "overuse_watashi_wa": {
      "label": "堅苦しい教科書のように、毎文の冒頭で「私は (watashi wa)」を繰り返してしまう",
      "tip": "会話の文脈から主語が明らかなときは「私は」を省略します"
    },
    "stative_verb_continuous": {
      "label": "原形動詞・状態動詞の前に to be (am/is/are) を置いてしまう（×I am want / ×I am agree / ×I'm think）",
      "tip": "主語 + 動詞をそのまま続けます（✓I'd like / ✓I agree / ✓I think）"
    },
    "be_plus_base_verb": {
      "label": "to be (am/is/are) と原形動詞を混ぜてしまう（×I am agree / ×It is look）",
      "tip": "am/is/areを削除し、動詞を正しく活用してください（✓I agree / ✓It looks）"
    },
    "missing_be_auxiliary_continuous": {
      "label": "V-ingの前に助動詞am/is/areを忘れています（×I meeting my friend）",
      "tip": "V-ingの前に「to be」を入れてください（✓I am meeting my friend）"
    },
    "past_tense_irregular_goed": {
      "label": "不規則動詞の過去形が誤っているか、過去形（V2）が使われていません（×goed / ×buyed / ×eat yesterday）",
      "tip": "正しい不規則動詞の過去形（V2）を使ってください（✓went / ✓bought / ✓ate / ✓took）"
    },
    "unconjugated_past_verb": {
      "label": "過去の出来事に対して現在形の動詞（V1）を使っています",
      "tip": "過去について話すときは、動詞を過去形（Simple Past V2）に変えてください"
    },
    "double_conjunction_although_but": {
      "label": "1つの文で接続詞「Although ... but ...」を重複して使っています",
      "tip": "「but」を使わずに「Although [clause 1], [clause 2]」の形を使ってください"
    },
    "possessive_pronoun_mine_noun": {
      "label": "名詞の前に代名詞「mine」を使っています（×mine job）",
      "tip": "名詞の前に所有限定詞「my」を使ってください（✓my job）"
    },
    "preposition_collocation_similar_with": {
      "label": "形容詞と組み合わせる前置詞が誤っています（×similar with）",
      "tip": "決まった組み合わせは「similar to」です（✓similar to）"
    },
    "modal_plus_to_infinitive": {
      "label": "法助動詞（can/will/must/should）の後に「to」を付けています（×can to go）",
      "tip": "法助動詞の直後には原形不定詞（toなしの動詞の原形）が続きます（✓can go / ✓should try）"
    }
  },
  "km": {
    "polite_past_masu_deshita": {
      "label": "ការផ្សំ ～ます + でした សម្រាប់កាលអតីតកាល (ឧ. ×食べますでした)",
      "tip": "ប្រើទម្រង់ ～ました ដោយផ្ទាល់ (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "ការភ្ជាប់ です ដោយផ្ទាល់នៅពីក្រោយកិរិយាសព្ទទម្រង់វចនានុក្រម (×行くです / ×飲むです)",
      "tip": "បំបែកទៅជា ～ます (បែបគួរសម) ឬប្រើទម្រង់ធម្មតាសុទ្ធដោយគ្មាន です"
    },
    "i_adj_past_deshita": {
      "label": "ការបង្កើតកាលអតីតកាលនៃគុណនាម い ជាមួយ でした (×美味しいでした / ×いいでした)",
      "tip": "ប្តូរពាក្យខាងចុង い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "ការច្រឡំពាក្យភ្ជាប់ទីតាំងសកម្មភាព で ជាមួយ に (×図書館に勉強する)",
      "tip": "ទីតាំងដែលសកម្មភាពកំពុងប្រព្រឹត្តទៅ ត្រូវតែប្រើ で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "ពាក្យភ្ជាប់ទីតាំងសកម្មភាព (で ទល់នឹង に), ×図書館に勉強する",
      "tip": "ទីតាំងដែលសកម្មភាពកំពុងប្រព្រឹត្តទៅ ត្រូវតែប្រើ で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "ការភ្លេច ឬប្រើខុសពាក្យភ្ជាប់កម្មបទផ្ទាល់ を ពេលស្នើសុំ/កុម្ម៉ង់",
      "tip": "ដាក់ を នៅចន្លោះនាម និងកិរិយាសព្ទ/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "ការភ្ជាប់ ～たら ដោយផ្ទាល់ទៅនឹងកិរិយាសព្ទទម្រង់វចនានុក្រម (×勉強するたら)",
      "tip": "ប្តូរទៅជាទម្រង់អតីតកាល た ជាមុនសិន រួចទើបបន្ថែម ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "ការនិយាយដដែលៗនូវ 私は (watashi wa) នៅដើមរាល់ប្រយោគដូចសៀវភៅពុម្ពរឹងកំព្រឹស",
      "tip": "លុប 私は ចោលនៅពេលប្រធានច្បាស់លាស់រួចហើយតាមបរិបទនៃការសន្ទនា"
    },
    "stative_verb_continuous": {
      "label": "ការដាក់ to be (am/is/are) នៅពីមុខកិរិយាសព្ទដើម/កិរិយាសព្ទបង្ហាញសភាព (×I am want / ×I am agree / ×I'm think)",
      "tip": "ទៅរកប្រធាន + កិរិយាសព្ទសកម្មដោយផ្ទាល់ (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "ការលាយ to be (am/is/are) ជាមួយកិរិយាសព្ទដើម (×I am agree / ×It is look)",
      "tip": "ដក am/is/are ចេញ ហើយបំបែកកិរិយាសព្ទឱ្យបានត្រឹមត្រូវ (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "ការភ្លេចកិរិយាសព្ទជំនួយ am/is/are នៅពីមុខ V-ing (×I meeting my friend)",
      "tip": "បញ្ចូល \"to be\" នៅពីមុខ V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "ទម្រង់អតីតកាលនៃកិរិយាសព្ទមិនទៀងទាត់ខុស ឬបាត់ V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "ប្រើទម្រង់ V2 មិនទៀងទាត់ឱ្យបានត្រឹមត្រូវ (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "ការប្រើទម្រង់កិរិយាសព្ទកាលបច្ចុប្បន្ន (V1) សម្រាប់ព្រឹត្តិការណ៍អតីតកាល",
      "tip": "ប្តូរកិរិយាសព្ទទៅជា Simple Past V2 នៅពេលនិយាយអំពីអតីតកាល"
    },
    "double_conjunction_although_but": {
      "label": "ការប្រើឈ្នាប់ស្ទួន \"Although ... but ...\" នៅក្នុងប្រយោគតែមួយ",
      "tip": "ប្រើ \"Although [ឃ្លាទី 1], [ឃ្លាទី 2]\" ដោយគ្មាន \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "ការប្រើសព្វនាម \"mine\" នៅពីមុខនាម (×mine job)",
      "tip": "ប្រើពាក្យបង្ហាញកម្មសិទ្ធិ \"my\" នៅពីមុខនាម (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "ការប្រើធ្នាក់ខុសជាមួយគុណនាម (×similar with)",
      "tip": "គូពាក្យត្រឹមត្រូវគឺ \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "ការបន្ថែម \"to\" ពីក្រោយកិរិយាសព្ទជំនួយ can/will/must/should (×can to go)",
      "tip": "កិរិយាសព្ទជំនួយត្រូវភ្ជាប់ដោយកិរិយាសព្ទដើមគ្មាន to ដោយផ្ទាល់ (✓can go / ✓should try)"
    }
  },
  "ru": {
    "polite_past_masu_deshita": {
      "label": "Сочетание ～ます + でした для прошедшего времени (например, ×食べますでした)",
      "tip": "Используйте форму ～ました напрямую (✓食べました / ✓行きました)"
    },
    "verb_plus_desu": {
      "label": "Присоединение です сразу после глаголов в словарной форме (×行くです / ×飲むです)",
      "tip": "Проспрягайте в форму ～ます (вежливая) или используйте простую разговорную форму без です"
    },
    "i_adj_past_deshita": {
      "label": "Образование прошедшего времени い-прилагательных через でした (×美味しいでした / ×いいでした)",
      "tip": "Замените окончание い → かったです (✓美味しかったです / ✓よかったです)"
    },
    "particle_confusion_ni_de": {
      "label": "Путаница частицы места действия で с に (×図書館に勉強する)",
      "tip": "Место, где совершается активное действие, ОБЯЗАТЕЛЬНО требует частицы で (✓図書館で勉強する)"
    },
    "ja_particle_ni_for_action_place": {
      "label": "Частицы места действия (で и に), ×図書館に勉強する",
      "tip": "Место, где совершается активное действие, ОБЯЗАТЕЛЬНО требует частицы で (✓図書館で勉強する)"
    },
    "particle_o_missing": {
      "label": "Пропуск или неверное использование частицы прямого дополнения を при просьбе или заказе",
      "tip": "Поставьте を между существительным и глаголом/ください (✓コーヒーをください)"
    },
    "tara_conditional_conjugation": {
      "label": "Присоединение ～たら сразу к глаголам в словарной форме (×勉強するたら)",
      "tip": "Сначала переведите глагол в прошедшую た-форму, затем добавьте ら (✓勉強したら / ✓行ったら)"
    },
    "overuse_watashi_wa": {
      "label": "Повторение 私は (watashi wa) в начале каждого предложения, как в сухом учебнике",
      "tip": "Опускайте 私は, когда подлежащее уже ясно из контекста разговора"
    },
    "stative_verb_continuous": {
      "label": "Постановка to be (am/is/are) перед обычными глаголами или глаголами состояния (×I am want / ×I am agree / ×I'm think)",
      "tip": "Сразу ставьте подлежащее + активный глагол (✓I'd like / ✓I agree / ✓I think)"
    },
    "be_plus_base_verb": {
      "label": "Смешивание to be (am/is/are) с начальной формой глаголов (×I am agree / ×It is look)",
      "tip": "Уберите am/is/are и правильно проспрягайте глагол (✓I agree / ✓It looks)"
    },
    "missing_be_auxiliary_continuous": {
      "label": "Пропуск вспомогательного глагола am/is/are перед V-ing (×I meeting my friend)",
      "tip": "Ставьте \"to be\" перед V-ing (✓I am meeting my friend)"
    },
    "past_tense_irregular_goed": {
      "label": "Неверная форма прошедшего времени неправильного глагола или отсутствие V2 (×goed / ×buyed / ×eat yesterday)",
      "tip": "Используйте правильную форму неправильного глагола V2 (✓went / ✓bought / ✓ate / ✓took)"
    },
    "unconjugated_past_verb": {
      "label": "Использование глагола в настоящем времени (V1) для событий в прошлом",
      "tip": "Когда говорите о прошлом, меняйте глагол на форму Simple Past V2"
    },
    "double_conjunction_although_but": {
      "label": "Двойной союз \"Although ... but ...\" в одном предложении",
      "tip": "Используйте \"Although [clause 1], [clause 2]\" БЕЗ \"but\""
    },
    "possessive_pronoun_mine_noun": {
      "label": "Использование местоимения \"mine\" перед существительным (×mine job)",
      "tip": "Используйте притяжательное местоимение \"my\" перед существительным (✓my job)"
    },
    "preposition_collocation_similar_with": {
      "label": "Неверный предлог в паре с прилагательным (×similar with)",
      "tip": "Устойчивое сочетание — \"similar to\" (✓similar to)"
    },
    "modal_plus_to_infinitive": {
      "label": "Добавление \"to\" после модальных глаголов can/will/must/should (×can to go)",
      "tip": "После модальных глаголов сразу идёт чистый инфинитив без to (✓can go / ✓should try)"
    }
  }
};
