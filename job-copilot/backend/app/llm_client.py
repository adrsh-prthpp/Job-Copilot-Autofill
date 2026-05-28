import json

from fastapi import HTTPException
from openai import OpenAI

from .config import settings
from .matcher import is_sensitive_field
from .models import LlmFieldSuggestion, LlmMatchFieldsRequest, LlmMatchFieldsResponse
from .prompts import LLM_FIELD_MATCHING_SYSTEM_PROMPT


def match_fields_with_llm(request: LlmMatchFieldsRequest) -> LlmMatchFieldsResponse:
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    client = get_openai_client()
    schema = _response_json_schema()

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": LLM_FIELD_MATCHING_SYSTEM_PROMPT.strip()},
            {"role": "user", "content": json.dumps(_model_to_dict(request), ensure_ascii=True)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "llm_field_match_response",
                "strict": True,
                "schema": schema,
            },
        },
    )

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response")

    parsed = json.loads(content)
    response_model = LlmMatchFieldsResponse(**parsed)
    return enforce_llm_safety(response_model, request)


def get_openai_client() -> OpenAI:
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
    return OpenAI(api_key=settings.openai_api_key)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    client = get_openai_client()
    response = client.embeddings.create(
        model=settings.openai_embedding_model,
        input=texts,
    )
    return [item.embedding for item in response.data]


def generate_json_response(
    system_prompt: str,
    payload: dict,
    schema: dict,
    schema_name: str,
) -> dict:
    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "strict": True,
                "schema": schema,
            },
        },
    )
    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response")
    return json.loads(content)


def enforce_llm_safety(
    response: LlmMatchFieldsResponse,
    request: LlmMatchFieldsRequest,
) -> LlmMatchFieldsResponse:
    fields_by_index = {field.index: field for field in request.fields}
    sensitive_keys = {
        "veteranStatus",
        "disabilityStatus",
        "gender",
        "raceEthnicity",
        "sexualOrientation",
        "pronouns",
    }
    sanitized_matches: list[LlmFieldSuggestion] = []

    for match in response.matches:
        field = fields_by_index.get(match.index)
        context = field.context if field else ""
        is_sensitive = match.matchedKey in sensitive_keys or bool(is_sensitive_field(context))
        is_unknown = not match.suggestedValue

        if is_sensitive:
            match.isSensitive = True
            match.requiresReview = True
            match.confidence = "manual_required"
            if not match.reason:
                match.reason = "Sensitive voluntary demographic field"

        if is_unknown:
            match.requiresReview = True

        sanitized_matches.append(match)

    return LlmMatchFieldsResponse(matches=sanitized_matches)


def _model_to_dict(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _response_json_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["matches"],
        "properties": {
            "matches": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "index",
                        "matchedKey",
                        "suggestedValue",
                        "matchedOption",
                        "confidence",
                        "requiresReview",
                        "isSensitive",
                        "reason",
                    ],
                    "properties": {
                        "index": {"type": "integer"},
                        "matchedKey": {"type": "string"},
                        "suggestedValue": {"type": "string"},
                        "matchedOption": {"type": "string"},
                        "confidence": {
                            "type": "string",
                            "enum": ["high", "medium", "low", "manual_required"],
                        },
                        "requiresReview": {"type": "boolean"},
                        "isSensitive": {"type": "boolean"},
                        "reason": {"type": "string"},
                    },
                },
            }
        },
    }
