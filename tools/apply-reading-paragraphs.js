const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'reading-bank.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let a1Count = 0;
let a2Count = 0;
let b2Normalized = 0;

data.forEach(p => {
  const text = p.text;

  // Case 1: B2 passages that had single \n instead of \n\n
  if (p.level === 'B2' && !text.includes('\n\n') && text.includes('\n')) {
    p.text = text.replace(/\n(?!\n)/g, '\n\n');
    b2Normalized++;
    return;
  }

  // Case 2: A1 and A2 passages with no breaks at all
  if (p.level === 'A1' || p.level === 'A2') {
    // Find all sentence-end boundaries in text: [.!?]\s+(?=[A-Z0-9"'])
    const boundaryRegex = /([.!?])(\s+)(?=[A-Z0-9"'])/g;
    const boundaries = [];
    let m;
    while ((m = boundaryRegex.exec(text)) !== null) {
      boundaries.push({
        punctIndex: m.index,
        spaceIndex: m.index + 1,
        spaceLength: m[2].length,
        fullIndex: m.index + m[0].length
      });
    }

    if (boundaries.length < 2) return;

    // Get all evidence spans in text
    const evidenceSpans = [];
    (p.qs || []).forEach(q => {
      const ev = q[3] && q[3].evidence;
      if (ev) {
        let idx = text.indexOf(ev);
        while (idx !== -1) {
          evidenceSpans.push({ start: idx, end: idx + ev.length, ev });
          idx = text.indexOf(ev, idx + 1);
        }
      }
    });

    // Safe boundaries: split point is not inside any evidence span
    const safeBoundaries = boundaries.filter(b => {
      for (const span of evidenceSpans) {
        if (b.spaceIndex > span.start && b.spaceIndex < span.end) {
          return false;
        }
      }
      return true;
    });

    if (safeBoundaries.length === 0) return;

    let chosenBoundaries = [];
    if (p.level === 'A1') {
      const midIdx = Math.floor(safeBoundaries.length / 2);
      chosenBoundaries.push(safeBoundaries[midIdx]);
      a1Count++;
    } else {
      if (safeBoundaries.length <= 4) {
        const midIdx = Math.floor(safeBoundaries.length / 2);
        chosenBoundaries.push(safeBoundaries[midIdx]);
      } else {
        const idx1 = Math.floor(safeBoundaries.length / 3);
        const idx2 = Math.floor((safeBoundaries.length * 2) / 3);
        chosenBoundaries.push(safeBoundaries[idx1]);
        if (idx2 !== idx1) {
          chosenBoundaries.push(safeBoundaries[idx2]);
        }
      }
      a2Count++;
    }

    // Apply breaks from right to left
    chosenBoundaries.sort((a, b) => b.spaceIndex - a.spaceIndex);
    let newText = text;
    for (const b of chosenBoundaries) {
      newText = newText.substring(0, b.spaceIndex) + '\n\n' + newText.substring(b.spaceIndex + b.spaceLength);
    }
    p.text = newText;
  }
});

// Full verification of all 312 passages and all evidence
let totalPassages = data.length;
let totalEvidence = 0;
let brokenEvidence = 0;

data.forEach(p => {
  (p.qs || []).forEach(q => {
    const ev = q[3] && q[3].evidence;
    if (ev) {
      totalEvidence++;
      if (!p.text.includes(ev)) {
        brokenEvidence++;
        console.error(`ERROR: Evidence mismatch in ${p.id}: "${ev}"`);
      }
    }
  });
});

if (brokenEvidence > 0) {
  console.error(`ABORTING: ${brokenEvidence} evidence strings failed verbatim match!`);
  process.exit(1);
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('SUCCESS: reading-bank.json updated with clean paragraph breaks!');
console.log({
  totalPassages,
  a1Count,
  a2Count,
  b2Normalized,
  totalEvidence,
  brokenEvidence
});
