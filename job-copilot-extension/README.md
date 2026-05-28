# Job Copilot Autofill

A local Chrome Extension MVP that scans job application pages, suggests field matches, and fills only high-confidence fields from saved local data. It uses Manifest V3, plain JavaScript, HTML, CSS, and `chrome.storage.local`.

## What Changed

- Added an editable settings page for profile values.
- Added saved application answers such as work authorization and sponsorship.
- Moved profile data out of `content.js` and into Chrome local storage.
- Added page scanning with suggested matches and confidence levels.
- Added selectable confidence autofill: high only, high + medium, or high + medium + low.
- Kept sensitive demographic fields as low-confidence/manual-review only.

## Load The Extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `job-copilot-extension` folder.
5. Reload the extension after editing files.

## Edit Your Profile

1. Click the extension icon.
2. Click **Open Settings**.
3. Edit profile fields and saved answers.
4. Click **Save Settings**.

The settings page stores values in `chrome.storage.local` on this browser. No data is sent to a backend or external service.

## Scan Mode

1. Open a job application form.
2. Click the extension icon.
3. Click **Scan Page**.
4. Review the suggested matches in the popup.

Each match shows:

- field text or label
- suggested profile or saved answer key
- value preview
- confidence: high, medium, or low
- reason for the match

## Fill By Confidence

Choose a fill confidence level in the popup, then click **Fill Selected Confidence**.

- **High only** fills the safest matches.
- **High + Medium** also fills reasonable but less certain matches.
- **High + Medium + Low** fills every matched non-sensitive field that has a saved value.

Sensitive demographic fields are still never auto-filled, even when low confidence is selected.

## Safety

The extension:

- does not overwrite fields that already have values
- does not fill password, hidden, disabled, readonly, submit, reset, button, checkbox, radio, or file inputs
- does not click submit buttons
- does not submit forms
- does not bypass CAPTCHA
- does not transmit data externally
- does not automatically fill veteran status, disability status, gender, or race/ethnicity

## Current Limitations

- Custom dropdowns that are not real `select` elements are not filled.
- Workday-style pages may work partially but can need custom handling.
- Medium-confidence fields cannot be manually selected for fill yet.
- Matching is rule-based and can miss unusual wording.
- Profile data is stored only in the current Chrome profile.

## Next Steps

1. Add manual review checkboxes for medium-confidence fields.
2. Add a backend with FastAPI.
3. Add LLM-based field matching.
4. Add resume parsing.
5. Add RAG over multiple resumes.
6. Add a LangGraph workflow.
