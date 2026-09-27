# Klasifikasi taksonomi untuk label miskonsepsi BARU dari paket m025-376.
# Kode dipilih dari label lama yang paling mirip di misconception-taxonomy-v1.json.
TAX = {
    # A1 bagian 1
    "object pronoun used as subject": "pronouns.case_form",
    "possessive form used as subject": "pronouns.case_form",
    "pronoun gender does not match the person": "pronouns.case_form",
    "possessive adjective used without a noun": "pronouns.case_form",
    "subject pronoun used to show ownership": "pronouns.case_form",
    "be verb matched to the nearest word instead of the whole subject": "agreement.number_mismatch",
    "-ies ending added to a word that does not end in consonant + y": "agreement.number_mismatch",
    "plural marked twice": "structure.double_marking",
    "correctly matching plural but ignoring the nearness cue": "agreement.number_mismatch",
    "using a singular far demonstrative with a plural, near noun": "agreement.number_mismatch",
    "correctly matching singular but ignoring the distance cue": "agreement.number_mismatch",
    "correctly matching distance but ignoring singular agreement": "agreement.number_mismatch",
    "using a plural near demonstrative with a singular, distant noun": "agreement.number_mismatch",
    "correctly matching nearness but ignoring plural agreement": "agreement.number_mismatch",
    "its and it's confused": "lexical.form_confusion",
    "owner form does not match the number of owners": "pronouns.case_form",
    "their and there confused": "lexical.form_confusion",
    "your and you're confused": "lexical.form_confusion",
    # A1 bagian 1 (revisi)
    "he-she-it be form used with you": "agreement.number_mismatch",
    "do added to a present be question": "question.auxiliary_error",
    "-es added to a word that only needs -s": "agreement.number_mismatch",
    # A1 bagian 2
    "he-she-it have form used with a plural subject": "agreement.number_mismatch",
    "he-she-it have form used with I": "agreement.number_mismatch",
    "plural be used with an uncountable noun": "articles.countability_quantifier",
    "have used to say that something exists": "transfer.id_l1_pattern",
    "surface preposition used for something inside": "prepositions.semantic_category",
    "below preposition used for something inside": "prepositions.semantic_category",
    "surface preposition used for a position beside": "prepositions.semantic_category",
    "inside preposition used for a position beside": "prepositions.semantic_category",
    "below preposition used for a position beside": "prepositions.semantic_category",
    "below preposition used for something on a surface": "prepositions.semantic_category",
    "-s added where the verb needs -es": "agreement.number_mismatch",
    "singular progressive used for a plural habit": "tense_aspect.progressive_overuse",
    "-s added to a consonant + y verb without changing y": "agreement.number_mismatch",
    "what used when the answer is not a thing": "question.wh_choice",
    "where used when the answer is not a place": "question.wh_choice",
    "when used when the answer is not a time": "question.wh_choice",
    "who used when the answer is not a person": "question.wh_choice",
    "-s added to the verb after can": "complementation.bare_form_error",
    "-ing form used after can": "complementation.bare_form_error",
    "not placed before can": "structure.word_order",
    "-s added to can": "agreement.number_mismatch",
    "be added before can": "structure.double_marking",
    # A1 bagian 3
    "plural be used in present continuous with a singular subject": "agreement.number_mismatch",
    "singular be used in present continuous with a plural subject": "agreement.number_mismatch",
    "he-she-it be form used with I": "agreement.number_mismatch",
    "-ing missing after am, is, or are": "agreement.bare_form",
    "plural past be used with I": "agreement.number_mismatch",
    "present he-she-it be used for I in the past": "tense_aspect.timeline_mismatch",
    "did used in place of a past be verb": "question.auxiliary_error",
    "plural past be used with a singular subject": "agreement.number_mismatch",
    "-ed added to a verb ending in e": "structure.double_marking",
    "-ed added to a consonant + y verb without changing y": "agreement.bare_form",
    "-s added to the verb after did": "complementation.bare_form_error",
    "-ing form used after did": "complementation.bare_form_error",
    "negative quantifier used in a positive sentence": "question.polarity_negation",
    "clock-time preposition used with a month": "prepositions.semantic_category",
    "deadline preposition used to name a month": "prepositions.semantic_category",
    "at night pattern copied to the evening": "prepositions.collocation",
    "day preposition used for a time that is not a day": "prepositions.semantic_category",
    "direction preposition used for a time": "prepositions.semantic_category",
    # A2 bagian 1 (pelajaran 18-24)
    "be form with a subject used in a command": "complementation.bare_form_error",
    "not used without do in a negative command": "agreement.missing_auxiliary",
    "-ing form used after don't in a command": "complementation.bare_form_error",
    "-s added to the verb after let's": "complementation.bare_form_error",
    "-ing form used after let's": "complementation.bare_form_error",
    "to added after let's": "complementation.bare_form_error",
    "-s added to the verb after I": "agreement.number_mismatch",
    "am inserted before a main verb": "structure.malformed_blend",
    "frequency word moved to the front of a question": "structure.word_order",
    "frequency word placed before the subject in a question": "structure.word_order",
    "statement order used for a question": "structure.inversion_error",
    "singular owner form used for plural owners": "agreement.number_mismatch",
    "'s added to a plural that already ends in s": "structure.double_marking",
    "s added to a plural that does not take s": "structure.double_marking",
    "regular plural rule used for an irregular plural": "agreement.number_mismatch",
    "owner named without any ownership marker": "transfer.id_l1_pattern",
    "of + name used for a person's belongings": "transfer.id_l1_pattern",
    "to dropped after would like": "complementation.verb_pattern",
    "-ing form used after would like": "complementation.gerund_infinitive_swap",
    "be used with like in an offer": "structure.malformed_blend",
    "will used for a polite offer": "modality.function_confusion",
    "to dropped after would like + person": "complementation.verb_pattern",
    "past form used after would like": "complementation.bare_form_error",
    "do added to a question that already has would": "question.auxiliary_error",
    "consonant not doubled before -ing": "structure.omitted_element",
    "-s added to the second verb": "complementation.verb_pattern",
    "second main verb added after a feeling verb": "complementation.verb_pattern",
    "final e kept before -ing": "structure.double_marking",
    "progressive form used for a habit": "tense_aspect.progressive_overuse",
    "singular habit form used for a plural action now": "tense_aspect.habitual_overgeneralized",
    "progressive negative used for a general habit": "tense_aspect.progressive_overuse",
    "don't used with he, she, or it": "agreement.number_mismatch",
    "not used without a helper verb in a negative": "agreement.missing_auxiliary",
    "do mixed with an -ing verb": "structure.malformed_blend",
    "don't have to used for a ban": "modality.negation_scope",
    "must used where the rule forbids the action": "modality.function_confusion",
    "can used for something the rules forbid": "modality.function_confusion",
    "have to used when there is no need": "modality.function_confusion",
    "must used to ask for permission": "modality.function_confusion",
    "have used without to in a question": "structure.omitted_element",
    "do used to ask for permission": "question.auxiliary_error",
    "don't have to used for a law": "modality.negation_scope",
    "mustn't used for something that is required": "modality.negation_scope",
    # A2 bagian 2 (pelajaran 25-31)
    "will used after if": "conditionals.clause_form_swap",
    "-ing form used after will": "complementation.bare_form_error",
    "doesn't used with a plural subject": "agreement.number_mismatch",
    "a used before a vowel sound": "articles.sound_rule",
    "an used for something the listener can already identify": "articles.definiteness_mismatch",
    "some reused for things already mentioned": "articles.definiteness_mismatch",
    "final consonant not doubled before -er": "structure.omitted_element",
    "the dropped before a superlative": "articles.definiteness_mismatch",
    "the used with a comparative for a group": "comparison.degree_scope",
    "-est added to a long adjective": "comparison.form_intensifier",
    "regular -ed added to an irregular verb": "structure.malformed_blend",
    "singular past be used with you": "agreement.number_mismatch",
    "few used when the meaning needs a large number": "articles.countability_quantifier",
    "few or a few used with an uncountable noun": "articles.countability_quantifier",
    "of dropped after a lot": "structure.omitted_element",
    "a placed before many": "structure.malformed_blend",
    "at used for a city or country": "prepositions.semantic_category",
    "on used for a city or country": "prepositions.semantic_category",
    "in used for a meeting point": "prepositions.semantic_category",
    "on used for a meeting point": "prepositions.semantic_category",
    "in used for a floor of a building": "prepositions.collocation",
    "at used for a floor of a building": "prepositions.collocation",
    "in used instead of the fixed phrase at home": "prepositions.collocation",
    "on used instead of the fixed phrase at home": "prepositions.collocation",
    "comparative form used inside as ... as": "comparison.form_intensifier",
    "like used to close an as ... as comparison": "structure.malformed_blend",
    "comparative -er closed with as instead of than": "structure.malformed_blend",
    "first as dropped in an as ... as comparison": "structure.omitted_element",
}


def install(tool_path, tax=TAX):
    """Sisipkan OVERRIDES baru (idempoten) ke tools/build-misconception-taxonomy.js."""
    src = open(tool_path, encoding='utf-8').read()
    marker = "var OVERRIDES = {\n"
    assert marker in src
    lines = ["  // === m025-376: soal latihan baru A1-A2 (label baru, dipetakan ke kode label lama yang paling mirip) ==="]
    for k, v in tax.items():
        key = "'" + k.replace("\\", "\\\\").replace("'", "\\'") + "'"
        if key + ':' in src:
            continue
        lines.append(f"  {key}: '{v}',")
    if len(lines) == 1:
        return 0
    src = src.replace(marker, marker + "\n".join(lines) + "\n", 1)
    open(tool_path, 'w', encoding='utf-8').write(src)
    return len(lines) - 1


if __name__ == '__main__':
    import sys
    print('overrides added:', install(sys.argv[1]))
