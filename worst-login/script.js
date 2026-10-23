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
  const loginCard = document.querySelector('#login-card');
  const loginIntro = document.querySelector('#login-intro');
  const successHeading = document.querySelector('#success-heading');
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
      description: 'Track the coin through all three rounds. Each round says “Success”; the final round says “Verified”. Sign in will finish after the game confirms completion.',
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
  const captchaDialog = document.querySelector('#captcha-dialog');
  const captchaStage = document.querySelector('#captcha-stage');
  const captchaViewport = document.querySelector('#captcha-viewport');
  const captchaStatus = document.querySelector('#captcha-status');
  const captchaHelp = document.querySelector('#captcha-help');
  const frameTemplate = document.querySelector('#captcha-template').content.firstElementChild;
  let captchaFrame = null;
  let loginPending = false;
  let helpTimer;

  document.querySelector('#difficulty-label').textContent = `${difficulty} / Sign in`;
  document.querySelector('#completed-difficulty').textContent = `${difficulty} mode complete`;
  document.querySelector('#captcha-title').textContent = challenge.name;
  document.querySelector('#captcha-description').textContent = challenge.description;
  const sourceLink = document.querySelector('#captcha-source');
  sourceLink.href = challenge.source;
  sourceLink.textContent = `By ${challenge.author} ↗`;
  sourceLink.setAttribute('aria-label', `${challenge.name} source by ${challenge.author} (opens in a new tab)`);
  captchaViewport.style.width = `${challenge.width}px`;
  captchaStage.style.maxWidth = `${challenge.width}px`;

  function resizeChallenge() {
    if (!captchaDialog.open || !captchaFrame) return;
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
    if (pending) acceptButton.textContent = 'Verifying…';
    else acceptButton.innerHTML = acceptLabel;
  }

  function closeChallenge() {
    setLoginPending(false);
    stopChallenge();
    if (captchaDialog.open) captchaDialog.close();
  }

  function resetChallenge() {
    if (!captchaDialog.open || !loginPending) return;
    stopChallenge();
    captchaHelp.hidden = true;
    captchaStatus.textContent = 'Loading your challenge…';
    // A new browsing context also invalidates completion messages from old games.
    const frame = frameTemplate.cloneNode(false);
    captchaFrame = frame;
    frame.style.width = `${challenge.width}px`;
    frame.title = `${difficulty} CAPTCHA: ${challenge.name}`;
    frame.addEventListener('load', () => {
      if (frame !== captchaFrame) return;
      captchaStatus.textContent = 'Complete the challenge below. Sign in will finish automatically.';
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
    if (!captchaFrame || !captchaDialog.open || !loginPending || form.hidden || event.source !== captchaFrame.contentWindow ||
        event.origin !== 'null' || event.data !== 'success') return;
    // Recheck the accepted details before completing this pending sign-in.
    if (!authenticate(email.value, password.value)) {
      rejectAttempt('Email or password is incorrect. Enter the demo details shown above.');
      return;
    }
    closeChallenge();
    form.reset();
    hidePassword();
    form.hidden = true;
    loginIntro.hidden = true;
    success.hidden = false;
    loginCard.classList.add('login-card--success');
    loginCard.setAttribute('aria-labelledby', 'success-heading');
    successHeading.focus();
  });

  document.querySelector('#reload-captcha').addEventListener('click', resetChallenge);
  document.querySelector('#close-captcha').addEventListener('click', closeChallenge);
  captchaDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeChallenge();
  });
  captchaDialog.addEventListener('close', () => {
    // A queued close event from an earlier attempt must not stop a reopened one.
    if (!captchaDialog.open) closeChallenge();
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeChallenge).observe(captchaStage);
  } else {
    window.addEventListener('resize', resizeChallenge);
  }

  function rejectAttempt(reason) {
    closeChallenge();
    form.reset();
    hidePassword();
    message.textContent = `${reason} Both fields were cleared.`;
    email.focus();
  }

  document.querySelector('#cancel-login').addEventListener('click', () => {
    form.reset();
    closeChallenge();
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
    if (loginPending) closeChallenge();
    setError(input, '');
    message.textContent = '';
  }));

  // The demo details can be copied, but entering them requires typing.
  // Block paste from context menus and keyboard shortcuts, plus drag/drop.
  function rejectPaste(event) {
    event.preventDefault();
    message.textContent = 'Pasting is not allowed!';
  }

  form.addEventListener('paste', rejectPaste);
  ['cut', 'dragstart', 'drop'].forEach(type => {
    form.addEventListener(type, event => event.preventDefault());
  });
  form.addEventListener('beforeinput', event => {
    if (['insertFromPaste', 'insertFromPasteAsQuotation'].includes(event.inputType)) {
      rejectPaste(event);
    } else if (event.inputType === 'insertFromDrop') {
      event.preventDefault();
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    message.textContent = '';
    if (!validate()) {
      rejectAttempt('Check the input errors above.');
      return;
    }
    if (!authenticate(email.value, password.value)) {
      rejectAttempt('Email or password is incorrect. Enter the demo details shown above.');
      return;
    }
    if (loginPending) return;
    // Do not create or load any external game until the credentials are accepted.
    captchaDialog.showModal();
    setLoginPending(true);
    resetChallenge();
  });

  function resetLogin() {
    closeChallenge();
    form.reset();
    hidePassword();
    setError(email, '');
    setError(password, '');
    success.hidden = true;
    form.hidden = false;
    loginIntro.hidden = false;
    loginCard.classList.remove('login-card--success');
    loginCard.setAttribute('aria-labelledby', 'heading');
    message.textContent = '';
    email.focus();
  }

  document.querySelector('#sign-out').addEventListener('click', resetLogin);
  window.addEventListener('pagehide', closeChallenge);

  // Back/Forward returns to the credential step without loading a challenge.
  window.addEventListener('pageshow', event => {
    if (event.persisted) resetLogin();
  });
})();
