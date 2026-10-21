const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const bin = fs.existsSync(chromePath) ? chromePath : edgePath;

const inputHtml = process.argv[2] || 'website/preview-test.html';
const outputPng = process.argv[3] || 'website/assets/shots/dual-preview-test.png';

const absHtml = path.resolve(inputHtml);
const absPng = path.resolve(outputPng);
const fileUrl = 'file:///' + absHtml.replace(/\\/g, '/');

console.log('Taking screenshot of:', fileUrl);
console.log('Saving to:', absPng);

const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1440,1100',
  '--virtual-time-budget=2000',
  `--screenshot=${absPng}`,
  fileUrl
];

const res = spawnSync(bin, args, { stdio: 'inherit' });
console.log('Finished with status:', res.status);
console.log('Output file exists?', fs.existsSync(absPng), 'size:', fs.existsSync(absPng) ? fs.statSync(absPng).size : 0);
