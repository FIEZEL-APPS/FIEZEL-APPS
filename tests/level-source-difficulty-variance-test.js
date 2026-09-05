'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/* GERBANG: kolam sesi belajar tidak boleh berkesulitan DATAR (Braincore v3, temuan T1/T2).
 *
 * Kenapa gerbang ini ada, dan kenapa ia harus MENJALANKAN kodenya.
 * ----------------------------------------------------------------
 * features/brain/fiezel-item-prior.js ditulis khusus untuk menghapus satu cacat: sebelum ia
 * ada, SEMUA item pada satu level CEFR punya difficulty identik (`LEVELS.indexOf(level)+1`),
 * sehingga
 *
 *   T2. term penalti |difficulty - target| bernilai SAMA untuk setiap kandidat lalu lenyap
 *       saat sorting - seleksi soal mengaku adaptif terhadap kesulitan padahal secara
 *       matematis ia tidak pernah memilih berdasarkan kesulitan; dan
 *   T1. informasi Fisher hanya sebanding dengan JUMLAH soal, jadi estimasi kemampuan IRT
 *       tidak pernah lebih pintar daripada persen benar.
 *
 * Modulnya lulus unit-test-nya sendiri sejak hari pertama. Meskipun begitu, sampai m025-206
 * `makeLevelSource()` - kolam yang dipakai startLevelPractice, yaitu sesi belajar BIASA -
 * tetap menimpa difficulty dengan basis level, jadi cacat yang sudah "diperbaiki" itu masih
 * hidup di jalur yang paling sering dilewati murid. Terukur di peramban: 634 item A1
 * seluruhnya difficulty 1, dan FiezelTutorBrain.selectNext memilih item yang SAMA pada
 * ability 0,5 / 0,863 / 1,5 / 2,5 / 3,5.
 *
 * Pelajarannya: gerbang yang menguji MODULNYA tidak akan pernah melihat ini, karena modulnya
 * memang benar - yang putus kabelnya. Jadi gerbang ini mengambil sumber makeLevelSource yang
 * sesungguhnya dari app.js dan MENJALANKANNYA di atas modul prior yang sesungguhnya.
 */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const src=fs.readFileSync(path.join(__fzRoot,'app.js'),'utf8');
const awal=src.indexOf('function makeLevelSource(level){');
assert.ok(awal>0,'makeLevelSource harus ada di app.js');
const akhir=src.indexOf('\n}',awal);
assert.ok(akhir>awal,'akhir makeLevelSource harus terbaca');
const sumber=src.slice(awal,akhir+2);

const LEVELS=['A1','A2','B1','B2','C1','C2'];
/* Pabrik soal ditiru seminimal mungkin - yang diuji BUKAN isi soalnya melainkan angka
   kesulitan yang dipasang makeLevelSource di atasnya. Tiap pabrik memasang basis level lama
   lebih dulu, persis seperti pabrik sungguhan (app.js:6930/7146/7241), supaya kalau
   makeLevelSource berhenti menyambung prior, hasilnya jatuh kembali menjadi DATAR - dan
   gerbang ini memerah. */
function bikinDunia(priorModul){
  const V=[],R=[],G=[];
  for(let i=0;i<12;i++)V.push({id:'v'+i,level:'A1',word:'w'+i});
  for(let i=0;i<4;i++)R.push({id:'r'+i,level:'A1',qs:[{},{}]});
  for(let i=0;i<6;i++)G.push({skill:'s'+i,item:{id:'g'+i}});
  const dilihatPrior=[];
  const sandbox={
    LEVELS,V,R,
    self:priorModul?{FiezelItemPrior:{difficultyFor(spec){dilihatPrior.push(spec);return priorModul.difficultyFor(spec)}}}:{},
    makeVocabQuestion:v=>({id:'vq-'+v.id,type:'vocab',level:'A1',question:'apa arti '+v.word+'?',difficulty:1}),
    makeReadingQuestion:(r,q,i)=>({id:'rq-'+r.id+'-'+i,type:'reading',level:'A1',question:'x'.repeat(200),difficulty:1}),
    grammarItemsForLevel:()=>G,
    makeGrammarQuestion:(skill,item)=>({id:'gq-'+item.id,type:'grammar',level:'A1',practiceMode:'apply_form',question:'lengkapi',difficulty:1}),
    hasil:null
  };
  vm.createContext(sandbox);
  vm.runInContext(sumber+'\nhasil=makeLevelSource("A1");',sandbox,{timeout:5000});
  return {keluar:sandbox.hasil,dilihatPrior};
}

const prior=require(path.join(__fzRoot,'features','brain','fiezel-item-prior.js'));
assert.strictEqual(typeof prior.difficultyFor,'function','modul prior harus mengekspor difficultyFor');

/* --- A. Dengan modul prior: kolam TIDAK BOLEH datar ------------------------------------ */
const {keluar,dilihatPrior}=bikinDunia(prior);
assert.ok(Array.isArray(keluar)&&keluar.length>0,'makeLevelSource harus mengembalikan kolam berisi');
const kesulitan=keluar.map(x=>Number(x.q.difficulty));
assert.ok(kesulitan.every(Number.isFinite),'setiap item harus punya difficulty numerik terhingga');
const unik=[...new Set(kesulitan)];
assert.ok(unik.length>=2,
  `T2 hidup lagi: seluruh ${kesulitan.length} item satu level berkesulitan sama (${unik.join(',')}). `+
  'Term |difficulty - target| menjadi konstan dan lenyap saat sorting, jadi seleksi soal '+
  'berhenti memilih berdasarkan kesulitan meskipun ia mengaku adaptif.');

/* --- B. Prior benar-benar DIKONSULTASI untuk ketiga domain ----------------------------- */
const domainTerlihat=new Set(dilihatPrior.map(s=>String(s&&s.domain||'')));
for(const d of ['vocabulary','reading','grammar'])
  assert.ok(domainTerlihat.has(d),`prior harus dikonsultasi untuk domain ${d} (terlihat: ${[...domainTerlihat].join(',')||'tidak ada'})`);

/* --- C. Grammar memakai biaya MODE, bukan basis level datar ---------------------------- */
const grammar=keluar.filter(x=>x.q.type==='grammar').map(x=>Number(x.q.difficulty));
assert.ok(grammar.length>0,'kolam harus memuat item grammar');
assert.ok(grammar.every(d=>d!==1),
  `item grammar masih memakai basis level datar (${[...new Set(grammar)].join(',')}); biaya mode apply_form (+0,45) tidak sampai`);

/* --- D. Item ber-stem panjang lebih berat daripada stem pendek ------------------------- */
const vocab=keluar.filter(x=>x.q.type==='vocab').map(x=>Number(x.q.difficulty));
const reading=keluar.filter(x=>x.q.type==='reading').map(x=>Number(x.q.difficulty));
assert.ok(Math.max(...reading)>Math.min(...vocab),
  'stem panjang (reading 200 karakter) harus lebih berat daripada stem pendek (vocab); beban leksikal tidak tersambung');

/* --- E. Kondisi T2 yang sesungguhnya: penalti target tidak boleh konstan --------------- */
/* Inilah bentuk matematis cacatnya, bukan parafrasenya: kalau |d - target| sama untuk semua
   kandidat, ia adalah konstanta aditif di setiap skor dan urutannya tidak berubah sedikit
   pun kalau term itu dihapus. Diuji pada target yang benar-benar dipakai jendela tantangan. */
for(const target of [0.9,1.4,2.2]){
  const penalti=[...new Set(kesulitan.map(d=>Math.abs(d-target).toFixed(4)))];
  assert.ok(penalti.length>=2,
    `penalti kesulitan konstan pada target ${target} - term ini tidak memilih apa pun (T2)`);
}

/* --- F. Tanpa modul prior, perilakunya IDENTIK dengan sebelum Braincore ---------------- */
/* Guard-nya harus benar-benar guard: modul absen = basis level lama, bukan NaN, bukan galat,
   bukan kolam kosong. Perangkat tanpa modul (muat gagal) harus tetap belajar seperti biasa. */
const tanpa=bikinDunia(null);
assert.ok(Array.isArray(tanpa.keluar)&&tanpa.keluar.length===keluar.length,'tanpa modul prior, kolam harus tetap terbentuk utuh');
assert.ok(tanpa.keluar.every(x=>Number(x.q.difficulty)===1),
  'tanpa modul prior, difficulty harus jatuh ke basis level lama (A1=1) - guard-nya bocor');

console.log(`FIEZEL kolam sesi belajar - variansi kesulitan: PASS (${kesulitan.length} item, ${unik.length} nilai kesulitan berbeda: ${unik.sort((a,b)=>a-b).join(', ')})`);
