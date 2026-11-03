# Walkthrough recording script

Target length: approximately 4 minutes. This is a script, not a recorded video. Open the live app and prepare a small `.txt` or `.md` file containing sample text. Use only demo content.

## 0:00–0:30 — Product and scope

Show the document workspace at `tysonthompson.com/googledocs/`.

“Folio is a lightweight shared document workspace. I focused on a complete path from creating or importing a document to editing, saving, and sharing it. This demo uses three seeded accounts so reviewers can test ownership and access without signing up.”

Point to the account switcher. Explain that all accounts are public demo identities.

## 0:30–1:30 — Create, edit, persist

Select Tyson, create a document, and give it a recognizable title such as “Launch checklist.” Add a heading, a short paragraph, bold or underline a phrase, and insert a list.

Point to autosave status. Wait for the saved state, return to the document list, refresh, and reopen the document. Confirm the content and formatting remain.

“The editor uses Tiptap. The PHP API validates and sanitizes saved HTML. A version check protects against silently overwriting changes from another tab.”

## 1:30–2:15 — Import

Import the prepared text file and show that it becomes a new editable document. Edit one line and wait for it to save.

“Import accepts TXT and Markdown files up to 1 MB. Both are treated as literal text, so Markdown syntax stays visible. I intentionally deferred DOCX and PDF conversion.”

## 2:15–3:15 — Sharing and roles

Return to “Launch checklist.” As Tyson, share it with Maya as an editor and Alex as a viewer.

Switch to Maya, locate the document in shared documents, and make a small edit. Switch to Alex, open the same document, and show the read-only state. Return to Tyson to show the ownership distinction and sharing controls.

“Roles are enforced by the server on each request. Only the owner manages access. Account selection is intentionally mocked, so this is a demonstration of permission behavior rather than production authentication.”

## 3:15–4:15 — Engineering choices and AI

Show the README, architecture note, and actual test results if available. Do not describe unrun tests as passing.

“The app runs on the site's existing Apache and PHP hosting. A locked JSON store persists content and access grants without a database service. This keeps local setup small; a production version would move to real authentication and transactional storage.”

“OpenAI Codex and parallel agents generated the implementation, tests, and documentation. The AI workflow note records the actual review and verification performed. The next priorities are secure identity, isolated demo data, improved conflict recovery, and wider browser testing.”

Only describe human revisions that actually occurred. If the user has not reviewed or changed generated code, say so rather than implying otherwise.

## After recording

Publish a viewable video link and place it in a plain text file in the submission folder. Include source code and the Markdown notes in the requested Google Drive folder, verify reviewer access to both links, and update `SUBMISSION.md` to match the delivered files exactly. No portal submission or video upload is implied by this script.
