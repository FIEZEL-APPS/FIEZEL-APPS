#!/usr/bin/env node
/**
 * build-misconception-taxonomy.js — Pemilik: A5
 *
 * KENAPA file ini ada:
 * Audit council (model-council-claude_opus_5_0.md T5) menemukan grammar-templates.json
 * punya 417 entri distraktor dengan 416 label miskonsepsi yang hampir semuanya unik.
 * Label unik = nol daya transfer: ledger miskonsepsi (A4) tidak pernah bisa mengumpulkan
 * >=3 bukti untuk miskonsepsi yang sama, karena setiap soal memakai frasa bebas sendiri.
 * Solusinya: taksonomi kanonik dua tingkat `family.mechanism` (<=50 kode) plus peta
 * dari SETIAP label verbatim ke satu kode kanonik. Ledger lalu menghitung bukti per
 * KODE, bukan per frasa, sehingga pola belajar lintas soal bisa terakumulasi.
 *
 * Cara pakai:
 *   node tools/build-misconception-taxonomy.js            -> validasi peta yang ada
 *   node tools/build-misconception-taxonomy.js --write    -> regenerasi misconception-taxonomy-v1.json
 *   node tools/build-misconception-taxonomy.js --report   -> cetak distribusi kode
 *
 * Desain klasifikasi:
 * 1. OVERRIDES: tabel manual label-verbatim -> kode, untuk kasus ambigu yang
 *    heuristik kata kunci salah tangkap (atau terlalu berisiko ditangkap regex umum).
 * 2. RULES: daftar heuristik kata kunci BERURUTAN (yang pertama cocok, menang).
 *    Beberapa rule sadar-konteks: memakai family template asal untuk memecah ambigu
 *    (mis. "-ing form instead of the past participle" di family passive vs tenses).
 * 3. Tanpa fallback diam-diam: label yang tidak tertangkap = error keras, supaya
 *    penambahan konten baru selalu memaksa keputusan taksonomi eksplisit.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var TEMPLATES_PATH = path.join(ROOT, 'grammar-templates.json');
var OUT_PATH = path.join(ROOT, 'misconception-taxonomy-v1.json');
var SCHEMA = 'fiezel-misconception-taxonomy-v1';

/* ============================================================
 * 1) KODE KANONIK (family.mechanism)
 * familyHint = family grammar dominan tempat mekanisme ini paling sering muncul
 * description_id = penjelasan miskonsepsi dalam bahasa Indonesia (untuk kartu tutor)
 * ============================================================ */
var CODES = {
  // ---- tense & aspek ----
  'tense_aspect.aspect_for_completed': {
    label: 'Aspek sedang-berlangsung tertukar dengan hasil selesai',
    familyHint: 'tense_aspect',
    description_id: 'Murid memakai bentuk progresif/perfect secara terbalik: kejadian yang masih berjalan dianggap sudah selesai, atau sebaliknya.'
  },
  'tense_aspect.habitual_overgeneralized': {
    label: 'Bentuk kebiasaan dipakai untuk kejadian sesaat (atau sebaliknya)',
    familyHint: 'tense_aspect',
    description_id: 'Present simple (rutinitas) dipakai untuk aksi yang sedang/akan terjadi sekali, atau kejadian tunggal dibaca sebagai kebiasaan.'
  },
  'tense_aspect.progressive_overuse': {
    label: 'Bentuk -ing dipakai berlebihan',
    familyHint: 'tense_aspect',
    description_id: 'Murid mengira setiap konteks "sekarang" atau rentang waktu wajib continuous, termasuk pada kata kerja statif yang menolak -ing.'
  },
  'tense_aspect.perfect_misuse': {
    label: 'Perfect dipakai/dilewatkan pada urutan waktu yang salah',
    familyHint: 'tense_aspect',
    description_id: 'Present/past perfect dipakai untuk sembarang kejadian lampau, atau justru dilewatkan saat urutan dua kejadian lampau harus ditandai.'
  },
  'tense_aspect.timeline_mismatch': {
    label: 'Tense tidak cocok dengan garis waktu kalimat',
    familyHint: 'tense_aspect',
    description_id: 'Bentuk waktu bertabrakan dengan penanda waktu: present di narasi lampau, past untuk fakta kini, dan pergeseran garis waktu lain.'
  },
  'tense_aspect.future_form_confusion': {
    label: 'Bentuk masa depan tertukar fungsinya',
    familyHint: 'tense_aspect',
    description_id: 'will / going to / present continuous / future perfect dipakai silang: jadwal tetap, rencana pribadi, niat, dan prediksi tidak dibedakan.'
  },
  // ---- kesesuaian (agreement) ----
  'agreement.bare_form': {
    label: 'Bentuk dasar dipakai tanpa infleksi wajib',
    familyHint: 'core_grammar',
    description_id: 'Kata kerja dibiarkan telanjang: tanpa -s orang ketiga, tanpa penanda lampau, atau tanpa perubahan bentuk yang dituntut subjek/waktu.'
  },
  'agreement.number_mismatch': {
    label: 'Kesesuaian jumlah subjek-kata kerja/penentu salah',
    familyHint: 'core_grammar',
    description_id: 'Tunggal/jamak tidak nyambung: verba mengikuti kata terdekat alih-alih subjek inti, atau penentu tunggal dipasang ke nomina jamak.'
  },
  'agreement.missing_auxiliary': {
    label: 'Kata bantu wajib hilang',
    familyHint: 'question_negation',
    description_id: 'be/do/have sebagai kata bantu dihilangkan atau ditukar jenisnya, padahal struktur kalimat (tanya, ingkar, progresif) mewajibkannya.'
  },
  // ---- struktur kalimat ----
  'structure.double_marking': {
    label: 'Penandaan ganda yang mubazir',
    familyHint: 'conditionals',
    description_id: 'Satu fungsi ditandai dua kali: would di dua klausa, penanda futur di klausa waktu, negasi ganda, atau dua subjek/kata bantu bersaing.'
  },
  'structure.word_order': {
    label: 'Urutan kata menyimpang dari pola wajib',
    familyHint: 'emphasis_inversion',
    description_id: 'Elemen ditaruh di slot yang salah: adverbia frekuensi, frasa cleft, kuantifier + relative, atau pasangan preposisi-pronomina terbalik.'
  },
  'structure.inversion_error': {
    label: 'Inversi subjek-kata bantu salah pakai',
    familyHint: 'emphasis_inversion',
    description_id: 'Inversi tidak diterapkan setelah pembuka negatif/kondisional formal, atau justru dipertahankan di klausa embedded/reported yang menolaknya.'
  },
  'structure.malformed_blend': {
    label: 'Dua pola dicampur jadi bentuk tidak valid',
    familyHint: 'gerunds_infinitives',
    description_id: 'Potongan dua konstruksi digabung: to + -ing, campuran did + have, passive + perfect setengah jadi — hasilnya tidak gramatikal di pola mana pun.'
  },
  'structure.omitted_element': {
    label: 'Elemen struktural wajib dihilangkan',
    familyHint: 'passive',
    description_id: 'Bagian yang wajib ada dibuang: be pada pasif, of pada kuantifier, to pada infinitive, dummy it, atau penanda tujuan — kalimat jadi bolong.'
  },
  // ---- modalitas ----
  'modality.function_confusion': {
    label: 'Fungsi modal tertukar (wajib/izin/saran/deduksi)',
    familyHint: 'modals',
    description_id: 'must, can, should, may dibaca silang fungsi: kewajiban dikira izin, deduksi dikira saran, izin formal dikira kemungkinan.'
  },
  'modality.strength_miscalibrated': {
    label: 'Kekuatan modal tidak pas dengan bukti/urgensi',
    familyHint: 'modals',
    description_id: 'Modal terlalu kuat atau terlalu lemah untuk konteks: might dipakai saat bukti menuntut must, atau prediksi yakin dipakai untuk spekulasi.'
  },
  'modality.negation_scope': {
    label: 'Lingkup negasi modal salah baca',
    familyHint: 'modals',
    description_id: "mustn't (larangan) dikira 'tidak wajib', don't have to dikira larangan — polaritas dan lingkup negasi modal tertukar."
  },
  'modality.past_reference_error': {
    label: 'Modal untuk rujukan lampau salah bentuk',
    familyHint: 'modals',
    description_id: 'should/could/must + have + V3 untuk penyesalan/deduksi lampau ditukar dengan modal present, atau makna kritik vs peluang lampau tertukar.'
  },
  // ---- kondisional ----
  'conditionals.type_mismatch': {
    label: 'Tipe kondisional tidak cocok dengan realitas kondisi',
    familyHint: 'conditionals',
    description_id: 'Kondisi nyata vs andaian vs andaian lampau tertukar: tipe 1 dipakai untuk situasi mustahil, tipe 2 untuk fakta umum, tipe 3 dilewatkan.'
  },
  'conditionals.clause_form_swap': {
    label: 'Bentuk klausa if dan klausa hasil tertukar',
    familyHint: 'conditionals',
    description_id: 'Struktur milik klausa hasil dipasang di klausa if (atau sebaliknya), termasuk was menggantikan subjunctive were.'
  },
  // ---- pasif ----
  'passive.active_for_passive': {
    label: 'Bentuk aktif dipertahankan saat pasif dibutuhkan',
    familyHint: 'passive',
    description_id: 'Pelaku tidak dikenal/tidak penting tapi kalimat tetap aktif, atau subjek non-pelaku dipaksa "melakukan" aksi.'
  },
  'passive.participle_form': {
    label: 'Bentuk verba dalam pasif/kausatif salah',
    familyHint: 'passive',
    description_id: 'Slot past participle diisi bentuk -ing, bentuk dasar, atau bentuk aktif — struktur pasif/kausatif kehilangan penanda V3-nya.'
  },
  'passive.causative_confusion': {
    label: 'Pola kausatif have/get tertukar dengan pola lain',
    familyHint: 'passive',
    description_id: 'have/get something done dikira pasif biasa atau make someone do; siapa mengerjakan apa untuk siapa jadi kabur.'
  },
  'passive.impersonal_pattern': {
    label: 'Pola pasif impersonal (it is said / sb is said to) salah rakit',
    familyHint: 'passive',
    description_id: 'Pola It is believed that... dan He is said to... dicampur, dummy it dibuang atau ditambah ganda.'
  },
  // ---- reported speech ----
  'reported.backshift_error': {
    label: 'Backshift kala dalam kalimat lapor salah',
    familyHint: 'reported_speech',
    description_id: 'Tense tidak digeser mundur, digeser terlalu jauh, atau kategorinya diganti; termasuk modal yang dibiarkan/digeser keliru.'
  },
  'reported.deixis_shift': {
    label: 'Pergeseran kata ganti/penunjuk waktu dalam lapor tidak tuntas',
    familyHint: 'reported_speech',
    description_id: 'I/my/today/tomorrow dibiarkan dari sudut pandang penutur asli, atau hanya sebagian yang digeser — rujukan jadi salah orang/hari.'
  },
  // ---- artikel & penentu ----
  'articles.definiteness_mismatch': {
    label: 'Kepastian rujukan (a/an vs the vs generik) salah pilih',
    familyHint: 'articles_determiners',
    description_id: 'Rujukan yang sudah dikenal diberi a/an, rujukan generik atau pertama diberi the, atau superlatif kehilangan the wajibnya.'
  },
  'articles.countability_quantifier': {
    label: 'Ketercacahan dan kuantifier tidak cocok',
    familyHint: 'articles_determiners',
    description_id: 'much/little dipasang ke nomina tercacah, a/an ke nomina jamak/takterhitung — pembeda countable vs uncountable belum jalan.'
  },
  'articles.sound_rule': {
    label: 'Aturan bunyi a vs an salah terap',
    familyHint: 'articles_determiners',
    description_id: 'Pilihan a/an mengikuti HURUF awal, bukan BUNYI awal (a umbrella, an university) — jalan pintas huruf konsonan/vokal.'
  },
  'articles.zero_article': {
    label: 'Artikel nol pada nama/idiom institusi salah kelola',
    familyHint: 'articles_determiners',
    description_id: 'Nama negara, idiom go to school, dan frasa institusi diberi artikel yang tidak perlu — atau aturan "tanpa artikel" digeneralisasi berlebihan.'
  },
  // ---- perbandingan ----
  'comparison.degree_scope': {
    label: 'Komparatif vs superlatif salah lingkup',
    familyHint: 'comparison',
    description_id: 'Superlatif dipakai untuk dua pembanding, komparatif untuk tiga atau lebih, atau perubahan bertahap dibaca sebagai peringkat tetap.'
  },
  'comparison.form_intensifier': {
    label: 'Bentuk komparatif atau pengintensifnya salah',
    familyHint: 'comparison',
    description_id: 'more dipasang ke adjektiva pendek yang minta -er, adjektiva dasar tanpa penanda banding, atau very/so/too dipaksa mengintensifkan komparatif.'
  },
  // ---- preposisi ----
  'prepositions.semantic_category': {
    label: 'Kategori makna preposisi tertukar',
    familyHint: 'prepositions',
    description_id: 'in/on/at/by/along/over dipakai silang kategori: titik vs permukaan vs ruang, durasi vs titik waktu, gerak vs lokasi statis.'
  },
  'prepositions.collocation': {
    label: 'Kolokasi preposisi tetap salah pasang',
    familyHint: 'prepositions',
    description_id: 'Pasangan mati seperti proud of, by bus, solution to diganti preposisi dari frasa mirip (search for, pleased with) — transfer antar kolokasi.'
  },
  // ---- leksikal ----
  'lexical.form_confusion': {
    label: 'Bentuk/kata mirip tertukar makna',
    familyHint: 'error_correction',
    description_id: 'Pasangan mirip rupa tertukar: affect/effect, phrasal verb put off/up/down, atau kata yang hanya mirip bunyi dengan target.'
  },
  'lexical.register_mismatch': {
    label: 'Register formal vs kasual salah pilih',
    familyHint: 'linking_devices',
    description_id: 'Konektor percakapan dipakai di teks akademik (atau sebaliknya), termasuk memilih be-passive saat register kasual menuntut get-passive.'
  },
  // ---- komplementasi (gerund/infinitive) ----
  'complementation.gerund_infinitive_swap': {
    label: 'Gerund dan infinitive tertukar slot',
    familyHint: 'gerunds_infinitives',
    description_id: 'Verba/struktur yang menuntut -ing diberi to-V (atau sebaliknya), termasuk gerund dipakai saat infinitive tujuan dibutuhkan.'
  },
  'complementation.meaning_pair_shift': {
    label: 'Pasangan makna remember/try/regret + gerund vs infinitive tertukar',
    familyHint: 'gerunds_infinitives',
    description_id: 'Verba bermakna ganda: remember to (tugas) vs remember -ing (kenangan), try to (usaha) vs try -ing (eksperimen) — makna yang dipilih salah.'
  },
  'complementation.bare_form_error': {
    label: 'Bare infinitive salah pakai atau salah tempat',
    familyHint: 'gerunds_infinitives',
    description_id: 'Bentuk dasar tanpa to dipakai di slot yang minta to-V/-ing, atau to dipertahankan setelah let/make yang minta bare infinitive.'
  },
  'complementation.verb_pattern': {
    label: 'Pola pelengkap verba tertentu salah transfer',
    familyHint: 'reported_speech',
    description_id: 'Pola satu verba dipindah ke verba lain: suggest diberi objek ala tell, apologize for + -ing diganti that-clause atau infinitive.'
  },
  // ---- klausa relatif ----
  'relative.pronoun_choice': {
    label: 'Pronomina relatif salah pilih',
    familyHint: 'relative_clauses',
    description_id: "who/which/whose/whom/that tertukar: which untuk orang, who's untuk whose, atau pronomina persona biasa dipakai menyambung klausa."
  },
  'relative.restrictiveness': {
    label: 'Klausa pembatas vs tambahan tertukar',
    familyHint: 'relative_clauses',
    description_id: 'Informasi ekstra dikira esensial (atau sebaliknya), sehingga koma dan pilihan that/which salah — makna kalimat ikut bergeser.'
  },
  'relative.reduction_error': {
    label: 'Reduksi klausa relatif salah arah',
    familyHint: 'relative_clauses',
    description_id: 'Participle -ing vs -ed salah pilih saat mereduksi klausa (pelaku vs penerima aksi), atau klausa menempel ke kepala nomina yang salah.'
  },
  // ---- pertanyaan & negasi ----
  'question.auxiliary_error': {
    label: 'Kata bantu pertanyaan/tag salah tense atau jenis',
    familyHint: 'question_negation',
    description_id: 'Tag/pertanyaan meminjam kata bantu dari tense lain (does untuk last night), atau do/be tertukar; termasuk did mubazir pada subject question.'
  },
  'question.polarity_negation': {
    label: 'Polaritas tanya/negasi salah kelola',
    familyHint: 'question_negation',
    description_id: 'Tag tidak dibalik polaritasnya, negasi dobel (didn\'t + nothing), atau so/neither salah pilih saat menyetujui kalimat negatif.'
  },
  'question.wh_choice': {
    label: 'Kata tanya salah sasaran informasi',
    familyHint: 'question_formation',
    description_id: 'what/when/why tertukar: kata tanya tidak menargetkan jenis informasi yang ditanyakan kalimat.'
  },
  // ---- pronomina ----
  'pronouns.case_form': {
    label: 'Kasus pronomina (subjek/objek/posesif) tertukar',
    familyHint: 'pronouns_determiners',
    description_id: 'I/me/my/mine dipakai silang slot: pronomina objek di posisi subjek, posesif berdiri sendiri di depan nomina, dan sejenisnya.'
  },
  // ---- konektor ----
  'linking.connector_choice': {
    label: 'Konektor antar-klausa salah kategori',
    familyHint: 'linking_devices',
    description_id: 'although vs despite, so that vs to, unless vs if not, therefore di posisi salah — kelas sintaksis konektor tidak dibedakan dari maknanya.'
  },
  // ---- transfer L1 Indonesia ----
  'transfer.id_l1_pattern': {
    label: 'Pola bahasa Indonesia dibawa ke Inggris',
    familyHint: 'core_grammar',
    description_id: 'Transfer L1: kopula/be dihilangkan (dia guru), nomina tak diinfleksi jamak (two book), kata tanya/apa dipetakan langsung — pola Indonesia dipertahankan di kalimat Inggris.'
  }
};

/* ============================================================
 * 2) OVERRIDES — label verbatim -> kode.
 * Dipakai untuk kasus ambigu yang heuristik umum salah arah.
 * Kunci HARUS persis sama dengan label di grammar-templates.json.
 * ============================================================ */
var OVERRIDES = {
  // gen2 (m025-188): 27 label batch S03-S05 — kode dari kandidat ter-QA (S17/S20).
  'uses the bare adjective after an action verb where a manner adverb in \'-ly\' is required': 'transfer.id_l1_pattern',
  'builds the manner phrase as \'with\' plus a bare adjective, copying Indonesian \'dengan hati-hati\'': 'transfer.id_l1_pattern',
  'asks quantity with bare \'how\' and drops the quantity word entirely': 'structure.omitted_element',
  'uses \'anything\' in a positive clause that has no negative word to license it': 'question.polarity_negation',
  'leaves bare \'any\' without a noun in a positive clause': 'question.polarity_negation',
  'puts \'because of\' before a full clause although it only takes a noun phrase': 'linking.connector_choice',
  'parks \'still\' at the end of a negative clause instead of before the auxiliary': 'structure.word_order',
  'uses the reciprocal \'each other\' with a singular subject': 'pronouns.case_form',
  'picks a reflexive that does not match the person of the subject': 'pronouns.case_form',
  'picks plural \'ones\' to replace a single noun': 'agreement.number_mismatch',
  'puts future \'will\' after \'wish\', calquing Indonesian \'akan\'': 'transfer.id_l1_pattern',
  'marks the clause after \'it\'s high time\' with future \'will\' because the action is still to come': 'tense_aspect.future_form_confusion',
  'keeps the real-possibility present after \'as if\' although the sentence denies the comparison': 'conditionals.type_mismatch',
  'uses \'didn\'t need to\' where the sentence shows the unnecessary action was actually done': 'modality.past_reference_error',
  'fronts \'no sooner\' but keeps ordinary subject-auxiliary order': 'structure.inversion_error',
  'drops the obligatory \'how\' after \'no matter\' before an adverb': 'structure.omitted_element',
  'treats the conjunction \'unless\' as if it could govern a bare noun phrase': 'linking.connector_choice',
  'truncates the fixed frame \'if it had not been for\' down to a bare \'if not\'': 'structure.omitted_element',
  'keeps modal \'daren\'t\' but still adds \'to\' before the verb': 'complementation.bare_form_error',
  'negates \'dare\' with bare \'not\' and no operator, copying Indonesian \'tidak berani\'': 'transfer.id_l1_pattern',
  'treats \'dare\' as an adjective and negates it with \'be\'': 'agreement.missing_auxiliary',
  'chooses clause-taking \'unless\' although only a noun phrase follows': 'linking.connector_choice',
  'reads \'except\' as if it meant \'provided none arise\'': 'prepositions.semantic_category',
  'translates Indonesian \'tidak\' as \'no\' to negate a participle': 'question.polarity_negation',
  'lets a finite \'didn\'t want\' head a subjectless adjunct': 'structure.malformed_blend',
  'puts clause conjunction \'whereas\' before a lone adjective': 'linking.connector_choice',
  'swaps in \'which\' although the antecedent is a person': 'relative.pronoun_choice',
  // transfer L1 Indonesia: kopula hilang, jamak tak diinfleksi, pola lintas bahasa
  'missing-be-auxiliary': 'transfer.id_l1_pattern',
  'bare-verb-without-auxiliary': 'transfer.id_l1_pattern',
  'singular-retention': 'transfer.id_l1_pattern',
  "Uses 'what' as a relative pronoun, a common cross-linguistic transfer error": 'transfer.id_l1_pattern',
  'be verb': 'transfer.id_l1_pattern',

  // core_grammar: label super pendek, konteksnya bentuk verba dasar
  'base form': 'agreement.bare_form',
  'base-form overuse': 'agreement.bare_form',
  'bare-infinitive substitution': 'agreement.bare_form',
  'bare verb': 'agreement.bare_form',
  'past participle alone': 'structure.omitted_element',
  'participle fragment': 'structure.omitted_element',
  'gerund mismatch': 'relative.reduction_error',
  'present mismatch': 'relative.reduction_error',
  'present-tense clash plus unnatural collocation': 'tense_aspect.timeline_mismatch',
  'singular be': 'agreement.number_mismatch',
  'first-person be': 'agreement.number_mismatch',
  'singular agreement': 'agreement.number_mismatch',
  'singular-past transfer': 'agreement.number_mismatch',
  'past tense': 'tense_aspect.timeline_mismatch',
  'past-tense confusion': 'tense_aspect.timeline_mismatch',
  'present-tense substitution': 'tense_aspect.timeline_mismatch',
  'progressive confusion': 'tense_aspect.progressive_overuse',
  'do auxiliary': 'agreement.missing_auxiliary',
  'possession': 'pronouns.case_form',
  'subject pronoun': 'pronouns.case_form',
  'object pronoun': 'pronouns.case_form',
  'possessive pronoun': 'pronouns.case_form',
  // possession family: has/have vs is/are
  'plural-form transfer': 'agreement.number_mismatch',
  'be-verb substitution': 'agreement.missing_auxiliary',
  'double-auxiliary construction': 'structure.double_marking',
  // nouns family: bentuk jamak
  'simple-s-overgeneralization': 'agreement.number_mismatch',
  'add-es-without-spelling-change': 'agreement.number_mismatch',

  // tense_aspect ambigu
  'tense-timeline mismatch': 'tense_aspect.timeline_mismatch',
  'missing-past-marking': 'agreement.bare_form',
  'third-person-present form': 'tense_aspect.timeline_mismatch',
  'progressive-form substitution': 'tense_aspect.progressive_overuse',
  'present-simple-habit': 'tense_aspect.habitual_overgeneralized',
  "structural error: double -ing after 'going to'": 'structure.malformed_blend',
  'treats spontaneous offers as pre-arranged plans': 'tense_aspect.future_form_confusion',
  'present simple used for a one-off future act': 'tense_aspect.future_form_confusion',
  "Applies 'would' to a stative verb (live = residing state) as if it were a repeated dynamic action": 'tense_aspect.progressive_overuse',
  "Adds a past-tense ending to the verb after the modal 'would'.": 'structure.double_marking',
  "Uses a bare gerund with no finite verb to carry the sentence's tense.": 'structure.omitted_element',
  'Forces a passive continuous structure onto an intransitive stative verb.': 'tense_aspect.progressive_overuse',
  'Assumes present time always requires present continuous.': 'tense_aspect.progressive_overuse',

  // artikel/penentu ambigu
  'quantifier substituted for a singular countable reference': 'articles.countability_quantifier',
  'treating a superlative noun phrase as an ordinary indefinite first mention': 'articles.definiteness_mismatch',
  'assuming proper-noun-adjacent phrases never take an article': 'articles.zero_article',
  'focuses on a particular building instead of institutional attendance': 'articles.zero_article',
  'introduces one unspecified building rather than the attendance idiom': 'articles.zero_article',
  'turns one routine of attendance into a generic plural destination': 'articles.zero_article',
  'using a singular near demonstrative with a plural, distant noun': 'agreement.number_mismatch',
  'correctly matching distance but ignoring plural agreement': 'agreement.number_mismatch',
  'correctly matching plural but ignoring the distance cue': 'articles.definiteness_mismatch',
  "Duplicates possession by using both 'my' and 'of mine' together.": 'structure.double_marking',
  "Uses the object pronoun 'me' instead of the possessive pronoun 'mine' after 'of'.": 'pronouns.case_form',
  'specific-article overuse': 'articles.definiteness_mismatch',
  'plural-or-uncountable quantifier': 'articles.countability_quantifier',
  'positive-quantifier-in-negative': 'question.polarity_negation',
  'singular-article-with-uncountable': 'articles.countability_quantifier',
  'countable-quantity-substitution': 'articles.countability_quantifier',
  "drops 'of' before the object pronoun": 'structure.omitted_element',
  "drops 'of' and ignores the explicitly two-person set": 'structure.omitted_element',
  "drops 'of' and reverses the affirmative meaning": 'structure.omitted_element',

  // kondisional / linking ambigu
  "stacks a redundant negative onto 'unless', which is already negative in meaning": 'structure.double_marking',
  "confuses 'if not' with 'unless' as directly interchangeable in this exact slot": 'linking.connector_choice',
  "drops the negative condition entirely, reversing the sentence's logic": 'linking.connector_choice',
  "reading 'otherwise' as a simple future contrast marker": 'linking.connector_choice',
  'Uses the negative-exception connector where a positive required condition is meant.': 'linking.connector_choice',
  "Uses a concessive connector implying the condition doesn't matter to the outcome.": 'linking.connector_choice',
  "Uses 'in case' (precaution for a possible future event) instead of a condition of permission.": 'linking.connector_choice',
  'duplicates future marking inside the time clause': 'structure.double_marking',
  'shifts the time clause into a completed past event': 'tense_aspect.timeline_mismatch',
  'treats a real future sequence as hypothetical or future-in-the-past': 'conditionals.type_mismatch',

  // error_correction ambigu
  'keeps plural agreement, just changes tense, missing the real error': 'agreement.number_mismatch',
  'changes the subject to match the verb instead of fixing the verb': 'agreement.number_mismatch',
  'introduces a new verb-form error while keeping the agreement error': 'agreement.number_mismatch',
  'tense inconsistency after a past event': 'tense_aspect.timeline_mismatch',
  'misplacing therefore between independent clauses': 'linking.connector_choice',
  'keeping the comma splice while adding an adverb': 'linking.connector_choice',
  "correctly swapping to 'affect' but adding an unneeded third-person -s after a modal verb": 'lexical.form_confusion',
  "keeping the noun 'effect' but inserting 'be' as if that fixes the part-of-speech mismatch": 'lexical.form_confusion',
  "substituting an unrelated noun ('affection') that only superficially resembles the needed verb": 'lexical.form_confusion',
  'Assumes rewording the adjective fixes the logical mismatch of the modifier.': 'relative.reduction_error',
  'Moves the modifier but keeps it attached to the same illogical subject.': 'relative.reduction_error',
  "Changes word order for stylistic emphasis without addressing the modifier's logical subject.": 'relative.reduction_error',
  'Fixes only two of the three items, still leaving the list form inconsistent overall reasoning.': 'complementation.gerund_infinitive_swap',
  'Converts the first item to infinitive while leaving the other two as gerunds.': 'complementation.gerund_infinitive_swap',
  'This is the original unedited sentence, left unchanged.': 'complementation.gerund_infinitive_swap',

  // pasif ambigu
  "not wrong grammatically, but ignores that the informal, exclamatory register strongly favors the 'get' passive here": 'lexical.register_mismatch',
  'malformed passive/perfect blend': 'structure.malformed_blend',
  'misapplies present perfect auxiliary to a simple past passive event': 'tense_aspect.perfect_misuse',
  'Mixes present perfect passive auxiliary into a past-time causative sentence.': 'tense_aspect.perfect_misuse',
  'adds a vague, uninformative agent instead of omitting it': 'passive.active_for_passive',
  'Fails subject-verb agreement, treating the plural subject \'all employees\' as singular.': 'agreement.number_mismatch',
  'Attempts simple past passive but misapplies subject-verb agreement and structure.': 'agreement.number_mismatch',
  'Adds an unnecessary preposition after the passive verb when the recipient is already the subject.': 'prepositions.collocation',
  'Reverses the auxiliary and main verb order.': 'structure.word_order',
  'Applies the passive infinitive pattern to a verb (\'resent\') that specifically requires a gerund complement.': 'complementation.gerund_infinitive_swap',
  "Uses the bare passive infinitive without 'to' or the required gerund '-ing' form.": 'complementation.bare_form_error',
  'adding continuous aspect to the passive infinitive unnecessarily': 'tense_aspect.progressive_overuse',
  'using a gerund where an infinitive pattern after \'expected\' is required': 'complementation.gerund_infinitive_swap',

  // reported speech ambigu
  "copies the object pattern of 'tell/ask' (verb + object) onto 'suggest', which doesn't take a direct personal object this way": 'complementation.verb_pattern',
  'uses a direct-instruction verb for what was actually a suggestion': 'complementation.verb_pattern',
  'escalates a mild suggestion into a forceful command': 'complementation.verb_pattern',
  "applies the statement-reporting pattern ('that' clause) to an imperative": 'complementation.verb_pattern',
  'leaves the original imperative form unchanged, without integrating it into reported speech': 'reported.backshift_error',
  'backshifts as if reporting a past statement rather than a command': 'complementation.verb_pattern',
  "uses 'that' for a yes/no reported question": 'structure.inversion_error',
  'Applies the generic reporting pattern (verb + that-clause) to a verb requiring preposition + gerund.': 'complementation.verb_pattern',
  'Uses an infinitive complement instead of the required preposition + gerund pattern.': 'complementation.verb_pattern',
  "Uses the bare base form after the preposition 'for' instead of the required gerund.": 'complementation.bare_form_error',
  "keeps 'did' as an unnecessary emphatic auxiliary instead of a simple backshifted past verb": 'structure.double_marking',

  // modal ambigu
  'drops the modal/auxiliary entirely': 'structure.omitted_element',
  "extends general-ability 'could' to a single specific achievement": 'modality.past_reference_error',
  'uses present-tense modal for a clearly past narrative': 'modality.past_reference_error',
  "places the finite modal 'can' after infinitive 'to'": 'structure.malformed_blend',
  'uses a finite past/conditional modal in a non-finite slot': 'structure.malformed_blend',
  'uses a gerund-participle where a bare infinitive is required': 'complementation.bare_form_error',
  'underestimates the strength of the evidence': 'modality.strength_miscalibrated',
  'reverses the polarity of the evidence': 'modality.negation_scope',
  'confuses the polarity of the deduction': 'modality.negation_scope',
  'missing the negation needed for criticizing a completed unwise action': 'modality.negation_scope',

  // advanced_grammar ambigu
  'moves the result into the unreal past': 'conditionals.type_mismatch',
  'treats the future result as real despite the unreal past condition': 'conditionals.type_mismatch',
  'uses simple past for an explicitly future consequence': 'conditionals.type_mismatch',
  'uses a completed-event deduction instead of an ongoing past activity': 'modality.past_reference_error',
  'changes evidence-based deduction into present advice or expectation': 'modality.function_confusion',
  'keeps ordinary statement order after a fronted restrictive phrase': 'structure.inversion_error',
  'inverts the lexical verb directly': 'structure.inversion_error',
  'adds emphatic do but does not invert it with the subject': 'structure.inversion_error',
  'makes the verb agree with the nearby plural noun team': 'agreement.number_mismatch',
  'inserts an it-cleft linker into a pseudo-cleft': 'structure.malformed_blend',
  'adds a dummy cleft subject and creates two competing subjects': 'structure.double_marking',

  // gerund/infinitive ambigu
  "adds an unnecessary obligation phrase not supported by the sentence's meaning": 'complementation.meaning_pair_shift',
  'inserting an unnecessary preposition before the verb form': 'structure.malformed_blend',
  "mixes a preposition with a to-infinitive, a combination that isn't standard in English": 'structure.malformed_blend',
  "misreads the sentence as needing a preposition + gerund structure instead of an infinitive of purpose": 'complementation.gerund_infinitive_swap',
  'drops the purpose marker entirely, leaving a bare gerund with no clear grammatical link to the main clause': 'structure.omitted_element',
  "Drops the infinitive marker 'to' entirely.": 'structure.omitted_element',
  "Places 'to' after the verb instead of before it, misreading the infinitive structure.": 'structure.word_order',
  "Uses 'for' as if introducing purpose rather than a subject.": 'linking.connector_choice',
  "Applies the to-infinitive pattern used after 'allow' to the different verb 'let'.": 'complementation.verb_pattern',
  'Uses a past participle instead of the bare infinitive.': 'complementation.bare_form_error',
  'Uses the bare base form with no verb marking at all.': 'complementation.bare_form_error',

  // pertanyaan/negasi ambigu
  "uses a neutral positive question form, missing the speaker's implied surprise/assumption": 'question.polarity_negation',
  'unnecessarily backshifts to past tense when the pharmacy\'s existence is a current, general fact': 'reported.backshift_error',
  'incorrectly splitting the compound negative pronoun into two words': 'question.polarity_negation',
  'Uses a gerund fragment instead of the statement\'s original verb form.': 'structure.omitted_element',
  'Forms a standard inverted question instead of echoing the statement\'s structure.': 'structure.inversion_error',
  'Fully reformulates the question with standard word order rather than echoing.': 'structure.inversion_error',

  // relative clauses ambigu
  'keeps the unreduced full relative clause when a reduced participle phrase is the target structure being tested': 'relative.reduction_error',
  'wrongly treats the vaccine as the head noun modified by the clause instead of the scientists': 'relative.reduction_error',
  'applies passive reduction when the scientists are actually the active agents, not the recipients of the action': 'relative.reduction_error',
  'Offers two pronouns as if either fits, ignoring that the pronoun is omissible here and that \'whom\' doesn\'t refer to things.': 'relative.pronoun_choice',

  // preposisi vs relative: 'fronted preposition' memicu rule preposisi, padahal intinya pronomina/urutan
  "using subject-form 'who' after a fronted preposition, which requires the object form": 'relative.pronoun_choice',
  "reverses the preposition-pronoun order, putting 'with' directly after 'who' mid-clause": 'structure.word_order',
  "Keeps normal subject-first order and misplaces 'such' mid-sentence.": 'structure.inversion_error',
  "uses the bare infinitive, which isn't a valid pattern after 'remember' in either meaning": 'complementation.bare_form_error',
  "using the bare infinitive after 'try', which isn't a valid pattern": 'complementation.bare_form_error',
  'moves the auxiliary to the very front of the embedded clause, producing an invalid word order': 'structure.inversion_error',
  'Reverses the auxiliary and main verb order.': 'structure.word_order',

  // 'duration'/'point' memicu rule preposisi, padahal ini soal bentuk futur
  'Confuses future continuous (in-progress at a moment) with future perfect continuous (duration up to a point).': 'tense_aspect.future_form_confusion',
  'Confuses future perfect simple (completion/result) with future perfect continuous (ongoing duration emphasis).': 'tense_aspect.future_form_confusion',
  'uses a bare future form without marking the ongoing nature of the action': 'tense_aspect.future_form_confusion',
  // 'bare/base' generik vs mekanisme spesifik
  'bare infinitive used instead of the required to-infinitive': 'complementation.bare_form_error',
  'base adjective used without comparative marking': 'comparison.form_intensifier',
  // 'indefinite/article' generik vs mekanisme spesifik
  'using a positive indefinite pronoun that contradicts the negative context': 'question.polarity_negation',
  'Inserts an article as if a noun were about to follow.': 'linking.connector_choice',
  'applies a singular indefinite article to a plural noun': 'articles.countability_quantifier',
  // 'formal' memicu rule register, padahal intinya fungsi modal / pasangan makna
  'obligation read as formal permission': 'modality.function_confusion',
  'Confuses formal permission with weak possibility.': 'modality.function_confusion',
  'Uses the gerund pattern (regretting a past action) where the formal-announcement meaning is intended.': 'complementation.meaning_pair_shift',

  // sisa kasus yang lolos dari semua heuristik
  'present-perfect-for-any-past-event': 'tense_aspect.perfect_misuse',
  'uses an active-voice auxiliary in a passive construction': 'passive.active_for_passive',
  "misreading the original 'today' as if it referred to the day after speaking": 'reported.deixis_shift',
  'Treats the modal as a regular verb that takes -s for third person.': 'agreement.number_mismatch',
  'uses the broader situation-focused pattern instead of directly evaluating the result': 'prepositions.collocation',
  'confuses pleased with pleased for someone': 'prepositions.collocation',
  'Treats the sentence as a yes/no question by fronting only the verb.': 'structure.inversion_error',

  // komparatif ambigu
  'Uses past simple twice instead of the fixed present perfect + ever pattern.': 'tense_aspect.perfect_misuse',
  "Repeats the auxiliary 'have' without the required past participle 'had' for the main verb 'eat/have (a meal)'.": 'passive.participle_form',
  "Mixes past simple auxiliary 'did' with present perfect 'have', producing an inconsistent structure.": 'structure.malformed_blend'
};

/* ============================================================
 * 3) RULES — heuristik kata kunci berurutan. Yang pertama cocok, menang.
 * Setiap rule: { code, re } atau { code, re, family } (family = syarat konteks).
 * ============================================================ */
var RULES = [
  // --- pola sangat spesifik dulu (supaya tidak dicaplok rule umum) ---
  { code: 'articles.sound_rule', re: /vowel[- ]sound|consonant sound|consonant[- ]letter/i },
  { code: 'articles.zero_article', re: /country name|proper[- ]noun/i },
  { code: 'passive.causative_confusion', re: /causativ|'have\/get'|make someone do|rather than causative/i },
  { code: 'passive.impersonal_pattern', re: /dummy (subject |cleft )?'?it'?|impersonal/i },
  { code: 'modality.negation_scope', re: /mustn't|absence of necessity|lack of requirement|negative obligation/i },
  { code: 'modality.past_reference_error', re: /past[- ]regret|retrospective|missed opportunity|past possibility|past hypothetical situation|past deduction|criticizing|criticism|achieved ability/i },
  { code: 'conditionals.clause_form_swap', re: /if-clause|result[- ]clause|main clause|subjunctive '?were|'weren't'/i },
  { code: 'reported.deixis_shift', re: /deictic|pronoun and possessive|forgets to shift|first-person pronoun|possessive but forgets/i },
  { code: 'reported.backshift_error', re: /backshift|reported speech|reporting time|reported version/i },
  { code: 'structure.inversion_error', re: /inversion|inverted|invert|echo/i },
  { code: 'question.wh_choice', re: /(thing|time|reason)-question substitution/i },
  { code: 'lexical.form_confusion', re: /put (down|up|away|off)|affect|effect|superficially resembles/i },
  { code: 'lexical.register_mismatch', re: /formal|casual|conversational|register|spoken connector/i },
  { code: 'linking.connector_choice', re: /connector|conjunctive adverb|coordinating conjunction|'although'|'however'|'even though'|'despite'|'such'|so\.\.\.that|purpose connector|introduce a full purpose clause/i },

  // --- transfer & agreement ---
  { code: 'agreement.number_mismatch', re: /subject[- ]verb agreement.*(plural|singular)|plural agreement|plural noun and ignores|treating the plural|as singular/i },
  { code: 'agreement.bare_form', re: /bare (form|infinitive used|present form)|base[- ]form|bare verb|missing subject-verb agreement|without.*(inflect|marking)|no verb marking/i },
  { code: 'agreement.missing_auxiliary', re: /(missing|omits?|drops?|without).*(auxiliary|'be'|'do')|auxiliary.*(missing|omitted)|'be' auxiliary instead of the 'do'/i },

  // --- struktur ---
  { code: 'structure.double_marking', re: /duplicat|redundant|double|stack|both clauses.*would|two competing|already signals|already negative|adds 'did' and keeps/i },
  { code: 'structure.malformed_blend', re: /blend|hybrid|mixes|malformed|invalid word order|non-standard|isn't a valid pattern|not standard/i },
  { code: 'structure.omitted_element', re: /(drops?|omits?|leaving only|leaves|missing) (the )?(passive )?(auxiliary|'of'|'to'|'be'|marker)|fragment|no auxiliary at all/i },
  // \bposition\b sengaja pakai batas kata: tanpa itu, 'preposition' ikut tertangkap.
  { code: 'structure.word_order', re: /word order|misorders?|reverses the order|scrambles|moves the (adverb|modifier)|places? '.*' (before|after)|misplace|wrong place|mid-position|\bfronts\b.*\bnoun\b/i },

  // --- modal ---
  { code: 'modality.strength_miscalibrated', re: /strength|too (strong|weak)|weakens certainty|weak possibility|confident|urgent|urgency|equally strong|possibility modal where obligation/i },
  { code: 'modality.function_confusion', re: /obligation|permission|deduction|advice|expectation|prohibition|ability|directive|speculation|'can' (is|for)/i },

  // --- kondisional ---
  { code: 'conditionals.type_mismatch', re: /conditional|hypothetical|unreal|general truth|real condition|timeless fact|unlikely event|real past fact|real current fact/i },

  // --- pasif ---
  { code: 'passive.active_for_passive', re: /active (voice|form|infinitive|subject|-voice)|cannot perform|capable of believing/i },
  { code: 'passive.participle_form', re: /past participle|-ing form instead|base form instead of the past participle/i },

  // --- artikel ---
  { code: 'articles.countability_quantifier', re: /uncountable|countable|pluraliz|quantifier|'much'|'little'|partitive/i },
  { code: 'articles.definiteness_mismatch', re: /indefinite|definite|article|generic plural|already-identified|first mention/i },

  // --- perbandingan ---
  { code: 'comparison.degree_scope', re: /superlative|two-item|comparison with|among (three|multiple)|ongoing change|fixed-point|ranking|equality/i },
  { code: 'comparison.form_intensifier', re: /comparative|intensifier|'-er'|'more \+|base adjective/i },

  // --- preposisi ---
  { code: 'prepositions.collocation', re: /collocat|'proud of'|'pleased|'by \+ transport'|transport|'search for'|'deal with'|'of' universally|emotion adjectives|pattern from a related phrase/i },
  { code: 'prepositions.semantic_category', re: /preposition|day-level|deadline|duration|point-in-time|'during'|'while'|surface|enclosed|movement|route point|container|point-location/i },

  // --- komplementasi ---
  { code: 'complementation.meaning_pair_shift', re: /'remember|'try (to|-ing)'|regret|formal-announcement|recalling a completed|experiment with/i },
  { code: 'complementation.bare_form_error', re: /bare infinitive/i },
  { code: 'complementation.gerund_infinitive_swap', re: /gerund|infinitive/i },

  // --- klausa relatif ---
  { code: 'relative.restrictiveness', re: /essential|identifying detail|uniquely identifies|extra detail|non-restrictive/i },
  { code: 'relative.pronoun_choice', re: /relative pronoun|'who'?s?'|'whose'|'whom'|non-personal relative|personal relative|personal pronoun 'them'|subject-form 'who'|omissible/i },

  // --- pertanyaan & negasi ---
  { code: 'question.polarity_negation', re: /tag polarity|double negative|negative pronoun|positive indefinite|polarity structure|'either'|'neither'|agreement structure|negative statement|negative context/i },
  { code: 'question.auxiliary_error', re: /wrong auxiliary|auxiliary borrowed|auxiliary substituted|'did' as if|'does' for|present-tense (negative )?auxiliary|question-formation rule/i },

  // --- pronomina ---
  { code: 'pronouns.case_form', re: /(subject|object|possessive)[- ]pronoun|pronoun-before-noun|stand-alone-possessive/i },

  // --- tense & aspek (paling umum, taruh terakhir) ---
  { code: 'tense_aspect.habitual_overgeneralized', re: /habit|routine|habitual/i },
  { code: 'tense_aspect.future_form_confusion', re: /future (perfect|continuous|marker|contrast)|'going to'|schedul|timetable|personal (plans|arrangements)|future-in-the-past|prediction|by the time|spontaneous offer/i },
  { code: 'tense_aspect.perfect_misuse', re: /present perfect|past perfect|perfect gerund|prior (action|event|to another)|earlier (past )?event|sequencing|flattening the sequence|sequential/i },
  { code: 'tense_aspect.aspect_for_completed', re: /in-progress|completed (result|trip|action|event|prior|unwise)|still in progress|finished|already (completed|happened)|ongoing (past activity|duration)|interrupted|in progress/i },
  { code: 'tense_aspect.progressive_overuse', re: /continuous|progressive|-ing|stative/i },
  { code: 'tense_aspect.timeline_mismatch', re: /past (tense|simple|narrative|form|time)|present (tense|simple|time|form)|tense|shifts to|backshift|time frame|current period/i }
];

/* ============================================================
 * 4) Mesin klasifikasi + IO
 * ============================================================ */
function normalizeLabel(label) {
  // Label dibandingkan apa adanya (verbatim); trim hanya untuk jaga-jaga spasi liar.
  return String(label).trim();
}

function classify(label, ctx) {
  var key = normalizeLabel(label);
  if (Object.prototype.hasOwnProperty.call(OVERRIDES, key)) return OVERRIDES[key];
  // varian tanpa titik akhir (beberapa label diakhiri '.')
  var noDot = key.replace(/\.$/, '');
  if (Object.prototype.hasOwnProperty.call(OVERRIDES, noDot)) return OVERRIDES[noDot];
  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    if (r.family && ctx && ctx.family !== r.family) continue;
    if (r.re.test(key)) return r.code;
  }
  return null;
}

function collectLabels() {
  var data = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  var seen = {}; // label -> {families:{}, count}
  var order = [];
  (data.templates || []).forEach(function (tpl) {
    (tpl.distractors || []).forEach(function (d) {
      if (!d || typeof d.misconception !== 'string' || !d.misconception.trim()) return;
      var label = d.misconception; // verbatim, TANPA trim — kunci peta harus persis
      if (!seen[label]) { seen[label] = { families: {}, count: 0 }; order.push(label); }
      seen[label].count++;
      seen[label].families[tpl.family] = (seen[label].families[tpl.family] || 0) + 1;
    });
  });
  return { labels: order, meta: seen };
}

function buildMap() {
  var got = collectLabels();
  var map = {};
  var orphans = [];
  got.labels.forEach(function (label) {
    var fams = Object.keys(got.meta[label].families);
    var code = classify(label, { family: fams[0] });
    if (!code || !CODES[code]) { orphans.push(label); return; }
    map[label] = code;
  });
  return { map: map, orphans: orphans, meta: got.meta, labels: got.labels };
}

function distribution(map) {
  var dist = {};
  Object.keys(map).forEach(function (label) {
    dist[map[label]] = (dist[map[label]] || 0) + 1;
  });
  return dist;
}

function main() {
  var args = process.argv.slice(2);
  var write = args.indexOf('--write') !== -1;
  var report = args.indexOf('--report') !== -1;

  var built = buildMap();
  if (built.orphans.length) {
    console.error('GAGAL: ' + built.orphans.length + ' label yatim (tidak terpetakan):');
    built.orphans.forEach(function (l) { console.error('  - ' + JSON.stringify(l)); });
    process.exit(1);
  }

  var taxonomy = { schema: SCHEMA, codes: CODES, map: built.map };

  if (write) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(taxonomy, null, 2) + '\n');
    console.log('ok - misconception-taxonomy-v1.json ditulis (' + Object.keys(built.map).length + ' label, ' + Object.keys(CODES).length + ' kode)');
  } else {
    // mode validasi: file di disk harus identik dengan hasil regenerasi
    var onDisk;
    try {
      onDisk = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    } catch (e) {
      console.error('GAGAL: misconception-taxonomy-v1.json tidak bisa dibaca. Jalankan dengan --write dulu.');
      process.exit(1);
    }
    var same = JSON.stringify(onDisk) === JSON.stringify(taxonomy);
    if (!same) {
      console.error('GAGAL: misconception-taxonomy-v1.json tidak sinkron dengan generator. Jalankan: node tools/build-misconception-taxonomy.js --write');
      process.exit(1);
    }
    console.log('ok - taksonomi sinkron: ' + Object.keys(built.map).length + ' label -> ' + Object.keys(CODES).length + ' kode, nol yatim');
  }

  if (report) {
    var dist = distribution(built.map);
    var rows = Object.keys(dist).map(function (c) { return [c, dist[c]]; });
    rows.sort(function (a, b) { return b[1] - a[1]; });
    console.log('\nDistribusi kode (label unik per kode):');
    rows.forEach(function (r) { console.log('  ' + String(r[1]).padStart(3) + '  ' + r[0]); });
  }
}

if (require.main === module) main();

module.exports = {
  SCHEMA: SCHEMA,
  CODES: CODES,
  OVERRIDES: OVERRIDES,
  RULES: RULES,
  classify: classify,
  collectLabels: collectLabels,
  buildMap: buildMap,
  distribution: distribution
};
