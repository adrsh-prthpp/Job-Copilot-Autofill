# Job Copilot Backend

Local FastAPI backend for the Job Copilot Autofill Chrome extension.

## Create Conda Environment

```bash
conda create -n jobcopilot python=3.11
conda activate jobcopilot
```

## Install

```bash
pip install -r requirements.txt
```

## Configure OpenAI

Copy `.env.example` to `.env` and set your API key:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
CHROMA_DIR=./data/chroma
DOCUMENT_UPLOAD_DIR=./data/documents
```

The Chrome extension never receives the API key. Only this local backend reads it.

## Run

From the `backend` folder:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

Open:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "job-copilot-backend"
}
```

## Enable In Extension

1. Open the extension popup.
2. Click **Open Settings**.
3. Enable backend support.
4. Keep the backend URL as `http://127.0.0.1:8000`.
5. Save settings.
6. Click **Test Backend** in the popup.

## Current Behavior

- Deterministic field matching
- Approximate option matching for yes/no, country, state, education, college, and major
- Custom long-form question detection
- Optional LLM field matching through `POST /llm/match-fields`
- Multi-document local RAG using OpenAI embeddings and persistent Chroma
- Local uploads for PDF, TXT, and Markdown documents
- Metadata-filtered retrieval by document type
- Lightweight deterministic document routing
- Sensitive/voluntary fields marked as manual review only
- No persistent request storage

## Upload Documents

Documents are stored locally under `backend/data/documents/`. Chroma vector data is stored locally under `backend/data/chroma/`.

Example with PowerShell:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/documents/upload `
  -Method Post `
  -Form @{
    documentType = "technical_resume"
    files = Get-Item "C:\path\to\technical_resume.pdf"
  }
```

Supported document types:

- `technical_resume`
- `sales_resume`
- `leadership_resume`
- `general_resume`
- `projects`
- `personal_context`
- `saved_answers`
- `portfolio`
- `transcript`
- `other`

Check indexed documents:

```text
http://127.0.0.1:8000/documents/status
```

Retrieve chunks:

```bash
POST /rag/retrieve
```

Generate grounded answers:

```bash
POST /rag/answer-fields
```

## LLM Endpoint

`POST /llm/match-fields` sends scanned fields, profile values, and saved answers to OpenAI from the backend only. It returns structured suggestions and does not fill anything by itself.

LLM and embedding calls use tokens and may incur OpenAI API cost. Keep the backend local and avoid sending unnecessary profile data.

## Current Limitations

- RAG answers are preview-only in the extension.
- Retrieval routing is heuristic.
- There is no LangGraph workflow yet.
- There is no cloud sync or authentication.
- Chroma and uploaded documents are local to this machine.
