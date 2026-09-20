import json
import os
import pypdf

downloads_dir = r"C:\Users\hp\Downloads\ku"
tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def extract_pdf_pages(pdf_path, start_page, end_page):
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for idx in range(start_page - 1, min(end_page, len(reader.pages))):
        text += f"\n--- Page {idx + 1} ---\n" + (reader.pages[idx].extract_text() or "")
    return text

print("PDF extractor helper ready.")
