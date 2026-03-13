import json
import re

from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.openai_api_key)

MAX_CONTEXT_CHARS = 1200
MAX_EXCERPT_CHARS = 360
MAX_SEARCH_TEXT_CHARS = 180
MIN_SEARCH_TEXT_CHARS = 32
MIN_SEARCH_WORDS = 6


def normalize_text(text: str | None) -> str:
    if not text:
        return ""

    normalized = text.replace("\x00", " ")
    normalized = re.sub(r"(?<=\w)-\s+(?=\w)", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"\s+([,.;:!?])", r"\1", normalized)

    return normalized.strip()


def truncate_text(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text

    clipped = text[:limit].rsplit(" ", 1)[0].strip()
    return f"{clipped}..." if clipped else text[:limit].strip()


def trim_exact_prefix(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text

    clipped = text[:limit].rsplit(" ", 1)[0].strip()
    return clipped if clipped else text[:limit].strip()


def split_sentences(text: str) -> list[str]:
    normalized = normalize_text(text)

    if not normalized:
        return []

    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", normalized)
        if sentence.strip()
    ]

    return sentences


def build_search_text(chunk_text: str) -> str | None:
    normalized = normalize_text(chunk_text)

    if not normalized:
        return None

    sentences = split_sentences(normalized)
    viable_sentences = [
        sentence
        for sentence in sentences
        if MIN_SEARCH_TEXT_CHARS <= len(sentence) <= MAX_SEARCH_TEXT_CHARS
        and len(sentence.split()) >= MIN_SEARCH_WORDS
    ]

    if viable_sentences:
        return max(viable_sentences, key=lambda sentence: (len(sentence.split()), len(sentence)))

    for sentence in sentences:
        if len(sentence.split()) >= MIN_SEARCH_WORDS:
            return trim_exact_prefix(sentence, MAX_SEARCH_TEXT_CHARS)

    return None


def build_display_excerpt(chunk_text: str) -> str:
    normalized = normalize_text(chunk_text)
    return truncate_text(normalized, MAX_EXCERPT_CHARS)


def clean_section_title(section_title: str | None, excerpt: str) -> str | None:
    title = normalize_text(section_title)

    if not title or len(title) < 4 or len(title) > 120:
        return None

    if title.lower() in excerpt.lower():
        return None

    return title


def build_context(chunks: list[dict]) -> str:
    parts = []

    for index, chunk in enumerate(chunks):
        source_id = index + 1
        page = chunk.get("page_number") or index + 1
        text = truncate_text(normalize_text(chunk.get("chunk_text", "")), MAX_CONTEXT_CHARS)

        if not text:
            continue

        parts.append(f"[{source_id}] Page {page}\n{text}")

    return "\n\n".join(parts)


def build_citations(chunks: list[dict]) -> list[dict]:
    citations = []

    for index, chunk in enumerate(chunks):
        excerpt = build_display_excerpt(chunk.get("chunk_text", ""))

        if not excerpt:
            continue

        citations.append({
            "id": index + 1,
            "chunkId": chunk.get("id"),
            "page": chunk.get("page_number") or 1,
            "excerpt": excerpt,
            "highlightText": clean_section_title(chunk.get("section_title"), excerpt),
            "searchText": build_search_text(chunk.get("chunk_text", "")),
        })

    return citations


def build_answer_prompt(question: str, chunks: list[dict]) -> str:
    context = build_context(chunks)

    return f"""
You are a legal assistant.

Answer the user's question using only the provided sources.
If the answer is not supported by the sources, say that clearly.
Only use citation markers for sources that directly support the sentence.
Do not invent citations, and do not cite a source that only loosely relates.
When referring to sources, use the numbered citation markers like [1], [2].

Question:
{question}

Sources:
{context}
""".strip()

def stream_answer_question_from_chunks(question: str, chunks: list[dict]):
    prompt = build_answer_prompt(question, chunks)
    citations = build_citations(chunks)

    def generate():
        answer_parts: list[str] = []

        try:
            with client.responses.stream(
                model=settings.openai_chat_model,
                input=prompt,
            ) as stream:
                for event in stream:
                    if event.type == "response.output_text.delta" and event.delta:
                        answer_parts.append(event.delta)
                        yield json.dumps({
                            "type": "answer.delta",
                            "delta": event.delta,
                        }) + "\n"

                final_response = stream.get_final_response()
                answer_text = "".join(answer_parts).strip() or final_response.output_text.strip()

                yield json.dumps({
                    "type": "answer.completed",
                    "answer": answer_text,
                    "citations": citations,
                }) + "\n"
        except Exception as exc:
            yield json.dumps({
                "type": "answer.error",
                "error": str(exc),
            }) + "\n"

    return generate()
