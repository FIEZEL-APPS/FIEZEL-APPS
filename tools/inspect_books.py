import pypdf
import os
import json

downloads_dir = r"C:\Users\hp\Downloads\ku"

books = {
    "mat7": os.path.join(downloads_dir, "Matematika-BS-KLS-VII.pdf"),
    "ind7": os.path.join(downloads_dir, "Bahasa_Indonesia_BS_KLS_VII_Rev.pdf"),
    "eng7": os.path.join(downloads_dir, "Bahasa-Inggris-BS-KLS-VII.pdf"),
    "ips7": os.path.join(downloads_dir, "IPS_BS_KLS_VII_Rev.pdf"),
    "ipa8": os.path.join(downloads_dir, "IPA_BS_KLS_VIII_Rev.pdf")
}

for name, path in books.items():
    print(f"Checking {name}: {os.path.exists(path)}")
