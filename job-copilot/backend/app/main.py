from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .chunker import chunk_text
from .document_parser import SUPPORTED_EXTENSIONS, extract_document_text
from .document_router import determine_relevant_document_types
from .llm_client import match_fields_with_llm
from .matcher import detect_custom_question, match_field
from .models import (
    AnalyzeScanRequest,
    AnalyzeScanResponse,
    AnalyzedCustomQuestion,
    AnalyzedMatch,
    CustomQuestionRequest,
    CustomQuestionResponse,
    FieldMatchRequest,
    FieldMatchResponse,
    LlmMatchFieldsRequest,
    LlmMatchFieldsResponse,
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentStatusItem,
    UploadedDocumentSummary,
    RagRetrieveRequest,
    RagRetrieveResponse,
    RetrievedChunk,
    RagAnswerFieldsRequest,
    RagAnswerFieldsResponse,
)
from .rag import answer_fields_with_rag, retrieve_chunks
from .vector_store import add_document_chunks, get_document_status

app = FastAPI(title="Job Copilot Backend", version="0.1.0")

# Local development only. Lock this down to the deployed extension ID before any production use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def model_to_dict(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}


@app.post("/match-field", response_model=FieldMatchResponse)
def match_field_endpoint(request: FieldMatchRequest) -> FieldMatchResponse:
    return match_field(
        context=request.context,
        field_type=request.fieldType,
        available_options=request.availableOptions,
        profile=request.profile,
        saved_answers=request.savedAnswers,
    )


@app.post("/detect-custom-question", response_model=CustomQuestionResponse)
def detect_custom_question_endpoint(request: CustomQuestionRequest) -> CustomQuestionResponse:
    return detect_custom_question(context=request.context, field_type=request.fieldType)


@app.post("/analyze-scan-results", response_model=AnalyzeScanResponse)
def analyze_scan_results(request: AnalyzeScanRequest) -> AnalyzeScanResponse:
    matches: list[AnalyzedMatch] = []
    custom_questions: list[AnalyzedCustomQuestion] = []
    manual_review: list[AnalyzedMatch] = []

    for field in request.fields:
        match = match_field(
            context=field.context,
            field_type=field.fieldType,
            available_options=field.availableOptions,
            profile=request.profile,
            saved_answers=request.savedAnswers,
        )
        analyzed_match = AnalyzedMatch(
            index=field.index,
            context=field.context,
            fieldType=field.fieldType,
            **model_to_dict(match),
        )
        matches.append(analyzed_match)

        custom_question = detect_custom_question(context=field.context, field_type=field.fieldType)
        if custom_question.isCustomQuestion:
            custom_questions.append(
                AnalyzedCustomQuestion(
                    index=field.index,
                    context=field.context,
                    fieldType=field.fieldType,
                    **model_to_dict(custom_question),
                )
            )

        if match.confidence in {"medium", "low", "manual_required"}:
            manual_review.append(analyzed_match)

    return AnalyzeScanResponse(matches=matches, customQuestions=custom_questions, manualReview=manual_review)


@app.post("/llm/match-fields", response_model=LlmMatchFieldsResponse)
def llm_match_fields(request: LlmMatchFieldsRequest) -> LlmMatchFieldsResponse:
    return match_fields_with_llm(request)


@app.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_documents(
    files: list[UploadFile] = File(...),
    documentType: str = Form("other"),
    source: str = Form("uploaded"),
    tags: str = Form(""),
) -> DocumentUploadResponse:
    upload_dir = Path(settings.document_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    uploaded: list[UploadedDocumentSummary] = []
    total_chunks = 0

    for file in files:
        filename = Path(file.filename or "").name
        suffix = Path(filename).suffix.lower()
        if not filename or suffix not in SUPPORTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail=f"Empty file rejected: {filename}")

        saved_path = upload_dir / f"{uuid4().hex}_{filename}"
        saved_path.write_bytes(content)
        detected_type = documentType if documentType != "other" else detect_document_type(filename)
        text = extract_document_text(saved_path).strip()
        if not text:
            raise HTTPException(status_code=400, detail=f"No extractable text found: {filename}")

        chunks = chunk_text(text)
        if not chunks:
            raise HTTPException(status_code=400, detail=f"No chunks created: {filename}")

        document_id = f"{Path(filename).stem}_{uuid4().hex[:8]}"
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        chunks_created = add_document_chunks(
            document_id=document_id,
            filename=filename,
            document_type=detected_type,
            source=source,
            tags=tag_list,
            chunks=chunks,
        )
        uploaded.append(
            UploadedDocumentSummary(
                filename=filename,
                documentType=detected_type,
                chunksCreated=chunks_created,
            )
        )
        total_chunks += chunks_created

    return DocumentUploadResponse(status="ok", uploadedDocuments=uploaded, totalChunks=total_chunks)


@app.get("/documents/status", response_model=DocumentStatusResponse)
def documents_status() -> DocumentStatusResponse:
    documents, total_chunks = get_document_status()
    items = [DocumentStatusItem(**document) for document in documents]
    return DocumentStatusResponse(documents=items, totalDocuments=len(items), totalChunks=total_chunks)


@app.post("/rag/retrieve", response_model=RagRetrieveResponse)
def rag_retrieve(request: RagRetrieveRequest) -> RagRetrieveResponse:
    chunks = retrieve_chunks(
        query=request.query,
        top_k=request.topK,
        document_types=request.documentTypes,
    )
    return RagRetrieveResponse(
        query=request.query,
        chunks=[
            RetrievedChunk(
                text=chunk["text"],
                source=chunk["source"],
                documentType=chunk["documentType"],
                chunkId=chunk["chunkId"],
                score=chunk["score"],
            )
            for chunk in chunks
        ],
    )


@app.post("/rag/answer-fields", response_model=RagAnswerFieldsResponse)
def rag_answer_fields(request: RagAnswerFieldsRequest) -> RagAnswerFieldsResponse:
    return answer_fields_with_rag(request)


def detect_document_type(filename: str) -> str:
    lowered = filename.lower()
    if "technical" in lowered or "software" in lowered:
        return "technical_resume"
    if "sales" in lowered:
        return "sales_resume"
    if "leadership" in lowered or "manager" in lowered:
        return "leadership_resume"
    if "project" in lowered:
        return "projects"
    if "personal" in lowered or "background" in lowered:
        return "personal_context"
    if "saved" in lowered or "answers" in lowered:
        return "saved_answers"
    if "portfolio" in lowered:
        return "portfolio"
    if "transcript" in lowered:
        return "transcript"
    if "resume" in lowered:
        return "general_resume"
    return "other"
