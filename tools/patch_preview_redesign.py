# tools/patch_preview_redesign.py
import subprocess
import sys

if __name__ == '__main__':
    result = subprocess.run(['node', 'tools/patch_preview_redesign.js'], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    sys.exit(result.returncode)
