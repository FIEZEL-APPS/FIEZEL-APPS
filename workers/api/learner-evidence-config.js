/**
 * workers/api/learner-evidence-config.js — SPESIFIKASI GERBANG FITUR lane bukti
 * belajar PER-MURID (SLOT 9).
 *
 * Satu berkas kecil, satu tabel, nol logika — pola `social-config.js`. Ia ada
 * terpisah dari `feature-gate.js` karena `PAID_FEATURES` di sana adalah daftar
 * fitur BERBAYAR (yang membelanjakan neuron), dan lane ini tidak membelanjakan
 * apa pun: ia membelanjakan PRIVASI. Menaruhnya di tabel yang sama akan
 * membuat pembaca berikutnya mengira gerbangnya ada untuk alasan biaya.
 *
 * TIGA SAKELAR HARUS SEPAKAT (AND), sama seperti AI/TTS/sosial:
 *   1. `env.FEATURE_LEARNER_EVIDENCE === 'on'` (wrangler.toml, butuh deploy);
 *   2. KV `cfg:flags`.`enabled.learnerEvidence === true` (kill switch owner);
 *   3. KV `cfg:flags`.`flags.cfLearnerEvidenceEnabled === true` (flag yang
 *      DILAPORKAN ke klien lewat GET /api/config).
 *
 * FAIL-CLOSED: flag tak terbaca = TOLAK. Lane yang menyimpan bukti
 * beridentitas tidak boleh pernah menyala karena pembacaan flag gagal.
 *
 * SAKELAR INI BUKAN PERSETUJUAN. Ia hanya menentukan apakah lane-nya HIDUP di
 * server. Setiap murid tetap harus memberi persetujuannya sendiri
 * (`learner_evidence_consent`), dan tanpa itu tidak ada satu baris pun ditulis.
 */

export const LEARNER_EVIDENCE_FEATURE_SPEC = Object.freeze({
  name: 'learnerEvidence',
  varName: 'FEATURE_LEARNER_EVIDENCE',
  killKey: 'learnerEvidence',
  flagKey: 'cfLearnerEvidenceEnabled',
  reasons: Object.freeze({
    featureVarOff: 'learner_evidence_feature_var_off',
    flagsUnreadable: 'learner_evidence_flags_unreadable',
    killSwitch: 'learner_evidence_kill_switch',
    flagOff: 'learner_evidence_flag_off'
  })
});

export default { LEARNER_EVIDENCE_FEATURE_SPEC };
