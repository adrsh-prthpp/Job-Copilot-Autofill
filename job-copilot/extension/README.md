# Job Copilot Autofill

A local Chrome Extension MVP that scans job application pages, previews suggested answers, and fills approved fields from saved local data. It uses Manifest V3, plain JavaScript, HTML, CSS, and `chrome.storage.local`.

The extension works by itself. It can optionally call a local FastAPI backend at `http://127.0.0.1:8000` for backend-enhanced matching of ambiguous fields.

## What It Supports

- Text inputs and textareas
- Native `select` dropdowns
- Radio groups
- Simple checkboxes, excluding consent/certification-style boxes
- Button-style yes/no choices when the surrounding question is recognizable
- Basic custom dropdown/listbox detection for Workday-style components
- Sensitive and voluntary demographic fields as manual approval only

## Supported Common Questions

The scanner recognizes common application fields for identity, contact info, address, postal code, education, work authorization, location, sponsorship, relocation, salary, and start date.

Education matching includes school, college attended, highest education, degree, major, graduation date, and graduated status. It can match options like `Bachelor's Degree` to `Bachelor's`, `UC Riverside` to `University of California, Riverside`, `CA` to `California`, and `United States of America` to `United States`.

## Load The Extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `job-copilot-extension` folder.
5. Reload the extension after editing files.

## Edit Profile And Answers

1. Click the extension icon.
2. Click **Open Settings**.
3. Edit profile fields and saved answers.
4. Optionally enable backend support and confirm the backend URL.
5. Click **Save Settings**.

Values are stored only in `chrome.storage.local` for this browser profile. Nothing is sent to a backend or external service.

## Test The Backend

1. Start the local FastAPI backend.
2. Open the extension popup.
3. Click **Test Backend**.

If the backend is enabled in settings, scan mode sends only ambiguous medium/low-confidence fields to the local backend. If the backend is offline, scan mode falls back to frontend-only matching.

Click **Ask LLM** after scanning to request OpenAI-powered suggestions through the local backend. The API key stays in `job-copilot/backend/.env`; it is never stored in or sent to the Chrome extension. LLM suggestions are displayed for review only and are not autofilled yet.

Use the **Documents / RAG** section to upload multiple PDF, TXT, or Markdown documents to the local backend. After scanning a page, optionally paste a job description and click **Ask Resume RAG** to preview grounded answers based on uploaded documents. RAG answers are not autofilled yet.

## Scan And Fill Workflow

1. Open a job application page.
2. Click **Scan Page**.
3. Review the sections:
   - Text Field Matches
   - Dropdown/Select Matches
   - Radio/Multiple-Choice Matches
   - Manual Review Required
   - Sensitive / Voluntary Fields
4. Use one of the fill buttons:
   - **Fill High Confidence Text Fields**
   - **Fill High Confidence Dropdowns/Radios**
   - **Fill All High Confidence**
   - **Fill Selected Medium Confidence**
   - **Fill Selected Sensitive Fields**

Medium-confidence and sensitive fields require checking the approval box before filling.

## Automatic Fill Rules

High-confidence autofill is allowed for common identity, address, education, graduation, work authorization, US location, and sponsorship questions.

The extension never automatically fills veteran status, disability status, gender, race/ethnicity, sexual orientation, or pronouns. Those appear in the sensitive section and can only be filled after explicit approval.

## Safety Rules

The extension does not:

- submit forms
- click final submit/apply buttons
- overwrite filled fields
- fill password or hidden fields
- transmit data externally
- bypass CAPTCHA
- auto-check legal consent, certification, agreement, terms, or conditions boxes

## Known Limitations

- Workday and other custom dropdowns vary heavily. This MVP detects many of them and can attempt approved fills, but some will remain manual.
- Custom list options may only appear after opening a dropdown, so option previews can be incomplete.
- Matching is still rule-based and may miss unusual wording.
- It does not answer custom long-form questions.
- Backend support is optional and local-only.
- LLM suggestions require the backend, an `OPENAI_API_KEY`, and may incur OpenAI token cost.
- RAG requires uploaded documents and uses OpenAI embeddings, which may incur token cost.
- It has no account sync, selected RAG autofill, or LangGraph workflow yet.

## Next Steps

1. Add a backend with FastAPI.
2. Add LLM-based ambiguous field matching.
3. Add resume parsing.
4. Add multiple resume versions.
5. Add RAG for custom questions.
6. Add LangGraph workflow orchestration.
