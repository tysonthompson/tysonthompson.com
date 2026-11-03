# Folio

A small shared document workspace built for the Ajaia full stack product engineering assessment. Create and format documents, import text files, and share editor or viewer access with seeded demo users.

Product URL: [tysonthompson.com/googledocs/](https://tysonthompson.com/googledocs/).

## Review the product

The account switcher simulates sign-in. No password or external service is required.

| Demo user | Email | Account ID |
| --- | --- | --- |
| Tyson Thompson | tyson@example.test | tyson |
| Maya Chen | maya@example.test | maya |
| Alex Morgan | alex@example.test | alex |

1. Select Tyson, create a document, rename it, and add a heading, bold text, and a list.
2. Wait for the saved indicator, refresh, and reopen the document.
3. Share the document with Maya as an editor and Alex as a viewer.
4. Switch to Maya and open the document under shared documents. Make an edit.
5. Switch to Alex and confirm the document is readable but cannot be edited or shared.
6. Import a `.txt` or `.md` file to create an editable document.

This is a public demo with intentionally mocked identity. Anyone can select any demo account and access its documents. Use sample content only; do not upload confidential or personal information.

## Included capabilities

- Create, rename, save, and reopen documents.
- Rich text: bold, italic, underline, headings, bullets, and numbered lists.
- Autosave with a visible save status and conflict handling for stale document versions.
- Import UTF-8 `.txt` and `.md` files up to 1 MB (1,048,576 bytes) as plain text. Markdown syntax stays literal rather than being rendered. DOCX, PDF, and attachments are out of scope.
- Server-enforced owner, editor, and viewer permissions. Only owners manage sharing.
- Owned and shared document filters, with persisted content and permissions.

## Run locally

Requirements: PHP 8 or newer with DOM, JSON, and session support, available as `php` in your shell. Node.js 22 and npm are used for frontend development and CI; the deployed app does not need Node.js. There is no database or paid dependency.

From the repository root:

```sh
cd googledocs
npm ci
npm run build
cd ..
php -S localhost:8080 -t .
```

Open <http://localhost:8080/googledocs/>. If your shell is already in `googledocs`, start PHP with `php -S localhost:8080 -t ..` instead. The PHP server must serve the app's parent directory so the `/googledocs/` path works.

PHP's built-in server is for local development. Production runs on Apache/PHP on the existing cPanel host. The PHP process needs write access to `googledocs/storage/`. Seed data is created on first use. If running from a standalone source archive containing the contents of this directory, extract it into a directory named `googledocs` and serve its parent directory as above.

## Build and validation

`npm run build` bundles the Tiptap editor and frontend JavaScript with esbuild. Browser assets are served locally without a CDN or third-party account.

From the repository root, run the backend tests:

```sh
php googledocs/tests/backend.php
```

From `googledocs`, run the frontend checks and rebuild:

```sh
npm test
npm run build
```

With the local PHP server running, run the HTTP integration test from the repository root (requires Python 3 and `curl`):

```sh
python googledocs/tests/http_test.py http://localhost:8080/googledocs/
```

The HTTP test creates disposable documents, exercises real sessions and API permissions, then removes its own documents. Backend tests use separate temporary storage.

The deployment workflow runs PHP tests, frontend checks, and the production build before publishing. It excludes runtime data, dependency directories, and test/source tooling from the FTP upload. Application deployments must preserve `storage/data.php` and its runtime files.

Verification so far: PHP 8.4.27 syntax checks, 75 backend assertions, and real local HTTP tests passed for persistence, access control, sharing/revocation, conflict handling, and file validation. All 14 frontend integration scenarios and the production bundle build also passed. The HTTP harness can target the public URL to verify the deployed workflow. Browser visual review is unavailable in the execution environment and has not been completed. See the final record in `AI_WORKFLOW.md`.

## Scope and next steps

The product prioritizes a complete editing, import, sharing, and persistence flow. Sharing controls access; editing is not real-time collaboration. Optimistic version checks prevent silently overwriting changes made in another tab or session. A conflict preserves local edits and offers a reload or a separate copy. There is no automatic content merge, presence, comments, version history, real authentication, or DOCX/PDF conversion.

The public demo caps the workspace at 1,000 documents and accepts saved HTML up to 7 MiB per request. These are basic bounds for the demonstration, not a claim of production-scale capacity.

With another 2–4 hours, the first priorities would be real sign-in and isolated demo workspaces, improved conflict recovery, and expanded browser/accessibility coverage. Sustained multi-user use would also warrant transactional database storage and a deliberate collaboration model.

See [ARCHITECTURE.md](ARCHITECTURE.md), [AI_WORKFLOW.md](AI_WORKFLOW.md), and [SUBMISSION.md](SUBMISSION.md) for design decisions, AI usage, and delivery status. [WALKTHROUGH.md](WALKTHROUGH.md) is a recording script; it is not a recorded video.
