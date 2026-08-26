// tools/cf-test-harness.js — harness Worker Cloudflare untuk gerbang node murni.
//
// Nol dependency (hanya `fs` bawaan lewat parameter/`require`), nol jaringan, nol berkas
// temporer. Dipakai bersama oleh seluruh gerbang CF supaya 12+ berkas gerbang tidak
// menyalin stub yang bisa menyimpang satu dari yang lain.
//
// Sumber desain: reports/cf-b7-testing-strategy.md §2 (prototipe terbukti jalan di
// /home/user/workspace/cf-b7-proto/), reports/cf-b3-quota.md §"jalur bebas-DO" (bentuk SQL
// D1 yang wajib dipahami penyimpan in-memory di bawah), reports/cf-b5-analytics.md §skema.
//
// Tiga aturan yang menentukan bentuk berkas ini:
//   1. Setiap stub MENCATAT panggilannya. "tidak dipanggil" adalah invarian yang sama
//      pentingnya dengan "dipanggil dengan benar" (mis. Worker aset dilarang `put`).
//   2. Waktu SELALU masuk sebagai parameter (`fakeClock`). Tidak ada `Date.now()` di jalur
//      keputusan, supaya reset kuota harian/DAU bisa diuji tanpa menunggu sehari —
//      disiplin yang sama dengan puter-popup-once-test.js:78-80.
//   3. Apa pun yang tidak dikenali MELEMPAR. Stub yang diam-diam mengembalikan `undefined`
//      membuat gerbang hijau tanpa menguji apa pun; itu lebih buruk daripada gerbang merah.
//
// Menjalankan berkas ini langsung = self-test (`node tools/cf-test-harness.js`).
'use strict';

const fs = require('fs');
const crypto = require('crypto');

/* =======================================================================================
 * 1. Jam palsu
 * ===================================================================================== */
function fakeClock(startIso) {
  let t = typeof startIso === 'number' ? startIso : Date.parse(startIso);
  if (!Number.isFinite(t)) throw new Error('fakeClock butuh ISO/epoch yang sah: ' + startIso);
  return {
    now: () => t,
    iso: () => new Date(t).toISOString(),
    // Hari SELALU dihitung di zona waktu eksplisit (UTC), bukan zona runner. Ini yang
    // membuat hasil identik untuk TZ=UTC dan TZ=Asia/Jakarta.
    day: () => new Date(t).toISOString().slice(0, 10),
    advance(ms) { t += ms; return t; },
    set(iso) { t = typeof iso === 'number' ? iso : Date.parse(iso); return t; }
  };
}

/* =======================================================================================
 * 2. R2 palsu — get/put/head/delete/list, mencatat semuanya
 * ===================================================================================== */
// `writable:false` (default) meniru Worker aset yang read-only menurut headernya sendiri
// (workers/fiezel-audio-worker.js:7-17): `put`/`delete` MELEMPAR dan hitungannya tetap
// dicatat, jadi "nol tulis" bisa di-assert sebagai angka, bukan sebagai harapan.
function fakeR2({ objects = new Map(), etag = '"tetap"', writable = false } = {}) {
  const calls = { get: [], put: [], delete: [], head: [], list: 0 };
  const store = objects instanceof Map ? objects : new Map(Object.entries(objects));
  const normalize = value => {
    if (typeof value === 'string') return { body: value, size: Buffer.byteLength(value) };
    if (value && typeof value === 'object' && 'body' in value) {
      return { body: value.body, size: value.size != null ? value.size : Buffer.byteLength(String(value.body || '')), httpMetadata: value.httpMetadata };
    }
    return { body: value, size: 0 };
  };
  for (const [k, v] of [...store]) store.set(k, normalize(v));

  const bucket = {
    async get(key, opt) {
      calls.get.push(key);
      const stored = store.get(key);
      if (!stored) return null;
      // fiezel-audio-worker.js:85 meneruskan `request.headers` APA ADANYA sebagai
      // `{range, onlyIf}`. Jadi opt.range adalah Headers, bukan {offset,length}.
      const headers = opt && opt.range && typeof opt.range.get === 'function' ? opt.range : null;
      const ifNoneMatch = headers ? headers.get('if-none-match') : null;
      const ifMatch = headers ? headers.get('if-match') : null;
      const rangeHeader = headers ? headers.get('range') : null;
      const conditionalMiss = (ifNoneMatch && ifNoneMatch === etag) || (ifMatch && ifMatch !== etag);
      return {
        key,
        body: conditionalMiss ? null : stored.body,
        size: stored.size,
        httpEtag: etag,            // nama field R2 adalah httpEtag, BUKAN etag
        etag: etag.replace(/"/g, ''),
        httpMetadata: stored.httpMetadata || { contentType: 'audio/mpeg' },
        // R2 mengisi object.range BAHKAN untuk pengambilan penuh. Tanpa meniru itu,
        // invarian "tanpa header Range jangan pernah 206" tidak pernah benar-benar teruji.
        range: rangeHeader ? { offset: 0, length: Math.min(2, stored.size) } : { offset: 0, length: stored.size },
        writeHttpMetadata(h) { h.set('content-type', (stored.httpMetadata || {}).contentType || 'audio/mpeg'); }
      };
    },
    async put(key, body, options) {
      calls.put.push(key);
      if (!writable) throw new Error('R2_WRITE_FORBIDDEN: ' + key);
      store.set(key, normalize({ body, size: Buffer.byteLength(String(body || '')), httpMetadata: options && options.httpMetadata }));
      return { key, httpEtag: etag };
    },
    async delete(key) {
      calls.delete.push(key);
      if (!writable) throw new Error('R2_DELETE_FORBIDDEN: ' + key);
      return store.delete(key);
    },
    async head(key) {
      calls.head.push(key);
      return store.has(key) ? { key, size: store.get(key).size, httpEtag: etag } : null;
    },
    async list(opt) {
      calls.list += 1;
      const prefix = (opt && opt.prefix) || '';
      return { objects: [...store.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, size: store.get(key).size })), truncated: false };
    }
  };
  return { bucket, calls, objects: store };
}

/* =======================================================================================
 * 3. D1 palsu — prepare/bind/first/all/run/raw/batch + penyimpan in-memory
 * ===================================================================================== */
// Ini BUKAN SQLite. Ia memahami tepat subset SQL yang dipakai desain CF repo ini
// (cf-b3-quota.md:220-240, cf-b5-analytics.md:141-360):
//   CREATE TABLE [IF NOT EXISTS] t (kolom …, PRIMARY KEY(a,b))
//   INSERT [OR IGNORE] INTO t (a,b) VALUES (?1,?2)
//        [ON CONFLICT(a,b) DO UPDATE SET x = x + ?3 | = excluded.x | DO NOTHING]
//        [RETURNING …]
//   SELECT */kolom/COUNT(*)/COUNT(DISTINCT c)/SUM(c)/MAX(c)/MIN(c) FROM t
//        [WHERE …] [ORDER BY c [ASC|DESC]] [LIMIT n]
//   UPDATE t SET a = a + 1, b = MAX(0, b - 1) WHERE … [RETURNING …]
//   DELETE FROM t WHERE …
// Apa pun di luar itu MELEMPAR `D1_UNSUPPORTED_SQL`. Query baru yang belum dipahami harus
// membuat gerbang merah, bukan mengembalikan hasil kosong yang terlihat lulus.
//
// Mode fixture tetap didukung: `fakeD1([[pola, fn], …])` seperti cf-b7 §2.1, untuk gerbang
// yang ingin mengunci teks query alih-alih menjalankannya.

/* ---- tokenizer + parser ekspresi kecil ------------------------------------------------ */
function tokenizeSql(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === "'") {
      let j = i + 1, str = '';
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") { str += "'"; j += 2; continue; }
        if (src[j] === "'") break;
        str += src[j]; j += 1;
      }
      out.push({ t: 'str', v: str }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      out.push({ t: 'num', v: Number(src.slice(i, j)) }); i = j; continue;
    }
    if (c === '?') {
      let j = i + 1; while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      out.push({ t: 'param', v: j > i + 1 ? Number(src.slice(i + 1, j)) : null }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j += 1;
      out.push({ t: 'id', v: src.slice(i, j) }); i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '!=', '<>', '||'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('()+-*/,<>='.includes(c)) { out.push({ t: 'op', v: c }); i += 1; continue; }
    throw new Error('D1_UNSUPPORTED_SQL: karakter tak dikenal ' + JSON.stringify(c) + ' pada ' + src);
  }
  return out;
}

function parseExpr(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const kw = word => { const tk = peek(); return tk && tk.t === 'id' && tk.v.toUpperCase() === word; };
  const eat = () => tokens[pos++];
  const expect = v => {
    const tk = eat();
    if (!tk || String(tk.v).toUpperCase() !== v) throw new Error('D1_UNSUPPORTED_SQL: harap ' + v + ', dapat ' + JSON.stringify(tk && tk.v));
    return tk;
  };

  function primary() {
    const tk = eat();
    if (!tk) throw new Error('D1_UNSUPPORTED_SQL: ekspresi terpotong');
    if (tk.t === 'num') return { k: 'lit', v: tk.v };
    if (tk.t === 'str') return { k: 'lit', v: tk.v };
    if (tk.t === 'param') return { k: 'param', v: tk.v };
    if (tk.t === 'op' && tk.v === '(') { const e = or(); expect(')'); return e; }
    if (tk.t === 'op' && tk.v === '-') return { k: 'neg', a: primary() };
    if (tk.t === 'id') {
      const upper = tk.v.toUpperCase();
      if (upper === 'NULL') return { k: 'lit', v: null };
      if (upper === 'TRUE') return { k: 'lit', v: 1 };
      if (upper === 'FALSE') return { k: 'lit', v: 0 };
      if (peek() && peek().t === 'op' && peek().v === '(') {
        eat();
        const args = [];
        if (!(peek() && peek().t === 'op' && peek().v === ')')) {
          for (;;) { args.push(or()); if (peek() && peek().t === 'op' && peek().v === ',') { eat(); continue; } break; }
        }
        expect(')');
        if (!['MAX', 'MIN', 'COALESCE', 'ABS', 'IFNULL'].includes(upper)) {
          throw new Error('D1_UNSUPPORTED_SQL: fungsi ' + upper + ' belum didukung harness');
        }
        return { k: 'fn', name: upper, args };
      }
      return { k: 'col', v: tk.v };
    }
    throw new Error('D1_UNSUPPORTED_SQL: token tak terduga ' + JSON.stringify(tk.v));
  }
  function mul() {
    let left = primary();
    while (peek() && peek().t === 'op' && ['*', '/'].includes(peek().v)) { const op = eat().v; left = { k: 'bin', op, a: left, b: primary() }; }
    return left;
  }
  function add() {
    let left = mul();
    while (peek() && peek().t === 'op' && ['+', '-'].includes(peek().v)) { const op = eat().v; left = { k: 'bin', op, a: left, b: mul() }; }
    return left;
  }
  function cmp() {
    const left = add();
    const tk = peek();
    if (tk && tk.t === 'op' && ['=', '<', '>', '<=', '>=', '!=', '<>'].includes(tk.v)) { eat(); return { k: 'cmp', op: tk.v, a: left, b: add() }; }
    if (kw('IS')) {
      eat();
      let negate = false;
      if (kw('NOT')) { eat(); negate = true; }
      expect('NULL');
      return { k: 'isnull', a: left, negate };
    }
    if (kw('IN')) {
      eat(); expect('(');
      const list = [];
      for (;;) { list.push(or()); if (peek() && peek().t === 'op' && peek().v === ',') { eat(); continue; } break; }
      expect(')');
      return { k: 'in', a: left, list };
    }
    if (kw('BETWEEN')) {
      eat();
      const lo = add(); expect('AND'); const hi = add();
      return { k: 'between', a: left, lo, hi };
    }
    return left;
  }
  function not() { if (kw('NOT')) { eat(); return { k: 'not', a: not() }; } return cmp(); }
  function and() { let left = not(); while (kw('AND')) { eat(); left = { k: 'and', a: left, b: not() }; } return left; }
  function or() { let left = and(); while (kw('OR')) { eat(); left = { k: 'or', a: left, b: and() }; } return left; }

  const ast = or();
  if (pos !== tokens.length) throw new Error('D1_UNSUPPORTED_SQL: sisa token pada ekspresi (' + tokens.slice(pos).map(t => t.v).join(' ') + ')');
  return ast;
}

function compileExpr(sqlFragment) {
  const ast = parseExpr(tokenizeSql(sqlFragment));
  let autoIndex = 0;
  const resolve = (node, ctx) => {
    switch (node.k) {
      case 'lit': return node.v;
      case 'param': {
        const idx = node.v == null ? ++autoIndex : node.v;
        if (idx > ctx.binds.length) throw new Error('D1_BIND_MISSING: ?' + idx + ' tidak diberi nilai');
        return ctx.binds[idx - 1];
      }
      case 'col': {
        const name = node.v;
        if (/^excluded\./i.test(name)) {
          const key = name.split('.')[1];
          if (!ctx.excluded || !(key in ctx.excluded)) throw new Error('D1_UNSUPPORTED_SQL: excluded.' + key + ' tidak tersedia');
          return ctx.excluded[key];
        }
        const bare = name.includes('.') ? name.split('.').pop() : name;
        if (ctx.row && bare in ctx.row) return ctx.row[bare];
        if (ctx.row) return null;
        throw new Error('D1_UNSUPPORTED_SQL: kolom ' + name + ' tidak dikenal');
      }
      case 'neg': return -Number(resolve(node.a, ctx));
      case 'fn': {
        const args = node.args.map(a => resolve(a, ctx));
        if (node.name === 'MAX') return args.reduce((m, x) => (Number(x) > Number(m) ? x : m));
        if (node.name === 'MIN') return args.reduce((m, x) => (Number(x) < Number(m) ? x : m));
        if (node.name === 'ABS') return Math.abs(Number(args[0]));
        return args.find(x => x != null) ?? null; // COALESCE / IFNULL
      }
      case 'bin': {
        const a = Number(resolve(node.a, ctx)) || 0;
        const b = Number(resolve(node.b, ctx)) || 0;
        return node.op === '+' ? a + b : node.op === '-' ? a - b : node.op === '*' ? a * b : a / b;
      }
      case 'cmp': {
        const a = resolve(node.a, ctx); const b = resolve(node.b, ctx);
        if (a == null || b == null) return false;
        const numeric = typeof a === 'number' && typeof b === 'number';
        const l = numeric ? a : String(a); const r = numeric ? b : String(b);
        switch (node.op) {
          case '=': return l === r;
          case '!=': case '<>': return l !== r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          default: return l >= r;
        }
      }
      case 'isnull': { const v = resolve(node.a, ctx); return node.negate ? v != null : v == null; }
      case 'in': { const v = resolve(node.a, ctx); return node.list.some(x => resolve(x, ctx) === v); }
      case 'between': { const v = resolve(node.a, ctx); return v >= resolve(node.lo, ctx) && v <= resolve(node.hi, ctx); }
      case 'not': return !resolve(node.a, ctx);
      case 'and': return Boolean(resolve(node.a, ctx)) && Boolean(resolve(node.b, ctx));
      case 'or': return Boolean(resolve(node.a, ctx)) || Boolean(resolve(node.b, ctx));
      default: throw new Error('D1_UNSUPPORTED_SQL: node ' + node.k);
    }
  };
  return (row, binds, excluded) => { autoIndex = 0; return resolve(ast, { row, binds, excluded }); };
}

function splitTopLevel(text, separator) {
  const parts = []; let depth = 0, current = '', inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'") inString = !inString;
    if (!inString) {
      if (c === '(') depth += 1;
      if (c === ')') depth -= 1;
      if (c === separator && depth === 0) { parts.push(current); current = ''; continue; }
    }
    current += c;
  }
  parts.push(current);
  return parts.map(s => s.trim()).filter(Boolean);
}

function fakeD1(handlersOrOptions) {
  // Mode fixture (cf-b7 §2.1): daftar [pola, fn]. Query tak terdaftar MELEMPAR.
  const fixtureMode = Array.isArray(handlersOrOptions);
  const handlers = fixtureMode ? handlersOrOptions : null;
  const log = [];
  const tables = new Map();   // nama -> { columns:[], pk:[], rows:[] }
  const norm = sql => String(sql).replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').trim().replace(/;$/, '');

  function table(name) {
    const t = tables.get(name.toLowerCase());
    if (!t) throw new Error('D1_UNKNOWN_TABLE: ' + name + ' (jalankan CREATE TABLE lebih dulu)');
    return t;
  }
  function pkOf(t, row) { return t.pk.map(c => String(row[c])).join('\u0000'); }
  function projection(t, columnsText, rows, binds) {
    const specs = splitTopLevel(columnsText, ',');
    if (specs.length === 1 && specs[0] === '*') return rows.map(r => ({ ...r }));
    const aggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(columnsText) && specs.some(s => /^(COUNT|SUM|AVG)\s*\(/i.test(s));
    if (aggregate) {
      const out = {};
      for (const spec of specs) {
        const [, expr, , alias] = spec.match(/^(.*?)(\s+AS\s+|\s+)?([A-Za-z_][\w]*)?$/i) || [];
        const m = spec.match(/^(COUNT|SUM|AVG|MAX|MIN)\s*\((DISTINCT\s+)?(.+?)\)(?:\s+(?:AS\s+)?([A-Za-z_][\w]*))?$/i);
        if (!m) throw new Error('D1_UNSUPPORTED_SQL: campuran agregat/kolom belum didukung: ' + spec);
        const [, fn, distinct, argument, alias2] = m;
        const key = alias2 || spec.replace(/\s+/g, '');
        let values;
        if (argument.trim() === '*') values = rows.map(() => 1);
        else { const get = compileExpr(argument); values = rows.map(r => get(r, binds)); }
        if (distinct) values = [...new Set(values.map(v => JSON.stringify(v)))].map(v => JSON.parse(v));
        const numbers = values.filter(v => v != null).map(Number);
        out[key] = fn.toUpperCase() === 'COUNT' ? (argument.trim() === '*' ? values.length : values.filter(v => v != null).length)
          : fn.toUpperCase() === 'SUM' ? numbers.reduce((a, b) => a + b, 0)
            : fn.toUpperCase() === 'AVG' ? (numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null)
              : fn.toUpperCase() === 'MAX' ? (numbers.length ? Math.max(...numbers) : null)
                : (numbers.length ? Math.min(...numbers) : null);
        void expr; void alias;
      }
      return [out];
    }
    return rows.map(row => {
      const out = {};
      for (const spec of specs) {
        const m = spec.match(/^(.+?)(?:\s+AS\s+([A-Za-z_][\w]*))?$/i);
        const source = m[1].trim();
        const alias = m[2] || (source.includes('.') ? source.split('.').pop() : source);
        out[alias] = /^[A-Za-z_][\w.]*$/.test(source) ? compileExpr(source)(row, binds) : compileExpr(source)(row, binds);
      }
      return out;
    });
  }
  function applyWhere(t, whereText, binds) {
    if (!whereText) return t.rows.slice();
    const predicate = compileExpr(whereText);
    return t.rows.filter(r => Boolean(predicate(r, binds)));
  }
  function assignments(setText, row, binds, excluded) {
    for (const piece of splitTopLevel(setText, ',')) {
      const eq = piece.indexOf('=');
      if (eq < 0) throw new Error('D1_UNSUPPORTED_SQL: SET tanpa "=": ' + piece);
      const column = piece.slice(0, eq).trim();
      const value = compileExpr(piece.slice(eq + 1).trim())(row, binds, excluded);
      row[column] = value;
    }
  }

  function execute(rawSql, binds) {
    const sql = norm(rawSql);
    log.push({ sql, binds });
    if (fixtureMode) {
      for (const [pattern, fn] of handlers) {
        if (pattern instanceof RegExp ? pattern.test(sql) : sql.startsWith(pattern)) {
          const out = fn(binds, sql) || {};
          return { rows: out.rows || [], meta: { changes: out.changes || 0, last_row_id: out.lastRowId || 0, rows_read: (out.rows || []).length, rows_written: out.changes || 0 } };
        }
      }
      throw new Error('D1 fixture tidak mengenal query ini: ' + sql);
    }

    let m;
    /* CREATE TABLE */
    if ((m = sql.match(/^CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z_][\w]*)\s*\((.*)\)$/i))) {
      const [, name, body] = m;
      const key = name.toLowerCase();
      if (tables.has(key)) return { rows: [], meta: { changes: 0, last_row_id: 0 } };
      const columns = []; let pk = [];
      for (const piece of splitTopLevel(body, ',')) {
        const pkTable = piece.match(/^PRIMARY KEY\s*\((.+)\)$/i);
        if (pkTable) { pk = pkTable[1].split(',').map(s => s.trim()); continue; }
        if (/^(UNIQUE|CHECK|FOREIGN KEY)\b/i.test(piece)) continue;
        const column = piece.match(/^([A-Za-z_][\w]*)/);
        if (!column) throw new Error('D1_UNSUPPORTED_SQL: definisi kolom ' + piece);
        const defaultMatch = piece.match(/\bDEFAULT\s+('[^']*'|-?[\d.]+)/i);
        columns.push({
          name: column[1],
          default: defaultMatch ? (defaultMatch[1].startsWith("'") ? defaultMatch[1].slice(1, -1) : Number(defaultMatch[1])) : null
        });
        if (/\bPRIMARY KEY\b/i.test(piece)) pk = [column[1]];
      }
      tables.set(key, { name, columns, pk, rows: [] });
      return { rows: [], meta: { changes: 0, last_row_id: 0 } };
    }
    /* CREATE INDEX — diterima, tidak berpengaruh pada semantik in-memory */
    if (/^CREATE (UNIQUE )?INDEX/i.test(sql)) return { rows: [], meta: { changes: 0, last_row_id: 0 } };

    /* INSERT */
    if ((m = sql.match(/^INSERT (OR IGNORE )?INTO ([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*VALUES\s*\((.*?)\)(.*)$/i))) {
      const [, orIgnore, name, columnList, valueList, tailRaw] = m;
      const t = table(name);
      const columns = columnList.split(',').map(s => s.trim());
      const values = splitTopLevel(valueList, ',').map(expression => compileExpr(expression)(null, binds));
      const candidate = {};
      for (const column of t.columns) candidate[column.name] = column.default;
      columns.forEach((column, i) => { candidate[column] = values[i]; });

      let tail = tailRaw.trim();
      let returning = '';
      const returningMatch = tail.match(/\bRETURNING\s+(.+)$/i);
      if (returningMatch) { returning = returningMatch[1]; tail = tail.slice(0, returningMatch.index).trim(); }

      const existing = t.pk.length ? t.rows.find(r => pkOf(t, r) === pkOf(t, candidate)) : null;
      let changes = 0;
      let affected = [];
      if (existing) {
        const conflict = tail.match(/^ON CONFLICT\s*(?:\(([^)]*)\))?\s*DO\s+(NOTHING|UPDATE SET (.+))$/i);
        if (conflict && /^UPDATE SET/i.test(conflict[2])) {
          assignments(conflict[3], existing, binds, candidate);
          changes = 1; affected = [existing];
        } else if (conflict || orIgnore) {
          changes = 0; affected = [];
        } else {
          throw new Error('D1_CONSTRAINT: UNIQUE constraint failed pada ' + name);
        }
      } else {
        t.rows.push(candidate); changes = 1; affected = [candidate];
      }
      const rows = returning ? projection(t, returning, affected, binds) : [];
      return { rows, meta: { changes, last_row_id: t.rows.length, rows_written: changes } };
    }
    /* INSERT … SELECT — tidak didukung: melempar dengan pesan yang menyebut jalannya */
    if (/^INSERT/i.test(sql)) {
      throw new Error('D1_UNSUPPORTED_SQL: hanya INSERT … VALUES yang didukung harness ini (lihat tools/cf-test-harness.js §3): ' + sql);
    }

    /* SELECT */
    if ((m = sql.match(/^SELECT (.+?) FROM ([A-Za-z_][\w]*)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP BY\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i))) {
      const [, columns, name, whereText, groupBy, orderBy, limit] = m;
      if (groupBy) throw new Error('D1_UNSUPPORTED_SQL: GROUP BY belum didukung harness');
      const t = table(name);
      let rows = applyWhere(t, whereText, binds);
      if (orderBy) {
        const [, column, direction] = orderBy.match(/^([A-Za-z_][\w]*)\s*(ASC|DESC)?$/i) || [];
        if (!column) throw new Error('D1_UNSUPPORTED_SQL: ORDER BY ' + orderBy);
        rows = rows.slice().sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0));
        if (direction && direction.toUpperCase() === 'DESC') rows.reverse();
      }
      const projected = projection(t, columns, rows, binds);
      return { rows: limit ? projected.slice(0, Number(limit)) : projected, meta: { changes: 0, last_row_id: 0, rows_read: rows.length } };
    }

    /* UPDATE … [RETURNING] — jalur atomik kuota cf-b3:224-240 */
    if ((m = sql.match(/^UPDATE ([A-Za-z_][\w]*)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?(?:\s+RETURNING\s+(.+?))?$/i))) {
      const [, name, setText, whereText, returning] = m;
      const t = table(name);
      const matched = applyWhere(t, whereText, binds);
      for (const row of matched) assignments(setText, row, binds, null);
      const rows = returning ? projection(t, returning, matched, binds) : [];
      return { rows, meta: { changes: matched.length, last_row_id: 0, rows_written: matched.length } };
    }

    /* DELETE */
    if ((m = sql.match(/^DELETE FROM ([A-Za-z_][\w]*)(?:\s+WHERE\s+(.+))?$/i))) {
      const [, name, whereText] = m;
      const t = table(name);
      const matched = applyWhere(t, whereText, binds);
      t.rows = t.rows.filter(r => !matched.includes(r));
      return { rows: [], meta: { changes: matched.length, last_row_id: 0, rows_written: matched.length } };
    }

    throw new Error('D1_UNSUPPORTED_SQL: ' + sql);
  }

  const db = {
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...args) { binds = args; return stmt; },
        async first(column) {
          const row = execute(sql, binds).rows[0] || null;
          return column && row ? (column in row ? row[column] : null) : row;
        },
        async run() { const r = execute(sql, binds); return { success: true, results: r.rows, meta: r.meta }; },
        async all() { const r = execute(sql, binds); return { success: true, results: r.rows, meta: r.meta }; },
        async raw() { return execute(sql, binds).rows.map(row => Object.values(row)); }
      };
      return stmt;
    },
    async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; },
    async exec(sql) {
      // D1 `exec` menerima beberapa pernyataan dipisah ';'
      const parts = splitTopLevel(String(sql).replace(/--[^\n]*/g, ' '), ';');
      for (const part of parts) execute(part, []);
      return { count: parts.length };
    },
    _log: log,
    _tables: tables,
    _rows(name) { return table(name).rows.map(r => ({ ...r })); }
  };
  return db;
}

/* =======================================================================================
 * 4. KV palsu — get/put/delete/list, DENGAN penghitung tulis (batas free 1.000/hari)
 * ===================================================================================== */
// Konsistensi KV yang sesungguhnya eventual ("up to 60 seconds"), jadi stub ini sengaja
// TIDAK berpura-pura langsung konsisten kalau `eventualMs` diisi: pembacaan sebelum jam
// maju sejauh itu mengembalikan nilai LAMA. Ini yang membuat "KV bukan tempat counter"
// (cf-b3 §1) bisa dibuktikan di gerbang, bukan hanya dikutip.
function fakeKV({ clock = null, eventualMs = 0, dailyWriteLimit = 1000, entries = {} } = {}) {
  const store = new Map(Object.entries(entries).map(([k, v]) => [k, { value: v, metadata: null, visibleAt: -Infinity, expiresAt: Infinity }]));
  const calls = { get: [], put: [], delete: [], list: 0 };
  const writesByDay = new Map();
  const now = () => (clock ? clock.now() : 0);
  return {
    calls, writesByDay,
    get writes() { return calls.put.length; },
    async get(key, options) {
      calls.get.push(key);
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) { store.delete(key); return null; }
      if (now() < entry.visibleAt) return entry.previous === undefined ? null : entry.previous;
      const type = typeof options === 'string' ? options : options && options.type;
      return type === 'json' ? JSON.parse(entry.value) : entry.value;
    },
    async getWithMetadata(key) {
      const value = await this.get(key);
      const entry = store.get(key);
      return { value, metadata: entry ? entry.metadata : null };
    },
    async put(key, value, options = {}) {
      calls.put.push(key);
      const day = clock ? clock.day() : 'no-clock';
      const used = (writesByDay.get(day) || 0) + 1;
      writesByDay.set(day, used);
      if (used > dailyWriteLimit) throw new Error('KV_DAILY_WRITE_LIMIT: ' + used + ' > ' + dailyWriteLimit + ' (batas Workers Free)');
      const previous = store.has(key) ? store.get(key).value : undefined;
      store.set(key, {
        value: typeof value === 'string' ? value : JSON.stringify(value),
        metadata: options.metadata || null,
        previous,
        visibleAt: now() + eventualMs,
        expiresAt: options.expirationTtl ? now() + options.expirationTtl * 1000 : Infinity
      });
    },
    async delete(key) { calls.delete.push(key); store.delete(key); },
    async list(options = {}) {
      calls.list += 1;
      const prefix = options.prefix || '';
      return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name, metadata: store.get(name).metadata })), list_complete: true };
    },
    _store: store
  };
}

/* =======================================================================================
 * 5. AI palsu — jawaban palsu deterministik + mode gagal
 * ===================================================================================== */
// Pesan galat 5xx SENGAJA membawa sentinel rahasia: gerbang harus membuktikan sentinel itu
// tidak pernah sampai ke klien (invarian A6 — pesan galat upstream tidak diteruskan).
const AI_UPSTREAM_SENTINEL = 'SENTINEL-UPSTREAM-SECRET';

function fakeAI({ mode = 'ok', clock = null, latencyMs = 0, text = null, answers = null } = {}) {
  const calls = [];
  const canned = answers || {};
  const binding = {
    async run(model, input, options = {}) {
      calls.push({ model, input, options });
      if (clock && latencyMs) clock.advance(latencyMs);
      if (options.signal && options.signal.aborted) { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
      if (mode === '429') { const e = new Error('Too Many Requests'); e.status = 429; e.retryAfter = 30; throw e; }
      if (mode === '5xx') { const e = new Error('upstream boom ' + AI_UPSTREAM_SENTINEL); e.status = 503; throw e; }
      if (mode === 'timeout') { const e = new Error('deadline'); e.name = 'TimeoutError'; throw e; }
      if (mode === 'hang') return new Promise(() => {});
      // Jawaban palsu DETERMINISTIK: sama input, sama keluaran, tanpa jaringan dan tanpa
      // acak — supaya assert tidak pernah flaky.
      const prompt = JSON.stringify(input && (input.prompt || input.messages || input.text) || '');
      if (canned[model]) return typeof canned[model] === 'function' ? canned[model](input) : canned[model];
      const digest = crypto.createHash('sha256').update(model + prompt).digest('hex').slice(0, 8);
      return { response: text != null ? text : 'jawaban-palsu-' + digest, usage: { prompt_tokens: 12, completion_tokens: 8 } };
    }
  };
  return { binding, calls };
}

/* =======================================================================================
 * 6. Analytics Engine palsu — writeDataPoint
 * ===================================================================================== */
// Batas nyata: 20 blob, 20 double, 1 index; index ≤ 96 byte. Stub MELEMPAR kalau dilanggar,
// karena melebihi batas di produksi berarti titik data hilang tanpa suara.
function fakeAnalyticsEngine() {
  const points = [];
  return {
    points,
    writeDataPoint(point) {
      if (!point || typeof point !== 'object') throw new Error('AE_BAD_POINT');
      const blobs = point.blobs || []; const doubles = point.doubles || []; const indexes = point.indexes || [];
      if (blobs.length > 20) throw new Error('AE_TOO_MANY_BLOBS: ' + blobs.length);
      if (doubles.length > 20) throw new Error('AE_TOO_MANY_DOUBLES: ' + doubles.length);
      if (indexes.length > 1) throw new Error('AE_TOO_MANY_INDEXES: ' + indexes.length);
      if (indexes[0] != null && Buffer.byteLength(String(indexes[0])) > 96) throw new Error('AE_INDEX_TOO_LONG');
      points.push({ blobs: [...blobs], doubles: [...doubles], indexes: [...indexes] });
    },
    _blobColumn(i) { return points.map(p => p.blobs[i]); }
  };
}

/* =======================================================================================
 * 7. Rate Limit binding palsu
 * ===================================================================================== */
// Binding CF hanya mengenal period 10 atau 60 detik. Stub menolak nilai lain, jadi
// memakai binding ini sebagai kuota harian harus mustahil di test juga — bukan hanya
// tidak dianjurkan di dokumen.
function fakeRateLimiter({ limit = 5, periodSeconds = 60, clock } = {}) {
  if (![10, 60].includes(periodSeconds)) throw new Error('Rate Limit CF hanya mendukung period 10 atau 60 detik, bukan ' + periodSeconds);
  if (!clock) throw new Error('fakeRateLimiter butuh fakeClock: waktu tidak boleh diambil dari runner');
  const buckets = new Map();
  const calls = [];
  return {
    calls, periodSeconds, limitValue: limit,
    async limit({ key }) {
      calls.push(key);
      const now = clock.now();
      const bucket = buckets.get(key);
      if (!bucket || now - bucket.start >= periodSeconds * 1000) { buckets.set(key, { start: now, count: 1 }); return { success: true }; }
      bucket.count += 1;
      return { success: bucket.count <= limit };
    }
  };
}

/* =======================================================================================
 * 8. ExecutionContext + env lengkap
 * ===================================================================================== */
function fakeExecutionContext() {
  const waits = [];
  return {
    waits,
    waitUntil(promise) { waits.push(promise); },
    passThroughOnException() {},
    async settle() { return Promise.allSettled(waits); }
  };
}

// Satu pintu untuk membangun `env` lengkap. Gerbang cukup memanggil ini, lalu menimpa
// bagian yang ingin diuji — bukan menyusun ulang tujuh stub setiap berkas.
function makeEnv(options = {}) {
  const clock = options.clock || fakeClock('2026-01-01T00:00:00.000Z');
  const r2 = fakeR2(options.r2 || {});
  const kv = fakeKV({ clock, ...(options.kv || {}) });
  const d1 = fakeD1(options.d1 || {});
  const ai = fakeAI({ clock, ...(options.ai || {}) });
  const analytics = fakeAnalyticsEngine();
  const rateLimiter = fakeRateLimiter({ clock, ...(options.rateLimit || {}) });
  const env = {
    AUDIO: r2.bucket,
    ASSETS: r2.bucket,
    DB: d1,
    KV: kv,
    CACHE: kv,
    AI: ai.binding,
    ANALYTICS: analytics,
    RATE_LIMIT: rateLimiter,
    ...(options.vars || {})
  };
  return { env, clock, r2, kv, d1, ai, analytics, rateLimiter, ctx: fakeExecutionContext() };
}

/* =======================================================================================
 * 9. Loader Worker ESM tanpa flag, tanpa berkas temporer
 * ===================================================================================== */
// `vm.runInContext` (pola core-worker-contract-test.js:12) TIDAK bisa memuat ESM, dan
// `vm.SourceTextModule` butuh --experimental-vm-modules. data: URL menghindari keduanya
// sekaligus tidak mengotori working tree dengan berkas temporer.
async function loadWorkerModule(absolutePath, fsImpl) {
  const io = fsImpl || fs;
  const source = io.readFileSync(absolutePath, 'utf8');
  return loadWorkerSource(source);
}
async function loadWorkerSource(source) {
  return import('data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64'));
}

module.exports = {
  fakeClock,
  fakeR2,
  fakeD1,
  fakeKV,
  fakeAI,
  fakeAnalyticsEngine,
  fakeRateLimiter,
  fakeExecutionContext,
  makeEnv,
  loadWorkerModule,
  loadWorkerSource,
  AI_UPSTREAM_SENTINEL,
  selfTest
};

/* =======================================================================================
 * 10. Self-test — harness yang tidak diuji adalah harness yang bohong
 * ===================================================================================== */
async function selfTest() {
  const checks = [];
  let failed = false;
  const check = (name, ok, details) => { checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) }); if (!ok) failed = true; };
  const throws = async (name, fn, pattern) => {
    try { await fn(); check(name, false, 'tidak melempar'); }
    catch (e) { check(name, pattern.test(e.message), e.message); }
  };

  /* --- jam palsu --- */
  const clock = fakeClock('2026-03-01T10:00:00.000Z');
  check('fakeClock.day di zona eksplisit', clock.day() === '2026-03-01', clock.day());
  clock.advance(3600000);
  check('fakeClock.advance memindahkan waktu', clock.iso() === '2026-03-01T11:00:00.000Z', clock.iso());
  await throws('fakeClock menolak ISO ngawur', async () => fakeClock('bukan-tanggal'), /ISO\/epoch/);

  /* --- R2 --- */
  const r2 = fakeR2({ objects: new Map([['a1/hello.mp3', 'audio-bytes']]) });
  const got = await r2.bucket.get('a1/hello.mp3');
  check('R2 get mengembalikan httpEtag dan range terisi tanpa header Range',
    got && got.httpEtag === '"tetap"' && got.range.length === got.size, JSON.stringify({ etag: got && got.httpEtag, range: got && got.range }));
  check('R2 get kunci tak ada = null', (await r2.bucket.get('tidak-ada')) === null, 'null');
  check('R2 head mencatat panggilan', (await r2.bucket.head('a1/hello.mp3')) !== null && r2.calls.head.length === 1, r2.calls.head.join(','));
  await throws('R2 put dilarang pada bucket read-only', () => r2.bucket.put('x', 'y'), /R2_WRITE_FORBIDDEN/);
  await throws('R2 delete dilarang pada bucket read-only', () => r2.bucket.delete('x'), /R2_DELETE_FORBIDDEN/);
  check('R2 mencatat percobaan tulis walau dilempar', r2.calls.put.length === 1 && r2.calls.delete.length === 1, `put=${r2.calls.put.length} delete=${r2.calls.delete.length}`);
  const r2w = fakeR2({ writable: true });
  await r2w.bucket.put('b/x.mp3', 'dua');
  check('R2 writable:true benar-benar menyimpan', (await r2w.bucket.get('b/x.mp3')).body === 'dua', 'dua');
  const headers = new Headers({ 'if-none-match': '"tetap"' });
  const conditional = await r2.bucket.get('a1/hello.mp3', { range: headers, onlyIf: headers });
  check('R2 memperlakukan opt.range sebagai Headers (if-none-match cocok → body null)', conditional.body === null, String(conditional.body));

  /* --- D1: jalur kuota atomik cf-b3:224-240 --- */
  const db = fakeD1();
  await db.exec(`CREATE TABLE IF NOT EXISTS quota_daily (
      user_id TEXT NOT NULL, day TEXT NOT NULL,
      ai_used INTEGER NOT NULL DEFAULT 0, ai_held INTEGER NOT NULL DEFAULT 0,
      rolled_back INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, day))`);
  await db.prepare('INSERT OR IGNORE INTO quota_daily(user_id, day) VALUES (?1, ?2)').bind('u1', '2026-03-01').run();
  await db.prepare('INSERT OR IGNORE INTO quota_daily(user_id, day) VALUES (?1, ?2)').bind('u1', '2026-03-01').run();
  check('D1 INSERT OR IGNORE idempoten (1 baris, bukan 2)', db._rows('quota_daily').length === 1, JSON.stringify(db._rows('quota_daily')));
  const reserve = sql => db.prepare(sql).bind('u1', '2026-03-01', 2);
  const RESERVE = `UPDATE quota_daily SET ai_held = ai_held + 1
     WHERE user_id = ?1 AND day = ?2 AND ai_used + ai_held < ?3 RETURNING ai_used, ai_held`;
  const first = await reserve(RESERVE).all();
  const second = await reserve(RESERVE).all();
  const third = await reserve(RESERVE).all();
  check('D1 UPDATE … WHERE used+held < limit RETURNING: dua reserve pertama lolos',
    first.results.length === 1 && second.results.length === 1, JSON.stringify([first.results, second.results]));
  check('D1 reserve ke-3 DITOLAK sebagai 0 baris (bukan galat, bukan lolos)', third.results.length === 0 && third.meta.changes === 0, JSON.stringify(third.results));
  await db.prepare(`UPDATE quota_daily SET ai_held = ai_held - 1, ai_used = ai_used + 1
     WHERE user_id = ?1 AND day = ?2 AND ai_held > 0`).bind('u1', '2026-03-01').run();
  const afterCommit = await db.prepare('SELECT ai_used, ai_held FROM quota_daily WHERE user_id = ?1 AND day = ?2').bind('u1', '2026-03-01').first();
  check('D1 COMMIT memindahkan held → used', afterCommit.ai_used === 1 && afterCommit.ai_held === 1, JSON.stringify(afterCommit));
  await db.prepare(`UPDATE quota_daily SET ai_held = MAX(0, ai_held - 1), rolled_back = rolled_back + 1
     WHERE user_id = ?1 AND day = ?2`).bind('u1', '2026-03-01').run();
  const afterRollback = await db.prepare('SELECT * FROM quota_daily WHERE user_id = ?1').bind('u1').first();
  check('D1 ROLLBACK memakai MAX(0, …) dan tidak pernah negatif',
    afterRollback.ai_held === 0 && afterRollback.rolled_back === 1, JSON.stringify(afterRollback));

  /* --- D1: agregat analytics cf-b5 --- */
  await db.exec('CREATE TABLE IF NOT EXISTS daily_active (day TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(day, user_id))');
  for (const [day, user] of [['2026-03-01', 'a'], ['2026-03-01', 'a'], ['2026-03-01', 'b'], ['2026-03-02', 'a']]) {
    await db.prepare('INSERT INTO daily_active (day, user_id) VALUES (?1, ?2) ON CONFLICT(day, user_id) DO NOTHING').bind(day, user).run();
  }
  const dau = await db.prepare('SELECT COUNT(*) AS dau FROM daily_active WHERE day = ?1').bind('2026-03-01').first('dau');
  const wau = await db.prepare('SELECT COUNT(DISTINCT user_id) AS wau FROM daily_active WHERE day BETWEEN ?1 AND ?2').bind('2026-03-01', '2026-03-07').first('wau');
  check('D1 agregat: DAU 2 (kunjungan ganda satu hari = 1) dan WAU 2', dau === 2 && wau === 2, `dau=${dau} wau=${wau}`);
  await db.exec('CREATE TABLE IF NOT EXISTS usage_daily (user_id TEXT, day TEXT, answers INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, day))');
  for (const n of [3, 4]) {
    await db.prepare('INSERT INTO usage_daily (user_id,day,answers) VALUES (?1,?2,?3) ON CONFLICT(user_id,day) DO UPDATE SET answers = answers + ?3').bind('a', '2026-03-01', n).run();
  }
  const answers = await db.prepare('SELECT SUM(answers) AS total FROM usage_daily WHERE user_id = ?1').bind('a').first('total');
  check('D1 ON CONFLICT DO UPDATE SET x = x + ? menjumlahkan (3+4=7)', answers === 7, String(answers));
  await throws('D1 melempak pada tabel tak dikenal', () => db.prepare('SELECT * FROM tabel_hantu').all(), /D1_UNKNOWN_TABLE/);
  await throws('D1 melempar pada SQL di luar subset (bukan diam-diam lulus)',
    () => db.prepare('WITH x AS (SELECT 1) SELECT * FROM x').all(), /D1_UNSUPPORTED_SQL/);
  const fixture = fakeD1([[/^SELECT 1$/, () => ({ rows: [{ one: 1 }] })]]);
  check('D1 mode fixture tetap berjalan', (await fixture.prepare('SELECT 1').first('one')) === 1, '1');
  await throws('D1 mode fixture menolak query tak terdaftar', () => fixture.prepare('SELECT 2').all(), /tidak mengenal query/);

  /* --- KV --- */
  const kv = fakeKV({ clock, dailyWriteLimit: 2 });
  await kv.put('k', JSON.stringify({ a: 1 }));
  check('KV get type:json', (await kv.get('k', 'json')).a === 1, 'a=1');
  await kv.put('k2', 'v', { expirationTtl: 60 });
  check('KV mencatat jumlah tulis per hari', kv.writesByDay.get(clock.day()) === 2, JSON.stringify([...kv.writesByDay]));
  await throws('KV melempar saat batas tulis harian free terlampaui', () => kv.put('k3', 'v'), /KV_DAILY_WRITE_LIMIT/);
  clock.advance(61000);
  check('KV expirationTtl kedaluwarsa dengan jam palsu', (await kv.get('k2')) === null, 'null');
  const kvEventual = fakeKV({ clock, eventualMs: 60000 });
  await kvEventual.put('c', 'baru');
  check('KV eventual: pembacaan langsung TIDAK melihat tulisan baru', (await kvEventual.get('c')) === null, 'null');
  clock.advance(60000);
  check('KV eventual: setelah 60 s tulisan terlihat', (await kvEventual.get('c')) === 'baru', 'baru');

  /* --- AI --- */
  const ai = fakeAI({});
  const a1 = await ai.binding.run('@cf/meta/llama', { prompt: 'jelaskan present perfect' });
  const a2 = await ai.binding.run('@cf/meta/llama', { prompt: 'jelaskan present perfect' });
  check('AI palsu deterministik (input sama → keluaran sama)', a1.response === a2.response && /^jawaban-palsu-/.test(a1.response), a1.response);
  check('AI mencatat panggilan', ai.calls.length === 2, String(ai.calls.length));
  await throws('AI mode 429', () => fakeAI({ mode: '429' }).binding.run('m', {}), /Too Many Requests/);
  await throws('AI mode 5xx membawa sentinel yang harus tidak pernah sampai klien',
    () => fakeAI({ mode: '5xx' }).binding.run('m', {}), new RegExp(AI_UPSTREAM_SENTINEL));
  await throws('AI menghormati AbortSignal yang sudah aborted',
    () => fakeAI({}).binding.run('m', {}, { signal: { aborted: true } }), /aborted/);
  const canned = fakeAI({ answers: { '@cf/tts': { audio: 'bytes' } } });
  check('AI jawaban palsu bisa ditentukan per model', (await canned.binding.run('@cf/tts', {})).audio === 'bytes', 'bytes');

  /* --- Analytics Engine --- */
  const ae = fakeAnalyticsEngine();
  ae.writeDataPoint({ blobs: ['dau'], doubles: [1], indexes: ['2026-03-01'] });
  check('AE menyimpan titik data', ae.points.length === 1 && ae._blobColumn(0)[0] === 'dau', 'dau');
  await throws('AE menolak >1 index', async () => ae.writeDataPoint({ indexes: ['a', 'b'] }), /AE_TOO_MANY_INDEXES/);
  await throws('AE menolak index > 96 byte', async () => ae.writeDataPoint({ indexes: ['x'.repeat(97)] }), /AE_INDEX_TOO_LONG/);
  await throws('AE menolak >20 blob', async () => ae.writeDataPoint({ blobs: new Array(21).fill('x') }), /AE_TOO_MANY_BLOBS/);

  /* --- Rate Limit --- */
  const rl = fakeRateLimiter({ limit: 2, periodSeconds: 10, clock });
  const verdicts = [];
  for (let i = 0; i < 4; i += 1) verdicts.push((await rl.limit({ key: 'u1' })).success);
  clock.advance(10000);
  verdicts.push((await rl.limit({ key: 'u1' })).success);
  check('Rate limit: 2 lolos, sisanya ditolak, lalu period baru lolos lagi',
    JSON.stringify(verdicts) === JSON.stringify([true, true, false, false, true]), JSON.stringify(verdicts));
  await throws('Rate limit menolak period selain 10/60 detik (tidak boleh jadi kuota harian)',
    async () => fakeRateLimiter({ periodSeconds: 86400, clock }), /hanya mendukung period 10 atau 60/);
  await throws('Rate limit menolak jam runner', async () => fakeRateLimiter({ periodSeconds: 60 }), /butuh fakeClock/);

  /* --- loader ESM + env --- */
  const mod = await loadWorkerSource(`export default { async fetch(request, env, ctx) {
      ctx.waitUntil(env.KV.put('hit', '1'));
      const object = await env.AUDIO.get('a1/hello.mp3');
      if (!object) return new Response('not found', { status: 404 });
      return new Response(object.body, { status: 200, headers: { etag: object.httpEtag } });
    } };`);
  check('loadWorkerSource memuat Worker ESM lewat data: URL', typeof mod.default.fetch === 'function', typeof mod.default.fetch);
  const harness = makeEnv({ clock, r2: { objects: new Map([['a1/hello.mp3', 'bytes']]) } });
  const response = await mod.default.fetch(new Request('https://x/a/a1/hello.mp3'), harness.env, harness.ctx);
  await harness.ctx.settle();
  check('makeEnv memberi env lengkap yang bisa dipakai Worker sungguhan',
    response.status === 200 && response.headers.get('etag') === '"tetap"' && (await harness.kv.get('hit')) === '1',
    `status=${response.status} etag=${response.headers.get('etag')}`);
  check('makeEnv memasang semua binding yang dijanjikan',
    ['AUDIO', 'DB', 'KV', 'AI', 'ANALYTICS', 'RATE_LIMIT'].every(k => harness.env[k]), Object.keys(harness.env).join(','));
  check('ctx.waitUntil dicatat, bukan dibuang', harness.ctx.waits.length === 1, String(harness.ctx.waits.length));

  const report = {
    schema: 'fiezel-cf-test-harness-selftest-v1',
    pass: !failed,
    counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
    checks
  };
  return report;
}

if (require.main === module) {
  selfTest().then(report => {
    console.log(JSON.stringify(report, null, 2));
    console.log(report.pass
      ? `FIEZEL cf-test-harness self-test: PASS (${report.counts.pass} assert)`
      : `FIEZEL cf-test-harness self-test: FAIL (${report.counts.fail} dari ${report.counts.pass + report.counts.fail})`);
    if (!report.pass) process.exitCode = 1;
  }).catch(error => {
    console.error('FIEZEL cf-test-harness self-test: CRASH — ' + error.stack);
    process.exitCode = 1;
  });
}
