const fs=require('fs');
const path=require('path');
const http=require('http');

const root=__dirname;
const expectedVersion=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  if(!target.startsWith(`${root}${path.sep}`)){response.writeHead(403);return response.end('Forbidden')}
  fs.readFile(target,(error,content)=>{
    if(error){response.writeHead(error.code==='ENOENT'?404:500);return response.end(error.message)}
    response.writeHead(200,{'Content-Type':target.endsWith('.json')?'application/json; charset=utf-8':'text/plain; charset=utf-8'});
    response.end(content);
  });
});

server.listen(0,'127.0.0.1',async()=>{
  const {port}=server.address();
  const base=`http://127.0.0.1:${port}`;
  try{
    const [indexResponse,versionResponse,grammarResponse]=await Promise.all([fetch(`${base}/`),fetch(`${base}/version.js`),fetch(`${base}/grammar-templates.json`)]);
    if(!indexResponse.ok||!versionResponse.ok||!grammarResponse.ok)throw new Error(`HTTP status index=${indexResponse.status} version=${versionResponse.status} grammar=${grammarResponse.status}`);
    const [index,version,grammar]=await Promise.all([indexResponse.text(),versionResponse.text(),grammarResponse.json()]);
    if(!index.includes('app.js')||!index.includes('version.js'))throw new Error('index.html did not expose required runtime assets');
    if(!version.includes(`self.FIEZEL_VERSION='${expectedVersion}'`))throw new Error(`HTTP runtime version is not ${expectedVersion}`);
    /* Jumlah template: 153, bukan 139.
     *
     * Angka 139 sudah basi sejak bank grammar tumbuh, dan gerbang ini MERAH di `main` karena
     * itu - bukan karena ada yang rusak. `regression-test.js:56` meng-assert berkas yang SAMA
     * bernilai 153 dan hijau, `grammar-curriculum-v1.json` juga 153, dan `release-audit.py`
     * melaporkan `grammar_items: 153`. Tiga sumber independen sepakat; yang salah satu-satunya
     * adalah angka di sini.
     *
     * Pesan galatnya sengaja diperinci. Bentuk lama menyebut "violates the schema contract"
     * untuk KEEMPAT syarat sekaligus, jadi kegagalan karena jumlah yang tumbuh terbaca seperti
     * payload rusak - dan itu yang membuat kegagalan ini bertahan: ia terdengar jauh lebih
     * menakutkan daripada "ada 14 pelajaran baru dan satu angka belum ikut". */
    const grammarContract=[
      ['version',grammar.version,expectedVersion],
      ['schemaVersion',grammar.schemaVersion,'2.0.0'],
      ['practiceBlueprintVersion',grammar.practiceBlueprintVersion,'focused-25-v1'],
      ['templates.length',grammar.templates?.length,153]
    ].filter(([,actual,expected])=>actual!==expected);
    if(grammarContract.length)throw new Error(`HTTP grammar payload violates the ${expectedVersion} schema contract: `+grammarContract.map(([field,actual,expected])=>`${field}=${actual} (harus ${expected})`).join(', '));
    console.log('FIEZEL HTTP smoke test: PASS');
    console.log(JSON.stringify({status:'PASS',httpAssets:3,version:grammar.version,grammarLessons:grammar.templates.length,blueprint:grammar.practiceBlueprintVersion}));
  }catch(error){console.error(`FIEZEL HTTP smoke test: FAIL\n${error.stack}`);process.exitCode=1}
  finally{server.close()}
});
