# Worst Login — base prototype

Open `index.html` directly or visit `/worst-login/` when deployed with the portfolio.

Demo login: `demo@example.com` / `password123`.

This is a browser-only classroom prototype. No authentication service, requests, credential storage, or password-reset flow is included. Validation, password visibility, demo success, and returning to the form work locally.

Files: `index.html` (structure), `styles.css` (isolated styling), `script.js` (validation, demo authentication, UI events). `authenticate` is the seam for future login-flow changes. Future difficulty settings and challenge features can be introduced separately; none are enabled or implemented yet.

The entry page (`index.html`) offers Easy, Medium, and Hard. All link to the same `login.html`, with a `difficulty` query parameter reserved for future behavior. No difficulty-specific challenges are implemented. The Ordinary logo returns to the difficulty selection.
