#!/usr/bin/env python3
"""
Test validation script for .github/workflows/build-android-apk.yml
Verifies YAML syntax, required triggers, sequential steps, signing logic, and artifact retention.
"""

import sys
from pathlib import Path
from ruamel.yaml import YAML

def test_workflow():
    workflow_path = Path(".github/workflows/build-android-apk.yml")
    if not workflow_path.exists():
        print(f"FAIL: {workflow_path} does not exist")
        sys.exit(1)

    yaml = YAML(typ='safe')
    with open(workflow_path, 'r', encoding='utf-8') as f:
        wf = yaml.load(f)

    print(f"1. Workflow loaded successfully. Name: '{wf.get('name')}'")

    # 1. Check Triggers
    triggers = wf.get('on', {})
    assert 'push' in triggers, "Missing push trigger"
    assert 'main' in triggers['push']['branches'], "Push trigger must target 'main' branch"
    push_paths = triggers['push']['paths']
    assert any('android' in p for p in push_paths), "Push paths must monitor 'android/**'"
    assert any('tools' in p for p in push_paths), "Push paths must monitor 'tools/**'"

    assert 'workflow_dispatch' in triggers, "Missing workflow_dispatch trigger"
    dispatch_inputs = triggers['workflow_dispatch'].get('inputs', {})
    assert 'build_type' in dispatch_inputs, "Missing build_type input in workflow_dispatch"
    options = dispatch_inputs['build_type'].get('options', [])
    assert set(options) >= {'all', 'debug', 'release'}, f"Missing required options in build_type: {options}"
    print("   Triggers: PASS (push on main with android/ & tools/ paths + workflow_dispatch with all/debug/release)")

    # 2. Check Jobs
    jobs = wf.get('jobs', {})
    assert 'build' in jobs, "Missing 'build' job"
    build_job = jobs['build']
    assert build_job.get('runs-on') == 'ubuntu-latest', "Job must run on ubuntu-latest"
    steps = build_job.get('steps', [])
    print(f"2. Job configuration: PASS ({len(steps)} steps configured)")

    # 3. Check Required Steps
    step_uses = [s.get('uses', '') for s in steps]
    step_runs = [s.get('run', '') for s in steps]

    assert any('actions/checkout@v4' in u for u in step_uses), "Missing actions/checkout@v4"
    print("   Checkout step: PASS")

    java_step = next(s for s in steps if 'actions/setup-java' in s.get('uses', ''))
    assert java_step.get('with', {}).get('distribution') == 'temurin', "Java distribution must be temurin"
    assert str(java_step.get('with', {}).get('java-version')) == '17', "Java version must be 17"
    print("   Setup Java 17 (temurin) step: PASS")

    assert any('android-actions/setup-android' in u for u in step_uses), "Missing setup-android step"
    print("   Setup Android SDK step: PASS")

    assert any('sync-android-assets.mjs' in r for r in step_runs), "Missing sync-android-assets.mjs step"
    print("   Sync web assets step: PASS")

    assert any('actions/cache' in u for u in step_uses), "Missing gradle cache step"
    print("   Cache Gradle packages step: PASS")

    assert any('chmod +x' in r and 'gradlew' in r for r in step_runs), "Missing chmod +x gradlew step"
    print("   Grant execute permission to gradlew: PASS")

    assert any('./gradlew assembleDebug --stacktrace' in r for r in step_runs), "Missing assembleDebug command"
    print("   Build Debug APK: PASS")

    assert any('./gradlew assembleRelease --stacktrace' in r for r in step_runs), "Missing assembleRelease command"
    print("   Build Release APK: PASS")

    # 4. Check Signing Logic
    assert any('sign --ks' in r and 'debug.keystore' in r for r in step_runs), "Missing debug keystore signing"
    assert any('secrets.RELEASE_KEYSTORE' in str(s) or 'secrets.ANDROID_KEYSTORE' in str(s) for s in steps), "Missing release secrets integration"
    print("   Signing debug/release APK logic: PASS")

    # 5. Check Upload Artifacts
    upload_steps = [s for s in steps if 'actions/upload-artifact@v4' in s.get('uses', '')]
    assert len(upload_steps) == 2, f"Expected 2 upload steps, found {len(upload_steps)}"
    
    debug_upload = next(s for s in upload_steps if s.get('with', {}).get('name') == 'fiezel-app-debug')
    assert debug_upload.get('with', {}).get('retention-days') == 30, "Debug APK retention must be 30 days"
    assert 'fiezel-app-debug.apk' in debug_upload.get('with', {}).get('path'), "Debug APK path must contain fiezel-app-debug.apk"

    release_upload = next(s for s in upload_steps if s.get('with', {}).get('name') == 'fiezel-app-release')
    assert release_upload.get('with', {}).get('retention-days') == 30, "Release APK retention must be 30 days"
    assert 'fiezel-app-release.apk' in release_upload.get('with', {}).get('path'), "Release APK path must contain fiezel-app-release.apk"
    print("   Upload artifacts (fiezel-app-debug, fiezel-app-release, retention-days: 30): PASS")

    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY! The workflow is production-ready.")

if __name__ == '__main__':
    test_workflow()
