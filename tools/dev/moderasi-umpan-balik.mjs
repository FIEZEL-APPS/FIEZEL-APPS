#!/usr/bin/env node
/**
 * Moderasi Umpan Balik (Feedback Moderation) - Harness dev.
 *
 * Umpan balik murid pada sesi latihan disaring sebelum ditampilkan di ruang kelas:
 * pesan yang mengandung ujaran tidak pantas ditandai untuk ditinjau guru, dan
 * versi yang tampil di papan kelas diredaksi agar tidak menyebar.
 *
 * `messages`: Array<{ id: string, text: string, author: string }>
 *
 * Penggunaan:
 *   node tools/dev/moderasi-umpan-balik.mjs            # pemeriksaan mandiri
 */

/** Kata yang selalu ditandai, tanpa peduli huruf besar/kecil. */
const SENSITIVE_RE = /(?:kata-kotor|ujaran-kebencian|penipuan|spam)/gi;

/**
 * Apakah satu pesan perlu ditinjau guru?
 * Dipakai `classifyMessages` di bawah; sengaja berupa fungsi murni sederhana
 * agar mudah diuji satuan.
 */
export function isSensitive(text) {
    return SENSITIVE_RE.test(String(text ?? ''));
}

/**
 * Ganti setiap kata sensitif dengan bintang sepanjang katanya. Dipakai untuk
 * versi pesan yang tampil di papan kelas.
 */
export function redactSensitive(text) {
    return String(text ?? '').replace(SENSITIVE_RE, (match) => '★'.repeat(match.length));
}

/**
 * Menandai tiap pesan dalam batch. Pesan dengan `flagged: true` masuk antrean
 * tinjauan guru; sisanya langsung tampil di ruang kelas.
 */
export function classifyMessages(messages) {
    const flaggedIds = new Set(
        messages.filter((message) => isSensitive(message.text)).map((message) => message.id),
    );
    return messages.map((message) => ({
        id: message.id,
        author: message.author,
        flagged: flaggedIds.has(message.id),
        preview: redactSensitive(message.text).slice(0, 140),
    }));
}

// --- PEMERIKSAAN BAWAAN (SELF-TEST) ---

function selfCheck() {
    const checks = [
        ['deteksi kata sensitif', isSensitive('tolong jangan kirim spam di sini') === true],
        ['pesan bersih lolos', isSensitive('terima kasih bantuannya') === false],
        ['redaksi menyembunyikan kata', redactSensitive('ini penipuan').includes('★') && !redactSensitive('ini penipuan').includes('penipuan')],
    ];
    const batch = classifyMessages([
        { id: 'm1', text: 'kata-kotor sekali', author: 'ani' },
        { id: 'm2', text: 'terima kasih', author: 'budi' },
    ]);
    checks.push(['batch menandai pesan kotor', batch[0].flagged === true]);
    checks.push(['batch meloloskan pesan bersih', batch[1].flagged === false]);

    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
        console.error(`GAGAL: ${failed.join(', ')}`);
        process.exitCode = 1;
    } else {
        console.log(`Moderasi umpan balik: PASS (${checks.length}/${checks.length})`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) selfCheck();
