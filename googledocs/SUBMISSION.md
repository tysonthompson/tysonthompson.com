# Submission inventory

Product: **Folio — shared document workspace**

Product URL: <https://tysonthompson.com/googledocs/>.

## Included

- Application source: browser interface, locally bundled editor, PHP API, and persistence layer.
- `README.md`: scope, local setup, demo accounts, and review flow.
- `ARCHITECTURE.md`: component boundaries, authorization, persistence, and tradeoffs.
- `AI_WORKFLOW.md`: AI tooling, review status, and verification record.
- `WALKTHROUGH.md`: a 3–5 minute video recording script.
- `tests/backend.php`: 75 backend assertions covering permissions, sanitization, persistence, imports, and concurrency conflicts.
- `tests/http_test.py`: a real HTTP integration test using Python and curl, with disposable test-document cleanup.

- `tests/frontend.test.mjs`: 14 integration scenarios exercising the actual editor and UI behavior in a simulated DOM.
- `assets/app.js`: the built, locally served editor bundle.

Local backend, frontend, and HTTP checks passed. Actual browser visual review was unavailable; this is documented in the AI workflow note.

## Demo access

Use the account switcher to select **Tyson Thompson**, **Maya Chen**, or **Alex Morgan**. No password is required. Share as an owner, switch accounts, and review editor or viewer behavior. These are publicly selectable demo identities; use sample content only.

## Not included yet

- A recorded walkthrough video and a text file containing its public URL.
- A Google Drive folder containing the submission materials.
- A submitted hiring-portal response.

The app deployment and this documentation do not fulfill those delivery steps. The assessment requests a 3–5 minute video and one Google Drive folder; both remain to be supplied.

## Intentional scope limits

File import supports `.txt` and `.md` up to 1 MB as literal text. Authentication is mocked. Shared editing uses version conflict detection rather than real-time merging. There is no comments system, history browser, DOCX/PDF conversion, or presence indicator.

With another 2–4 hours, prioritize real sign-in and reviewer data isolation, better conflict recovery, and broader browser/accessibility checks.
