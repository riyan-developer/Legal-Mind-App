def chunk_pages(pages: list[dict], max_chars: int = 1800):
    chunks = []
    chunk_index = 0

    for page in pages:
        page_number = page["page_number"]
        text = page["text"]

        if not text:
            continue

        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        current = ""

        for para in paragraphs:
            candidate = f"{current}\n{para}".strip() if current else para

            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    chunks.append({
                        "chunk_index": chunk_index,
                        "page_number": page_number,
                        "section_title": None,
                        "chunk_text": current
                    })
                    chunk_index += 1
                current = para

        if current:
            chunks.append({
                "chunk_index": chunk_index,
                "page_number": page_number,
                "section_title": None,
                "chunk_text": current
            })
            chunk_index += 1

    return chunks