# Job Copilot Autofill

A local-first Chrome extension and optional FastAPI backend that scan job
application forms, match fields against a saved profile, and present proposed
answers for review. The backend adds optional LLM suggestions and multi-document
retrieval without exposing API credentials to the extension.

## Features

- Manifest V3 browser extension
- Text, dropdown, radio, and multiple-choice field matching
- Confidence scoring and manual review boundaries
- Local profile storage through `chrome.storage.local`
- Optional FastAPI matching service
- Optional OpenAI suggestions
- PDF, text, and Markdown ingestion for local RAG
- Local Chroma vector storage

## Architecture

```text
Job application page
  -> extension scanner and deterministic matcher
  -> review UI
  -> optional localhost FastAPI service
     -> LLM suggestions
     -> document ingestion and Chroma retrieval
```

## Tech stack

- JavaScript, HTML, and CSS
- Chrome Extension Manifest V3
- Python and FastAPI
- OpenAI API
- Chroma

## Installation

Backend:

```bash
cd job-copilot/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `job-copilot/extension`.

## Privacy and safety

The OpenAI key remains in the local backend. Sensitive or voluntary fields
require manual approval, and generated answers are presented for review rather
than automatically submitted.

## Project status

**Functional prototype.** Python syntax validation passes. Browser-level tests,
backend tests, packaging, and CI are not yet included.

## Screenshot / demo

Add a GIF showing scan, confidence grouping, manual approval, and previewed RAG
answers. Use a synthetic application form with fake personal data.

## Future improvements

- Add automated extension and API tests
- Add ATS-specific adapters behind a shared interface
- Encrypt or minimize locally stored profile data
- Add document deletion and vector-index lifecycle controls
- Package a reproducible local development environment
