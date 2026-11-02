#!/usr/bin/env node
/**
 * tools/seo/ping-indexnow.mjs
 *
 * Submits FIEZEL canonical URLs to Microsoft Bing and IndexNow-enabled search engines
 * for instant priority crawling and generative AI indexation (Bing Copilot, ChatGPT, Perplexity).
 *
 * Spec: https://www.indexnow.org/documentation
 */

import https from 'node:https';

const HOST = 'fiezel.my.id';
const KEY = '86b259a0a7e5e5a93ca24145331e181a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  `https://${HOST}/`,
  `https://${HOST}/about/`,
  `https://${HOST}/tentang.html`,
  `https://${HOST}/grammar/`,
  `https://${HOST}/vocabulary/`,
  `https://${HOST}/reading/`,
  `https://${HOST}/listening/`,
  `https://${HOST}/speaking/`,
  `https://${HOST}/cefr/`,
  `https://${HOST}/faq/`,
  `https://${HOST}/kelasku/`,
  `https://${HOST}/untuk-sekolah.html`,
  `https://${HOST}/install/`,
  `https://${HOST}/privacy/`,
  `https://${HOST}/terms/`,
  `https://${HOST}/llms.txt`,
  `https://${HOST}/llms-full.txt`,
  `https://${HOST}/sitemap.xml`
];

const ENDPOINTS = [
  'api.indexnow.org',
  'www.bing.com'
];

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: URLS
});

console.log(`[IndexNow] Preparing submission for ${HOST} (${URLS.length} URLs)...`);

for (const endpoint of ENDPOINTS) {
  const req = https.request({
    hostname: endpoint,
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'User-Agent': 'Fiezel-IndexNow-Agent/1.0'
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`[IndexNow] Endpoint ${endpoint} -> Status ${res.statusCode} (${res.statusMessage || 'OK'})`);
      if (body) {
        console.log(`[IndexNow] Response: ${body}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[IndexNow] Error submitting to ${endpoint}:`, err.message);
  });

  req.write(payload);
  req.end();
}
