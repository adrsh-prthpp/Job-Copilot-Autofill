import json

from .document_router import determine_relevant_document_types
from .llm_client import generate_json_response
from .models import RagAnswerFieldsRequest, RagAnswerFieldsResponse, RagFieldAnswer, RagAnswerSource
from .prompts import RAG_ANSWER_SYSTEM_PROMPT
from .vector_store import search_chunks


def retrieve_chunks(query: str, top_k: int = 5, document_types: list[str] | None = None) -> list[dict]:
    return search_chunks(query=query, top_k=top_k, document_types=document_types or None)


def answer_fields_with_rag(request: RagAnswerFieldsRequest) -> RagAnswerFieldsResponse:
    answers: list[RagFieldAnswer] = []

    for field in request.fields:
        route = determine_relevant_document_types(field.context, request.jobDescription)
        chunks = retrieve_chunks(field.context, top_k=5, document_types=route.recommendedDocumentTypes)
        payload = {
            "field": {
                "index": field.index,
                "context": field.context,
                "fieldType": field.fieldType,
                "availableOptions": field.availableOptions,
            },
            "profile": request.profile,
            "savedAnswers": request.savedAnswers,
            "jobDescription": request.jobDescription,
            "retrievedChunks": [
                {
                    "chunkId": chunk["chunkId"],
                    "source": chunk["source"],
                    "documentType": chunk["documentType"],
                    "text": chunk["text"],
                }
                for chunk in chunks
            ],
        }
        result = generate_json_response(
            system_prompt=RAG_ANSWER_SYSTEM_PROMPT,
            payload=payload,
            schema=_rag_answer_schema(),
            schema_name="rag_field_answer",
        )
        sources = [
            RagAnswerSource(source=chunk["source"], chunkId=chunk["chunkId"])
            for chunk in chunks[:3]
        ]
        answers.append(
            RagFieldAnswer(
                index=field.index,
                question=field.context,
                suggestedAnswer=result.get("suggestedAnswer", ""),
                confidence=result.get("confidence", "low"),
                requiresReview=True,
                retrievedDocumentTypes=route.recommendedDocumentTypes,
                sources=sources,
                reason=result.get("reason", route.reason),
            )
        )

    return RagAnswerFieldsResponse(answers=answers)


def _rag_answer_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["suggestedAnswer", "confidence", "reason"],
        "properties": {
            "suggestedAnswer": {"type": "string"},
            "confidence": {"type": "string", "enum": ["high", "medium", "low", "manual_required"]},
            "reason": {"type": "string"},
        },
    }
