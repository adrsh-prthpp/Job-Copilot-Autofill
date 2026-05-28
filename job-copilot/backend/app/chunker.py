from dataclasses import dataclass


@dataclass
class DocumentChunk:
    text: str
    chunk_index: int
    start_char: int
    end_char: int


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[DocumentChunk]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    chunks: list[DocumentChunk] = []
    start = 0

    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        if end < len(cleaned):
            sentence_break = max(cleaned.rfind(". ", start, end), cleaned.rfind("\n", start, end))
            if sentence_break > start + 300:
                end = sentence_break + 1

        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(
                DocumentChunk(
                    text=chunk,
                    chunk_index=len(chunks),
                    start_char=start,
                    end_char=end,
                )
            )

        if end >= len(cleaned):
            break
        start = max(0, end - overlap)

    return chunks
