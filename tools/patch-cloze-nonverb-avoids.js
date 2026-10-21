'use strict';
const fs = require('fs');
const path = require('path');

const fileBank = path.join(__dirname, '..', 'cloze-bank-v1.json');
const fileExpl = path.join(__dirname, '..', 'cloze-explains-v1.json');

const bankData = JSON.parse(fs.readFileSync(fileBank, 'utf8'));
const explData = JSON.parse(fs.readFileSync(fileExpl, 'utf8'));

const specificAvoids = {
  'MO-001-cz0': 'Perhatikan tingkat keharusannya: gunakan “must” untuk kewajiban kuat/aturan resmi.',
  'MO-002-cz0': 'Untuk kesimpulan logis negatif (pasti tidak), gunakan “can\'t”, bukan “mustn\'t”.',
  'MO-005-cz0': 'Untuk hal yang tidak perlu dilakukan, gunakan “needn\'t” (bukan larangan “mustn\'t”).',
  'CO-005-cz0': 'Klausa setelah “unless” sudah bermakna pengandaian negatif, jangan tambahkan kata negatif ganda.',
  'AR-003-cz0': 'Untuk kata benda yang bisa dihitung dalam bentuk jamak (chairs), gunakan “many”, bukan “much”.',
  'RC-003-cz0': 'Untuk menyatakan hubungan kepemilikan orang terhadap bendanya, gunakan “whose”, bukan “who” atau “which”.',
  'AR-005-cz0': 'Untuk benda jamak dengan posisi jauh (“over there”), gunakan “those”, bukan “these”.',
  'PR-004-cz0': 'Pasangan phrasal verb untuk menunda rapat adalah “put off”, bukan “put out” atau “put on”.',
  'PR-005-cz0': 'Untuk melewati celah atau ruang sempit dari satu sisi ke sisi lain, gunakan preposisi “through”.',
  'CM-004-cz0': 'Untuk perbandingan jumlah benda yang bisa dihitung (eggs), gunakan “fewer”, bukan “less”.',
  'QN-001-cz0': 'Perhatikan kalimat utama: jika negatif (“haven\'t”), question tag-nya wajib positif (“have you”).',
  'QN-004-cz0': 'Dalam kalimat negatif (“didn\'t find”), gunakan kata ganti tak tentu “anything”, bukan “nothing”.',
  'QN-005-cz0': 'Untuk menyetujui pernyataan negatif (“don\'t enjoy”), gunakan “Neither do I”, bukan “So do I”.',
  'b4_012-cz0': 'Untuk tujuan utama lembaga (belajar di sekolah), jangan tambahkan artikel “the” (cukup “go to school”).',
  'b4_013-cz0': 'Gunakan pola kepemilikan ganda: “a friend of mine”, bukan “a friend of me”.',
  'b4_014-cz0': 'Diikuti kata benda periode waktu (“the meeting”), gunakan preposisi “during”, bukan konjungsi “while”.',
  'b4_015-cz0': 'Pasangan kata sifat rasa puas terhadap hasil adalah “pleased with”, bukan “pleased at” atau “pleased of”.',
  'b4_019-cz0': 'Untuk memperkuat kata sifat komparatif (“faster”), gunakan penjelas “much”, bukan “very”.',
  'b4_020-cz0': 'Untuk meminta pengulangan informasi benda yang tidak terdengar jelas, gunakan kata tanya “what”.',
  'b4_022-cz0': 'Diikuti frasa kata benda (“the heavy rain”), gunakan “Despite”, bukan konjungsi “Although”.',
  'b5_006-cz0': 'Gunakan frasa syarat resmi “provided that” untuk menyatakan “dengan syarat bahwa”.',
  'b5_011-cz0': 'Nama negara berbentuk jamak atau kesatuan (Netherlands) wajib diawali artikel tentu “the”.',
  'b5_012-cz0': 'Merujuk pada tepat dua orang kawan, gunakan “Both of them”, bukan “All of them”.',
  'b5_017-cz0': 'Klausa penjelas formal untuk bagian dari orang banyak: gunakan “many of whom”, bukan “many of who”.',
  'b5_019-cz0': 'Untuk menanyakan pelaku (subjek yang memecahkan jendela), gunakan kata tanya “Who broke”, bukan kata bantu pasif.',
  'b5_021-cz0': 'Untuk menyatakan tujuan (agar murid lain tidak dengar), gunakan penghubung “so that”.',
  'b5_022-cz0': 'Gunakan kata penghubung formal penambah argumen “Furthermore”, bukan ragam santai.',
  'A1-006-cz0': 'Untuk kata ganti kepemilikan perempuan tunggal (Anna), gunakan kata sandang “Her”, bukan “His”.',
  'A1-015-cz0': 'Untuk menanyakan lokasi tempat tinggal, gunakan kata tanya tempat “Where”, bukan “What”.',
  'A1-016-cz0': 'Dalam kalimat menyangkal/negatif (“don\'t have”), gunakan quantifier “any”, bukan “some”.',
  'A1-017-cz0': 'Untuk nama orang perempuan (Sari), gunakan kata ganti kepemilikan “Her”, bukan “His”.'
};

let bankUpdated = 0;
bankData.items.forEach(it => {
  if (specificAvoids[it.id]) {
    if (!it.explain) it.explain = {};
    it.explain.avoid = specificAvoids[it.id];
    bankUpdated++;
  }
});

let explUpdated = 0;
if (explData && explData.explains) {
  Object.entries(specificAvoids).forEach(([id, avoidText]) => {
    if (explData.explains[id]) {
      explData.explains[id].avoid = avoidText;
      explUpdated++;
    }
  });
}

fs.writeFileSync(fileBank, JSON.stringify(bankData, null, 2) + '\n', 'utf8');
fs.writeFileSync(fileExpl, JSON.stringify(explData, null, 2) + '\n', 'utf8');

console.log(`Successfully patched non-verb avoid tips: Bank updated = ${bankUpdated}, Explains updated = ${explUpdated}`);
