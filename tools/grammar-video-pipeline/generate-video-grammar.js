const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG & CONSTANTS
// ============================================================================

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Basic grammar patterns for detection (simplified for demonstration)
const GRAMMAR_RULES = {
  present_simple: {
    pattern: /\b(always|usually|often|sometimes|never|every)\b.*?\b(am|is|are|do|does|play|plays|walk|walks|eat|eats)\b/i,
    level: 'A1',
    rule: "Use present simple for routines and habits.",
    memory: "Routines = Present Simple",
    distractorGenerators: [
      { form: 'playing', reason: "-ing needs 'to be' and is for ongoing actions, not routines." },
      { form: 'played', reason: "Past tense, not present habit." },
      { form: 'play', reason: "Missing 3rd person 's' (if subject is he/she/it) OR wrong verb." }
    ]
  },
  past_simple: {
    pattern: /\b(yesterday|last|ago)\b.*?\b(\w+ed|was|were|did|went|had|saw|ate)\b/i,
    level: 'A2',
    rule: "Use past simple for finished actions in the past.",
    memory: "Past marker = Past Simple",
    distractorGenerators: [
      { form: 'walk', reason: "Base form is present, not past." },
      { form: 'walking', reason: "-ing needs auxiliary verb and implies continuous action." },
      { form: 'has walked', reason: "Present perfect is for unfinished time, not finished time like 'yesterday'." }
    ]
  },
  present_perfect: {
    pattern: /\b(has|have)\s+(\w+ed|been|gone|seen|done|eaten)\b/i,
    level: 'B1',
    rule: "Use present perfect for past actions with a connection to now, or unspecified time.",
    memory: "Have/Has + V3 = Present Perfect",
    distractorGenerators: [
      { form: 'did', reason: "Past simple needs a specific time." },
      { form: 'doing', reason: "-ing needs 'to be'." },
      { form: 'do', reason: "Base form doesn't follow have/has." }
    ]
  }
};

// ============================================================================
// PARSER UTILITIES
// ============================================================================

/**
 * Parses SRT content into an array of subtitle objects
 */
function parseSRT(content) {
  const blocks = content.trim().split(/\n\s*\n/);
  const subtitles = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1];
      const textLines = lines.slice(2).join(' ');
      
      const timeMatches = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (timeMatches) {
        const start = parseInt(timeMatches[1]) * 3600 + parseInt(timeMatches[2]) * 60 + parseInt(timeMatches[3]) + parseInt(timeMatches[4]) / 1000;
        const end = parseInt(timeMatches[5]) * 3600 + parseInt(timeMatches[6]) * 60 + parseInt(timeMatches[7]) + parseInt(timeMatches[8]) / 1000;
        
        subtitles.push({
          start: parseFloat(start.toFixed(2)),
          end: parseFloat(end.toFixed(2)),
          text: textLines.trim(),
          speaker: "A" // default
        });
      }
    }
  }
  return subtitles;
}

// ============================================================================
// GRAMMAR ANALYSIS & GENERATION
// ============================================================================

/**
 * Detects grammar points in text
 */
function analyzeGrammar(text) {
  const matches = [];
  
  for (const [key, rule] of Object.entries(GRAMMAR_RULES)) {
    if (rule.pattern.test(text)) {
      matches.push({
        key,
        ...rule,
        matchedText: text.match(rule.pattern)[0]
      });
    }
  }
  
  return matches;
}

/**
 * Generates an exercise from a subtitle segment and grammar rule
 */
function generateExercise(subtitle, grammarPoint, idCounter) {
  // Simplistic cloze logic for demonstration
  // In reality, this would need NLP to accurately blank the specific verb/word
  const words = subtitle.text.split(' ');
  const targetWord = words.find(w => w.endsWith('ed') || ['was', 'were', 'have', 'has', 'went', 'saw'].includes(w.toLowerCase())) || words[Math.floor(words.length / 2)];
  
  const clozeText = subtitle.text.replace(targetWord, '___');
  const cleanTarget = targetWord.replace(/[.,!?]/g, '');

  const distractors = grammarPoint.distractorGenerators.slice(0, 3).map(d => ({
    option: d.form, // In a real system, these would be morphologically derived from the target
    reason: d.reason
  }));
  
  const options = [cleanTarget, ...distractors.map(d => d.option)];
  // Shuffle options in a real app, here we just keep answer at 0 for simplicity, 
  // or we can randomly place it. Let's place it at index 0 for output schema matching.
  
  return {
    id: `vg-${grammarPoint.level.toLowerCase()}-${String(idCounter).padStart(3, '0')}`,
    level: grammarPoint.level,
    skill: grammarPoint.key,
    videoUrl: "",
    posterUrl: "",
    subtitles: [
      { start: subtitle.start, end: subtitle.end, text: subtitle.text, speaker: "A" }
    ],
    pauseAt: parseFloat((subtitle.end - 0.5).toFixed(2)),
    exercise: {
      type: "subtitle-cloze",
      question: "Complete the subtitle:",
      clozeText: clozeText,
      clozeAnswer: cleanTarget,
      options: options,
      answerIndex: 0,
      grammarPoint: grammarPoint.key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      rule: grammarPoint.rule,
      explain: {
        why: `Because the sentence requires ${grammarPoint.key.replace('_', ' ')}.`,
        rule: grammarPoint.rule,
        memory: grammarPoint.memory,
        distractors: distractors
      }
    },
    loopCount: 2,
    tags: [grammarPoint.key, "auto-generated"]
  };
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

function processSubtitles(inputFile, targetLevel, limit = 0) {
  const content = fs.readFileSync(inputFile, 'utf-8');
  const subtitles = parseSRT(content);
  
  const exercises = [];
  let idCounter = 1;
  
  for (const sub of subtitles) {
    if (limit > 0 && exercises.length >= limit) break;
    
    const grammarPoints = analyzeGrammar(sub.text);
    
    for (const gp of grammarPoints) {
      if (!targetLevel || gp.level === targetLevel) {
        exercises.push(generateExercise(sub, gp, idCounter++));
      }
    }
  }
  
  return { videoGrammarBank: exercises };
}

function generateSample(targetLevel, count) {
  // Generate dummy data if no input file
  const samples = [];
  let idCounter = 1;
  
  for (let i = 0; i < count; i++) {
    const gpKey = Object.keys(GRAMMAR_RULES)[i % Object.keys(GRAMMAR_RULES).length];
    const gp = GRAMMAR_RULES[gpKey];
    
    if (targetLevel && gp.level !== targetLevel) continue;
    
    const dummySub = {
      start: 0.0,
      end: 2.5,
      text: gpKey === 'past_simple' ? "Yesterday I walked to school." : 
            gpKey === 'present_simple' ? "I always walk to school." :
            "I have walked to school many times.",
      speaker: "A"
    };
    
    samples.push(generateExercise(dummySub, gp, idCounter++));
  }
  
  return { videoGrammarBank: samples };
}

// ============================================================================
// CLI ENTRY
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  let input = null;
  let level = null;
  let output = 'video-grammar-bank.json';
  let sample = false;
  let count = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') input = args[++i];
    else if (args[i] === '--level') level = args[++i];
    else if (args[i] === '--output') output = args[++i];
    else if (args[i] === '--sample') sample = true;
    else if (args[i] === '--count') count = parseInt(args[++i], 10);
  }

  let result;
  if (sample) {
    result = generateSample(level, count);
  } else if (input) {
    if (!fs.existsSync(input)) {
      console.error(`Input file not found: ${input}`);
      process.exit(1);
    }
    result = processSubtitles(input, level, count);
  } else {
    console.error("Usage: node generate-video-grammar.js [--input <file> | --sample] [--level <CEFR>] [--output <file>] [--count <num>]");
    process.exit(1);
  }

  fs.writeFileSync(output, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Generated ${result.videoGrammarBank.length} exercises to ${output}`);
}

if (require.main === module) {
  main();
}
