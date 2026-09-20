import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

# ENG Chapter 2 items completion up to 16 items
eng_c2_path = os.path.join(tools_dir, "chunk_eng_7_c2.json")
eng_c2 = load_json(eng_c2_path)
items_eng = eng_c2["items"]
needed_eng = [
    {
        "id": "eng-d-7-c2-q07",
        "difficulty": "dasar",
        "prompt": "Based on English for Nusantara Grade VII (page 68 Unit 2), what tool is used to mix salad ingredients together thoroughly in a bowl?",
        "options": ["A large mixing spoon", "A sharp knife", "A drinking straw", "A napkin"],
        "answer": 0,
        "why": {"0": "A large mixing spoon is used to toss and combine salad ingredients evenly."},
        "distractorWhy": {"1": "A knife is for cutting.", "2": "A straw is for drinking liquids.", "3": "A napkin is for wiping hands."}
    },
    {
        "id": "eng-d-7-c2-q08",
        "difficulty": "sedang",
        "prompt": "Based on English for Nusantara Grade VII (page 74 Unit 3), choose the correct sentence to describe a crispy banana fritter:",
        "options": ["'The fried banana fritter is warm, sweet, and crunchy on the outside.'", "'The banana fritter is cold and sour like lemon.'", "'The fritter tastes bitter like dark coffee.'", "'The banana fritter is salty like sea water.'"],
        "answer": 0,
        "why": {"0": "Banana fritters (pisang goreng) are described as warm, sweet, and crunchy."},
        "distractorWhy": {"1": "Banana fritters are not cold or sour.", "2": "Banana fritters are sweet, not bitter.", "3": "Banana fritters are sweet, not salty."}
    },
    {
        "id": "eng-d-7-c2-q09",
        "difficulty": "sedang",
        "prompt": "Based on English for Nusantara Grade VII (page 79), what imperative verb completes the recipe step: '___ the boiling soup into four bowls before serving.'",
        "options": ["Ladle", "Bake", "Freeze", "Grill"],
        "answer": 0,
        "why": {"0": "'Ladle' (sendokkan) is the specific cooking verb for serving soup from a pot into bowls."},
        "distractorWhy": {"1": "Bake is for ovens.", "2": "Freeze turns liquids to ice.", "3": "Grill is direct flame."}
    },
    {
        "id": "eng-d-7-c2-q10",
        "difficulty": "tinggi",
        "prompt": "Based on English for Nusantara Grade VII (page 82 Language Focus), choose the correct adverb of sequence to start the first cooking step:",
        "options": ["First", "Finally", "After that", "Lastly"],
        "answer": 0,
        "why": {"0": "'First' is the initial sequence marker used at the start of procedural instructions."},
        "distractorWhy": {"1": "'Finally' is used at the end.", "2": "'After that' is used in middle steps.", "3": "'Lastly' is used at the end."}
    },
    {
        "id": "eng-d-7-c2-q11",
        "difficulty": "dasar",
        "prompt": "Based on English for Nusantara Grade VII (page 58), what taste word describes honey and sugar?",
        "options": ["Sweet", "Sour", "Salty", "Spicy"],
        "answer": 0,
        "why": {"0": "Honey and sugar are sweet (manis)."},
        "distractorWhy": {"1": "Sour describes lemons.", "2": "Salty describes salt.", "3": "Spicy describes chili."}
    },
    {
        "id": "eng-d-7-c2-q12",
        "difficulty": "tinggi",
        "prompt": "Based on English for Nusantara Grade VII (page 85 Unit 3 Review), why do recipes use exact measurements like 'two teaspoons' or '500 ml'?",
        "options": ["To ensure the dish turns out with the correct balance of taste and consistency", "To make the cooking process longer", "To confuse the reader", "To increase the price of the ingredients"],
        "answer": 0,
        "why": {"0": "Exact measurements ensure consistent flavor balance and proper cooking results."},
        "distractorWhy": {"1": "Measurements do not aim to lengthen time needlessly.", "2": "Recipes aim to clarify, not confuse.", "3": "Measurements do not alter ingredient prices."}
    }
]

for item in needed_eng:
    if not any(i["id"] == item["id"] for i in items_eng):
        items_eng.append(item)
eng_c2["items"] = items_eng
save_json(eng_c2_path, eng_c2)


# IPA Grade 8 Bab 2 items completion up to 16 items
ipa8_b2_path = os.path.join(tools_dir, "chunk_ipa_8_b2.json")
ipa8_b2 = load_json(ipa8_b2_path)
items_ipa8 = ipa8_b2["items"]
needed_ipa8 = [
    {
        "id": "ipa-d-8-b2-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 44), organ pencernaan mekanis utama di dalam mulut yang berfungsi memotong dan mengunyah makanan adalah…",
        "options": ["Gigi", "Lidah", "Kelenjar ludah", "Kerongkongan"],
        "answer": 0,
        "why": {"0": "Gigi memotong, merobek, dan mengunyah makanan secara mekanis menjadi bagian-bagian lebih kecil."},
        "distractorWhy": {"1": "Lidah memindahkan dan meratakan makanan.", "2": "Kelenjar ludah menghasilkan enzim amilase pencernaan kimiawi.", "3": "Kerongkongan menyalurkan makanan ke lambung."}
    },
    {
        "id": "ipa-d-8-b2-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 58), pembuluh darah balik (vena) memiliki ciri khas struktur yaitu…",
        "options": ["Dinding tipis kurang elastis dan memiliki banyak katup di sepanjang pembuluh untuk mencegah aliran balik darah", "Dinding tebal elastis tanpa katup", "Mengalirkan darah bertekanan sangat tinggi keluar dari jantung", "Berada di dalam jaringan paling dalam jauh dari permukaan kulit"],
        "answer": 0,
        "why": {"0": "Vena memiliki katup-katup berseri untuk menjaga darah tetap mengalir satu arah menuju jantung."},
        "distractorWhy": {"1": "Ciri pembuluh nadi (arteri).", "2": "Ciri aliran darah arteri.", "3": "Ciri letak arteri."}
    },
    {
        "id": "ipa-d-8-b2-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 68), gerakan pernapasan dada pada saat inspirasi (menghirup udara) ditandai oleh…",
        "options": ["Otot antartulang rusuk berkontraksi, tulang rusuk terangkat, dan volume rongga dada membesar", "Otot diafragma melengkung ke atas", "Tekanan udara di dalam paru-paru meningkat lebih tinggi dari luar", "Rongga dada mengecil dan mengempis"],
        "answer": 0,
        "why": {"0": "Inspirasi dada terjadi saat otot antartulang rusuk berkontraksi sehingga rusuk naik dan rongga dada membesar."},
        "distractorWhy": {"1": "Diafragma melengkung terjadi saat ekspirasi.", "2": "Tekanan paru tinggi terjadi saat ekspirasi menghembuskan udara.", "3": "Rongga mengempis terjadi saat ekspirasi."}
    },
    {
        "id": "ipa-d-8-b2-q10",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 76), penyakit ginjal kronis yang ditandai oleh ditemukannya molekul protein albumen di dalam urine (albuminuria) disebabkan oleh kerusakan pada bagian…",
        "options": ["Glomerulus pada badan Malpighi", "Tubulus kontortus distal", "Kantung kemih (vesika urinaria)", "Ureter"],
        "answer": 0,
        "why": {"0": "Kerusakan membran penyaring glomerulus menyebabkan protein lolos ke dalam filtrat urine."},
        "distractorWhy": {"1": "Tubulus distal adalah tempat augmentasi.", "2": "Kantung kemih penampung urine.", "3": "Ureter saluran penyuplai ke vesika."}
    },
    {
        "id": "ipa-d-8-b2-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 50), vitamin larut dalam lemak yang penting untuk kesehatan penglihatan mata dan integritas sel epitel adalah…",
        "options": ["Vitamin A", "Vitamin C", "Vitamin B12", "Vitamin K"],
        "answer": 0,
        "why": {"0": "Vitamin A (retinol) penting untuk pembentukan pigmen rhodopsin mata."},
        "distractorWhy": {"1": "Vitamin C larut air untuk kekebalan.", "2": "Vitamin B12 larut air untuk sel darah.", "3": "Vitamin K untuk pembekuan darah."}
    },
    {
        "id": "ipa-d-8-b2-q12",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 84 Uji Kompetensi), penyakit gangguan pernapasan yang disebabkan oleh infeksi bakteri Mycobacterium tuberculosis yang menyebabkan kerusakan dinding alveolus paru-paru dinamakan…",
        "options": ["Tuberkulosis (TBC)", "Asma", "Emfisema", "Influenza"],
        "answer": 0,
        "why": {"0": "TBC adalah penyakit menular paru akibat infeksi bakteri M. tuberculosis."},
        "distractorWhy": {"1": "Asma akibat penyempitan saluran pernapasan alergi.", "2": "Emfisema akibat hilangnya elastisitas alveolus rokok.", "3": "Influenza akibat virus flu."}
    }
]

for item in needed_ipa8:
    if not any(i["id"] == item["id"] for i in items_ipa8):
        items_ipa8.append(item)
ipa8_b2["items"] = items_ipa8
save_json(ipa8_b2_path, ipa8_b2)

print("Items count completed for eng_7_c2 and ipa_8_b2!")
