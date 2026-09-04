const { chromium } = await import('playwright');
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto('https://cloudflare-quic.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('nav err', e.message));
for (const url of ['https://cloudflare-quic.com/favicon.ico', 'https://www.cloudflare.com/robots.txt']) {
  for (let i = 0; i < 3; i += 1) {
    const r = await p.evaluate(async u => {
      const t0 = performance.now();
      try { const res = await fetch(u + '?i=' + Math.random(), { cache: 'no-store' }); await res.arrayBuffer();
        const e = performance.getEntriesByType('resource').filter(x => x.name.startsWith(u)).pop();
        return { status: res.status, proto: e && e.nextHopProtocol, ms: Math.round(performance.now() - t0) }; }
      catch (e) { return { err: String(e.message), ms: Math.round(performance.now() - t0) }; }
    }, url).catch(e => ({ evalErr: e.message }));
    console.log(url.replace('https://', ''), i, JSON.stringify(r));
  }
}
await b.close();
