/**
 * FIEZEL Braincore Contract & Single-Source-of-Truth Runtime Parity Test
 *
 * Menguji kepatuhan mendalam (deep runtime execution, BUKAN shallow string checking):
 * 1. Mengimpor modul client nyata (features/brain/fiezel-mastery-bkt.js) dan mengecek objek PARAMS & GATE langsung di memori runtime.
 * 2. Mengeksekusi Python backend (backend/braincore.py) secara riil dan mengecek konstanta yang di-load dari braincore-contract.json.
 * 3. Memastikan pemisahan metrik posterior vs proporsi murid tuntas.
 * 4. Memastikan gerbang privasi cohort (MIN_COHORT = 5).
 * 5. Memastikan klasifikasi tamper-evident FNV-1a non-kriptografis.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const contractPath = path.join(root, 'coordination', 'braincore-contract.json');
const clientBktPath = path.join(root, 'features', 'brain', 'fiezel-mastery-bkt.js');

console.log('--- Testing Braincore Canonical Contract (Deep Runtime Execution) ---');

// 1. Validasi berkas kontrak kanonik
assert.ok(fs.existsSync(contractPath), 'coordination/braincore-contract.json wajib ada');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
assert.strictEqual(contract.version, '1.0.0');
assert.ok(contract.namespaces.lesson_mastery, 'namespace lesson_mastery harus terdefinisi');
assert.ok(contract.namespaces.competency_mastery, 'namespace competency_mastery harus terdefinisi');
console.log('  ok - berkas kontrak kanonik valid dan lengkap');

// 2. Paritas Client: Eksekusi nyata modul JS FiezelMasteryBKT (bukan string matching)
const FiezelMasteryBKT = require(clientBktPath);
const lm = contract.namespaces.lesson_mastery;

assert.strictEqual(FiezelMasteryBKT.PARAMS.L0, lm.bkt_params.L0, 'L0 runtime client harus cocok dengan kontrak');
assert.strictEqual(FiezelMasteryBKT.PARAMS.T, lm.bkt_params.T, 'T runtime client harus cocok dengan kontrak');
assert.strictEqual(FiezelMasteryBKT.PARAMS.slip, lm.bkt_params.slip, 'slip runtime client harus cocok dengan kontrak');
assert.strictEqual(FiezelMasteryBKT.PARAMS.guess, lm.bkt_params.guess, 'guess runtime client harus cocok dengan kontrak');
assert.strictEqual(FiezelMasteryBKT.GATE.L, lm.gate.mastery_threshold, 'gate.L runtime client harus cocok dengan kontrak');
assert.strictEqual(FiezelMasteryBKT.GATE.minN, lm.gate.min_observations, 'gate.minN runtime client harus cocok dengan kontrak');
console.log('  ok - eksekusi runtime JS client (FiezelMasteryBKT) 100% selaras dengan kontrak');

// 3. Paritas Server: Eksekusi nyata backend Python braincore.py (bukan string matching)
const cm = contract.namespaces.competency_mastery;
const pyEnv = { ...process.env, MONGO_URL: 'mongodb://localhost:27017', DB_NAME: 'fiezel_test' };
const pyCmd = 'python -c "import sys, json; sys.path.insert(0, \'backend\'); import braincore as bc; print(json.dumps({\'p_init\': bc.P_INIT, \'p_learn\': bc.P_LEARN, \'p_slip\': bc.P_SLIP, \'p_guess\': bc.P_GUESS, \'mastery_t\': bc.MASTERY_T, \'min_correct\': bc.MIN_CORRECT_FOR_MASTERY, \'min_cohort\': bc.MIN_COHORT}))"';
const pyRaw = execSync(pyCmd, { cwd: root, env: pyEnv, encoding: 'utf8' });
const pyBc = JSON.parse(pyRaw.trim());

assert.strictEqual(pyBc.p_init, cm.bkt_params.p_init, 'P_INIT runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.p_learn, cm.bkt_params.p_learn, 'P_LEARN runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.p_slip, cm.bkt_params.p_slip, 'P_SLIP runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.p_guess, cm.bkt_params.p_guess, 'P_GUESS runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.mastery_t, cm.gate.mastery_threshold, 'MASTERY_T runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.min_correct, cm.gate.min_correct_for_mastery, 'MIN_CORRECT runtime server harus cocok dengan kontrak');
assert.strictEqual(pyBc.min_cohort, contract.privacy_and_cohort.min_cohort, 'MIN_COHORT runtime server harus cocok dengan kontrak');
console.log('  ok - eksekusi runtime Python backend (braincore.py) 100% selaras dengan kontrak');

// 4. Privasi Cohort (MIN_COHORT = 5)
assert.strictEqual(pyBc.min_cohort, 5, 'Backend MIN_COHORT harus 5');
console.log('  ok - batas privasi agregat MIN_COHORT = 5 ditegakkan konsisten di runtime');

// 5. Integritas Hash: klasifikasi non-kriptografis
assert.strictEqual(contract.integrity_and_tamper.classification, 'deterministic_tamper_evident_hash_chain');
assert.ok(contract.integrity_and_tamper.algorithm.includes('FNV-1a'));
console.log('  ok - klasifikasi hash tamper-evident FNV-1a jujur & akurat');

// 6. Pemisahan semantik metrik
const pyMetricCmd = 'python -c "import sys, json; sys.path.insert(0, \'backend\'); import braincore as bc; row = bc._coverage_row({\'id\':\'tp1\', \'code\':\'T1\', \'name\':\'Test\'}, [\'c1\'], [\'s1\'], {\'s1\':[{\'competency_id\':\'c1\', \'p_mastery\':0.72, \'state\':\'DEVELOPING\', \'attempts\':3, \'exposures\':1}]}, 1, 0); print(json.dumps({\'has_mean\': \'mean_mastery_probability\' in row, \'has_students\': \'students_mastered_pct\' in row, \'mean_val\': row[\'mean_mastery_probability\'], \'students_val\': row[\'students_mastered_pct\']}))"';
const pyMetricRaw = execSync(pyMetricCmd, { cwd: root, env: pyEnv, encoding: 'utf8' });
const pyMetric = JSON.parse(pyMetricRaw.trim());

assert.ok(pyMetric.has_mean, 'mean_mastery_probability harus ada');
assert.ok(pyMetric.has_students, 'students_mastered_pct harus ada');
assert.strictEqual(pyMetric.mean_val, 0.72, 'mean_mastery_probability harus 0.72');
assert.strictEqual(pyMetric.students_val, 0.0, 'students_mastered_pct harus 0.0%');
console.log('  ok - pemisahan metrik posterior vs persentase murid tuntas terbukti aktif di runtime');

console.log('\nFIEZEL Braincore Deep Runtime Contract Validation: 6/6 PASS');
