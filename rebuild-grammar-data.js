const fs=require('fs');
const path=require('path');

const target=path.join(__dirname,'grammar-templates.json');
const data=JSON.parse(fs.readFileSync(target,'utf8'));

const replacements={
  b4_007:{
    id:'b4_007',family:'conditionals',subskill:'future_time_clauses_present_after_when_as_soon_as',cefr:'B1',questionType:'multiple_choice',
    pedagogicalObjective:"Use present simple—not 'will'—inside a future time clause introduced by when, as soon as, before, or after.",
    misconceptionTargeted:"Learner puts 'will' in both clauses because both events refer to the future.",
    reasoningOperation:'locate the future time-clause connector -> keep present simple in that clause -> place future marking in the main clause',
    stem:"I'll call you as soon as the train ___.",options:['arrives','will arrive','arrived','would arrive'],correctIndex:0,
    distractors:[
      {option:'will arrive',misconception:'duplicates future marking inside the time clause',whyFails:"After 'as soon as', English normally uses present simple for future reference; 'will' belongs in the main clause."},
      {option:'arrived',misconception:'shifts the time clause into a completed past event',whyFails:"The call and arrival are still future events, so past simple does not fit the timeline."},
      {option:'would arrive',misconception:'treats a real future sequence as hypothetical or future-in-the-past',whyFails:"Nothing in the context creates an unreal condition or a past reporting frame requiring 'would'."}
    ],
    explanation:{whyCorrect:"'Arrives' is present simple, the required form after 'as soon as' even though the arrival is in the future.",rule:"In future time clauses with when, as soon as, before, after, until, or once, use present simple in the time clause and future marking in the main clause.",whyOthersFail:"'Will arrive' duplicates future marking in the subordinate clause; 'arrived' and 'would arrive' introduce timelines the sentence does not contain.",howToAvoid:"Circle the time connector first. If it introduces the future time clause, keep that clause in present simple.",memoryCue:"Future meaning after 'as soon as' still takes present simple: as soon as it arrives."}
  },
  b4_011:{
    id:'b4_011',family:'reported_speech',subskill:'reported_yes_no_questions_if_whether',cefr:'B1',questionType:'multiple_choice',
    pedagogicalObjective:"Report a yes/no question with if or whether, statement word order, and appropriate tense backshift.",
    misconceptionTargeted:"Learner keeps direct-question inversion or introduces a yes/no reported question with 'that'.",
    reasoningOperation:'recognize a yes/no question -> insert if/whether -> restore subject-before-verb order -> backshift when the past reporting context requires it',
    stem:'He asked me, “Did you lock the door?” -> He asked me ___ the door.',options:['whether I had locked','did I lock','that I had locked','whether had I locked'],correctIndex:0,
    distractors:[
      {option:'did I lock',misconception:'keeps direct-question inversion and omits if/whether',whyFails:'A reported question uses statement order and needs if/whether when the original question has no question word.'},
      {option:'that I had locked',misconception:"uses 'that' for a yes/no reported question",whyFails:"'That' introduces reported statements, while a yes/no question requires 'if' or 'whether'."},
      {option:'whether had I locked',misconception:'adds whether but retains auxiliary-subject inversion',whyFails:"After 'whether', the embedded clause uses statement order: subject before auxiliary ('I had'), not 'had I'."}
    ],
    explanation:{whyCorrect:"'Whether I had locked' correctly marks a yes/no reported question, uses statement word order, and backshifts the earlier action.",rule:"Reported yes/no question: ask + if/whether + subject + verb; do not keep direct-question inversion.",whyOthersFail:"The distractors either retain direct-question order, use the statement marker 'that', or invert the auxiliary after 'whether'.",howToAvoid:"First decide whether the original can be answered yes/no. If so, use if/whether and then write the clause like a statement.",memoryCue:"Yes/no report = whether + subject + verb, never whether + auxiliary + subject."}
  },
  b5_004:{
    id:'b5_004',family:'modals',subskill:'ability_nonfinite_forms_be_able_to',cefr:'B1',questionType:'multiple_choice',
    pedagogicalObjective:"Use 'be able to' where the grammar requires a non-finite ability expression after another infinitive.",
    misconceptionTargeted:"Learner treats 'can' like a normal infinitive and writes impossible combinations such as 'to can'.",
    reasoningOperation:'detect the preceding infinitive marker -> recognize that can has no infinitive -> substitute be able to',
    stem:'After months of treatment, she hopes to ___ walk without assistance again.',options:['be able to','can','could','being able to'],correctIndex:0,
    distractors:[
      {option:'can',misconception:"places the finite modal 'can' after infinitive 'to'",whyFails:"English has no infinitive 'to can'; after 'hopes to', ability must be expressed as 'be able to'."},
      {option:'could',misconception:'uses a finite past/conditional modal in a non-finite slot',whyFails:"'Could' cannot follow 'hopes to' and would also introduce the wrong time or conditional meaning."},
      {option:'being able to',misconception:'uses a gerund-participle where a bare infinitive is required',whyFails:"The first 'to' belongs to 'hopes to' and must be followed by the base form 'be', not 'being'."}
    ],
    explanation:{whyCorrect:"'Hopes to be able to walk' uses the infinitive form of the ability expression that 'can' itself does not possess.",rule:"When grammar requires an infinitive, perfect, or other non-finite form of ability, use a form of 'be able to' instead of 'can'.",whyOthersFail:"'Can' and 'could' are finite modals and cannot occupy the infinitive slot; 'being' is the wrong non-finite form after 'hopes to'.",howToAvoid:"If you are about to write 'to can', stop and replace the whole ability phrase with 'to be able to'.",memoryCue:"No 'to can'; say 'to be able to'."}
  },
  'C2-002':{
    id:'C2-002',family:'advanced_grammar',subskill:'mixed_conditional_past_cause_future_result',cefr:'C2',questionType:'multiple_choice',
    pedagogicalObjective:'Construct a mixed conditional in which an unreal past decision controls a hypothetical future event.',
    misconceptionTargeted:'Learner forces both clauses into the same time frame and loses the past-to-future relationship.',
    reasoningOperation:'date the unreal condition in the past -> date the consequence in the future -> combine past perfect with would be + -ing',
    stem:'If the board had approved the budget last month, construction ___ next Monday.',options:['would be starting','would have started','will start','started'],correctIndex:0,
    distractors:[
      {option:'would have started',misconception:'moves the result into the unreal past',whyFails:"'Would have started' describes a past result, but 'next Monday' places the result in the future."},
      {option:'will start',misconception:'treats the future result as real despite the unreal past condition',whyFails:"The budget was not approved, so the future start is hypothetical and needs 'would', not 'will'."},
      {option:'started',misconception:'uses simple past for an explicitly future consequence',whyFails:"Simple past conflicts with 'next Monday' and fails to mark the hypothetical result."}
    ],
    explanation:{whyCorrect:"The unreal approval belongs to last month, while the hypothetical start belongs to next Monday; 'would be starting' preserves that cross-time relationship.",rule:'A mixed conditional may combine if + past perfect for an unreal past cause with would + infinitive/continuous for a present or future result.',whyOthersFail:"'Would have started' puts the result in the past; 'will start' makes it real; 'started' conflicts with the future time marker.",howToAvoid:'Draw two points on a timeline—one for the condition and one for the result—before choosing the verb forms.',memoryCue:'Past cause, future result: if had done, would be doing.'}
  },
  'C2-003':{
    id:'C2-003',family:'advanced_grammar',subskill:'modal_deduction_past_progressive',cefr:'C2',questionType:'multiple_choice',
    pedagogicalObjective:'Use a modal perfect progressive to deduce that an activity was in progress at a specific past moment.',
    misconceptionTargeted:'Learner notices past evidence but ignores the ongoing-at-that-moment meaning and chooses a completed-action form.',
    reasoningOperation:'evaluate the evidence strength -> locate the past reference point -> mark the deduced activity as ongoing with must have been + -ing',
    stem:'At 9 p.m. the office lights were on and keyboards could be heard, so the team ___ late at that moment.',options:['must have been working','must have worked','should work','cannot have been working'],correctIndex:0,
    distractors:[
      {option:'must have worked',misconception:'uses a completed-event deduction instead of an ongoing past activity',whyFails:"The phrase 'at that moment' and the audible activity frame the work as in progress, which requires the progressive form."},
      {option:'should work',misconception:'changes evidence-based deduction into present advice or expectation',whyFails:"'Should work' neither refers to the observed past moment nor expresses a confident deduction from evidence."},
      {option:'cannot have been working',misconception:'reverses the polarity of the evidence',whyFails:'The lights and keyboard sounds support, rather than rule out, the conclusion that the team was working.'}
    ],
    explanation:{whyCorrect:"'Must have been working' combines strong deduction, past reference, and an activity in progress at 9 p.m.",rule:'For a strong deduction about an activity in progress at a past time, use must have been + verb-ing.',whyOthersFail:"The simple perfect loses the ongoing viewpoint; 'should' changes the function; 'cannot' contradicts the evidence.",howToAvoid:'Check three layers separately: certainty, time, and whether the activity is complete or in progress.',memoryCue:'Strong evidence + ongoing past = must have been working.'}
  },
  'C2-004':{
    id:'C2-004',family:'advanced_grammar',subskill:'inversion_after_only_restrictive_phrase',cefr:'C2',questionType:'multiple_choice',
    pedagogicalObjective:"Apply subject-auxiliary inversion when a restrictive 'only' phrase is fronted for formal emphasis.",
    misconceptionTargeted:"Learner fronts 'only after/by/when' but keeps ordinary subject-verb order.",
    reasoningOperation:"detect the fronted restrictive 'only' phrase -> identify the tense -> supply an auxiliary before the subject",
    stem:'Only after the second audit ___ the scale of the error.',options:['did the board understand','the board understood','understood the board','the board did understand'],correctIndex:0,
    distractors:[
      {option:'the board understood',misconception:'keeps ordinary statement order after a fronted restrictive phrase',whyFails:"Fronted 'Only after...' triggers subject-auxiliary inversion, so 'did' must precede 'the board'."},
      {option:'understood the board',misconception:'inverts the lexical verb directly',whyFails:'English requires do-support here; the lexical verb stays in base form after the auxiliary.'},
      {option:'the board did understand',misconception:'adds emphatic do but does not invert it with the subject',whyFails:"The auxiliary is present but remains after the subject, so the required inversion has not occurred."}
    ],
    explanation:{whyCorrect:"'Only after the second audit did the board understand...' correctly places the past auxiliary before the subject and leaves 'understand' in base form.",rule:"When a restrictive phrase beginning with only is fronted, invert auxiliary and subject in the main clause: Only after X did + subject + base verb.",whyOthersFail:'The alternatives either keep normal order, invert the lexical verb, or fail to move the auxiliary before the subject.',howToAvoid:"Treat fronted 'Only after/by/when...' like a signal to build question-style auxiliary-subject order in the following main clause.",memoryCue:'Only after... did the subject + base verb.'}
  },
  'C2-005':{
    id:'C2-005',family:'advanced_grammar',subskill:'pseudo_cleft_what_clause_emphasis',cefr:'C2',questionType:'multiple_choice',
    pedagogicalObjective:"Construct a pseudo-cleft with a fused 'what' clause as subject and a focused complement after 'be'.",
    misconceptionTargeted:"Learner blends an it-cleft with a what-cleft or makes the verb agree with a nearby plural noun rather than the whole what-clause.",
    reasoningOperation:"recognize the initial what-clause as one subject unit -> choose singular agreement -> place the focused complement after be",
    stem:'What the team needed most ___ a clear decision.',options:['was','were','that was','it was'],correctIndex:0,
    distractors:[
      {option:'were',misconception:'makes the verb agree with the nearby plural noun team',whyFails:"The subject is the entire singular idea 'What the team needed most', so singular 'was' is required."},
      {option:'that was',misconception:'inserts an it-cleft linker into a pseudo-cleft',whyFails:"A pseudo-cleft links the what-clause directly to its focus with 'be'; it does not add 'that'."},
      {option:'it was',misconception:'adds a dummy cleft subject and creates two competing subjects',whyFails:"The what-clause already functions as the subject, so adding 'it' makes the structure ungrammatical."}
    ],
    explanation:{whyCorrect:"The whole what-clause is a singular subject, and 'was' links it directly to the focused complement 'a clear decision'.",rule:'Pseudo-cleft: What + clause + be + focused element. Treat the fused what-clause as a single subject unit.',whyOthersFail:"'Were' follows the wrong noun; 'that was' and 'it was' incorrectly import pieces of an it-cleft.",howToAvoid:"Bracket the whole 'What ...' clause before checking agreement; do not let a noun inside that bracket control the verb.",memoryCue:'What we needed was X—one what-clause, one singular idea.'}
  }
};

const byId=new Map(data.templates.map((item,index)=>[item.id,index]));
for(const [id,replacement] of Object.entries(replacements)){
  if(!byId.has(id))throw new Error(`Cannot rebuild missing grammar template: ${id}`);
  data.templates[byId.get(id)]=replacement;
}

const enhancements={
  'A1-003':{
    reasoningOperation:"find the routine marker 'every morning' -> identify the third-person singular subject -> add -s to the present-simple verb",
    explanation:{whyOthersFail:"'Drink' misses third-person -s; 'drinking' needs an auxiliary and describes a different aspect; 'drank' moves the routine into the past.",howToAvoid:"Underline the subject and the routine marker before choosing. With he, she, or it in a present routine, check the verb for -s/-es.",memoryCue:'He, she, it: the present-simple verb gets -s.'}
  },
  'A1-004':{
    reasoningOperation:"match the subject pronoun 'they' to the present-tense forms of be -> select are",
    explanation:{whyOthersFail:"'Am' belongs with I; 'is' belongs with a singular third-person subject; bare 'be' cannot act as the finite present verb here.",howToAvoid:"Say the short pair aloud before completing the sentence: I am, he/she/it is, you/we/they are.",memoryCue:'They always pairs with are in the present.'}
  },
  'A1-005':{
    reasoningOperation:"look past 'there' to the noun phrase that follows -> identify 'two books' as plural -> select are",
    explanation:{whyOthersFail:"'Is' and 'was' use singular agreement, while bare 'be' is not a finite present verb. The plural phrase 'two books' requires 'are'.",howToAvoid:"Do not make the verb agree with 'there'. Look at the first noun after the verb and decide whether it is singular or plural.",memoryCue:'There are + plural; there is + singular.'}
  },
  'A1-006':{
    reasoningOperation:"identify Anna as the female owner -> notice that 'brother' follows the blank -> select the possessive adjective her",
    explanation:{whyOthersFail:"'She' is a subject, 'hers' replaces a noun, and 'him' is an object; only 'her' can directly modify 'brother'.",howToAvoid:"Check whether a noun comes immediately after the blank. If it does, use a possessive adjective such as my, his, her, or their.",memoryCue:'Her + noun; hers stands alone.'}
  },
  'A1-007':{
    reasoningOperation:"identify the meaning as present ability -> choose the modal can -> keep the following verb swim in base form",
    explanation:{whyOthersFail:"'Am' cannot directly precede base 'swim'; 'do' does not express ability; 'have' changes the meaning to possession or experience.",howToAvoid:"When the sentence means 'is able to', use can followed immediately by the base verb, with no 'to' and no -s.",memoryCue:'Can + base verb: can swim, can drive.'}
  },
  'C2-006':{
    reasoningOperation:'confirm that the committee performed both actions -> place the review before the reopening -> encode the earlier active action with having + past participle',
    explanation:{whyOthersFail:"'Reviewed' suggests a passive relationship; 'having review' lacks the past participle; 'to reviewing' combines incompatible infinitive and gerund forms.",howToAvoid:'Check both subject control and timeline: the understood subject of the participle clause must perform its action, and an earlier completed action takes having + past participle.',memoryCue:'Earlier active action: having reviewed; earlier passive action: having been reviewed.'}
  },
  'C2-007':{
    reasoningOperation:"recognize 'much as' as a concessive linker -> require a finite clause after it -> align the verb with the completed past board decision",
    explanation:{whyOthersFail:"'Appeals' clashes with the completed past frame; 'appealing' leaves the concessive clause without a finite verb; 'has appeal' changes both structure and intended meaning.",howToAvoid:"After 'much as', verify that you have a full subject-plus-finite-verb clause, then align its tense with the surrounding narrative.",memoryCue:"Much as + subject + finite verb = although."}
  }
};
for(const [id,patch] of Object.entries(enhancements)){
  if(!byId.has(id))throw new Error(`Cannot enhance missing grammar template: ${id}`);
  const item=data.templates[byId.get(id)];
  item.reasoningOperation=patch.reasoningOperation;
  item.explanation={...item.explanation,...patch.explanation};
}

const ambiguityRepairs={
  'RC-002':{
    stem:'Choose the reduced relative-clause form: The scientists ___ the vaccine were awarded a major prize.'
  },
  'b4_005':{
    stem:'For the conventionally most formal wording in an official notice: Visitors ____ enter the laboratory only when accompanied by staff.'
  },
  'b5_016':{
    stem:'Which completion most explicitly marks the breaking as earlier than the later admission? He admitted ____ the vase.',
    distractors:[
      {option:'breaking',misconception:'Uses the simple gerund, which leaves the earlier timing to context instead of encoding it explicitly.',whyFails:"'Breaking' is a valid complement of 'admit', but it does not explicitly mark anteriority; the question specifically asks for the form that does."},
      {option:'to break',misconception:"Uses an infinitive complement after 'admit', a verb that takes a gerund, not an infinitive.",whyFails:"'Admit' is not followed by a to-infinitive in standard English; it requires a gerund complement."},
      {option:'break',misconception:'Uses the bare base form with no verb marking at all.',whyFails:"'Admit break' has no valid grammatical function; 'admit' requires a gerund (simple or perfect), never a bare verb."}
    ],
    explanation:{whyCorrect:"'Having broken' explicitly encodes that the breaking preceded the admission.",rule:'Perfect gerund (having + past participle) explicitly marks the gerund action as anterior to the main verb; a simple gerund may leave that timing implicit.',whyOthersFail:"'Breaking' leaves the sequence implicit rather than explicitly marking it; 'to break' and 'break' are invalid complements of 'admit'.",howToAvoid:'Read the task constraint carefully: if it asks you to mark anteriority explicitly, choose having + past participle rather than relying on context alone.',memoryCue:"Having + past participle = explicitly earlier."}
  },
  'b5_022':{
    stem:"Which formal conjunctive adverb best completes this academic passage? The study's sample size was too small to generalize the findings. ____, the participants were not randomly selected, further weakening the results.",
    options:['Furthermore',"What's more",'Plus','And'],correctIndex:0,
    distractors:[
      {option:"What's more",misconception:'Selects a conversational addition phrase instead of a formal conjunctive adverb.',whyFails:"'What's more' adds information, but its conversational tone does not meet the explicitly academic register required by the prompt."},
      {option:'Plus',misconception:'Uses a casual spoken connector in a formal academic passage.',whyFails:"'Plus' is informal and is not the formal conjunctive adverb requested by the question."},
      {option:'And',misconception:'Uses a coordinating conjunction instead of the requested conjunctive adverb.',whyFails:"'And' is a conjunction, not a conjunctive adverb, and therefore fails the explicit grammatical category in the prompt."}
    ],
    explanation:{whyCorrect:"'Furthermore' is a formal conjunctive adverb used to add a related supporting point in academic prose.",rule:'Formal conjunctive adverbs of addition include furthermore and moreover; conversational alternatives include plus and what is more.',whyOthersFail:"'What's more' and 'Plus' do not match the requested academic register, while 'And' is not a conjunctive adverb.",howToAvoid:'Check both dimensions named in the prompt: grammatical category and register. A connector can express addition yet still fail one of those constraints.',memoryCue:'Academic addition adverb: furthermore or moreover.'}
  },
  'CO-004':{
    stem:"If I hadn't taken that job in Berlin, I ___ fluent in German now.",options:["wouldn't be","wouldn't have been","weren't","hadn't been"],correctIndex:0,
    distractors:[
      {option:"wouldn't have been",misconception:'places the result in the unreal past instead of the present',whyFails:"'Would not have been' is a past hypothetical result, but 'now' requires a present hypothetical state."},
      {option:"weren't",misconception:'uses a past form without the modal required in the result clause',whyFails:"The main clause of this mixed conditional needs 'would' to mark the hypothetical present result."},
      {option:"hadn't been",misconception:'repeats past perfect in the main clause',whyFails:"Past perfect belongs in the unreal past condition; it cannot express the present result in the main clause."}
    ],
    explanation:{whyCorrect:"The unreal job decision belongs to the past, while not being fluent is a present hypothetical state, so 'wouldn't be' is required.",rule:'Mixed conditional for past cause and present result: if + past perfect, would + base verb.',whyOthersFail:"'Wouldn't have been' moves the result into the past; the other choices omit the result modal or misuse past perfect.",howToAvoid:'Date the condition and result separately. Use past perfect for the unreal past cause and would + base verb for the present result.',memoryCue:'Past cause, present result: had done → would be.'}
  },
  'PA-003':{
    stem:'To use the informal get-passive for an unexpected event: "Ugh, my bike ___ stolen outside the station last night!"'
  },
  'b5_012':{
    subskill:'quantifier_of_before_object_pronoun',
    pedagogicalObjective:"Use 'of' between a quantifier and an object pronoun, producing 'both of them' rather than the ungrammatical 'both them'.",
    misconceptionTargeted:"Learner drops 'of' before an object pronoun because 'both' can appear directly before some noun phrases.",
    reasoningOperation:"notice the object pronoun 'them' -> insert of after the quantifier -> select both of",
    stem:'I have exactly two closest friends. ____ them live in different countries now, so we rarely meet in person.',options:['Both of','Both','All','Neither'],correctIndex:0,
    distractors:[
      {option:'Both',misconception:"drops 'of' before the object pronoun",whyFails:"'Both them' is not standard English; an object pronoun requires 'both of them'."},
      {option:'All',misconception:"drops 'of' and ignores the explicitly two-person set",whyFails:"'All them' is ungrammatical, and 'all' does not match the explicitly two-person contrast targeted here."},
      {option:'Neither',misconception:"drops 'of' and reverses the affirmative meaning",whyFails:"'Neither them' is ungrammatical and would also negate the statement instead of referring to both friends."}
    ],
    explanation:{whyCorrect:"'Both of them' correctly combines a two-person quantifier with an object pronoun.",rule:"Use quantifier + of before an object pronoun: both of them, all of us, neither of you.",whyOthersFail:"Each alternative either omits the required 'of' before 'them' or changes the intended quantity and polarity.",howToAvoid:"If the quantifier is followed by us, you, them, or another object pronoun, place 'of' between them.",memoryCue:'Pronoun ahead? Use of: both of them.'}
  },
  'b4_012':{
    stem:"To express attendance for the institution's normal purpose, not movement to a building: During term time, the children go to ____ every weekday to study.",options:['school','the school','a school','schools'],correctIndex:0,
    distractors:[
      {option:'the school',misconception:'focuses on a particular building instead of institutional attendance',whyFails:"The prompt explicitly asks for the institutional-purpose reading, which uses zero article in 'go to school'."},
      {option:'a school',misconception:'introduces one unspecified building rather than the attendance idiom',whyFails:"'A school' names an unspecified place; it does not form the fixed institutional-purpose expression requested."},
      {option:'schools',misconception:'turns one routine of attendance into a generic plural destination',whyFails:'The sentence describes the children attending their institution, not visiting multiple schools.'}
    ],
    explanation:{whyCorrect:"'Go to school' uses zero article when school means participation in its normal educational function.",rule:"Institution nouns can take zero article for their normal purpose (go to school, be in prison) and 'the' when the physical building is meant.",whyOthersFail:'The alternatives shift attention to a particular or unspecified building, or to multiple buildings, instead of institutional attendance.',howToAvoid:'Ask whether the person is participating in the institution’s normal function or merely going to its building.',memoryCue:'Study there as a pupil: go to school; visit the building: go to the school.'}
  },
  'b4_015':{
    stem:"To use the conventional collocation for directly evaluating a specific result: I'm really pleased ____ your exam results.",options:['with','about','for','on'],correctIndex:0,
    distractors:[
      {option:'about',misconception:'uses the broader situation-focused pattern instead of directly evaluating the result',whyFails:"'Pleased about' can introduce a situation, but the prompt specifically asks for the collocation used to evaluate a particular result: 'pleased with'."},
      {option:'for',misconception:"confuses pleased with pleased for someone",whyFails:"'Pleased for you' means happy on another person's behalf; it does not directly evaluate the result noun phrase."},
      {option:'on',misconception:'imports a preposition that does not collocate with pleased',whyFails:"'Pleased on' is not the standard adjective-preposition combination in this meaning."}
    ],
    explanation:{whyCorrect:"'Pleased with' conventionally introduces the person, performance, or specific result being evaluated positively.",rule:"Use pleased with for a person/performance/result, pleased about for a situation, and pleased for someone when sharing their good fortune.",whyOthersFail:'The alternatives express a broader situation, happiness on someone’s behalf, or a nonstandard collocation.',howToAvoid:'Identify what follows: a specific thing being evaluated takes with; a situation takes about; a beneficiary takes for.',memoryCue:'Pleased with the result; pleased about the news; pleased for you.'}
  },
  'MO-002':{
    stem:"Which option expresses the strongest negative deduction supported by the evidence? The lights are off and the car isn't in the driveway, so they ___ be home."
  },
  'MO-004':{
    stem:"Which option expresses the strongest positive past deduction supported by the evidence? The lights are still off and his car isn't here — he ___ left for work already."
  },
  'MO-006':{
    stem:"Which completion gives the strongest urgent warning tied to the stated consequence? You ___ leave now — if you miss this train, there isn't another one until tomorrow."
  },
  'b4_004':{
    stem:'Which completion neutrally states an available past opportunity without criticizing the decision? You ____ the job — they offered it to you, but you turned it down.'
  },
  'b5_003':{
    stem:"Which completion explicitly criticizes the past decision rather than merely noting a possibility? You ____ more carefully before signing the contract — now we're stuck with these terms."
  },
  'GI-004':{
    stem:"Which completion presents restarting as a troubleshooting method to experiment with? If the file won't open, try ___ the computer — that usually fixes it."
  },
  'RS-001':{
    stem:"Apply conventional backshift to report the earlier state: Yesterday she said, 'I am tired.' Today we report that she ___ tired."
  },
  'RS-006':{
    stem:"Apply conventional backshift after the picnic date has passed. He said, 'If it rains, I'll cancel the picnic.' Reported later: He said that if it ___, he ___ the picnic."
  },
  'b4_010':{
    stem:'Apply the standard can → could backshift in a later report. Direct: “I can finish the report by Friday.” Reported: She said she ____ finish the report by Friday.'
  }
};
for(const [id,patch] of Object.entries(ambiguityRepairs)){
  if(!byId.has(id))throw new Error(`Cannot repair missing grammar template: ${id}`);
  const item=data.templates[byId.get(id)];
  Object.assign(item,patch);
}

const languageRepairs=[
  ['b5_008','treated',"Without 'being', the sentence loses its passive marking entirely and becomes grammatically incomplete after 'resents'."],
  ['AR-002','An',"'An' is a singular article and cannot precede the plural noun 'elephants'."],
  ['b5_011','an',"Country names do not take the indefinite article 'an'; this fixed name requires the definite article in 'the Netherlands'."]
];
for(const [id,option,whyFails] of languageRepairs){
  const item=data.templates[byId.get(id)],distractor=item?.distractors?.find(x=>x.option===option);
  if(!distractor)throw new Error(`Cannot language-repair ${id}/${option}`);
  distractor.whyFails=whyFails;
}

data.version=require('./VERSION.json').version;
data.schemaVersion='2.0.0';
data.practiceBlueprintVersion='focused-25-v1';
data.count=data.templates.length;

const ids=data.templates.map(x=>x.id);
const skills=data.templates.map(x=>x.subskill);
if(data.count!==129||new Set(ids).size!==data.count||new Set(skills).size!==data.count){
  throw new Error('Grammar rebuild violated the 129-lesson identity contract.');
}

fs.writeFileSync(target,`${JSON.stringify(data,null,2)}\n`);
console.log(JSON.stringify({status:'PASS',version:data.version,templates:data.count,replaced:Object.keys(replacements),enhanced:Object.keys(enhancements),ambiguityRepaired:Object.keys(ambiguityRepairs),languageRepaired:languageRepairs.map(x=>x[0])},null,2));
