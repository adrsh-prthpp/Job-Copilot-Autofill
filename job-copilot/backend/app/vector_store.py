from collections import defaultdict
from pathlib import Path
from typing import Any

import chromadb

from .chunker import DocumentChunk
from .config import settings
from .llm_client import embed_texts


COLLECTION_NAME = "job_copilot_documents"


def get_chroma_client():
    Path(settings.chroma_dir).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=settings.chroma_dir)


def get_or_create_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(name=COLLECTION_NAME)


def add_document_chunks(
    document_id: str,
    filename: str,
    document_type: str,
    source: str,
    tags: list[str],
    chunks: list[DocumentChunk],
) -> int:
    if not chunks:
        return 0

    collection = get_or_create_collection()
    texts = [chunk.text for chunk in chunks]
    embeddings = embed_texts(texts)
    ids = [f"{document_id}-{chunk.chunk_index}" for chunk in chunks]
    metadatas = [
        {
            "documentId": document_id,
            "filename": filename,
            "documentType": document_type,
            "source": source,
            "tags": ",".join(tags),
            "chunkIndex": chunk.chunk_index,
            "startChar": chunk.start_char,
            "endChar": chunk.end_char,
        }
        for chunk in chunks
    ]

    collection.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    return len(chunks)


def search_chunks(query: str, top_k: int = 5, document_types: list[str] | None = None) -> list[dict[str, Any]]:
    collection = get_or_create_collection()
    query_embedding = embed_texts([query])[0]
    where = {"documentType": {"$in": document_types}} if document_types else None
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=max(1, top_k),
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    return _format_results(results)


def search_chunks_by_document_type(query: str, document_types: list[str], top_k: int = 5) -> list[dict[str, Any]]:
    return search_chunks(query=query, top_k=top_k, document_types=document_types)


def get_document_status() -> tuple[list[dict[str, Any]], int]:
    collection = get_or_create_collection()
    raw = collection.get(include=["metadatas"])
    grouped: dict[tuple[str, str], int] = defaultdict(int)

    for metadata in raw.get("metadatas", []):
        key = (metadata.get("filename", ""), metadata.get("documentType", "other"))
        grouped[key] += 1

    documents = [
        {"filename": filename, "documentType": document_type, "chunks": chunks}
        for (filename, document_type), chunks in sorted(grouped.items())
    ]
    return documents, len(raw.get("ids", []))


def _format_results(results) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for chunk_id, text, metadata, distance in zip(ids, documents, metadatas, distances):
        score = max(0.0, 1.0 - float(distance or 0.0))
        chunks.append(
            {
                "text": text,
                "source": metadata.get("filename", ""),
                "documentType": metadata.get("documentType", "other"),
                "chunkId": chunk_id,
                "score": score,
                "metadata": metadata,
            }
        )

    return chunks
