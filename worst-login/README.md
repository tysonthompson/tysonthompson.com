# Worst Login

Visit `/worst-login/` and choose Easy, Medium, or Hard. For a local preview from the repository root:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/worst-login/`. Demo login: `demo@example.com` / `password123`.

This is a browser-only classroom prototype, not an authentication service. Credentials are checked only in this page and are never sent to the CAPTCHA frames or saved. The externally hosted challenges need an internet connection; opening the HTML directly also requires that connection.

## Difficulties and credits

| Mode | Challenge | Author | How to complete it |
| --- | --- | --- | --- |
| Easy | [Crow Lifting Weights](https://github.com/CourageousMayonnaise/codejam25-crow-lifting-weights) | CourageousMayonnaise | Click inside and type LIFT, or tap the letters on a touchscreen. A wrong letter resets the lift. |
| Medium | [Shell Game](https://github.com/aPatchyy/ShellGameCaptcha) | aPatchyy | Track the coin through three rounds of shuffling wallets. |
| Hard | [Cooking CAPTCHA](https://github.com/wesbos/Kitboga-captcha) | Wes Bos | Drag six foods onto/off the grill within their cooking-time tolerances. Includes sound. |

These come from [Kitboga's 2025 CAPTCHA Code Jam](https://github.com/The-Kitboga-Show/codejam25). Crow Lifting Weights is an official example linked by the competition; Shell Game and Cooking CAPTCHA are community submissions. These labels do not imply they were finalists or winners.

The repositories publish their code but do not include a general redistribution license. Their competition terms grant rights specifically to The Kitboga Show. This project therefore embeds the authors' public demos and links their source, rather than copying their code or assets.

Reviewed source snapshots on October 20, 2026:

- [Crow: 6f0480f](https://github.com/CourageousMayonnaise/codejam25-crow-lifting-weights/tree/6f0480f539dec6af324207aacc06277d1503f41b/captcha)
- [Shell Game: 66bff49](https://github.com/aPatchyy/ShellGameCaptcha/tree/66bff49d15faf03498f13a70c0561c028fd55579/captcha)
- [Cooking: 6fb3e11](https://github.com/wesbos/Kitboga-captcha/tree/6fb3e112826ef00a2050ffe25e3fd17ad3dcd34f/captcha)

The live demos are not pinned and can change or become unavailable. Their URLs are in `script.js`. GitHub Pages serves the games and their assets; some games also load fonts. If a challenge fails to load, the page offers a restart hint and keeps sign-in blocked.

## Login behavior

- Missing or unrecognized `difficulty` values use Easy.
- The difficulty menu shows only the mode names. The initial sign-in form displays the demo credentials without revealing the upcoming challenge.
- Correct demo credentials **and** completion of the current CAPTCHA are required.
- Accept with correct credentials opens a modal dialog and loads the selected challenge. No game iframe or external challenge request is created before that point. The modal keeps the underlying form inactive and contains keyboard focus.
- Completing the current challenge signs in automatically. This waits for the game's completion message, including Medium's three-second delay after its final “Verified” banner.
- Green **Cancel** returns to difficulty selection; red **Accept** submits.
- Invalid or incorrect credentials clear both fields and hide the password without opening or mentioning a challenge.
- **Back to sign in** or Escape closes the dialog, removes the game to stop audio/animations, and cancels the pending sign-in while preserving the entered credentials. Accept starts a fresh challenge.
- **Restart challenge** replaces the current game and continues waiting for completion with the same credentials. Editing credentials cancels a pending attempt.
- Successful verification removes the game frame. Returning from the success screen or restoring the page with Back/Forward resets to the empty credential form without loading a game.
- Copy, cut, paste, and drag/drop are blocked within the credential form, and the displayed demo values cannot be selected. Users must type the credentials; normal typing and editing remain available. These are intentional prototype interactions, not a security boundary.

Each challenge uses a sandboxed `allow-scripts` iframe with no same-origin privilege and no referrer. A completion is accepted only for the exact string `success` from the current frame's window with its expected opaque origin. No credentials are passed to a frame. The native 400×300 (Easy) or 390×300 (Medium/Hard) stage scales down to fit narrow screens.

Files: `index.html` (difficulty selection), `login.html` (form and challenge shell), `styles.css` (isolated styling), `script.js` (configuration, challenge lifecycle, and demo login).
