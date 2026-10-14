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

  function rejectAttempt(reason) {
    form.reset();
    hidePassword();
    message.textContent = `${reason} Both fields were cleared. Start again.`;
    email.focus();
  }

  document.querySelector('#cancel-login').addEventListener('click', () => {
    form.reset();
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
    form.reset();
    hidePassword();
    form.hidden = true;
    success.hidden = false;
    document.querySelector('#sign-out').focus();
  });

  document.querySelector('#sign-out').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    email.focus();
  });
})();
