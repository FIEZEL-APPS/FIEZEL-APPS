import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pteDir = path.resolve(__dirname, '../../content/pte');

// 1. New Reading & Writing FIB items (rw-fib-009 to rw-fib-020)
const newRwFibItems = [
  {
    id: "rw-fib-009",
    title: "HACCP Food Safety and Commercial Kitchen Hygiene",
    domain: "Hospitality Management & Culinary Science",
    text: "The Hazard Analysis Critical Control Point (HACCP) system is an internationally recognized framework designed to [blank_1] biological, chemical, and physical food safety hazards. In commercial kitchens, head chefs and food handlers are legally obligated to monitor critical temperatures to prevent harmful bacteria from proliferating. For instance, high-risk foods must be refrigerated below five degrees Celsius to [blank_2] microbial growth. [blank_3], failure to adhere to statutory hygiene protocols can result in severe legal penalties, public health sanctions, and immediate business closure.",
    blanks: [
      {
        id: "blank_1",
        correct: "mitigate",
        options: ["mitigate", "mitigation", "mitigated", "mitigating"],
        deepFeedback: {
          formula: "Rumus 3 Detik: Setelah partikel infinitive 'to', gunakan kata kerja dasar VERB 1 (base form).",
          grammarRule: "to + Verb 1 murni tanpa imbuhan.",
          collocation: "mitigate hazards (= mengurangi/memitigasi bahaya)",
          distractorAnalysis: "'Mitigation' adalah kata benda (noun), 'mitigated' adalah past tense (V2/V3), dan 'mitigating' adalah participle (-ing). Hanya 'mitigate' yang memenuhi kaidah infinitive 'to + V1'.",
          translation: "Sistem HACCP dirancang untuk memitigasi bahaya keamanan pangan biologis, kimia, dan fisik."
        }
      },
      {
        id: "blank_2",
        correct: "inhibit",
        options: ["inhibit", "inhabits", "inhabitant", "inhibiting"],
        deepFeedback: {
          formula: "Rumus 3 Detik: Frasa tujuan 'to + V1' membutuhkan kata kerja dasar yang memiliki arti 'menghambat'.",
          grammarRule: "Infinitive of purpose: to + V1.",
          collocation: "inhibit microbial growth (= menghambat pertumbuhan mikroba)",
          distractorAnalysis: "'Inhabits' dan 'inhabitant' berasal dari kata 'inhabit' (menempati/menghuni) yang salah total secara arti. 'Inhibiting' memiliki akhiran -ing yang melanggar aturan to + V1.",
          translation: "Makanan berisiko tinggi harus didinginkan di bawah lima derajat Celsius untuk menghambat pertumbuhan mikroba."
        }
      },
      {
        id: "blank_3",
        correct: "Furthermore",
        options: ["Furthermore", "However", "Although", "Despite"],
        deepFeedback: {
          formula: "Peta Linking Words (Penambahan / Penguatan): Kalimat ini menambahkan konsekuensi hukum yang memperkuat peringatan bahaya di kalimat sebelumnya.",
          grammarRule: "Conjunctive adverb diikuti tanda koma di awal klausa independen.",
          linkingWordType: "Addition & Reinforcement (= Lebih jauh lagi / Selain itu)",
          distractorAnalysis: "'However' salah karena tidak ada kontradiksi/pertentangan ide. 'Although' dan 'Despite' membutuhkan klausa dependen dan tidak dapat berdiri sendiri di depan koma.",
          translation: "Selain itu, kegagalan mematuhi protokol kebersihan resmi dapat mengakibatkan sanksi hukum berat."
        }
      }
    ]
  },
  {
    id: "rw-fib-010",
    title: "The Biochemistry of Culinary Fermentation",
    domain: "Food Science & Molecular Gastronomy",
    text: "Culinary fermentation represents a biochemical transformation driven by beneficial microorganisms such as yeasts, molds, and lactic acid bacteria. During the process, enzymes break down complex carbohydrates into organic acids or alcohols, which [blank_1] a distinctive tangy flavor profile and natural preservation qualities. Fermented food items, ranging from sourdough bread to artisan cheeses, must be incubated within tightly controlled temperature [blank_2]. [blank_3], improper handling can introduce pathogenic microbes that spoil the entire batch.",
    blanks: [
      {
        id: "blank_1",
        correct: "impart",
        options: ["impart", "imparts", "imparting", "impartation"],
        deepFeedback: {
          formula: "Rumus 3 Detik: Relative pronoun 'which' merujuk pada kata benda jamak 'organic acids or alcohols', sehingga kata kerjanya adalah VERB 1 PLURAL (tanpa akhiran -s).",
          grammarRule: "Subject-Verb Agreement: Plural antecedent -> Plural verb (impart).",
          collocation: "impart a distinctive flavor (= memberi/menghasilkan cita rasa khas)",
          distractorAnalysis: "'Imparts' berbentuk singular (untuk he/she/it). 'Imparting' adalah bentuk -ing tanpa auxiliary verb, dan 'impartation' adalah noun.",
          translation: "Enzim memecah karbohidrat kompleks menjadi asam organik atau alkohol, yang memberikan profil rasa asam yang khas."
        }
      },
      {
        id: "blank_2",
        correct: "ranges",
        options: ["ranges", "distances", "intervals", "durations"],
        deepFeedback: {
          formula: "Rumus Kolokasi Paten: Dalam sains termal, rentang derajat suhu dinyatakan dengan frasa 'temperature ranges'.",
          grammarRule: "Noun phrase collocation: temperature + ranges.",
          collocation: "temperature ranges (= rentang/kisaran suhu)",
          distractorAnalysis: "'Distances' merujuk pada jarak spasial (meter/km). 'Intervals' merujuk pada jeda waktu atau titik berkala. 'Durations' merujuk pada durasi waktu, bukan derajat suhu.",
          translation: "Makanan fermentasi harus diinkubasi dalam rentang suhu yang dikontrol secara ketat."
        }
      },
      {
        id: "blank_3",
        correct: "Nevertheless",
        options: ["Nevertheless", "Consequently", "Because", "Therefore"],
        deepFeedback: {
          formula: "Peta Linking Words (Kontras / Konsesi): Kalimat sebelumnya membahas manfaat fermentasi yang terkontrol, sedangkan kalimat ini memperingatkan risiko kontaminasi patogen bila salah penanganan.",
          grammarRule: "Adversative conjunctive adverb: Menyatakan kontras/peringatan berlawanan.",
          linkingWordType: "Concession / Contrast (= Meskipun demikian / Namun)",
          distractorAnalysis: "'Consequently' dan 'Therefore' menandakan sebab-akibat searah, bukan kontras. 'Because' adalah subordinate conjunction yang tidak bisa berdiri sendiri sebelum tanda koma.",
          translation: "Meskipun demikian, penanganan yang salah dapat memasukkan mikroba patogen yang merusak seluruh adonan."
        }
      }
    ]
  },
  {
    id: "rw-fib-011",
    title: "Ecotourism Management in Western Australia",
    domain: "Tourism Economics & Environmental Protection",
    text: "Ecotourism has emerged as a cornerstone of sustainable regional economic growth across Western Australia, drawing international visitors to pristine natural reserves such as Rottnest Island and Ningaloo Reef. Conservation authorities strive to [blank_1] an optimal balance between welcoming tourism revenues and preserving fragile marine ecosystems. Tour operators are required to undergo rigorous accreditation to ensure their activities do not [blank_2] native wildlife. [blank_3], environmental levies paid by tourists are directly allocated toward habitat restoration and ecological monitoring programs.",
    blanks: [
      {
        id: "blank_1",
        correct: "strike",
        options: ["strike", "strikes", "striking", "stricken"],
        deepFeedback: {
          formula: "Rumus Kolokasi Paten Bahasa Inggris Akademik (ACL): Pasangan frasa 'mencapai keseimbangan' adalah 'strike a balance'.",
          grammarRule: "Infinitive structure: strive to + Verb 1 (strike).",
          collocation: "strike an optimal balance (= mencapai/menemukan keseimbangan optimal)",
          distractorAnalysis: "'Strikes' (singular), 'striking' (-ing), dan 'stricken' (past participle) melanggar kaidah 'strive to + V1'.",
          translation: "Otoritas konservasi berusaha untuk mencapai keseimbangan optimal antara menyambut pendapatan pariwisata dan melestarikan ekosistem laut yang rapuh."
        }
      },
      {
        id: "blank_2",
        correct: "disturb",
        options: ["disturb", "disturbed", "disturbance", "disturbingly"],
        deepFeedback: {
          formula: "Rumus Auxiliary Modal: Setelah auxiliary verb negatif 'do not', kata kerja SELALU berupa VERB 1 BASE FORM.",
          grammarRule: "do not + Verb 1 murni.",
          collocation: "disturb native wildlife (= mengganggu satwa liar asli)",
          distractorAnalysis: "'Disturbed' adalah bentuk lampau, 'disturbance' adalah kata benda, dan 'disturbingly' adalah adverb. Hanya 'disturb' yang merupakan Verb 1.",
          translation: "Operator tur diwajibkan menjalani akreditasi ketat untuk memastikan aktivitas mereka tidak mengganggu satwa liar asli."
        }
      },
      {
        id: "blank_3",
        correct: "Moreover",
        options: ["Moreover", "Whereas", "Despite", "Unless"],
        deepFeedback: {
          formula: "Peta Linking Words (Penambahan Positif): Menambahkan fakta positif pendukung tentang bagaimana retribusi turis langsung mendanai konservasi.",
          grammarRule: "Conjunctive adverb diikuti tanda koma di awal kalimat baru.",
          linkingWordType: "Addition & Elaboration (= Selain itu / Terlebih lagi)",
          distractorAnalysis: "'Whereas' dan 'Unless' adalah subordinating conjunctions yang membutuhkan klausa terikat. 'Despite' membutuhkan noun phrase, bukan kalimat lengkap dengan koma.",
          translation: "Terlebih lagi, pungutan lingkungan yang dibayarkan oleh wisatawan dialokasikan langsung untuk pemulihan habitat."
        }
      }
    ]
  },
  {
    id: "rw-fib-012",
    title: "Hotel Revenue Management and Dynamic Pricing",
    domain: "Hospitality Operations & Business Analytics",
    text: "Modern hospitality establishments rely heavily on algorithmic revenue management systems to maximize RevPAR (Revenue Per Available Room). By continuously analyzing historical reservation data and market demand fluctuations, hotels can [blank_1] room rates in real time. During peak festival seasons, high occupancy allows properties to charge premium tariffs, whereas promotional discounts are introduced during off-peak periods to stimulate [blank_2]. [blank_3], excessive price volatility can alienate loyal corporate clients and harm long-term brand equity.",
    blanks: [
      {
        id: "blank_1",
        correct: "adjust",
        options: ["adjust", "adjustment", "adjusted", "adjusting"],
        deepFeedback: {
          formula: "Rumus Modal Verb: Setelah modal auxiliary 'can', kata kerja WAJIB berbentuk VERB 1 DASAR.",
          grammarRule: "Modal (can/could/may/must/should) + Verb 1.",
          collocation: "adjust room rates (= menyesuaikan tarif kamar)",
          distractorAnalysis: "'Adjustment' adalah noun, 'adjusted' adalah past form, 'adjusting' adalah present participle. Hanya 'adjust' yang merupakan bentuk dasar.",
          translation: "Dengan terus menganalisis data reservasi historis, hotel dapat menyesuaikan tarif kamar secara real time."
        }
      },
      {
        id: "blank_2",
        correct: "demand",
        options: ["demand", "demanding", "demanded", "demands"],
        deepFeedback: {
          formula: "Rumus Frasa Kerja-Benda: Kata kerja transitif 'stimulate' membutuhkan objek berupa kata benda (noun).",
          grammarRule: "Transitive verb + Noun object: stimulate demand.",
          collocation: "stimulate demand (= merangsang/mendorong permintaan pasar)",
          distractorAnalysis: "'Demanding' adalah kata sifat (menuntut/sulit), 'demanded' adalah verb lampau. 'Demand' (uncountable noun) adalah pilihan tepat untuk konsep ekonomi permintaan pasar.",
          translation: "Diskon promosi diperkenalkan selama periode sepi untuk merangsang permintaan."
        }
      },
      {
        id: "blank_3",
        correct: "However",
        options: ["However", "Therefore", "Because", "In addition"],
        deepFeedback: {
          formula: "Peta Linking Words (Peringatan / Kontras): Kalimat sebelumnya menguraikan keuntungan penetapan harga dinamis, sedangkan kalimat ini memperingatkan dampak negatif volatilitas harga berlebih.",
          grammarRule: "Adversative transition followed by comma.",
          linkingWordType: "Contrast / Limitation (= Namun / Akan tetapi)",
          distractorAnalysis: "'Therefore' menandakan akibat logis positif, 'In addition' menambahkan poin searah, sedangkan kalimat ini menyajikan risiko berlawanan.",
          translation: "Namun, volatilitas harga yang berlebihan dapat mengasingkan klien korporat yang setia dan merusak reputasi merek jangka panjang."
        }
      }
    ]
  },
  {
    id: "rw-fib-013",
    title: "Sensory Perception and Food Texture Chemistry",
    domain: "Food Science & Sensory Evaluation",
    text: "The perceived palatability of culinary dishes is determined not only by taste and olfactory signals, but also by oral tactile sensations known as mouthfeel. Food rheology studies how substances deform and flow under mechanical mastication. For example, hydrocolloids such as xanthan gum are widely utilized in modern gastronomy to [blank_1] aqueous solutions without altering their aromatic qualities. When food exhibits an agreeable consistency, consumer acceptance increases [blank_2]. [blank_3], an overly viscous or slimy texture can instantly evoke sensory aversion.",
    blanks: [
      {
        id: "blank_1",
        correct: "thicken",
        options: ["thicken", "thickness", "thickened", "thickly"],
        deepFeedback: {
          formula: "Rumus 3 Detik: Setelah 'to' (infinitive of purpose), gunakan kata kerja dasar VERB 1. Perhatikan bentukan kata kerja dari 'thick' adalah 'thicken'.",
          grammarRule: "to + Verb 1 murni (thicken).",
          collocation: "thicken aqueous solutions (= mengentalkan larutan berbasis air)",
          distractorAnalysis: "'Thickness' adalah kata benda (noun), 'thickened' adalah past participle/adjective, dan 'thickly' adalah adverb. Kata kerja dasarnya adalah 'thicken'.",
          translation: "Hidrokoloid seperti permen xanthan banyak digunakan dalam gastronomi modern untuk mengentalkan larutan tanpa mengubah kualitas aromanya."
        }
      },
      {
        id: "blank_2",
        correct: "substantially",
        options: ["substantially", "substantial", "substance", "substantiate"],
        deepFeedback: {
          formula: "Rumus Modifikasi Kata Kerja: Kata kerja intransitif 'increases' dimodifikasi oleh KATA KETERANGAN (adverb of degree) berakhiran -ly.",
          grammarRule: "Verb + Adverb of manner/degree: increases substantially.",
          collocation: "increase substantially (= meningkat secara substansial / sangat nyata)",
          distractorAnalysis: "'Substantial' adalah kata sifat (adjective), 'substance' adalah noun, dan 'substantiate' adalah kata kerja (membuktikan). Hanya 'substantially' yang merupakan adverb.",
          translation: "Ketika makanan menunjukkan konsistensi yang menyenangkan, penerimaan konsumen meningkat secara substansial."
        }
      },
      {
        id: "blank_3",
        correct: "Conversely",
        options: ["Conversely", "Consequently", "Furthermore", "Namely"],
        deepFeedback: {
          formula: "Peta Linking Words (Kebalikan Langsung): Membandingkan dua kondisi yang bertolak belakang (tekstur enak vs tekstur terlalu kental/berlendir).",
          grammarRule: "Contrastive sentence linker: Conversely (= Sebaliknya).",
          linkingWordType: "Direct Contrast / Opposite Case (= Sebaliknya)",
          distractorAnalysis: "'Consequently' menandakan sebab-akibat, 'Furthermore' menandakan penambahan, dan 'Namely' digunakan untuk menyebutkan contoh spesifik.",
          translation: "Sebaliknya, tekstur yang terlalu kental atau berlendir dapat langsung memicu keengganan sensorik."
        }
      }
    ]
  },
  {
    id: "rw-fib-014",
    title: "Sustainable Fisheries Management in Australia",
    domain: "Marine Ecology & Commercial Cookery Supply Chain",
    text: "The Western Rock Lobster fishery off the coast of Perth is widely celebrated as one of the world's most sustainably managed commercial fisheries. To prevent depletion of crustacean stocks, authorities set stringent annual total allowable catch limits that are [blank_1] enforced. Vessels must install satellite tracking devices and utilize escape gaps in potting traps to permit juvenile lobsters to [blank_2] safely. [blank_3], these rigorous ecological measures ensure steady export revenues while safeguarding marine biodiversity for future generations.",
    blanks: [
      {
        id: "blank_1",
        correct: "rigorously",
        options: ["rigorously", "rigorous", "rigor", "rigorousness"],
        deepFeedback: {
          formula: "Rumus Passive Voice Adverbial: Di antara passive auxiliary 'are' dan participle 'enforced', sisipkan KATA KETERANGAN (adverb -ly) untuk menerangkan cara penegakan.",
          grammarRule: "be + Adverb (-ly) + Past Participle: are rigorously enforced.",
          collocation: "rigorously enforced (= ditegakkan secara ketat/disiplin)",
          distractorAnalysis: "'Rigorous' adalah adjective, sedangkan 'rigor' dan 'rigorousness' adalah noun. Posisi sebelum past participle membutuhkan adverb.",
          translation: "Otoritas menetapkan batas tangkapan tahunan yang ditegakkan secara ketat."
        }
      },
      {
        id: "blank_2",
        correct: "escape",
        options: ["escape", "escaped", "escaping", "escapes"],
        deepFeedback: {
          formula: "Rumus Verb of Causation/Permission: Pola 'permit + object + to + Verb 1'.",
          grammarRule: "permit [someone/something] to + Verb 1 base form.",
          collocation: "permit juvenile lobsters to escape (= memungkinkan lobster muda meloloskan diri)",
          distractorAnalysis: "'Escaped' adalah V2/V3, 'escaping' adalah gerund, 'escapes' adalah singular present. Setelah 'to' wajib Verb 1 'escape'.",
          translation: "Kapal harus menggunakan celah keluar pada perangkap agar lobster muda dapat meloloskan diri dengan aman."
        }
      },
      {
        id: "blank_3",
        correct: "Ultimately",
        options: ["Ultimately", "Instead", "Although", "Whereas"],
        deepFeedback: {
          formula: "Peta Linking Words (Kesimpulan / Hasil Akhir): Merangkum hasil akhir dari seluruh regulasi ekologis yang dibahas sebelumnya.",
          grammarRule: "Concluding sentence adverb followed by comma.",
          linkingWordType: "Conclusion & Culmination (= Pada akhirnya / Secara mendasar)",
          distractorAnalysis: "'Instead' digunakan bila ada penggantian alternatif yang dibatalkan. 'Although' dan 'Whereas' adalah konjungsi perbandingan yang membutuhkan dua klausa terhubung.",
          translation: "Pada akhirnya, langkah-langkah ekologis yang ketat ini memastikan pendapatan ekspor yang stabil sekaligus melindungi keanekaragaman hayati laut."
        }
      }
    ]
  },
  {
    id: "rw-fib-015",
    title: "Food Allergens and Commercial Menu Engineering",
    domain: "Hospitality Compliance & Public Health",
    text: "Food allergies represent an escalating public health concern, with severe reactions such as anaphylaxis posing immediate life-threatening risks to dining patrons. Under Australian hospitality regulations, commercial dining establishments possess a legal duty of care to accurately [blank_1] all major allergens present in their culinary offerings. Kitchens must implement dedicated preparation stations and color-coded utensils to eradicate the hazard of cross-contact. [blank_2], front-of-house service staff must be thoroughly trained to communicate ingredient specifications transparently with guests.",
    blanks: [
      {
        id: "blank_1",
        correct: "disclose",
        options: ["disclose", "disclosure", "disclosed", "disclosing"],
        deepFeedback: {
          formula: "Rumus Infinitive: Setelah frasa 'legal duty of care to', kata kerja wajib berbentuk VERB 1 DASAR.",
          grammarRule: "duty of care to + Verb 1 base form.",
          collocation: "disclose allergens (= mengungkapkan/mencantumkan bahan alergen)",
          distractorAnalysis: "'Disclosure' adalah kata benda (noun), 'disclosed' adalah past form, 'disclosing' adalah present participle. Hanya 'disclose' yang merupakan Verb 1 dasar.",
          translation: "Tempat makan komersial memiliki kewajiban hukum untuk mengungkapkan secara akurat semua alergen utama yang ada dalam hidangan mereka."
        }
      },
      {
        id: "blank_2",
        correct: "Simultaneously",
        options: ["Simultaneously", "Otherwise", "Despite", "Unless"],
        deepFeedback: {
          formula: "Peta Linking Words (Aksi Bersamaan / Paralel): Menghubungkan persiapan di dapur dengan pelatihan staf pelayan yang harus berjalan beriringan.",
          grammarRule: "Sentence-level temporal adverb followed by comma.",
          linkingWordType: "Simultaneous Action / Parallel Effort (= Secara bersamaan)",
          distractorAnalysis: "'Otherwise' menandakan kondisi pengandaian negatif ('jika tidak'). 'Despite' membutuhkan noun phrase, 'Unless' adalah konjungsi bersyarat.",
          translation: "Secara bersamaan, staf layanan depan harus dilatih secara menyeluruh untuk mengomunikasikan spesifikasi bahan secara transparan kepada para tamu."
        }
      }
    ]
  },
  {
    id: "rw-fib-016",
    title: "Nutritional Science and Plant-Based Protein Quality",
    domain: "Clinical Nutrition & Dietetics",
    text: "The global surge in plant-based diets has prompted food scientists to evaluate the biological value and amino acid profiles of novel non-animal proteins. While traditional animal proteins contain all essential amino acids in optimal ratios, individual plant sources are often [blank_1] in specific amino acids such as methionine or lysine. To overcome this limitation, food manufacturers [blank_2] complementary proteins, such as combining legumes with cereal grains, to achieve a complete protein profile. [blank_3], modern processing techniques have enhanced the bioavailability of plant-derived minerals.",
    blanks: [
      {
        id: "blank_1",
        correct: "deficient",
        options: ["deficient", "deficiency", "deficiently", "deficit"],
        deepFeedback: {
          formula: "Rumus Predicative Adjective: Pola 'are often [adjective] in [nutrient]'. Pasangan kata sifat untuk kekurangan zat adalah 'deficient in'.",
          grammarRule: "be + Adjective + in + noun: deficient in.",
          collocation: "deficient in amino acids (= kekurangan asam amino)",
          distractorAnalysis: "'Deficiency' dan 'deficit' adalah kata benda (noun). 'Deficiently' adalah adverb. Setelah to be 'are' dibutuhkan kata sifat 'deficient'.",
          translation: "Sumber nabati individual sering kali kekurangan asam amino spesifik seperti metionin atau lisin."
        }
      },
      {
        id: "blank_2",
        correct: "blend",
        options: ["blend", "blends", "blended", "blending"],
        deepFeedback: {
          formula: "Rumus Subject-Verb Agreement: Subjek 'food manufacturers' adalah jamak (plural), maka kata kerja Simple Present harus jamak VERB 1 TANPA -S.",
          grammarRule: "Plural subject (manufacturers) -> Plural verb (blend).",
          collocation: "blend complementary proteins (= mencampur/mengombinasikan protein pelengkap)",
          distractorAnalysis: "'Blends' adalah bentuk singular. 'Blended' adalah past tense. 'Blending' membutuhkan auxiliary to be.",
          translation: "Produsen makanan mencampurkan protein pelengkap untuk mencapai profil protein yang lengkap."
        }
      },
      {
        id: "blank_3",
        correct: "Additionally",
        options: ["Additionally", "Conversely", "Although", "In contrast"],
        deepFeedback: {
          formula: "Peta Linking Words (Penambahan Manfaat): Menambahkan kemajuan teknologi lain yang melengkapi keberhasilan kombinasi protein.",
          grammarRule: "Additive linking adverb followed by comma.",
          linkingWordType: "Addition & Progress (= Selain itu / Di samping itu)",
          distractorAnalysis: "'Conversely' dan 'In contrast' salah karena menandakan perlawanan/kebalikan ide. 'Although' membutuhkan anak kalimat terikat.",
          translation: "Selain itu, teknik pengolahan modern telah meningkatkan ketersediaan hayati mineral yang berasal dari tumbuhan."
        }
      }
    ]
  },
  {
    id: "rw-fib-017",
    title: "Vocational Education and Australian Apprenticeships",
    domain: "Vocational Education & Workforce Economics",
    text: "Vocational Education and Training (VET) plays a pivotal role in maintaining Australia's skilled labor force, particularly in high-demand trades such as commercial cookery, electrical engineering, and hospitality management. Unlike purely theoretical university degrees, vocational programs emphasize competency-based assessments that [blank_1] direct workplace application. Apprentices spend a significant portion of their training under the mentorship of licensed industry professionals. [blank_2], graduates enter the workforce with proven technical competencies that substantially enhance their employability.",
    blanks: [
      {
        id: "blank_1",
        correct: "prioritize",
        options: ["prioritize", "prioritizes", "priority", "prioritizing"],
        deepFeedback: {
          formula: "Rumus Subject-Verb Agreement Klausa Relatif: Antecedent 'competency-based assessments' berbentuk jamak (plural), maka kata kerja 'that ...' adalah VERB 1 PLURAL.",
          grammarRule: "Plural antecedent -> Verb 1 base form (prioritize).",
          collocation: "prioritize direct application (= memprioritaskan penerapan langsung)",
          distractorAnalysis: "'Prioritizes' adalah bentuk tunggal (-s). 'Priority' adalah kata benda. 'Prioritizing' adalah gerund/participle.",
          translation: "Program kejuruan menekankan penilaian berbasis kompetensi yang memprioritaskan penerapan langsung di tempat kerja."
        }
      },
      {
        id: "blank_2",
        correct: "As a result",
        options: ["As a result", "On the contrary", "Nevertheless", "Despite"],
        deepFeedback: {
          formula: "Peta Linking Words (Hasil / Dampak Logis): Kalimat sebelumnya menjelaskan bimbingan profesional langsung, maka kalimat ini menyimpulkan hasil positif berupa peningkatan daya kerja lulusan.",
          grammarRule: "Transitional phrase denoting logical consequence followed by comma.",
          linkingWordType: "Cause and Effect / Positive Consequence (= Akibatnya / Oleh karena itu)",
          distractorAnalysis: "'On the contrary' dan 'Nevertheless' mengindikasikan pertentangan ide, bukan kelanjutan logis.",
          translation: "Akibatnya, lulusan memasuki dunia kerja dengan kompetensi teknis terbukti yang secara substansial meningkatkan daya serap kerja mereka."
        }
      }
    ]
  },
  {
    id: "rw-fib-018",
    title: "Specialty Coffee Agronomy and Roasting Chemistry",
    domain: "Agricultural Science & Culinary Chemistry",
    text: "The cultivation of specialty Arabica coffee requires precise microclimatic conditions, typically found at high altitudes with well-drained volcanic soils. During the roasting process, green coffee beans undergo the complex Maillard reaction, in which reducing sugars and amino acids interact to [blank_1] hundreds of volatile aromatic compounds. Master roasters carefully modulate the rate of temperature rise to prevent surface charring while ensuring uniform heat penetration. [blank_2], improper heat application can destroy delicate fruity notes and leave an unpleasant astringent aftertaste.",
    blanks: [
      {
        id: "blank_1",
        correct: "generate",
        options: ["generate", "generation", "generated", "generating"],
        deepFeedback: {
          formula: "Rumus Infinitive of Result: Pola 'interact to + Verb 1'.",
          grammarRule: "to + Verb 1 murni (generate).",
          collocation: "generate aromatic compounds (= menghasilkan senyawa aromatik)",
          distractorAnalysis: "'Generation' adalah kata benda, 'generated' adalah past tense, 'generating' adalah bentuk -ing. Hanya 'generate' yang merupakan Verb 1.",
          translation: "Gula pereduksi dan asam amino berinteraksi untuk menghasilkan ratusan senyawa aromatik yang mudah menguap."
        }
      },
      {
        id: "blank_2",
        correct: "Conversely",
        options: ["Conversely", "Furthermore", "Therefore", "Because"],
        deepFeedback: {
          formula: "Peta Linking Words (Kontras Risiko): Membandingkan pemanggangan sempurna dengan risiko kegagalan bila panas tidak diatur dengan benar.",
          grammarRule: "Adversative discourse marker: Conversely (= Sebaliknya).",
          linkingWordType: "Contrast & Consequence (= Sebaliknya / Namun bila salah)",
          distractorAnalysis: "'Furthermore' dan 'Therefore' menandakan kesinambungan searah, bukan perbandingan kondisi yang salah penanganan.",
          translation: "Sebaliknya, penerapan panas yang tidak tepat dapat merusak aroma buah yang lembut dan meninggalkan rasa sepat yang tidak menyenangkan."
        }
      }
    ]
  },
  {
    id: "rw-fib-019",
    title: "Cold Chain Logistics in Modern Food Supply Chains",
    domain: "Supply Chain Management & Food Preservation",
    text: "Maintaining an unbroken cold chain is indispensable for safeguarding the freshness and microbiological safety of perishable agricultural commodities. From the moment produce is harvested, temperature-controlled transport units must prevent thermal abuse that can accelerate enzymatic [blank_1]. IoT sensors equipped with real-time telemetry allow logistics coordinators to monitor temperature deviations instantly across vast geographic distances. [blank_2], any breakdown in refrigeration during transit can compromise consumer safety and result in substantial financial losses.",
    blanks: [
      {
        id: "blank_1",
        correct: "breakdown",
        options: ["breakdown", "break", "breaking", "broken"],
        deepFeedback: {
          formula: "Rumus Frasa Kata Benda: Setelah kata sifat 'enzymatic', kita membutuhkan KATA BENDA (noun).",
          grammarRule: "Adjective + Noun: enzymatic breakdown.",
          collocation: "enzymatic breakdown (= penguraian enzimatik)",
          distractorAnalysis: "'Break' adalah verb dasar, 'breaking' adalah present participle, 'broken' adalah past participle. 'Breakdown' adalah noun baku untuk proses penguraian biokimia.",
          translation: "Unit transportasi dengan pengatur suhu harus mencegah kenaikan suhu yang dapat mempercepat penguraian enzimatik."
        }
      },
      {
        id: "blank_2",
        correct: "Indeed",
        options: ["Indeed", "Although", "Despite", "Unless"],
        deepFeedback: {
          formula: "Peta Linking Words (Penegasan / Kenyataan): Menegaskan fakta pentingnya rantai dingin dengan memaparkan bahaya fatal bila terjadi kerusakan pendingin.",
          grammarRule: "Emphatic adverbial connector followed by comma: Indeed (= Memang / Faktanya).",
          linkingWordType: "Emphasis & Confirmation (= Memang benar / Kenyataannya)",
          distractorAnalysis: "'Although' dan 'Unless' adalah subordinating conjunctions. 'Despite' adalah preposition.",
          translation: "Memang benar, setiap kerusakan pada sistem pendingin selama transit dapat membahayakan keselamatan konsumen dan mengakibatkan kerugian finansial yang besar."
        }
      }
    ]
  },
  {
    id: "rw-fib-020",
    title: "The Gut-Brain Axis and Dietary Neurobiology",
    domain: "Neuroscience & Clinical Nutrition",
    text: "Emerging scientific research indicates that the gastrointestinal microbiome communicates bidirectionally with the central nervous system through the gut-brain axis. Commensal bacterial colonies produce neurotransmitters such as serotonin and gamma-aminobutyric acid (GABA), which [blank_1] mood regulation and cognitive function. Clinical trials have shown that diets enriched with dietary prebiotic fiber can cultivate beneficial microbial diversity. [blank_2], the therapeutic modulation of gut flora represents an innovative frontier in preventative mental healthcare.",
    blanks: [
      {
        id: "blank_1",
        correct: "influence",
        options: ["influence", "influences", "influential", "influencing"],
        deepFeedback: {
          formula: "Rumus Subject-Verb Agreement Relatif: Antecedent 'neurotransmitters' berbentuk jamak (plural), maka verb yang mengikuti adalah VERB 1 PLURAL (tanpa -s).",
          grammarRule: "Plural noun + which + Verb 1: influence.",
          collocation: "influence mood regulation (= memengaruhi pengaturan suasana hati)",
          distractorAnalysis: "'Influences' adalah bentuk tunggal singular. 'Influential' adalah kata sifat (adjective). 'Influencing' adalah participle.",
          translation: "Bakteri usus menghasilkan neurotransmiter seperti serotonin yang memengaruhi pengaturan suasana hati dan fungsi kognitif."
        }
      },
      {
        id: "blank_2",
        correct: "Consequently",
        options: ["Consequently", "However", "Although", "In contrast"],
        deepFeedback: {
          formula: "Peta Linking Words (Kesimpulan Logis): Menyimpulkan bahwa berdasarkan bukti ilmiah tersebut, modulasi flora usus merupakan terobosan baru dalam kesehatan mental.",
          grammarRule: "Sentence adverb of result followed by comma.",
          linkingWordType: "Cause and Effect / Scientific Conclusion (= Oleh karena itu / Akibatnya)",
          distractorAnalysis: "'However' dan 'In contrast' salah karena menyatakan perlawanan ide, padahal kalimat ini adalah rangkuman kesimpulan yang selaras.",
          translation: "Oleh karena itu, modulasi terapeutik flora usus mewakili garis depan yang inovatif dalam perawatan kesehatan mental preventif."
        }
      }
    ]
  }
];

// Execute expansion for reading FIB
const rwFibPath = path.join(pteDir, 'pte-reading-fib.json');
const rwFibData = JSON.parse(fs.readFileSync(rwFibPath, 'utf8'));
const existingRwIds = new Set(rwFibData.items.map(x => x.id));
let addedRwCount = 0;

newRwFibItems.forEach(item => {
  if (!existingRwIds.has(item.id)) {
    rwFibData.items.push(item);
    addedRwCount++;
  }
});

fs.writeFileSync(rwFibPath, JSON.stringify(rwFibData, null, 2), 'utf8');
console.log(`Updated pte-reading-fib.json: added ${addedRwCount} items, total now ${rwFibData.items.length}.`);

// 2. Reading Drag & Drop Items (r-dd-007 to r-dd-016)
const newRDdItems = [
  {
    id: "r-dd-007",
    title: "Kitchen Sanitation and Foodborne Illness Prevention",
    domain: "Commercial Cookery & Food Safety",
    text: "Commercial kitchens are dynamic environments where rigorous hygiene standards are strictly enforced to prevent outbreaks of foodborne illnesses. Chefs must maintain high levels of personal cleanliness and sanitize all food-contact surfaces [blank_1] throughout each shift. Raw poultry and seafood must be kept completely [blank_2] from ready-to-eat ingredients to eliminate the danger of cross-contamination. Furthermore, cooling warm dishes rapidly within two hours is vital to [blank_3] bacterial spores from germinating into active pathogens.",
    wordPool: [
      "regularly",
      "separate",
      "prevent",
      "prevention",
      "separation",
      "carelessly"
    ],
    correctAnswers: {
      "blank_1": "regularly",
      "blank_2": "separate",
      "blank_3": "prevent"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "regularly",
        "grammarFormula": "Rumus Adverb of Frequency: Kata kerja 'sanitize surfaces' dimodifikasi oleh kata keterangan (adverb -ly) yang menunjukkan keteraturan waktu.",
        "collocation": "sanitize regularly (= membersihkan secara teratur)",
        "distractorTip": "'Carelessly' berlawanan makna (sembrono), 'regular' adalah kata sifat (adjective)."
      },
      "blank_2": {
        "correct": "separate",
        "grammarFormula": "Rumus Adjective Complement: Pola 'kept completely [adjective] from'. Kata sifat pemisah adalah 'separate'.",
        "collocation": "kept separate from (= dijaga terpisah dari)",
        "distractorTip": "'Separation' adalah kata benda (noun), sedangkan posisi setelah 'kept + adverb' membutuhkan adjective."
      },
      "blank_3": {
        "correct": "prevent",
        "grammarFormula": "Rumus Infinitive: 'vital to' + Verb 1 murni (base form). Kata kerja pencegahan adalah 'prevent'.",
        "collocation": "prevent bacterial spores from germinating (= mencegah spora bakteri berkecambah)",
        "distractorTip": "'Prevention' adalah noun, bukan verb dasar."
      }
    }
  },
  {
    id: "r-dd-008",
    title: "Hospitality Guest Services and Front Office Excellence",
    domain: "Hospitality Management",
    text: "In the contemporary luxury hotel industry, providing personalized guest experiences is the primary catalyst for fostering customer [blank_1]. Front desk associates serve as the initial point of contact, requiring active listening skills to anticipate traveler needs [blank_2]. When service disruptions or scheduling errors occur, managers must respond promptly with empathetic communication and restitution to [blank_3] customer satisfaction.",
    wordPool: [
      "loyalty",
      "effectively",
      "restore",
      "restoration",
      "effective",
      "disloyalty"
    ],
    correctAnswers: {
      "blank_1": "loyalty",
      "blank_2": "effectively",
      "blank_3": "restore"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "loyalty",
        "grammarFormula": "Rumus Noun Phrase: Setelah kata benda atribut 'customer', kita membutuhkan kata benda utama (head noun) 'loyalty'.",
        "collocation": "foster customer loyalty (= menumbuhkan loyalitas pelanggan)",
        "distractorTip": "'Disloyalty' berlawanan arti, 'loyal' adalah adjective."
      },
      "blank_2": {
        "correct": "effectively",
        "grammarFormula": "Rumus Adverb of Manner: Kata kerja 'anticipate needs' dimodifikasi oleh keterangan cara (adverb -ly).",
        "collocation": "anticipate needs effectively (= mengantisipasi kebutuhan secara efektif)",
        "distractorTip": "'Effective' adalah kata sifat, tidak bisa memodifikasi kata kerja transitif."
      },
      "blank_3": {
        "correct": "restore",
        "grammarFormula": "Rumus Infinitive of Purpose: 'to' + Verb 1 murni. Kata kerja pemulihan kepuasan adalah 'restore'.",
        "collocation": "restore customer satisfaction (= memulihkan kepuasan pelanggan)",
        "distractorTip": "'Restoration' adalah noun."
      }
    }
  },
  {
    id: "r-dd-009",
    title: "Culinary Emulsification and Sauce Chemistry",
    domain: "Culinary Science & Classic Cookery",
    text: "Sauce making in classical culinary arts relies extensively on physical chemistry, specifically the science of emulsification. In oil-in-water emulsions such as mayonnaise or hollandaise, two immiscible liquids are forced into a stable [blank_1] through continuous mechanical shearing. Egg yolks contain lecithin, a natural phospholipid that acts as an emulsifying agent to [blank_2] the surface tension between fat droplets and vinegar. If oil is incorporated too rapidly, the delicate emulsion will [blank_3] and separate into greasy layers.",
    wordPool: [
      "mixture",
      "reduce",
      "split",
      "reduction",
      "mixed",
      "splitting"
    ],
    correctAnswers: {
      "blank_1": "mixture",
      "blank_2": "reduce",
      "blank_3": "split"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "mixture",
        "grammarFormula": "Rumus Noun Phrase: Setelah adjective 'stable', dibutuhkan kata benda (noun) 'mixture'.",
        "collocation": "stable mixture (= campuran yang stabil)",
        "distractorTip": "'Mixed' adalah adjective/verb, bukan noun."
      },
      "blank_2": {
        "correct": "reduce",
        "grammarFormula": "Rumus Infinitive of Purpose: 'to' + Verb 1 murni (reduce).",
        "collocation": "reduce surface tension (= mengurangi tegangan permukaan)",
        "distractorTip": "'Reduction' adalah kata benda."
      },
      "blank_3": {
        "correct": "split",
        "grammarFormula": "Rumus Modal Future: Setelah modal auxiliary 'will', kata kerja WAJIB berbentuk VERB 1 DASAR.",
        "collocation": "emulsion will split (= emulsi akan pecah/rusak)",
        "distractorTip": "'Splitting' adalah participle, membutuhkan to be."
      }
    }
  },
  {
    id: "r-dd-010",
    title: "Solar Photovoltaic Efficiency and Grid Modernization",
    domain: "Renewable Energy & Engineering",
    text: "Advances in photovoltaic cell engineering have led to substantial improvements in the conversion [blank_1] of sunlight into electrical energy. Perovskite-silicon tandem cells demonstrate record performance by absorbing broader wavelengths of the solar spectrum. However, national electricity networks must incorporate large-scale battery storage to [blank_2] consistent supply during overcast days. Engineers are currently designing intelligent transmission systems to [blank_3] clean energy across rural and metropolitan regions.",
    wordPool: [
      "efficiency",
      "maintain",
      "distribute",
      "efficient",
      "maintenance",
      "distribution"
    ],
    correctAnswers: {
      "blank_1": "efficiency",
      "blank_2": "maintain",
      "blank_3": "distribute"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "efficiency",
        "grammarFormula": "Rumus Compound Noun: Pasangan istilah teknik untuk daya guna pengubahan energi adalah 'conversion efficiency'.",
        "collocation": "conversion efficiency (= efisiensi konversi)",
        "distractorTip": "'Efficient' adalah adjective, membutuhkan noun sebagai objek preposisi 'in'."
      },
      "blank_2": {
        "correct": "maintain",
        "grammarFormula": "Rumus Infinitive: 'to' + Verb 1 (maintain).",
        "collocation": "maintain consistent supply (= menjaga pasokan yang konsisten)",
        "distractorTip": "'Maintenance' adalah noun."
      },
      "blank_3": {
        "correct": "distribute",
        "grammarFormula": "Rumus Infinitive: 'to' + Verb 1 (distribute).",
        "collocation": "distribute clean energy (= mendistribusikan energi bersih)",
        "distractorTip": "'Distribution' adalah noun."
      }
    }
  },
  {
    id: "r-dd-011",
    title: "Agricultural Water Management in Arid Australia",
    domain: "Environmental Agriculture & Irrigation",
    text: "In the arid interior of Western Australia, agricultural producers must manage limited freshwater resources with extreme [blank_1]. Traditional overhead sprayers have been largely supplanted by automated subsurface drip irrigation systems that deliver water directly to crop roots. This technique minimizes evaporative [blank_2] and reduces soil salinization. By utilizing soil moisture sensors, growers can calculate exact daily irrigation quotas to [blank_3] crop yields while conserving groundwater reserves.",
    wordPool: [
      "precision",
      "losses",
      "maximize",
      "precise",
      "losing",
      "maximum"
    ],
    correctAnswers: {
      "blank_1": "precision",
      "blank_2": "losses",
      "blank_3": "maximize"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "precision",
        "grammarFormula": "Rumus Prepositional Object: Setelah preposisi 'with', kita membutuhkan KATA BENDA (noun) 'precision'.",
        "collocation": "with extreme precision (= dengan ketepatan/presisi ekstrem)",
        "distractorTip": "'Precise' adalah kata sifat (adjective)."
      },
      "blank_2": {
        "correct": "losses",
        "grammarFormula": "Rumus Noun Phrase: Setelah kata sifat 'evaporative', kita membutuhkan kata benda jamak (losses).",
        "collocation": "evaporative losses (= kehilangan air akibat penguapan)",
        "distractorTip": "'Losing' adalah participle/gerund."
      },
      "blank_3": {
        "correct": "maximize",
        "grammarFormula": "Rumus Infinitive: 'to' + Verb 1 (maximize).",
        "collocation": "maximize crop yields (= memaksimalkan hasil panen)",
        "distractorTip": "'Maximum' adalah adjective/noun."
      }
    }
  },
  {
    id: "r-dd-012",
    title: "Meat Tenderness and Post-Mortem Muscle Proteolysis",
    domain: "Meat Science & Culinary Preparation",
    text: "The mechanical tenderness of meat is governed by the structural integrity of myofibrillar proteins and connective collagen tissues. Following slaughter, muscle tissues enter rigor mortis as cellular ATP stores become depleted. During subsequent aging, endogenous proteolytic enzymes, primarily calpains and cathepsins, gradually [blank_1] muscle fibers. Chefs utilize wet-aging vacuum packaging to allow this enzymatic tenderization to proceed [blank_2] without surface dehydration. Cooking meat at low, gentle temperatures further prevents muscle fibers from tightening [blank_3].",
    wordPool: [
      "degrade",
      "safely",
      "excessively",
      "degradation",
      "safe",
      "excessive"
    ],
    correctAnswers: {
      "blank_1": "degrade",
      "blank_2": "safely",
      "blank_3": "excessively"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "degrade",
        "grammarFormula": "Rumus Subject-Verb Agreement: Subjek jamak 'proteolytic enzymes' membutuhkan VERB 1 PLURAL 'degrade'.",
        "collocation": "degrade muscle fibers (= mengurai/melunakkan serat otot)",
        "distractorTip": "'Degradation' adalah kata benda."
      },
      "blank_2": {
        "correct": "safely",
        "grammarFormula": "Rumus Adverb of Manner: Kata kerja 'proceed' diterangkan oleh kata keterangan berakhiran -ly 'safely'.",
        "collocation": "proceed safely (= berlangsung dengan aman)",
        "distractorTip": "'Safe' adalah kata sifat."
      },
      "blank_3": {
        "correct": "excessively",
        "grammarFormula": "Rumus Adverb of Degree: Menerangkan kata kerja 'tightening' dengan adverb 'excessively'.",
        "collocation": "tighten excessively (= mengencang/mengeras secara berlebihan)",
        "distractorTip": "'Excessive' adalah kata sifat."
      }
    }
  },
  {
    id: "r-dd-013",
    title: "Food Waste Reduction in Commercial Hospitality",
    domain: "Hospitality Sustainability & Operations",
    text: "Food waste in the hospitality sector carries immense ecological and fiscal implications. Buffets and high-volume catering kitchens frequently generate excess prepared food due to inaccurate patron [blank_1]. To mitigate this systemic waste, forward-thinking restaurants perform comprehensive culinary audits and repurpose trimmings into stocks and sauces. Furthermore, establishing partnerships with community food rescue charities enables hotels to [blank_2] unserved edible meals to populations in need, thereby reinforcing their corporate social [blank_3].",
    wordPool: [
      "forecasting",
      "donate",
      "responsibility",
      "forecast",
      "donation",
      "responsible"
    ],
    correctAnswers: {
      "blank_1": "forecasting",
      "blank_2": "donate",
      "blank_3": "responsibility"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "forecasting",
        "grammarFormula": "Rumus Noun Phrase: Setelah kata sifat 'inaccurate patron', kita membutuhkan noun/gerund 'forecasting'.",
        "collocation": "patron forecasting (= peramalan/prediksi jumlah tamu)",
        "distractorTip": "'Forecast' adalah bentuk kerja dasar/singular present."
      },
      "blank_2": {
        "correct": "donate",
        "grammarFormula": "Rumus Infinitive: 'enables hotels to' + Verb 1 murni (donate).",
        "collocation": "donate unserved meals (= menyumbangkan makanan yang belum disajikan)",
        "distractorTip": "'Donation' adalah kata benda."
      },
      "blank_3": {
        "correct": "responsibility",
        "grammarFormula": "Rumus Collocation Paten: 'corporate social responsibility' (CSR) adalah istilah bisnis paten dunia.",
        "collocation": "corporate social responsibility (= tanggung jawab sosial perusahaan)",
        "distractorTip": "'Responsible' adalah kata sifat."
      }
    }
  },
  {
    id: "r-dd-014",
    title: "The Physics of Sourdough Bread Aeration",
    domain: "Baking Science & Pastry Arts",
    text: "The open crumb structure of artisan sourdough bread is a direct manifestation of gas retention within a viscoelastic gluten matrix. As yeasts ferment sugars, carbon dioxide gas bubbles expand during the initial stages of baking in a phenomenon called oven [blank_1]. Bakers must develop gluten strength through controlled hydration and folding techniques to ensure the dough walls are [blank_2] enough to entrap expanding gas without rupturing prematurely. A well-aerated loaf exhibits a light interior crumb and an exceptionally crisp outer [blank_3].",
    wordPool: [
      "spring",
      "elastic",
      "crust",
      "springing",
      "elasticity",
      "crusty"
    ],
    correctAnswers: {
      "blank_1": "spring",
      "blank_2": "elastic",
      "blank_3": "crust"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "spring",
        "grammarFormula": "Rumus Baking Terminology: Istilah baku lonjakan mengembangnya roti saat pertama masuk oven adalah 'oven spring'.",
        "collocation": "oven spring (= lonjakan pemuaian adonan di oven)",
        "distractorTip": "'Springing' adalah bentuk participle."
      },
      "blank_2": {
        "correct": "elastic",
        "grammarFormula": "Rumus Adjective + Enough: Pola '[adjective] + enough'. Kata sifat elastis adalah 'elastic'.",
        "collocation": "elastic enough to entrap gas (= cukup elastis untuk memerangkap gas)",
        "distractorTip": "'Elasticity' adalah kata benda (noun)."
      },
      "blank_3": {
        "correct": "crust",
        "grammarFormula": "Rumus Noun Phrase: Setelah kata sifat 'crisp outer', kita membutuhkan kata benda 'crust'.",
        "collocation": "crisp outer crust (= kerak luar yang renyah)",
        "distractorTip": "'Crusty' adalah kata sifat."
      }
    }
  },
  {
    id: "r-dd-015",
    title: "Sous-Vide Cooking and Precision Temperature Control",
    domain: "Modern Culinary Techniques & Thermal Physics",
    text: "Sous-vide cooking involves vacuum-sealing raw ingredients in food-grade pouches and submerging them into an agitated water bath maintained at a constant [blank_1]. By eliminating moisture loss through evaporation, this technique preserves delicate cellular moisture and volatile aromatics. Furthermore, uniform thermal conduction ensures that proteins reach pasteurization temperatures [blank_2] without overcooking outer layers. Once cooked, chefs often give meats a brief sear in a smoking hot pan to develop savory caramelized crusts via the Maillard [blank_3].",
    wordPool: [
      "temperature",
      "evenly",
      "reaction",
      "hot",
      "eventual",
      "react"
    ],
    correctAnswers: {
      "blank_1": "temperature",
      "blank_2": "evenly",
      "blank_3": "reaction"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "temperature",
        "grammarFormula": "Rumus Noun Phrase: Setelah adjective 'constant', kita membutuhkan kata benda 'temperature'.",
        "collocation": "constant temperature (= suhu konstan)",
        "distractorTip": "'Hot' adalah kata sifat."
      },
      "blank_2": {
        "correct": "evenly",
        "grammarFormula": "Rumus Adverb of Manner: Menerangkan proses pemanasan 'reach temperatures' dengan keterangan rata/merata 'evenly'.",
        "collocation": "heat evenly (= memanas secara merata)",
        "distractorTip": "'Eventual' adalah kata sifat."
      },
      "blank_3": {
        "correct": "reaction",
        "grammarFormula": "Rumus Kimia Kuliner Paten: Reaksi pencokelatan aroma pada masakan bernama 'Maillard reaction'.",
        "collocation": "Maillard reaction (= reaksi Maillard)",
        "distractorTip": "'React' adalah kata kerja."
      }
    }
  },
  {
    id: "r-dd-016",
    title: "Australian Tourism Economics and Regional Infrastructure",
    domain: "Regional Development & Tourism Economics",
    text: "Regional tourism outside metropolitan capitals serves as a crucial economic lifeline for rural Australian towns. To attract international travelers, local governments must invest in transportation [blank_1] such as modern regional airports and scenic highway corridors. Enhanced accessibility encourages visitors to disperse throughout rural wine regions and national parks, generating direct revenues for family-owned restaurants and boutique hotels. Effective marketing campaigns highlight unique cultural heritage to [blank_2] visitor interest throughout all seasons. As a consequence, regional communities enjoy sustainable employment [blank_3].",
    wordPool: [
      "infrastructure",
      "stimulate",
      "opportunities",
      "structural",
      "stimulation",
      "opportunistic"
    ],
    correctAnswers: {
      "blank_1": "infrastructure",
      "blank_2": "stimulate",
      "blank_3": "opportunities"
    },
    deepFeedback: {
      "blank_1": {
        "correct": "infrastructure",
        "grammarFormula": "Rumus Compound Noun: 'transportation infrastructure' adalah frasa benda ekonomi standar.",
        "collocation": "transportation infrastructure (= infrastruktur transportasi)",
        "distractorTip": "'Structural' adalah kata sifat."
      },
      "blank_2": {
        "correct": "stimulate",
        "grammarFormula": "Rumus Infinitive: 'to' + Verb 1 murni (stimulate).",
        "collocation": "stimulate visitor interest (= merangsang/meningkatkan minat pengunjung)",
        "distractorTip": "'Stimulation' adalah kata benda."
      },
      "blank_3": {
        "correct": "opportunities",
        "grammarFormula": "Rumus Noun Phrase: Setelah 'employment', kita membutuhkan kata benda jamak 'opportunities'.",
        "collocation": "employment opportunities (= peluang/lapangan pekerjaan)",
        "distractorTip": "'Opportunistic' adalah kata sifat."
      }
    }
  }
];

// Append to reading drag drop
const rDdPath = path.join(pteDir, 'pte-reading-drag-drop.json');
const rDdData = JSON.parse(fs.readFileSync(rDdPath, 'utf8'));
const existingDdIds = new Set(rDdData.items.map(x => x.id));
let addedDdCount = 0;

newRDdItems.forEach(item => {
  if (!existingDdIds.has(item.id)) {
    rDdData.items.push(item);
    addedDdCount++;
  }
});

fs.writeFileSync(rDdPath, JSON.stringify(rDdData, null, 2), 'utf8');
console.log(`Updated pte-reading-drag-drop.json: added ${addedDdCount} items, total now ${rDdData.items.length}.`);

// 3. Listening FIB Items (lfib-006 to lfib-016)
const newLfibItems = [
  {
    id: "lfib-006",
    title: "Commercial Kitchen Temperature Standards",
    audioTranscript: "To prevent foodborne bacterial proliferation, commercial refrigeration units must maintain temperatures strictly between one and four degrees Celsius. Food inspectors routinely inspect digital calibration logs to ensure complete regulatory compliance.",
    displayedText: "To prevent foodborne bacterial [blank_1], commercial refrigeration units must maintain temperatures strictly between one and four degrees Celsius. Food inspectors routinely inspect digital [blank_2] logs to ensure complete regulatory [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "proliferation",
        spellingTip: "P-R-O-L-I-F-E-R-A-T-I-O-N (Akhiran -tion, satu huruf F, bukan double F)."
      },
      {
        id: "blank_2",
        correct: "calibration",
        spellingTip: "C-A-L-I-B-R-A-T-I-O-N (Satu huruf L, diawali C)."
      },
      {
        id: "blank_3",
        correct: "compliance",
        spellingTip: "C-O-M-P-L-I-A-N-C-E (Perhatikan akhiran -ance, bukan -ence)."
      }
    ]
  },
  {
    id: "lfib-007",
    title: "Hospitality Customer Relationship Management",
    audioTranscript: "Modern hotel management systems gather real-time analytical data on guest preferences during their stay. Front desk personnel utilize these records to anticipate individual requests and provide superior customer hospitality.",
    displayedText: "Modern hotel management systems gather real-time [blank_1] data on guest preferences during their stay. Front desk personnel utilize these records to [blank_2] individual requests and provide superior customer [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "analytical",
        spellingTip: "A-N-A-L-Y-T-I-C-A-L (Huruf Y setelah L, akhiran -ical)."
      },
      {
        id: "blank_2",
        correct: "anticipate",
        spellingTip: "A-N-T-I-C-I-P-A-T-E (Verb 1 setelah 'to anticipate')."
      },
      {
        id: "blank_3",
        correct: "hospitality",
        spellingTip: "H-O-S-P-I-T-A-L-I-T-Y (H-O-S-P-I-T-A-L-I-T-Y)."
      }
    ]
  },
  {
    id: "lfib-008",
    title: "Nutritional Value of Dietary Fiber",
    audioTranscript: "Clinical nutritionists emphasize that soluble fiber plays an indispensable role in stabilizing blood glucose levels and reducing serum cholesterol. Whole grains and legumes also provide vital micronutrients essential for digestive health.",
    displayedText: "Clinical nutritionists emphasize that soluble fiber plays an [blank_1] role in stabilizing blood glucose levels and reducing serum [blank_2]. Whole grains and legumes also provide vital [blank_3] essential for digestive health.",
    blanks: [
      {
        id: "blank_1",
        correct: "indispensable",
        spellingTip: "I-N-D-I-S-P-E-N-S-A-B-L-E (Perhatikan akhiran -able, bukan -ible)."
      },
      {
        id: "blank_2",
        correct: "cholesterol",
        spellingTip: "C-H-O-L-E-S-T-E-R-O-L (Diawali Ch-, akhiran -ol)."
      },
      {
        id: "blank_3",
        correct: "micronutrients",
        spellingTip: "M-I-C-R-O-N-U-T-R-I-E-N-T-S (Bentuk jamak berakhiran -s)."
      }
    ]
  },
  {
    id: "lfib-009",
    title: "Culinary Emulsification Techniques",
    audioTranscript: "When preparing classic warm emulsion sauces, chefs must introduce melted butter gradually while whisking vigorously to avoid thermal curdling. The precise temperature of the egg yolks determines the ultimate stability of the sauce.",
    displayedText: "When preparing classic warm [blank_1] sauces, chefs must introduce melted butter gradually while whisking [blank_2] to avoid thermal curdling. The precise temperature of the egg yolks determines the ultimate [blank_3] of the sauce.",
    blanks: [
      {
        id: "blank_1",
        correct: "emulsion",
        spellingTip: "E-M-U-L-S-I-O-N (Satu huruf M, akhiran -sion)."
      },
      {
        id: "blank_2",
        correct: "vigorously",
        spellingTip: "V-I-G-O-R-O-U-S-L-Y (Adverb berakhiran -ously)."
      },
      {
        id: "blank_3",
        correct: "stability",
        spellingTip: "S-T-A-B-I-L-I-T-Y (Kata benda dari stable)."
      }
    ]
  },
  {
    id: "lfib-010",
    title: "Renewable Energy and Solar Microgrids",
    audioTranscript: "Remote mining operations in the Australian outback are adopting hybrid solar microgrids to minimize diesel consumption. High-capacity lithium batteries store surplus electrical power generated during midday sunshine.",
    displayedText: "Remote mining operations in the Australian outback are adopting hybrid solar [blank_1] to minimize diesel consumption. High-capacity lithium batteries store [blank_2] electrical power generated during midday [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "microgrids",
        spellingTip: "M-I-C-R-O-G-R-I-D-S (Satu kata majemuk, jamak -s)."
      },
      {
        id: "blank_2",
        correct: "surplus",
        spellingTip: "S-U-R-P-L-U-S (Surplus = kelebihan daya)."
      },
      {
        id: "blank_3",
        correct: "sunshine",
        spellingTip: "S-U-N-S-H-I-N-E (S-U-N-S-H-I-N-E)."
      }
    ]
  },
  {
    id: "lfib-011",
    title: "Great Barrier Reef Coral Conservation",
    audioTranscript: "Marine biologists have discovered that certain thermal-tolerant coral colonies can survive elevated oceanic temperatures. Genetic sequencing reveals protective adaptations that offer hope for extensive ecological restoration.",
    displayedText: "Marine biologists have discovered that certain thermal-tolerant coral [blank_1] can survive elevated oceanic temperatures. Genetic [blank_2] reveals protective adaptations that offer hope for extensive ecological [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "colonies",
        spellingTip: "C-O-L-O-N-I-E-S (Bentuk jamak dari colony: y berubah menjadi -ies)."
      },
      {
        id: "blank_2",
        correct: "sequencing",
        spellingTip: "S-E-Q-U-E-N-C-I-N-G (Perhatikan huruf Q-U, akhiran -cing)."
      },
      {
        id: "blank_3",
        correct: "restoration",
        spellingTip: "R-E-S-T-O-R-A-T-I-O-N (Akhiran -tion)."
      }
    ]
  },
  {
    id: "lfib-012",
    title: "Vocational Hospitality Apprenticeships in Perth",
    audioTranscript: "Vocational apprentices receive structured on-the-job mentorship within accredited hotel dining establishments. Practical competency evaluations verify that candidates can execute high-volume food service under rigorous commercial deadlines.",
    displayedText: "Vocational apprentices receive structured on-the-job [blank_1] within accredited hotel dining establishments. Practical [blank_2] evaluations verify that candidates can execute high-volume food service under rigorous commercial [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "mentorship",
        spellingTip: "M-E-N-T-O-R-S-H-I-P (Akhiran -ship)."
      },
      {
        id: "blank_2",
        correct: "competency",
        spellingTip: "C-O-M-P-E-T-E-N-C-Y (Perhatikan huruf E di tengah: c-o-m-p-e-t-e-n-c-y)."
      },
      {
        id: "blank_3",
        correct: "deadlines",
        spellingTip: "D-E-A-D-L-I-N-E-S (Jamak berakhiran -s)."
      }
    ]
  },
  {
    id: "lfib-013",
    title: "Sustainable Agriculture and Soil Microbiomes",
    audioTranscript: "Regenerative agricultural practices focus on replenishing organic matter in depleted topsoils. Cover crops foster symbiotic relationships with mycorrhizal fungi, which significantly enhances moisture retention during summer droughts.",
    displayedText: "Regenerative agricultural practices focus on replenishing organic matter in [blank_1] topsoils. Cover crops foster [blank_2] relationships with mycorrhizal fungi, which significantly enhances moisture [blank_3] during summer droughts.",
    blanks: [
      {
        id: "blank_1",
        correct: "depleted",
        spellingTip: "D-E-P-L-E-T-E-D (Past participle sebagai adjective)."
      },
      {
        id: "blank_2",
        correct: "symbiotic",
        spellingTip: "S-Y-M-B-I-O-T-I-C (Huruf Y setelah S, akhiran -tic)."
      },
      {
        id: "blank_3",
        correct: "retention",
        spellingTip: "R-E-T-E-N-T-I-O-N (Akhiran -tion, bukan -sion)."
      }
    ]
  },
  {
    id: "lfib-014",
    title: "Culinary Maillard Reaction and Meat Searing",
    audioTranscript: "High-heat surface searing triggers non-enzymatic browning between amino acids and reducing carbohydrates. This reaction produces complex heterocyclic volatile aromatics that define the savory profile of roasted steaks.",
    displayedText: "High-heat surface searing triggers non-enzymatic [blank_1] between amino acids and reducing carbohydrates. This reaction produces complex heterocyclic [blank_2] aromatics that define the savory [blank_3] of roasted steaks.",
    blanks: [
      {
        id: "blank_1",
        correct: "browning",
        spellingTip: "B-R-O-W-N-I-N-G (Gerund/noun proses pencokelatan)."
      },
      {
        id: "blank_2",
        correct: "volatile",
        spellingTip: "V-O-L-A-T-I-L-E (V-o-l-a-t-i-l-e = mudah menguap)."
      },
      {
        id: "blank_3",
        correct: "profile",
        spellingTip: "P-R-O-F-I-L-E (P-r-o-f-i-l-e)."
      }
    ]
  },
  {
    id: "lfib-015",
    title: "Regional Tourism and Western Australian Vineyards",
    audioTranscript: "Boutique wineries in the Margaret River district combine premium viticulture with luxury culinary hospitality. Tour operators organize guided tastings that highlight sustainable vineyard practices and regional biodiversity.",
    displayedText: "Boutique wineries in the Margaret River district combine premium [blank_1] with luxury culinary hospitality. Tour operators organize guided [blank_2] that highlight sustainable vineyard practices and regional [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "viticulture",
        spellingTip: "V-I-T-I-C-U-L-T-U-R-E (Viticulture = budidaya anggur)."
      },
      {
        id: "blank_2",
        correct: "tastings",
        spellingTip: "T-A-S-T-I-N-G-S (Jamak berakhiran -s)."
      },
      {
        id: "blank_3",
        correct: "biodiversity",
        spellingTip: "B-I-O-D-I-V-E-R-S-I-T-Y (Bio + diversity)."
      }
    ]
  },
  {
    id: "lfib-016",
    title: "Hotel Energy Efficiency and Automated HVAC Systems",
    audioTranscript: "Eco-friendly hotels are retrofitting computerized environmental sensors to regulate room climate automatically. These intelligent thermostats adjust output according to occupancy, cutting electrical expenditure without compromising patron comfort.",
    displayedText: "Eco-friendly hotels are retrofitting computerized environmental sensors to regulate room [blank_1] automatically. These intelligent thermostats adjust output according to [blank_2], cutting electrical expenditure without compromising patron [blank_3].",
    blanks: [
      {
        id: "blank_1",
        correct: "climate",
        spellingTip: "C-L-I-M-A-T-E (C-L-I-M-A-T-E)."
      },
      {
        id: "blank_2",
        correct: "occupancy",
        spellingTip: "O-C-C-U-P-A-N-C-Y (Dua huruf C, satu huruf P, akhiran -ancy)."
      },
      {
        id: "blank_3",
        correct: "comfort",
        spellingTip: "C-O-M-F-O-R-T (C-o-m-f-o-r-t)."
      }
    ]
  }
];

// Append to listening FIB
const lfibPath = path.join(pteDir, 'pte-listening-fib.json');
const lfibData = JSON.parse(fs.readFileSync(lfibPath, 'utf8'));
const existingLfibIds = new Set(lfibData.items.map(x => x.id));
let addedLfibCount = 0;

newLfibItems.forEach(item => {
  if (!existingLfibIds.has(item.id)) {
    lfibData.items.push(item);
    addedLfibCount++;
  }
});

fs.writeFileSync(lfibPath, JSON.stringify(lfibData, null, 2), 'utf8');
console.log(`Updated pte-listening-fib.json: added ${addedLfibCount} items, total now ${lfibData.items.length}.`);

// 4. Repeat Sentence expansion (15 authentic official exam sentences)
const newRsItems = [
  {
    id: "rs-013",
    title: "Commercial Kitchen Safety Briefing",
    sentence: "All kitchen staff must wash their hands thoroughly before handling raw food ingredients.",
    audioTranscript: "All kitchen staff must wash their hands thoroughly before handling raw food ingredients.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["kitchen staff", "hands", "raw food ingredients"],
    target50Chunk: "All kitchen staff must wash their hands thoroughly"
  },
  {
    id: "rs-014",
    title: "University Library Digital Archives",
    sentence: "Students can access peer-reviewed academic journals through the online university repository.",
    audioTranscript: "Students can access peer-reviewed academic journals through the online university repository.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["students", "academic journals", "online repository"],
    target50Chunk: "Students can access peer-reviewed academic journals"
  },
  {
    id: "rs-015",
    title: "Hospitality Customer Reservation Confirmation",
    sentence: "Please confirm your dining reservation with the front desk before six o'clock this evening.",
    audioTranscript: "Please confirm your dining reservation with the front desk before six o'clock this evening.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["dining reservation", "front desk", "six o'clock"],
    target50Chunk: "Please confirm your dining reservation with the front desk"
  },
  {
    id: "rs-016",
    title: "Food Temperature Regulation Compliance",
    sentence: "Perishable items must be stored below five degrees Celsius to inhibit bacterial growth.",
    audioTranscript: "Perishable items must be stored below five degrees Celsius to inhibit bacterial growth.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["perishable items", "five degrees Celsius", "bacterial growth"],
    target50Chunk: "Perishable items must be stored below five degrees Celsius"
  },
  {
    id: "rs-017",
    title: "Vocational Apprenticeship Workshop Orientation",
    sentence: "Protective footwear and safety goggles are strictly mandatory inside the commercial workshop.",
    audioTranscript: "Protective footwear and safety goggles are strictly mandatory inside the commercial workshop.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["protective footwear", "safety goggles", "commercial workshop"],
    target50Chunk: "Protective footwear and safety goggles are strictly mandatory"
  },
  {
    id: "rs-018",
    title: "Environmental Science Lecture Overview",
    sentence: "Rising ocean temperatures pose a catastrophic threat to delicate coral reef ecosystems.",
    audioTranscript: "Rising ocean temperatures pose a catastrophic threat to delicate coral reef ecosystems.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["ocean temperatures", "catastrophic threat", "coral reef ecosystems"],
    target50Chunk: "Rising ocean temperatures pose a catastrophic threat"
  },
  {
    id: "rs-019",
    title: "Culinary Technique Demonstration",
    sentence: "Slow roasting at moderate temperatures tenderizes tough cuts of meat while preserving moisture.",
    audioTranscript: "Slow roasting at moderate temperatures tenderizes tough cuts of meat while preserving moisture.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["slow roasting", "moderate temperatures", "meat", "moisture"],
    target50Chunk: "Slow roasting at moderate temperatures tenderizes tough cuts"
  },
  {
    id: "rs-020",
    title: "Hotel Revenue Operations Meeting",
    sentence: "The marketing team implemented dynamic pricing strategies to maximize room occupancy during the conference.",
    audioTranscript: "The marketing team implemented dynamic pricing strategies to maximize room occupancy during the conference.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["marketing team", "dynamic pricing", "room occupancy", "conference"],
    target50Chunk: "The marketing team implemented dynamic pricing strategies"
  },
  {
    id: "rs-021",
    title: "Public Health and Dietary Guidelines",
    sentence: "Consuming a balanced diet rich in leafy vegetables significantly lowers cardiovascular risk factors.",
    audioTranscript: "Consuming a balanced diet rich in leafy vegetables significantly lowers cardiovascular risk factors.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["balanced diet", "leafy vegetables", "cardiovascular risk"],
    target50Chunk: "Consuming a balanced diet rich in leafy vegetables"
  },
  {
    id: "rs-022",
    title: "Academic Research Methodology",
    sentence: "Participants were randomly divided into two experimental groups to evaluate treatment efficacy.",
    audioTranscript: "Participants were randomly divided into two experimental groups to evaluate treatment efficacy.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["participants", "experimental groups", "treatment efficacy"],
    target50Chunk: "Participants were randomly divided into two experimental groups"
  },
  {
    id: "rs-023",
    title: "Renewable Energy Seminar Discussion",
    sentence: "Solar and wind energy installations have expanded rapidly across regional Western Australia.",
    audioTranscript: "Solar and wind energy installations have expanded rapidly across regional Western Australia.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["solar and wind energy", "installations", "Western Australia"],
    target50Chunk: "Solar and wind energy installations have expanded rapidly"
  },
  {
    id: "rs-024",
    title: "Sustainable Fisheries Enforcement",
    sentence: "Strict quota regulations prevent overfishing and guarantee the long-term survival of marine species.",
    audioTranscript: "Strict quota regulations prevent overfishing and guarantee the long-term survival of marine species.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["quota regulations", "overfishing", "marine species"],
    target50Chunk: "Strict quota regulations prevent overfishing and guarantee"
  },
  {
    id: "rs-025",
    title: "Student Visa and Enrollment Guidelines",
    sentence: "International applicants must present certified documentation before their official enrollment can be finalized.",
    audioTranscript: "International applicants must present certified documentation before their official enrollment can be finalized.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["international applicants", "certified documentation", "enrollment"],
    target50Chunk: "International applicants must present certified documentation"
  },
  {
    id: "rs-026",
    title: "Baking Science Sourdough Fermentation",
    sentence: "Beneficial microorganisms produce organic acids that impart distinct tart flavors to artisan bread.",
    audioTranscript: "Beneficial microorganisms produce organic acids that impart distinct tart flavors to artisan bread.",
    persona: "guy",
    recordTimeSec: 15,
    keyNounChunks: ["microorganisms", "organic acids", "tart flavors", "artisan bread"],
    target50Chunk: "Beneficial microorganisms produce organic acids that impart"
  },
  {
    id: "rs-027",
    title: "Campus Security and Emergency Protocols",
    sentence: "In case of emergency, please evacuate the lecture hall immediately through the nearest marked exits.",
    audioTranscript: "In case of emergency, please evacuate the lecture hall immediately through the nearest marked exits.",
    persona: "aria",
    recordTimeSec: 15,
    keyNounChunks: ["emergency", "lecture hall", "marked exits"],
    target50Chunk: "In case of emergency please evacuate the lecture hall"
  }
];

// Append to repeat sentence
const rsPath = path.join(pteDir, 'pte-repeat-sentence.json');
const rsData = JSON.parse(fs.readFileSync(rsPath, 'utf8'));
const existingRsIds = new Set(rsData.items.map(x => x.id));
let addedRsCount = 0;

newRsItems.forEach(item => {
  if (!existingRsIds.has(item.id)) {
    rsData.items.push(item);
    addedRsCount++;
  }
});

fs.writeFileSync(rsPath, JSON.stringify(rsData, null, 2), 'utf8');
console.log(`Updated pte-repeat-sentence.json: added ${addedRsCount} items, total now ${rsData.items.length}.`);

// 5. Write from Dictation expansion (15 authentic official exam sentences)
const newWfdItems = [
  {
    id: "wfd-011",
    title: "Commercial Cookery Kitchen Sanitation",
    sentence: "All food handlers must maintain strict personal hygiene inside the commercial kitchen.",
    audioTranscript: "All food handlers must maintain strict personal hygiene inside the commercial kitchen.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "hygiene",
        commonErrors: ["hygene", "heigiene", "hygeine"],
        rule: "H-Y-G-I-E-N-E (I before E, letter Y in first syllable)."
      },
      {
        word: "commercial",
        commonErrors: ["comercial", "commerical"],
        rule: "C-O-M-M-E-R-C-I-A-L (Double M, ends in -cial)."
      }
    ],
    nakulExtraWords: ["handler", "handlers", "kitchen", "kitchens"]
  },
  {
    id: "wfd-012",
    title: "Hospitality Front Office Accommodation",
    sentence: "The hotel accommodates corporate clients with modern conference facilities.",
    audioTranscript: "The hotel accommodates corporate clients with modern conference facilities.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "accommodates",
        commonErrors: ["acommodates", "accomodates", "accommodate"],
        rule: "A-C-C-O-M-M-O-D-A-T-E-S (Double C and double M)."
      },
      {
        word: "conference",
        commonErrors: ["conferance", "conferense"],
        rule: "C-O-N-F-E-R-E-N-C-E (Ends in -ence, not -ance)."
      }
    ],
    nakulExtraWords: ["client", "clients", "facility", "facilities"]
  },
  {
    id: "wfd-013",
    title: "University Laboratory Safety Procedures",
    sentence: "Protective equipment must be worn at all times inside chemical laboratories.",
    audioTranscript: "Protective equipment must be worn at all times inside chemical laboratories.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "equipment",
        commonErrors: ["equipments", "equiptment"],
        rule: "E-Q-U-I-P-M-E-N-T (Uncountable noun, never add -s)."
      },
      {
        word: "laboratories",
        commonErrors: ["laboratorys", "labratories"],
        rule: "L-A-B-O-R-A-T-O-R-I-E-S (Plural of laboratory: -ies)."
      }
    ],
    nakulExtraWords: ["laboratory", "laboratories", "chemical", "chemicals"]
  },
  {
    id: "wfd-014",
    title: "Environmental Climate Research Findings",
    sentence: "Scientists collected valuable empirical data regarding extreme weather fluctuations.",
    audioTranscript: "Scientists collected valuable empirical data regarding extreme weather fluctuations.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "empirical",
        commonErrors: ["empiracle", "emperical"],
        rule: "E-M-P-I-R-I-C-A-L (E-m-p-i-r-i-c-a-l)."
      },
      {
        word: "fluctuations",
        commonErrors: ["fluctuasions", "fluctuations"],
        rule: "F-L-U-C-T-U-A-T-I-O-N-S (Ends in -tions)."
      }
    ],
    nakulExtraWords: ["scientist", "scientists", "fluctuation", "fluctuations"]
  },
  {
    id: "wfd-015",
    title: "Library Borrowing Privileges and Regulations",
    sentence: "Students must present their valid identity cards to borrow reference books.",
    audioTranscript: "Students must present their valid identity cards to borrow reference books.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "privilege",
        commonErrors: ["privelege", "priviledge"],
        rule: "P-R-I-V-I-L-E-G-E (Two I's, no D)."
      },
      {
        word: "reference",
        commonErrors: ["referance", "referense"],
        rule: "R-E-F-E-R-E-N-C-E (Ends in -ence)."
      }
    ],
    nakulExtraWords: ["student", "students", "card", "cards", "book", "books"]
  },
  {
    id: "wfd-016",
    title: "Vocational Hospitality Assessment Criteria",
    sentence: "Practical competency assessments require candidates to demonstrate professional customer service.",
    audioTranscript: "Practical competency assessments require candidates to demonstrate professional customer service.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "assessments",
        commonErrors: ["assesments", "assesment"],
        rule: "A-S-S-E-S-S-M-E-N-T-S (Four S's in total)."
      },
      {
        word: "professional",
        commonErrors: ["profesional", "proffessional"],
        rule: "P-R-O-F-E-S-S-I-O-N-A-L (One F, double S)."
      }
    ],
    nakulExtraWords: ["candidate", "candidates", "assessment", "assessments"]
  },
  {
    id: "wfd-017",
    title: "Culinary Nutrition and Dietary Balance",
    sentence: "Balanced nutrition supports sustained physical energy and cognitive performance throughout the day.",
    audioTranscript: "Balanced nutrition supports sustained physical energy and cognitive performance throughout the day.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "sustained",
        commonErrors: ["susteined", "sustanied"],
        rule: "S-U-S-T-A-I-N-E-D (S-u-s-t-a-i-n-e-d)."
      },
      {
        word: "cognitive",
        commonErrors: ["cognative", "cognetive"],
        rule: "C-O-G-N-I-T-I-V-E (C-o-g-n-i-t-i-v-e)."
      }
    ],
    nakulExtraWords: ["nutrition", "nutritions", "performance", "performances"]
  },
  {
    id: "wfd-018",
    title: "Renewable Energy Transition Policies",
    sentence: "Government subsidies encourage corporate investment in sustainable solar infrastructure.",
    audioTranscript: "Government subsidies encourage corporate investment in sustainable solar infrastructure.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "government",
        commonErrors: ["goverment", "govornment"],
        rule: "G-O-V-E-R-N-M-E-N-T (Keep the N: govern + ment)."
      },
      {
        word: "infrastructure",
        commonErrors: ["infrastructur", "infrastruture"],
        rule: "I-N-F-R-A-S-T-R-U-C-T-U-R-E (Contains -cture)."
      }
    ],
    nakulExtraWords: ["subsidy", "subsidies", "investment", "investments"]
  },
  {
    id: "wfd-019",
    title: "Marine Ecology Great Barrier Reef",
    sentence: "Marine sanctuaries protect endangered aquatic species from commercial exploitation.",
    audioTranscript: "Marine sanctuaries protect endangered aquatic species from commercial exploitation.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "sanctuaries",
        commonErrors: ["sanctuarys", "sancturies"],
        rule: "S-A-N-C-T-U-A-R-I-E-S (Plural: y becomes -ies)."
      },
      {
        word: "endangered",
        commonErrors: ["indangered", "endangred"],
        rule: "E-N-D-A-N-G-E-R-E-D (Prefix en-, not in-)."
      }
    ],
    nakulExtraWords: ["sanctuary", "sanctuaries", "species"]
  },
  {
    id: "wfd-020",
    title: "Hotel Reservation Management Procedures",
    sentence: "Guests should notify reception immediately if their travel arrangements change unexpectedly.",
    audioTranscript: "Guests should notify reception immediately if their travel arrangements change unexpectedly.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "immediately",
        commonErrors: ["immediatly", "imediatly"],
        rule: "I-M-M-E-D-I-A-T-E-L-Y (Double M, keep the E before -ly)."
      },
      {
        word: "arrangements",
        commonErrors: ["arangements", "arrangments"],
        rule: "A-R-R-A-N-G-E-M-E-N-T-S (Double R, keep E: arrange + ments)."
      }
    ],
    nakulExtraWords: ["guest", "guests", "arrangement", "arrangements"]
  },
  {
    id: "wfd-021",
    title: "Food Chemistry and Emulsification",
    sentence: "Egg yolks contain natural emulsifiers that stabilize delicate culinary sauces.",
    audioTranscript: "Egg yolks contain natural emulsifiers that stabilize delicate culinary sauces.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "emulsifiers",
        commonErrors: ["emulsyfiers", "emulcifiers"],
        rule: "E-M-U-L-S-I-F-I-E-R-S (S, not C; ends in -fiers)."
      },
      {
        word: "stabilize",
        commonErrors: ["stabilise", "stabelize"],
        rule: "S-T-A-B-I-L-I-Z-E (Pearson accepts both -ize and -ise)."
      }
    ],
    nakulExtraWords: ["sauce", "sauces", "emulsifier", "emulsifiers"]
  },
  {
    id: "wfd-022",
    title: "Academic Research Thesis Submission",
    sentence: "Postgraduate candidates must submit their finalized dissertations before the commencement ceremony.",
    audioTranscript: "Postgraduate candidates must submit their finalized dissertations before the commencement ceremony.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "dissertations",
        commonErrors: ["disertations", "dissertacions"],
        rule: "D-I-S-S-E-R-T-A-T-I-O-N-S (Double S, ends in -tions)."
      },
      {
        word: "commencement",
        commonErrors: ["comencement", "commencment"],
        rule: "C-O-M-M-E-N-C-E-M-E-N-T (Double M, keep E before -ment)."
      }
    ],
    nakulExtraWords: ["candidate", "candidates", "dissertation", "dissertations"]
  },
  {
    id: "wfd-023",
    title: "Hospitality Food Allergens Safety Notice",
    sentence: "Restaurant staff are legally required to disclose potential food allergens upon request.",
    audioTranscript: "Restaurant staff are legally required to disclose potential food allergens upon request.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "allergens",
        commonErrors: ["alergenes", "allergenes"],
        rule: "A-L-L-E-R-G-E-N-S (Double L, single G, ends in -ens)."
      },
      {
        word: "potential",
        commonErrors: ["potensial", "potentual"],
        rule: "P-O-T-E-N-T-I-A-L (T-I-A-L, not S-I-A-L)."
      }
    ],
    nakulExtraWords: ["allergen", "allergens", "staff", "request", "requests"]
  },
  {
    id: "wfd-024",
    title: "Agricultural Irrigation Water Conservation",
    sentence: "Modern agricultural techniques utilize automated drip irrigation to conserve precious groundwater.",
    audioTranscript: "Modern agricultural techniques utilize automated drip irrigation to conserve precious groundwater.",
    persona: "aria",
    spellingChallenges: [
      {
        word: "irrigation",
        commonErrors: ["irigation", "irrigasion"],
        rule: "I-R-R-I-G-A-T-I-O-N (Double R, single G, -tion)."
      },
      {
        word: "precious",
        commonErrors: ["presious", "preceous"],
        rule: "P-R-E-C-I-O-U-S (C-I-O-U-S)."
      }
    ],
    nakulExtraWords: ["technique", "techniques", "groundwater"]
  },
  {
    id: "wfd-025",
    title: "Perth Student Campus Transportation",
    sentence: "Public transportation discounts are available for all full-time vocational college students.",
    audioTranscript: "Public transportation discounts are available for all full-time vocational college students.",
    persona: "guy",
    spellingChallenges: [
      {
        word: "transportation",
        commonErrors: ["transportasion", "transporation"],
        rule: "T-R-A-N-S-P-O-R-T-A-T-I-O-N (T-a-t-i-o-n)."
      },
      {
        word: "vocational",
        commonErrors: ["vocasionale", "vacational"],
        rule: "V-O-C-A-T-I-O-N-A-L (V-o-, not V-a-)."
      }
    ],
    nakulExtraWords: ["student", "students", "discount", "discounts", "college", "colleges"]
  }
];

// Append to write dictation
const wfdPath = path.join(pteDir, 'pte-write-dictation.json');
const wfdData = JSON.parse(fs.readFileSync(wfdPath, 'utf8'));
const existingWfdIds = new Set(wfdData.items.map(x => x.id));
let addedWfdCount = 0;

newWfdItems.forEach(item => {
  if (!existingWfdIds.has(item.id)) {
    wfdData.items.push(item);
    addedWfdCount++;
  }
});

fs.writeFileSync(wfdPath, JSON.stringify(wfdData, null, 2), 'utf8');
console.log(`Updated pte-write-dictation.json: added ${addedWfdCount} items, total now ${wfdData.items.length}.`);
