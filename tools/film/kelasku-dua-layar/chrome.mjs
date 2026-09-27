// Opsi peluncuran Chrome/Chromium untuk render & stills.
//   CHROME_PATH=...   pakai berkas Chrome tertentu
//   FZ_GPU=1          pakai GPU (default: otomatis — GPU bila ada Chrome terpasang, SwiftShader di server)
//   FZ_HEADED=1       tampilkan jendela (berguna di Windows bila GPU headless bermasalah)
import fs from 'node:fs';
export function launchOpts() {
  const gpu = process.env.FZ_GPU === '1' || (process.env.FZ_GPU !== '0' && process.platform !== 'linux');
  const args = ['--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-color-profile=srgb'];
  if (gpu) args.push('--use-angle=default', '--enable-gpu-rasterization'); else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  const o = { headless: process.env.FZ_HEADED !== '1', args };
  const candidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  const exe = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (exe) o.executablePath = exe; else o.channel = 'chrome';
  return o;
}
