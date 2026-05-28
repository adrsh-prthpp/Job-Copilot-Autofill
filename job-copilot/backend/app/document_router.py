from .models import DocumentRouteResponse


def determine_relevant_document_types(query: str, job_description: str = "") -> DocumentRouteResponse:
    text = f"{query} {job_description}".lower()

    if any(word in text for word in ["python", "software", "engineer", "technical", "code", "api", "backend", "frontend"]):
        return DocumentRouteResponse(
            recommendedDocumentTypes=["technical_resume", "projects"],
            reason="Detected technical/software-related question.",
        )

    if any(word in text for word in ["sales", "customer", "client", "pipeline", "quota", "account"]):
        return DocumentRouteResponse(
            recommendedDocumentTypes=["sales_resume", "leadership_resume"],
            reason="Detected sales/customer-facing question.",
        )

    if any(word in text for word in ["leadership", "lead", "mentor", "team", "managed", "ownership"]):
        return DocumentRouteResponse(
            recommendedDocumentTypes=["leadership_resume", "projects"],
            reason="Detected leadership or teamwork question.",
        )

    if any(word in text for word in ["saved answer", "repeat", "standard response", "anything else"]):
        return DocumentRouteResponse(
            recommendedDocumentTypes=["saved_answers", "personal_context"],
            reason="Detected saved-answer style question.",
        )

    return DocumentRouteResponse(
        recommendedDocumentTypes=["general_resume", "personal_context", "projects"],
        reason="Using general background and project context.",
    )
