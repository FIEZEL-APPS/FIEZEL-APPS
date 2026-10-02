#!/usr/bin/env python3
"""
Unit and integration test suite for Fiezel Video Factory Pipeline.
Tests catalog loading, checkpoint construction, subtitle cloze masking, and bank integrity.
"""

import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from video_batch_pipeline import VideoBatchPipeline, FORBIDDEN_CLAIMS, FORBIDDEN_MASCOTS, ALLOWED_LEVELS

class TestVideoBatchPipeline(unittest.TestCase):
    def setUp(self):
        self.pipeline = VideoBatchPipeline()

    def test_catalog_loaded(self):
        for lvl in ALLOWED_LEVELS:
            self.assertIn(lvl, self.pipeline.catalog, f"Catalog must contain {lvl} rules")

    def test_build_checkpoint(self):
        cp = self.pipeline.build_checkpoint(
            cp_id="test-cp-1",
            pause_at=3.2,
            cloze_text="My full name ___ Lucy.",
            cloze_answer="is",
            options=["is", "am", "are", "be"],
            grammar_point="To Be (Present)",
            explain={"why": "Singular noun uses is.", "rule": "Subj + is", "memory": "One name = IS"}
        )
        self.assertEqual(cp["id"], "test-cp-1")
        self.assertEqual(cp["pauseAt"], 3.2)
        ex = cp["exercise"]
        self.assertEqual(ex["clozeAnswer"], "is")
        self.assertEqual(ex["answerIndex"], 0)
        self.assertEqual(ex["options"][ex["answerIndex"]], "is")

    def test_build_checkpoint_auto_insert_answer(self):
        # If cloze_answer is missing from options, it must be automatically inserted
        cp = self.pipeline.build_checkpoint(
            cp_id="test-cp-missing",
            pause_at=5.0,
            cloze_text="She ___ ready.",
            cloze_answer="is",
            options=["are", "were"],
            grammar_point="To Be",
            explain={"why": "Test", "rule": "Test", "memory": "Test"}
        )
        ex = cp["exercise"]
        self.assertIn("is", ex["options"])
        self.assertEqual(ex["options"][ex["answerIndex"]], "is")

    def test_align_and_mask_subtitles(self):
        subs = [
            {"start": 0.0, "end": 2.0, "text": "She is ready."},
            {"start": 2.1, "end": 4.0, "text": "They were there."}
        ]
        checkpoints = [
            {
                "id": "cp-mask-1",
                "pauseAt": 2.0,
                "exercise": {"clozeAnswer": "is"}
            }
        ]
        masked = self.pipeline.align_and_mask_subtitles(subs, checkpoints)
        self.assertIn("censorPattern", masked[0])
        self.assertEqual(masked[0]["censorAnswer"], "is")
        self.assertNotIn("censorPattern", masked[1])

    def test_align_and_mask_subtitles_apostrophe_and_smart_quotes(self):
        # Subtitle with straight apostrophe
        subs1 = [{"start": 0.0, "end": 3.0, "text": "I don't really listen to music."}]
        cps1 = [{"id": "cp-1", "pauseAt": 2.5, "exercise": {"clozeAnswer": "don't"}}]
        masked1 = self.pipeline.align_and_mask_subtitles(subs1, cps1)
        self.assertIn("censorPattern", masked1[0])
        self.assertEqual(masked1[0]["censorAnswer"], "don't")

        # Subtitle with smart/curly apostrophe
        subs2 = [{"start": 0.0, "end": 3.0, "text": "I think it’s a city."}]
        cps2 = [{"id": "cp-2", "pauseAt": 2.5, "exercise": {"clozeAnswer": "it's"}}]
        masked2 = self.pipeline.align_and_mask_subtitles(subs2, cps2)
        self.assertIn("censorPattern", masked2[0])
        self.assertEqual(masked2[0]["censorAnswer"], "it's")

    def test_validate_entry_invalid_pause_order(self):
        bad_entry = {
            "id": "vg-bad-pause",
            "level": "A1",
            "skill": "to_be",
            "checkpoints": [
                {"id": "cp-1", "pauseAt": 5.0, "exercise": {"clozeAnswer": "is", "options": ["is", "are"], "answerIndex": 0}},
                {"id": "cp-2", "pauseAt": 3.0, "exercise": {"clozeAnswer": "are", "options": ["are", "is"], "answerIndex": 0}}
            ]
        }
        errs = self.pipeline.validate_entry(bad_entry)
        self.assertTrue(any("pauseAt" in e and "strictly greater" in e for e in errs))

    def test_validate_entry_mascot_rejection(self):
        bad_entry = {
            "id": "vg-bad-mascot",
            "level": "A1",
            "skill": "to_be",
            "exercise": {"question": "Hello PAW mascot", "clozeAnswer": "is", "options": ["is", "are"], "answerIndex": 0}
        }
        errs = self.pipeline.validate_entry(bad_entry)
        self.assertTrue(any("prohibited mascot 'PAW'" in e for e in errs))

    def test_validate_entry_missing_media_file(self):
        bad_entry = {
            "id": "vg-missing-file",
            "level": "A1",
            "skill": "to_be",
            "videoUrl": "./content/video/non-existent-video.mp4",
            "exercise": {"clozeAnswer": "is", "options": ["is", "are"], "answerIndex": 0}
        }
        errs = self.pipeline.validate_entry(bad_entry)
        self.assertTrue(any("videoUrl file does not exist" in e for e in errs))

    def test_validate_bank_clean(self):
        # Must pass cleanly on production bank
        passed = self.pipeline.validate_bank()
        self.assertTrue(passed, "Video grammar bank must pass validation cleanly")

    def test_no_forbidden_claims_in_bank(self):
        with open(self.pipeline.DEFAULT_BANK_JSON if hasattr(self.pipeline, 'DEFAULT_BANK_JSON') else (Path(__file__).resolve().parent.parent.parent / "content" / "video-grammar-bank-v1.json"), "r", encoding="utf-8") as f:
            content = f.read()
        for claim in FORBIDDEN_CLAIMS:
            self.assertNotIn(claim.lower(), content.lower(), f"Bank must not contain forbidden claim '{claim}'")

if __name__ == "__main__":
    unittest.main()
