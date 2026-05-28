from typing import Any, Literal

from pydantic import BaseModel, Field


Confidence = Literal["high", "medium", "low", "manual_required"]
DocumentType = Literal[
    "technical_resume",
    "sales_resume",
    "leadership_resume",
    "general_resume",
    "projects",
    "personal_context",
    "saved_answers",
    "portfolio",
    "transcript",
    "other",
]


class FieldMatchRequest(BaseModel):
    context: str
    fieldType: str
    availableOptions: list[str] = Field(default_factory=list)
    profile: dict[str, Any] = Field(default_factory=dict)
    savedAnswers: dict[str, Any] = Field(default_factory=dict)


class FieldMatchResponse(BaseModel):
    matchedKey: str = ""
    suggestedValue: str = ""
    matchedOption: str = ""
    confidence: Confidence = "low"
    reason: str = "No clear field match"


class CustomQuestionRequest(BaseModel):
    context: str
    fieldType: str


class CustomQuestionResponse(BaseModel):
    isCustomQuestion: bool
    questionType: str = ""
    confidence: Confidence = "low"
    reason: str = ""


class ScanField(BaseModel):
    index: int
    context: str
    fieldType: str
    availableOptions: list[str] = Field(default_factory=list)


class AnalyzeScanRequest(BaseModel):
    fields: list[ScanField]
    profile: dict[str, Any] = Field(default_factory=dict)
    savedAnswers: dict[str, Any] = Field(default_factory=dict)


class AnalyzedMatch(FieldMatchResponse):
    index: int
    context: str
    fieldType: str


class AnalyzedCustomQuestion(CustomQuestionResponse):
    index: int
    context: str
    fieldType: str


class AnalyzeScanResponse(BaseModel):
    matches: list[AnalyzedMatch]
    customQuestions: list[AnalyzedCustomQuestion]
    manualReview: list[AnalyzedMatch]


class LlmScanField(BaseModel):
    index: int
    context: str
    fieldType: str
    availableOptions: list[str] = Field(default_factory=list)


class LlmMatchFieldsRequest(BaseModel):
    fields: list[LlmScanField]
    profile: dict[str, Any] = Field(default_factory=dict)
    savedAnswers: dict[str, Any] = Field(default_factory=dict)


class LlmFieldSuggestion(BaseModel):
    index: int
    matchedKey: str = ""
    suggestedValue: str = ""
    matchedOption: str = ""
    confidence: Confidence = "low"
    requiresReview: bool = True
    isSensitive: bool = False
    reason: str = ""


class LlmMatchFieldsResponse(BaseModel):
    matches: list[LlmFieldSuggestion]


class UploadedDocumentSummary(BaseModel):
    filename: str
    documentType: DocumentType
    chunksCreated: int


class DocumentUploadResponse(BaseModel):
    status: str
    uploadedDocuments: list[UploadedDocumentSummary]
    totalChunks: int


class DocumentStatusItem(BaseModel):
    filename: str
    documentType: str
    chunks: int


class DocumentStatusResponse(BaseModel):
    documents: list[DocumentStatusItem]
    totalDocuments: int
    totalChunks: int


class RagRetrieveRequest(BaseModel):
    query: str
    topK: int = 5
    documentTypes: list[DocumentType] = Field(default_factory=list)


class RetrievedChunk(BaseModel):
    text: str
    source: str
    documentType: str
    chunkId: str
    score: float


class RagRetrieveResponse(BaseModel):
    query: str
    chunks: list[RetrievedChunk]


class RagAnswerFieldsRequest(BaseModel):
    fields: list[ScanField]
    profile: dict[str, Any] = Field(default_factory=dict)
    savedAnswers: dict[str, Any] = Field(default_factory=dict)
    jobDescription: str = ""


class RagAnswerSource(BaseModel):
    source: str
    chunkId: str


class RagFieldAnswer(BaseModel):
    index: int
    question: str
    suggestedAnswer: str = ""
    confidence: Confidence = "low"
    requiresReview: bool = True
    retrievedDocumentTypes: list[str] = Field(default_factory=list)
    sources: list[RagAnswerSource] = Field(default_factory=list)
    reason: str = ""


class RagAnswerFieldsResponse(BaseModel):
    answers: list[RagFieldAnswer]


class DocumentRouteResponse(BaseModel):
    recommendedDocumentTypes: list[DocumentType]
    reason: str
