#!/usr/bin/env python3
"""
FIEZEL VIDEO FACTORY PIPELINE (tools/video-factory/video_batch_pipeline.py)
Automated batch video ingestion, precision FFmpeg slicing, subtitle alignment,
cloze masking shield enforcement, and multi-checkpoint JSON bank compilation for Level A1–C2 Video Grammar.
"""

import os
import sys
import json
import re
import subprocess
import argparse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_BANK_JSON = ROOT_DIR / "content" / "video-grammar-bank-v1.json"
CATALOG_PATH = Path(__file__).resolve().parent / "grammar_rules_catalog.json"
OUTPUT_VIDEO_DIR = ROOT_DIR / "content" / "video"

FORBIDDEN_CLAIMS = ["100% Gratis", "Latihan Bisa Offline", "CEFR", "JLPT"]
FORBIDDEN_MASCOTS = ["PAW", "MIRA", "NUSA"]
ALLOWED_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

class VideoBatchPipeline:
    def __init__(self, catalog_path=CATALOG_PATH):
        self.catalog = self._load_catalog(catalog_path)
        OUTPUT_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    def _load_catalog(self, path):
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f).get("catalog", {})
        return {}

    def slice_clip(self, input_video, start_time, duration, output_filename, crf=22):
        """
        Lossless/high-quality slice with H.264 + AAC and +faststart flag for HTTP 206 streaming.
        """
        output_path = OUTPUT_VIDEO_DIR / output_filename
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", str(input_video),
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(output_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg slicing failed: {res.stderr}")

        poster_filename = output_filename.replace(".mp4", "-poster.jpg")
        self.extract_poster(output_path, poster_filename, timestamp=1.5)

        filesize = os.path.getsize(output_path)
        return {
            "videoPath": f"./content/video/{output_filename}",
            "posterPath": f"./content/video/{poster_filename}",
            "filesizeBytes": filesize,
            "filesizeKB": filesize // 1024
        }

    def extract_poster(self, video_path, output_filename, timestamp=1.5):
        """
        Extract crisp poster frame at specified timestamp.
        """
        output_path = OUTPUT_VIDEO_DIR / output_filename
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(timestamp),
            "-i", str(video_path),
            "-vframes", "1",
            "-q:v", "2",
            str(output_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            # Fallback to t=0.2 if clip is shorter than timestamp
            cmd[2] = "0.2"
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return str(output_path)

    def build_checkpoint(self, cp_id, pause_at, cloze_text, cloze_answer, options, grammar_point, explain, question_prompt=None):
        """
        Builds a compliant multi-checkpoint exercise dictionary.
        """
        if cloze_answer not in options:
            options.insert(0, cloze_answer)

        ans_idx = options.index(cloze_answer)
        return {
            "id": cp_id,
            "pauseAt": float(pause_at),
            "exercise": {
                "type": "subtitle-cloze",
                "grammarPoint": grammar_point,
                "question": question_prompt or f"Lengkapi kalimat berikut: {cloze_text}",
                "clozeText": cloze_text,
                "clozeAnswer": cloze_answer,
                "options": options,
                "answerIndex": ans_idx,
                "explain": explain
            }
        }

    def align_and_mask_subtitles(self, subtitles, checkpoints):
        """
        Scans subtitles against checkpoints to ensure target answer words
        are automatically cloze-masked ([ ___ ]) and don't leak answers in the video subtitle overlay.
        """
        if not checkpoints or not subtitles:
            return subtitles

        for cp in checkpoints:
            ex = cp.get("exercise", {})
            ans = ex.get("clozeAnswer", "").strip()
            if not ans:
                continue

            pause = cp.get("pauseAt", 0.0)
            norm_ans = ans.replace("’", "'")
            esc_ans = re.sub(r"['’]", r"['’]", re.escape(norm_ans))
            pat_regex = re.compile(r"\b" + esc_ans + r"\b", re.IGNORECASE)

            for sub in subtitles:
                # Target subtitle active during or immediately preceding pause
                if sub.get("start", 0.0) <= pause <= sub.get("end", 999.0) + 0.5:
                    text = sub.get("text", "")
                    if pat_regex.search(text):
                        if "censorPattern" not in sub:
                            sub["censorPattern"] = f"/\\b{norm_ans}\\b/i"
                            sub["censorAnswer"] = ans

        return subtitles

    def validate_entry(self, entry):
        """
        Strict validation of single video grammar entry against all quality gates.
        """
        errors = []
        entry_id = entry.get("id", "UNKNOWN")

        # 1. Level check
        lvl = entry.get("level", "")
        if lvl not in ALLOWED_LEVELS:
            errors.append(f"{entry_id}: Invalid level '{lvl}', must be in {ALLOWED_LEVELS}")

        # 2. Forbidden claims & mascots check
        raw_str = json.dumps(entry)
        for claim in FORBIDDEN_CLAIMS:
            if claim.lower() in raw_str.lower():
                errors.append(f"{entry_id}: Contains forbidden claim '{claim}'")

        # 3. Mascot check (videoUrl/posterUrl must not reference mascot motion)
        v_url = entry.get("videoUrl", "")
        p_url = entry.get("posterUrl", "")
        if "assets/motion" in v_url or "assets/motion" in p_url:
            errors.append(f"{entry_id}: Contains forbidden mascot animation asset path")

        for mascot in FORBIDDEN_MASCOTS:
            if re.search(r"\b" + mascot + r"\b", raw_str, re.IGNORECASE):
                errors.append(f"{entry_id}: References prohibited mascot '{mascot}'")

        # 4. File existence check
        if v_url:
            clean_v = v_url.replace("./", "")
            if not (ROOT_DIR / clean_v).exists():
                errors.append(f"{entry_id}: videoUrl file does not exist at {clean_v}")
        if p_url:
            clean_p = p_url.replace("./", "")
            if not (ROOT_DIR / clean_p).exists():
                errors.append(f"{entry_id}: posterUrl file does not exist at {clean_p}")

        # 5. Checkpoints & Exercise integrity
        checkpoints = entry.get("checkpoints", [])
        if checkpoints:
            last_pause = -1.0
            for i, cp in enumerate(checkpoints):
                cp_id = cp.get("id", f"cp-{i}")
                pause = cp.get("pauseAt", 0.0)
                if pause <= last_pause:
                    errors.append(f"{entry_id} {cp_id}: pauseAt ({pause}) must be strictly greater than previous ({last_pause})")
                last_pause = pause

                ex = cp.get("exercise", {})
                ans = ex.get("clozeAnswer")
                opts = ex.get("options", [])
                a_idx = ex.get("answerIndex")

                if not opts or a_idx is None or a_idx < 0 or a_idx >= len(opts):
                    errors.append(f"{entry_id} {cp_id}: answerIndex out of bounds")
                elif opts[a_idx] != ans:
                    errors.append(f"{entry_id} {cp_id}: options[answerIndex] '{opts[a_idx]}' != clozeAnswer '{ans}'")

        # 6. Top-level exercise check
        top_ex = entry.get("exercise", {})
        if top_ex:
            ans = top_ex.get("clozeAnswer")
            opts = top_ex.get("options", [])
            a_idx = top_ex.get("answerIndex")
            if not opts or a_idx is None or a_idx < 0 or a_idx >= len(opts):
                errors.append(f"{entry_id} top-exercise: answerIndex out of bounds")
            elif opts[a_idx] != ans:
                errors.append(f"{entry_id} top-exercise: options[answerIndex] '{opts[a_idx]}' != clozeAnswer '{ans}'")

        return errors

    def validate_bank(self, bank_path=DEFAULT_BANK_JSON):
        """
        Validates entire video grammar bank against CI quality gates.
        """
        if not os.path.exists(bank_path):
            print(f"Error: Bank file not found at {bank_path}")
            return False

        with open(bank_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        bank = data.get("videoGrammarBank", [])
        all_errors = []
        levels_present = set()

        for entry in bank:
            levels_present.add(entry.get("level"))
            errs = self.validate_entry(entry)
            all_errors.extend(errs)

        print("=" * 60)
        print("VIDEO GRAMMAR BANK VALIDATION REPORT")
        print("=" * 60)
        print(f"Total entries: {len(bank)}")
        print(f"Levels covered: {sorted(list(levels_present))}")

        if all_errors:
            print(f"\n[FAIL] Found {len(all_errors)} errors:")
            for err in all_errors:
                print(f"  - {err}")
            return False
        else:
            print("\n[PASS] All video grammar entries passed validation cleanly.")
            return True

    def register_to_bank(self, entry, bank_path=DEFAULT_BANK_JSON):
        """
        Appends or updates an entry in video-grammar-bank-v1.json.
        """
        if os.path.exists(bank_path):
            with open(bank_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = {"videoGrammarBank": []}

        bank = data.get("videoGrammarBank", [])
        existing_idx = next((i for i, x in enumerate(bank) if x.get("id") == entry["id"]), -1)
        if existing_idx >= 0:
            bank[existing_idx] = entry
        else:
            bank.append(entry)

        data["videoGrammarBank"] = bank
        with open(bank_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return len(bank)

    def process_batch(self, batch_file):
        """
        Runs batch generation from a specification file.
        """
        with open(batch_file, "r", encoding="utf-8") as f:
            spec = json.load(f)

        results = []
        for item in spec.get("clips", []):
            print(f"[*] Processing clip: {item['id']} ({item.get('level', 'A1')})")
            if "sourceVideo" in item and os.path.exists(item["sourceVideo"]):
                output_name = item.get("outputFilename") or f"{item['id'].replace('vg-', '')}.mp4"
                media_info = self.slice_clip(
                    input_video=item["sourceVideo"],
                    start_time=item.get("startTime", 0),
                    duration=item.get("duration", 26.0),
                    output_filename=output_name
                )
                item["videoUrl"] = media_info["videoPath"]
                item["posterUrl"] = media_info["posterPath"]

            # Subtitle alignment & cloze masking
            subs = self.align_and_mask_subtitles(item.get("subtitles", []), item.get("checkpoints", []))

            # Format entry
            entry = {
                "id": item["id"],
                "level": item.get("level", "A1"),
                "skill": item.get("skill", "grammar_checkpoint"),
                "videoUrl": item.get("videoUrl", ""),
                "posterUrl": item.get("posterUrl", ""),
                "attribution": item.get("attribution", {
                    "source": "Educational Authentic English Resource",
                    "url": "https://www.youtube.com"
                }),
                "subtitles": subs,
                "checkpoints": item.get("checkpoints", []),
                "exercise": item.get("exercise", item["checkpoints"][0]["exercise"] if item.get("checkpoints") else {})
            }
            self.register_to_bank(entry)
            results.append(entry["id"])

        print(f"[OK] Successfully processed and registered {len(results)} video exercises.")
        return results

def main():
    parser = argparse.ArgumentParser(description="Fiezel Video Factory Batch Pipeline")
    parser.add_argument("--action", choices=["slice", "batch", "verify", "validate"], default="verify")
    parser.add_argument("--batch-file", help="Path to batch specification JSON")
    parser.add_argument("--input", help="Source MP4 file")
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--duration", type=float, default=26.0)
    parser.add_argument("--output", help="Output MP4 filename (in content/video/)")

    args = parser.parse_args()
    pipeline = VideoBatchPipeline()

    if args.action == "slice":
        if not args.input or not args.output:
            print("Error: --input and --output are required for slicing")
            sys.exit(1)
        res = pipeline.slice_clip(args.input, args.start, args.duration, args.output)
        print(f"Sliced: {res}")

    elif args.action == "batch":
        if not args.batch_file:
            print("Error: --batch-file is required for batch action")
            sys.exit(1)
        pipeline.process_batch(args.batch_file)

    elif args.action == "verify":
        print(f"Catalog loaded with levels: {list(pipeline.catalog.keys())}")
        print(f"Output directory ready: {OUTPUT_VIDEO_DIR}")

    elif args.action == "validate":
        success = pipeline.validate_bank()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
