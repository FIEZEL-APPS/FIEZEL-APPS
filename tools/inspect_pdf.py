import pypdf

reader = pypdf.PdfReader(r'C:\Users\hp\Downloads\ku\IPA_BS_KLS_VIII_Rev.pdf')

print("Searching TOC and Bab 1 pages...")
for i in range(len(reader.pages)):
    txt = reader.pages[i].extract_text() or ""
    if "Daftar Isi" in txt or "DAFTAR ISI" in txt:
        print(f"Page {i+1} has Daftar Isi:")
        print(txt[:600])
    if "Bab 1" in txt or "BAB 1" in txt or "Bab I" in txt or "BAB I" in txt:
        print(f"Page {i+1} mentions Bab 1:")
        first_lines = "\n".join([line for line in txt.split("\n") if line.strip()][:5])
        print(first_lines)
        if "Bab 2" in txt or "BAB 2" in txt or "Bab II" in txt or "BAB II" in txt:
            print("  (also mentions Bab 2)")
    if i > 80: # Bab 1 should be well within the first 80 pages
        break
