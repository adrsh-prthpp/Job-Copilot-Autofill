# Job Copilot Autofill

Job Copilot Autofill is a local-first Chrome extension plus optional FastAPI backend for job application autofill experiments.

## Architecture

```text
job-copilot/
├── extension/   Chrome Extension MV3 UI, scanning, matching, and autofill
└── backend/     Local FastAPI service for matching, LLM suggestions, and multi-document RAG
```

The extension works without the backend. When backend support is enabled in settings, the extension can send ambiguous scan results to the local FastAPI service for deterministic backend-enhanced suggestions. The popup can also ask the backend for OpenAI LLM suggestions and grounded RAG answers, but generated answers are review-only for now.

## Extension

Load `job-copilot/extension` as an unpacked extension from `chrome://extensions`.

The extension supports:

- saved profile and application answers in `chrome.storage.local`
- scan mode
- confidence scoring
- text field autofill
- dropdown/select support
- radio and multiple-choice support
- postal code support
- manual review for medium-confidence fields
- manual approval for sensitive/voluntary fields
- multi-document upload from the popup
- optional job description context
- preview-only RAG answers

## Backend Setup

```bash
cd job-copilot/backend
conda create -n jobcopilot python=3.11
conda activate jobcopilot
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `OPENAI_API_KEY` in `job-copilot/backend/.env` before using **Ask LLM**.
Set `OPENAI_EMBEDDING_MODEL=text-embedding-3-small` before uploading documents for RAG.

Test:

```text
http://127.0.0.1:8000/health
```

## Current Limitations

- Backend matching is deterministic and rule-based.
- LLM matching is available only when the backend is running and `OPENAI_API_KEY` is configured.
- The API key stays backend-only and is never exposed in the Chrome extension.
- Multi-document RAG stores uploads in `backend/data/documents` and embeddings in local Chroma under `backend/data/chroma`.
- OpenAI API and embedding calls use tokens and may incur cost.
- No LangGraph, database server, Docker, or auth yet.
- Custom dropdowns vary by ATS and may still need manual review.
- Backend must be manually started locally.

## Next Steps

1. Add smarter routing.
2. Add resume selection by job type.
3. Add better job description analysis.
4. Add selected answer autofill.
5. Add LangGraph only if workflows become multi-step.
