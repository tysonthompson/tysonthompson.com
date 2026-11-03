# AI workflow note

## Tools and division of work

OpenAI Codex implemented this application with parallel agents for the PHP backend and automated tests, the Tiptap interface, and reviewer documentation. The coordinating assistant handled integration and deployment work. The user supplied the assessment requirements and requested the public `/googledocs` route.

AI accelerated the first implementation, coordination across frontend and backend contracts, repetitive validation cases, and documentation. The scope deliberately uses the existing Apache/PHP host, seeded identities, a small file store, and plain-text import so the core workflow can be delivered without configuring additional services.

## Review and judgment

The generated code, tests, and prose still require review. The human user has not yet reported reviewing or changing the generated output. Assistant review and tool execution should not be presented as human intervention.

No human revisions or rejected AI suggestions are claimed. Assistant review found that switching demo accounts in one tab could leave another tab displaying the old identity while saving as the new identity. The accepted correction rotates the CSRF token on account switching, making stale-tab writes fail visibly instead of acting as the wrong displayed account. The coordinating assistant also added build/test gates to the existing deployment workflow and exclusions to preserve live storage across uploads.

Further assistant review fixed navigation and save-copy races, prevented sharing responses from attaching a newer version to stale editor content, corrected skip-link navigation, and increased interface text size and contrast. Import was changed from a code block to normal paragraphs so rich formatting works immediately; an escaped-content size edge case was also fixed and regression-tested.

The architecture retained Apache/cPanel and PHP instead of adding a new hosting service. The product scope excludes real-time merging, real authentication, and rich document conversion to keep the editing, persistence, and sharing paths coherent.

## Verification record

Completed checks:

- PHP 8.4.27 syntax checks passed for the API, storage, and document service.
- The backend suite passed 75 assertions covering permissions, private-document isolation, sharing/revocation, stale versions, hostile HTML and links, literal-text import and invalid input, persistence across service instances, transaction rollback, and temporary-file cleanup.
- Real local HTTP tests passed for CSRF enforcement, rich-text persistence, private-document isolation, viewer/editor restrictions, sharing and revocation, stale-version rejection, rename, literal-text import, invalid-file rejection, and owner-only deletion. Test-created documents were removed afterward.
- The HTTP regression for account switching passed: changing the selected account rotates the CSRF token, and a stale token is rejected.

Pending at this integration stage: frontend build/tests and public deployment verification.

Visual browser review could not be performed because the execution environment exposed no usable browser surface and its native automation helper was unavailable. DOM/editor and HTTP tests can validate behavior but do not replace visual or manual accessibility review.

A recording script is included, but no walkthrough video has been recorded or published by this workflow. No hiring-portal submission or Google Drive delivery is claimed.
