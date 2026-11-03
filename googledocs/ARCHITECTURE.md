# Architecture and scope

## Product slice

Folio implements a small document workspace: choose a demo identity, create or import a document, edit rich text, persist it, and share it with a teammate. The product uses the existing PHP hosting environment to keep setup and deployment small enough for the assessment timebox.

## Components

| Component | Responsibility |
| --- | --- |
| Browser application | Document list and filters, Tiptap editor, formatting toolbar, autosave status, import and sharing controls |
| Locally bundled assets | npm dependencies bundled with esbuild; no runtime CDN requirement |
| PHP JSON API | Session identity, request validation, authorization, HTML sanitization, document and sharing operations |
| JSON file store | Persistent demo users, document content, revisions, ownership, and access grants |
| Apache/cPanel | Serves `/googledocs/`, runs PHP, and protects runtime data with `.htaccess` rules |

## Data and authorization

A document has an owner, title, sanitized HTML content, modification information, and a version. Access grants associate another user with the editor or viewer role. The list response exposes only documents accessible to the current session user and distinguishes owned documents from shared documents.

Owners can edit and manage access. Editors can update content but cannot grant permissions. Viewers can read only. Authorization runs in the API for each operation; hiding controls in the interface is not the enforcement boundary.

Identity is intentionally mocked. A session stores a selected seeded user; any visitor can select any of the three users. Consequently, role enforcement demonstrates application behavior but does not establish real-world identity or privacy.

## Editing and persistence

Tiptap produces structured rich text in the browser. The API accepts a restricted HTML representation and sanitizes it on the server with a DOM-based allowlist before saving. Formatting survives refreshes without storing arbitrary executable HTML.

Autosave waits 650 ms after editing and permits one save request at a time. It sends the last known document version. A stale version produces a conflict rather than silently replacing newer server content. The interface retains local edits and offers reloading the latest version or saving a separate copy. Local draft recovery helps preserve unsaved changes after a failed save or closed tab. This is optimistic concurrency control, not character-level synchronization or automatic merging.

The file store holds an exclusive `flock` lock over every read/modify/write operation and uses atomic replacement for writes. Data lives in `storage/data.php`, containing a PHP exit guard followed by JSON. Temporary files carry the same guard. Runtime data is excluded from source control and FTP deployment and must survive application deployments. Apache access rules deny direct downloads. These protections depend on correct server configuration and are not a substitute for authenticated access.

For this small single-server demo, a JSON store removes database setup and makes the full workflow easy to run. It is not an appropriate design for horizontal scaling, large datasets, or high write throughput. A transactional database would be the next persistence step.

## Import boundary

Import accepts `.txt` and `.md` files no larger than 1 MB and creates a new document. File contents are treated as literal text, including Markdown syntax and HTML-looking strings. The server validates the import; the browser's file picker is only a convenience. Document conversion, binary files, embedded media, and arbitrary attachments are intentionally excluded.

## Verification and limitations

The backend suite passed 75 assertions, and local HTTP checks passed for the core document, sharing, import, and concurrency flows, including stale-tab CSRF rejection after account switching. Frontend checks and public deployment verification remain pending. The deployment workflow gates publishing on backend tests, frontend checks, and a successful production build. The README and AI workflow note record completed checks. Visual browser review is unavailable in the execution environment and remains uncompleted.

Deliberate omissions are real authentication, concurrent text merging, comments, presence, revision history, and DOCX/PDF conversion. The next work would secure identity, isolate each reviewer's demo data, improve conflict recovery, and expand browser and accessibility checks before broadening the editor feature set.
