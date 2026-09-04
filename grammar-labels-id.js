/**
 * m025-125 — judul lesson grammar dalam Bahasa Indonesia.
 *
 * Sebelum ini, kunci subskill dari bank soal dipakai apa adanya sebagai judul di layar
 * siswa, jadi yang muncul adalah "SUBJECT OBJECT PRONOUNS AND POSSESSIVES" atau
 * "PRESENT SIMPLE VS CONTINUOUS". Nama bentuk grammar (present perfect, gerund, passive)
 * sengaja dipertahankan karena itu memang istilah yang dipelajari; yang diterjemahkan
 * adalah kalimat penjelasnya, bukan nama bentuknya.
 */
(function (root) {
  'use strict';
  var GRAMMAR_SKILL_TITLES_ID = {
    // ---------------------------------------------------------- tense_aspect
    present_simple_vs_continuous: 'Kebiasaan atau sedang berlangsung: present simple dan present continuous',
    past_simple_vs_present_perfect: 'Waktu lampau yang jelas atau masih terhubung sekarang: past simple dan present perfect',
    future_forms_plan_vs_prediction: 'Rencana atau perkiraan: bentuk masa depan',
    past_continuous_vs_past_simple_interrupted_action: 'Kejadian yang sedang berlangsung lalu terpotong: past continuous dan past simple',
    present_perfect_continuous_vs_present_perfect_simple: 'Menekankan lamanya atau hasilnya: present perfect continuous dan present perfect simple',
    past_perfect_sequencing_two_past_events: 'Menyusun dua kejadian lampau dengan past perfect',
    future_continuous_vs_future_perfect: 'Sedang berlangsung nanti atau sudah selesai nanti: future continuous dan future perfect',
    future_in_the_past_would_vs_was_going_to: 'Rencana masa depan yang diceritakan dari masa lalu: would dan was going to',
    future_perfect_continuous_duration_before_deadline: 'Menghitung lamanya sampai satu batas waktu dengan future perfect continuous',
    narrative_past_perfect_flashback_vs_past_simple_sequence: 'Kilas balik atau urutan maju dalam cerita: past perfect dan past simple',
    past_habitual_used_to_vs_would_vs_past_simple: 'Kebiasaan lama: used to, would, dan past simple',
    past_perfect_continuous_background_cause: 'Menjelaskan sebab yang berlangsung lama sebelumnya dengan past perfect continuous',
    present_perfect_for_unfinished_time_period_this_week: 'Rentang waktu yang belum berakhir dengan present perfect',
    present_simple_for_fixed_schedules_not_personal_plans: 'Jadwal tetap memakai present simple, bukan rencana pribadi',
    state_verbs_resist_continuous_form: 'Kata kerja keadaan yang tidak dipakai dalam bentuk -ing',

    // ----------------------------------------------------------------- modals
    obligation_vs_permission: 'Kewajiban atau izin: memilih modal yang tepat',
    deduction_present: 'Menyimpulkan keadaan sekarang dengan must, might, dan can’t',
    ability_past_could_vs_was_able_to: 'Kemampuan di masa lalu: could dan was able to',
    deduction_past_must_have_vs_cant_have: 'Menyimpulkan kejadian lampau: must have dan can’t have',
    necessity_absence_neednt_vs_mustnt: 'Tidak perlu atau tidak boleh: needn’t dan mustn’t',
    advice_should_vs_ought_to_vs_had_better: 'Memberi saran: should, ought to, dan had better',
    speculation_scale_may_might_could_vs_will: 'Tingkat keyakinan: may, might, could, dan will',
    past_regret_should_have_vs_shouldnt_have: 'Menyesali masa lalu: should have dan shouldn’t have',
    modal_of_criticism_should_have_vs_could_have_contrast: 'Menegur atau menyebut peluang yang lewat: should have dan could have',
    modal_perfect_could_have_missed_opportunity: 'Peluang yang terlewat dengan could have',
    possibility_vs_permission_can_vs_may_formal_register: 'Kemungkinan atau izin dalam bahasa formal: can dan may',
    ability_nonfinite_forms_be_able_to: 'Menyatakan kemampuan saat modal tidak bisa dipakai: be able to',

    // ----------------------------------------------------------- conditionals
    zero_vs_first_conditional: 'Fakta umum atau kemungkinan nyata: zero dan first conditional',
    second_conditional_unreal_present: 'Pengandaian yang tidak nyata sekarang: second conditional',
    third_conditional_unreal_past: 'Pengandaian yang tidak terjadi di masa lalu: third conditional',
    mixed_conditional_past_cause_present_result: 'Sebab di masa lalu, akibat sekarang: mixed conditional',
    mixed_conditional_present_cause_past_result: 'Keadaan sekarang, akibat di masa lalu: mixed conditional',
    unless_vs_if_not: 'Membedakan unless dan if not',
    conditional_with_unless_provided_that_as_long_as_distinction: 'Syarat dengan unless, provided that, dan as long as',
    conditional_inversion_were_i_to: 'Pengandaian formal tanpa if: were I to',
    formal_inversion_had_i_known: 'Pengandaian lampau formal tanpa if: had I known',
    implied_conditional_otherwise: 'Syarat yang tersirat lewat otherwise',
    future_time_clauses_present_after_when_as_soon_as: 'Anak kalimat waktu memakai present setelah when dan as soon as',

    // --------------------------------------------------------------- passive
    agent_omission_when_irrelevant: 'Kapan pelaku boleh dihilangkan dalam kalimat pasif',
    passive_with_modal_verbs: 'Kalimat pasif bersama kata modal',
    get_passive_informal_vs_be_passive: 'Pasif santai dan pasif baku: get dan be',
    causative_have_get_something_done: 'Menyuruh orang lain mengerjakan sesuatu: have dan get something done',
    impersonal_reporting_it_is_said_that: 'Melaporkan tanpa menyebut sumber: it is said that',
    impersonal_passive_reporting_believed_thought: 'Pasif pelaporan: is believed dan is thought',
    passive_infinitive_after_modal_expectation: 'Harapan dalam bentuk pasif setelah modal',
    passive_causative_vs_passive_simple_confusion: 'Membedakan pasif biasa dan pasif menyuruh',
    passive_gerund_vs_passive_infinitive_after_verb: 'Pasif setelah kata kerja: bentuk -ing atau to be done',
    passive_with_two_objects_verb_give_send_choice_of_subject: 'Kalimat pasif dari kata kerja berobjek dua seperti give dan send',

    // -------------------------------------------------------- reported_speech
    backshift_statement: 'Menggeser tense saat melaporkan ucapan',
    reported_questions_word_order: 'Urutan kata saat melaporkan pertanyaan',
    reported_commands_infinitive: 'Melaporkan perintah dengan bentuk to',
    reporting_verb_choice_suggest_vs_tell: 'Memilih kata kerja pelaporan: suggest dan tell',
    reported_speech_modal_shift_can_to_could: 'Pergeseran modal saat melaporkan: can menjadi could',
    reported_yes_no_questions_if_whether: 'Melaporkan pertanyaan ya/tidak dengan if dan whether',
    reporting_first_conditional_sentences: 'Melaporkan kalimat pengandaian first conditional',
    reported_speech_pronoun_and_possessive_shift: 'Pergeseran kata ganti dan kepemilikan saat melaporkan',
    reporting_verb_pattern_deny_admit_apologize_for: 'Pola setelah deny, admit, dan apologize for',
    time_and_place_reference_shift: 'Pergeseran keterangan waktu dan tempat saat melaporkan',

    // --------------------------------------------------- articles_determiners
    first_vs_subsequent_mention: 'Penyebutan pertama dan penyebutan berikutnya: a dan the',
    much_many_little_few_countability: 'Benda terhitung dan tak terhitung: much, many, little, few',
    zero_article_generic_plural_vs_the_specific: 'Tanpa kata sandang untuk hal umum, the untuk hal tertentu',
    definite_article_with_unique_referents_and_superlatives: 'The untuk hal yang hanya satu dan untuk bentuk superlative',
    demonstrative_reference_distance_this_these_that_those: 'Jarak rujukan: this, these, that, those',
    possessive_determiner_vs_double_genitive_of_mine: 'Kepemilikan sebelum kata benda dan bentuk of mine',
    article_with_institutions_school_prison_hospital: 'Kata sandang pada lembaga: school, prison, hospital',
    quantifier_of_before_object_pronoun: 'Kata jumlah + of sebelum kata ganti objek',
    zero_article_with_proper_nouns_exceptions_the_netherlands: 'Nama diri tanpa kata sandang dan kekecualiannya',

    // ---------------------------------------------------------- prepositions
    time_prepositions_in_on_at: 'Kata depan waktu: in, on, at',
    place_prepositions_at_in_on: 'Kata depan tempat: at, in, on',
    dependent_prepositions_after_adjectives: 'Kata depan yang melekat setelah kata sifat',
    movement_prepositions_through_across_along_over: 'Kata depan gerak: through, across, along, over',
    phrasal_verb_particle_changes_meaning: 'Partikel yang mengubah makna phrasal verb',
    preposition_placement_formal_vs_informal_relative_clause: 'Letak kata depan pada anak kalimat: baku dan santai',
    preposition_of_means_by_vs_with_vs_on: 'Kata depan alat dan cara: by, with, on',
    preposition_of_time_duration_for_vs_since_vs_during: 'Lamanya waktu: for, since, during',
    preposition_after_adjective_of_emotion_pleased_with_vs_about: 'Kata depan setelah kata sifat perasaan: pleased with dan pleased about',
    dependent_preposition_after_noun_reason_for_solution_to: 'Kata depan yang melekat setelah kata benda: reason for, solution to',

    // --------------------------------------------------- gerunds_infinitives
    verb_pattern_meaning_change_stop: 'Perubahan makna setelah stop: bentuk -ing atau to',
    gerund_after_preposition_vs_infinitive_of_purpose: 'Setelah kata depan pakai -ing, untuk menyatakan tujuan pakai to',
    verb_pattern_remember_forget_meaning_change: 'Perubahan makna setelah remember dan forget',
    infinitive_after_too_enough_adjective: 'Bentuk to setelah too dan enough',
    verb_pattern_try_meaning_change: 'Perubahan makna setelah try',
    bare_infinitive_after_modal_and_causative_make_let: 'Bentuk dasar tanpa to setelah modal, make, dan let',
    gerund_as_subject_vs_infinitive_as_subject_formality: 'Subjek berupa -ing atau to: perbedaan rasa bahasanya',
    perfect_gerund_vs_simple_gerund_time_reference: 'Menunjukkan waktu lebih awal: having done dan doing',
    verb_pattern_regret_mean_go_on_meaning_change: 'Perubahan makna setelah regret, mean, dan go on',

    // ---------------------------------------------------- relative_clauses
    defining_vs_nondefining: 'Anak kalimat penjelas yang wajib dan yang hanya tambahan',
    reduced_relative_clauses_participle: 'Memendekkan anak kalimat dengan bentuk participle',
    relative_pronoun_whose_possession: 'Menyatakan kepemilikan dalam anak kalimat dengan whose',
    relative_clause_omitting_object_pronoun: 'Kapan kata penghubung boleh dihilangkan',
    relative_clause_with_quantifier_some_of_which_many_of_whom: 'Anak kalimat berjumlah: some of which dan many of whom',

    // ------------------------------------------------------------- comparison
    comparative_vs_superlative_scope: 'Membandingkan dua hal atau menyebut yang paling: comparative dan superlative',
    as_as_equality_vs_comparative: 'Menyatakan setara dengan as ... as',
    irregular_comparative_better_worse_forms: 'Better dan worse: bentuk banding tanpa -er',
    double_comparative_progressive_change: 'Perubahan yang terus berlanjut: the more ... the more',
    less_vs_fewer_countability_agreement: 'Membandingkan jumlah: less dan fewer',
    comparative_intensifiers_much_far_a_lot_before_comparative: 'Penguat sebelum bentuk perbandingan: much, far, a lot',
    superlative_with_ever_present_perfect_combination: 'Bentuk superlative bersama ever dan present perfect',

    // ------------------------------------------------------ question_negation
    question_tag_polarity: 'Menyusun question tag: positif atau negatif',
    negative_questions_expecting_agreement: 'Pertanyaan negatif yang mengharapkan persetujuan',
    indirect_questions_embedded_word_order: 'Urutan kata pada pertanyaan tidak langsung',
    agreement_structures_so_do_i_neither_do_i: 'Menyatakan senada: so do I dan neither do I',
    double_negative_avoidance_single_negation_rule: 'Satu kalimat cukup satu penanda negatif',
    echo_questions_for_clarification: 'Pertanyaan ulang untuk memastikan',
    subject_vs_object_questions_word_order: 'Pertanyaan tentang subjek dan tentang objek',

    // ------------------------------------------------------- error_correction
    subject_verb_agreement_with_intervening_phrase: 'Kesesuaian subjek dan kata kerja saat ada sisipan',
    word_order_adverb_placement: 'Letak kata keterangan dalam kalimat',
    article_omission_with_uncountable: 'Kata sandang yang tidak dipakai pada benda tak terhitung',
    comma_splice_run_on_correction: 'Memperbaiki dua kalimat yang disambung hanya dengan koma',
    confusing_word_pair_affect_vs_effect: 'Pasangan kata yang mudah tertukar: affect dan effect',
    dangling_modifier_correction: 'Memperbaiki keterangan yang menggantung tanpa pelaku jelas',
    parallel_structure_error_correction: 'Menjaga bentuk yang sejajar dalam satu rangkaian',

    // -------------------------------------------------------- linking_devices
    contrast_connectors_although_despite_however_distinction: 'Penghubung pertentangan: although, despite, however',
    result_connectors_so_such_that_therefore_distinction: 'Penghubung akibat: so, such ... that, therefore',
    purpose_connectors_so_that_in_order_to_distinction: 'Penghubung tujuan: so that dan in order to',
    addition_connectors_furthermore_in_addition_moreover_register: 'Penghubung penambahan dan rasa bahasanya',

    // ----------------------------------------------------- emphasis_inversion
    cleft_sentences_it_was_x_that_emphasis: 'Menonjolkan satu bagian kalimat: it was ... that',
    negative_adverbial_inversion_never_rarely_not_only: 'Pembalikan setelah keterangan negatif: never, rarely, not only',
    fronting_for_emphasis_such_was_the_impact: 'Memajukan bagian kalimat untuk penekanan',

    // ---------------------------------------------------------- core_grammar
    present_simple_basics: 'Dasar present simple',
    be_subject_agreement: 'Menyesuaikan am, is, dan are dengan subjek',
    there_is_are: 'Menyatakan keberadaan: there is dan there are',
    possessive_adjectives: 'Kata kepemilikan sebelum kata benda: my, your, her',
    can_ability: 'Menyatakan kemampuan dengan can',

    // ------------------------------------------------------ advanced_grammar
    mixed_conditional_past_cause_future_result: 'Sebab di masa lalu, akibat di masa depan',
    modal_deduction_past_progressive: 'Menyimpulkan kejadian yang sedang berlangsung di masa lalu',
    inversion_after_only_restrictive_phrase: 'Pembalikan setelah ungkapan pembatas only',
    pseudo_cleft_what_clause_emphasis: 'Penekanan dengan anak kalimat what',
    participle_clause: 'Anak kalimat ringkas berbentuk participle',
    concession_linking: 'Menghubungkan gagasan yang saling mengalah',
    // m025-149: sepuluh lesson A1 yang masuk lewat kurikulum grammar terbaru
    articles_a_an_the: 'Artikel a, an, dan the: memilih dari bunyi awal',
    have_got_has_got: 'Menyatakan kepemilikan dengan have got dan has got',
    past_simple_regular_forms: 'Kata kerja lampau beraturan dan bentuk dasar sesudah did',
    past_be_was_were: 'Was dan were: bentuk lampau kata kerja be',
    plural_nouns_basic: 'Kata benda jamak dan perubahan ejaannya',
    place_prepositions_basic: 'Preposisi tempat: in, on, dan at',
    present_continuous_basics: 'Present continuous: sedang berlangsung sekarang',
    question_words_basic: 'Kata tanya dasar: who, what, where, when, why',
    some_any_countable_uncountable: 'Some, any, many, dan much sesuai jenis kata benda',
    subject_object_pronouns_and_possessives: 'Kata ganti subjek, objek, dan bentuk kepemilikan',
    // ------------------------------------------ 14 lesson baru (G1, R6 perbaikan-10)
    imperative_commands_base_form: 'Kalimat perintah: mulai dari kata kerja dasar',
    adverbs_of_frequency_mid_position: 'Posisi kata frekuensi: always, usually, never',
    possessive_s_noun_ownership: "Kepemilikan dengan apostrof + s: Sinta's bag",
    would_like_polite_requests: 'Minta dengan sopan: would like',
    like_love_hate_plus_gerund_preferences: 'Kesukaan dengan -ing: like, love, hate + gerund',
    present_perfect_experience_ever_never: 'Pengalaman hidup: present perfect dengan ever dan never',
    present_perfect_with_for_since_duration: 'Dari dulu sampai sekarang: present perfect dengan for dan since',
    wish_unreal_present_past_simple: 'Harapan soal sekarang: wish + past simple',
    if_only_past_regret_past_perfect: 'Penyesalan masa lalu: if only + past perfect',
    future_perfect_epistemic_past_assumption: 'Dugaan yakin yang sudah kejadian: will have + past participle',
    perfect_passive_infinitive_anteriority_reported_events: 'Pasif yang lebih dulu terjadi: to have been + past participle',
    mandative_subjunctive_after_demand_insist: 'Subjunctive bentuk dasar: demand that he resign',
    sentential_which_whole_clause_antecedent: 'Komentar untuk satu klausa utuh: koma + which',
    generic_the_species_class_predicates: 'The generik untuk spesies: the Sumatran tiger',
  'comparative_formation_er_vs_more_no_double_marking': 'Membentuk komparatif: -er atau more, tanpa penanda ganda',
  'adverb_of_manner_ly_vs_adjective_after_verb': 'Kata sifat atau adverbia -ly?',
  'how_much_vs_how_many_quantity_questions': 'How much atau how many?',
  'indefinite_compounds_something_anything_nothing': 'Something, anything, atau nothing?',
  'cause_result_connectors_because_vs_so': 'Because atau so: sebab atau akibat?',
  'present_perfect_just_already_yet_placement': 'Just, already, yet: penempatan yang tepat',
  'reflexive_pronouns_myself_vs_each_other': 'Myself atau each other?',
  'substitution_one_ones_avoid_repetition': 'One dan ones untuk menghindari pengulangan kata',
  'wish_would_annoyance_at_others_behaviour': 'Wish + would: keluhan kebiasaan orang lain',
  'be_get_used_to_gerund_vs_used_to_infinitive': 'Be/get used to + -ing vs used to + kata dasar',
  'would_rather_bare_infinitive_vs_prefer_to': 'Would rather + kata dasar vs prefer to',
  'be_supposed_to_expectation_vs_obligation': 'Be supposed to: ekspektasi dan jadwal yang bisa meleset',
  'its_high_time_past_simple_unreal': 'It\'s high time + past simple: desakan buat sekarang',
  'as_if_as_though_unreal_past_form': 'As if / as though + past: perbandingan tak nyata',
  'neednt_have_vs_didnt_need_to': 'Needn\'t have vs didn\'t need to: perlu-tidaknya di masa lampau',
  'no_sooner_hardly_inversion_paired_correlatives': 'No sooner ... than / hardly ... when: inversi berpasangan',
  'concessive_whatever_however_no_matter': 'However + adjektiva, whatever, no matter: klausa konsesif',
  'verb_phrase_ellipsis_after_auxiliary': 'Elipsis frasa kerja: kata bantu yang menggantikan',
  'but_for_noun_phrase_unreal_condition': 'But for: pengandaian padat dalam satu frasa',
  'semi_modal_dare_bare_infinitive_negative': 'Daren\'t: semi-modal untuk \'tidak berani\'',
  'possessive_subject_of_gerund_formal': 'His resigning: posesif di depan gerund',
  'marginal_prepositions_notwithstanding_pending_barring': 'Barring: preposisi formal untuk pengecualian',
  'all_the_more_intensified_comparative_with_cause': 'All the more: makin terasa karena ada alasannya',
  'negated_participle_clause_not_wishing_to': 'Not wanting: negasi di depan klausa -ing',
  'albeit_reduced_concession_phrase': 'Albeit: konsesi ringkas tanpa klausa',
  'who_whom_hypercorrection_embedded_subject': 'Who vs whom: whom yang kelihatan formal tapi salah',
};

  root.GRAMMAR_SKILL_TITLES_ID = GRAMMAR_SKILL_TITLES_ID;
  if (typeof module !== 'undefined' && module.exports) module.exports = { GRAMMAR_SKILL_TITLES_ID: GRAMMAR_SKILL_TITLES_ID };
})(typeof self !== 'undefined' ? self : globalThis);
