(() => {
  'use strict';

  // Fictional demo only: keep authentication separate from the UI so future
  // assignment features can be added without changing form rendering.
  const DEMO_ACCOUNT = Object.freeze({ email: 'demo@example.com', password: 'password123' });
  const form = document.querySelector('#login-form');
  const email = document.querySelector('#email');
  const password = document.querySelector('#password');
  const visibilityButton = document.querySelector('#show-password');
  const message = document.querySelector('#form-message');
  const success = document.querySelector('#success');
  const acceptButton = document.querySelector('#accept-login');
  const acceptLabel = acceptButton.innerHTML;
  // Published Code Jam demos are embedded without redistributing their source.
  // See README.md for authors, source snapshots, and hosting dependencies.
  const challenges = {
    easy: {
      name: 'Crow Lifting Weights',
      author: 'CourageousMayonnaise',
      description: 'Click inside the challenge, then type LIFT in order. On a touchscreen, tap the four letters. One wrong letter starts the lift over.',
      url: 'https://courageousmayonnaise.github.io/codejam25-crow-lifting-weights/captcha/captcha.html',
      source: 'https://github.com/CourageousMayonnaise/codejam25-crow-lifting-weights',
      width: 400,
    },
    medium: {
      name: 'Shell Game',
      author: 'aPatchyy',
      description: 'Track the coin through all three rounds. Each round says “Success”; the final round says “Verified”. Accept will wait for the game’s confirmation.',
      url: 'https://apatchyy.github.io/ShellGameCaptcha/captcha/captcha.html',
      source: 'https://github.com/aPatchyy/ShellGameCaptcha',
      width: 390,
    },
    hard: {
      name: 'Cooking CAPTCHA',
      author: 'Wes Bos',
      description: 'Drag six foods onto the grill and remove each at exactly the right time. Burn dinner and you get to try again. Sound may play.',
      url: 'https://wesbos.github.io/Kitboga-captcha/captcha/captcha.html',
      source: 'https://github.com/wesbos/Kitboga-captcha',
      width: 390,
    },
  };
  const requestedDifficulty = new URLSearchParams(window.location.search).get('difficulty');
  const difficulty = Object.hasOwn(challenges, requestedDifficulty) ? requestedDifficulty : 'easy';
  const challenge = challenges[difficulty];
  const captchaStage = document.querySelector('#captcha-stage');
  const captchaViewport = document.querySelector('#captcha-viewport');
  const captchaStatus = document.querySelector('#captcha-status');
  const captchaHelp = document.querySelector('#captcha-help');
  const frameTemplate = document.querySelector('#captcha-frame').cloneNode(false);
  let captchaFrame = null;
  let captchaVerified = false;
  let loginPending = false;
  let helpTimer;

  document.querySelector('#difficulty-label').textContent = `${difficulty} / Human verification`;
  document.querySelector('#captcha-title').textContent = challenge.name;
  document.querySelector('#captcha-description').textContent = challenge.description;
  const sourceLink = document.querySelector('#captcha-source');
  sourceLink.href = challenge.source;
  sourceLink.textContent = `By ${challenge.author} ↗`;
  sourceLink.setAttribute('aria-label', `${challenge.name} source by ${challenge.author} (opens in a new tab)`);
  captchaViewport.style.width = `${challenge.width}px`;
  captchaStage.style.maxWidth = `${challenge.width}px`;

  function resizeChallenge() {
    if (captchaStage.hidden || form.hidden) return;
    const scale = Math.min(1, captchaStage.clientWidth / challenge.width);
    captchaViewport.style.transform = `scale(${scale})`;
    captchaStage.style.height = `${300 * scale}px`;
  }

  function stopChallenge() {
    window.clearTimeout(helpTimer);
    captchaFrame?.remove();
    captchaFrame = null;
  }

  function setLoginPending(pending) {
    loginPending = pending;
    acceptButton.disabled = pending;
    if (pending) acceptButton.textContent = 'Waiting for CAPTCHA…';
    else acceptButton.innerHTML = acceptLabel;
  }

  function resetChallenge() {
    stopChallenge();
    setLoginPending(false);
    captchaVerified = false;
    captchaStage.hidden = false;
    captchaHelp.hidden = true;
    captchaStatus.textContent = 'Loading your challenge…';
    // A new browsing context also invalidates completion messages from old games.
    const frame = frameTemplate.cloneNode(false);
    captchaFrame = frame;
    frame.style.width = `${challenge.width}px`;
    frame.title = `${difficulty} CAPTCHA: ${challenge.name}`;
    frame.addEventListener('load', () => {
      if (frame !== captchaFrame || loginPending) return;
      captchaStatus.textContent = 'Complete the challenge below to unlock sign in.';
    });
    frame.addEventListener('error', () => {
      if (frame !== captchaFrame) return;
      captchaStatus.textContent = 'Challenge unavailable. Check your connection and restart it.';
      captchaHelp.hidden = false;
    });
    frame.src = challenge.url;
    captchaViewport.replaceChildren(frame);
    resizeChallenge();
    // Browsers do not reliably report cross-origin iframe loading failures.
    // Offer recovery even if an error page has triggered the load event.
    helpTimer = window.setTimeout(() => { captchaHelp.hidden = false; }, 12000);
  }

  window.addEventListener('message', event => {
    // allow-scripts (without allow-same-origin) gives the demo an opaque origin.
    // Never trust an unrelated frame, a prior attempt, or a generic message object.
    if (!captchaFrame || form.hidden || event.source !== captchaFrame.contentWindow ||
        event.origin !== 'null' || event.data !== 'success') return;
    const shouldSignIn = loginPending;
    setLoginPending(false);
    captchaVerified = true;
    stopChallenge();
    captchaStage.hidden = true;
    captchaHelp.hidden = true;
    captchaStatus.textContent = 'Human enough. You may now Accept.';
    if (shouldSignIn) form.requestSubmit();
    else acceptButton.focus();
  });

  document.querySelector('#reload-captcha').addEventListener('click', resetChallenge);
  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeChallenge).observe(captchaStage);
  } else {
    window.addEventListener('resize', resizeChallenge);
  }
  resetChallenge();

  function rejectAttempt(reason) {
    form.reset();
    hidePassword();
    resetChallenge();
    message.textContent = `${reason} Both fields were cleared and the CAPTCHA was reset. Start again.`;
    email.focus();
  }

  document.querySelector('#cancel-login').addEventListener('click', () => {
    form.reset();
    stopChallenge();
    window.location.href = './';
  });

  function setError(input, text) {
    input.setAttribute('aria-invalid', String(Boolean(text)));
    document.querySelector(`#${input.id}-error`).textContent = text;
  }

  function validate() {
    const emailError = !email.value.trim() ? 'Enter your email address.' : !email.validity.valid ? 'Enter a valid email address.' : '';
    const passwordError = !password.value ? 'Enter your password.' : '';
    setError(email, emailError);
    setError(password, passwordError);
    if (emailError || passwordError) {
      (emailError ? email : password).focus();
      return false;
    }
    return true;
  }

  function authenticate(address, secret) {
    return address.trim().toLowerCase() === DEMO_ACCOUNT.email && secret === DEMO_ACCOUNT.password;
  }

  function hidePassword() {
    password.type = 'password';
    visibilityButton.textContent = 'Show';
    visibilityButton.setAttribute('aria-label', 'Show password');
    visibilityButton.setAttribute('aria-pressed', 'false');
  }

  visibilityButton.addEventListener('click', () => {
    if (password.type === 'text') return hidePassword();
    password.type = 'text';
    visibilityButton.textContent = 'Hide';
    visibilityButton.setAttribute('aria-label', 'Hide password');
    visibilityButton.setAttribute('aria-pressed', 'true');
  });

  [email, password].forEach(input => input.addEventListener('input', () => {
    if (loginPending) {
      setLoginPending(false);
      captchaStatus.textContent = 'Complete the challenge below to unlock sign in.';
    }
    setError(input, '');
    message.textContent = '';
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    message.textContent = '';
    if (!validate()) {
      rejectAttempt('Check the input errors above.');
      return;
    }
    if (!authenticate(email.value, password.value)) {
      rejectAttempt('Email or password is incorrect.');
      return;
    }
    if (!captchaVerified) {
      // Some games display their win before sending the completion message.
      // Preserve that frame and its callback; continue this submit when it arrives.
      setLoginPending(true);
      captchaStatus.textContent = 'Waiting for the game to confirm completion. Finish every round; sign in will continue automatically.';
      return;
    }
    form.reset();
    hidePassword();
    form.hidden = true;
    success.hidden = false;
    document.querySelector('#sign-out').focus();
  });

  document.querySelector('#sign-out').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    message.textContent = '';
    resetChallenge();
    email.focus();
  });

  // Back/Forward can restore the exact DOM after Cancel has removed its frame.
  // Treat a restored page as a fresh login, including any prior verification.
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    form.reset();
    hidePassword();
    setError(email, '');
    setError(password, '');
    message.textContent = '';
    success.hidden = true;
    form.hidden = false;
    resetChallenge();
  });
})();
