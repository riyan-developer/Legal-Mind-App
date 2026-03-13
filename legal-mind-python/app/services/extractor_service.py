import fitz  # pymupdf


def extract_pdf_text_with_pages(file_path: str):
    doc = fitz.open(file_path)
    pages = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        text = page.get_text("text") or ""
        pages.append({
            "page_number": page_index + 1,
            "text": text.strip()
        })

    full_text = "\n\n".join([p["text"] for p in pages if p["text"]])
    return {
        "pages": pages,
        "full_text": full_text
    }