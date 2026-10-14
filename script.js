(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(links.classList.toggle('open')));
  });
  links.addEventListener('click', event => {
    if (event.target.closest('a')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section__title, .exp-card, .about__terminal, .project-card, .contact__text').forEach(element => {
      element.classList.add('animate');
      observer.observe(element);
    });
  }

  const canvas = document.querySelector('.hero__canvas');
  const context = canvas?.getContext('2d');
  if (!context) return;

  const motionToggle = document.querySelector('.hero__motion');
  let motionEnabled = !reducedMotion.matches;

  let width = 0;
  let height = 0;
  let particles = [];
  let frame = null;
  let lastTime = null;
  let inView = true;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: Math.min(80, Math.max(25, Math.round(width * height / 15000))) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 24,
      vy: (Math.random() - 0.5) * 24,
      radius: 1 + Math.random() * 1.5,
    }));
    draw(0);
  }

  function draw(delta) {
    context.clearRect(0, 0, width, height);
    particles.forEach(particle => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (particle.x < 0 || particle.x > width) {
        particle.x = Math.max(0, Math.min(width, particle.x));
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > height) {
        particle.y = Math.max(0, Math.min(height, particle.y));
        particle.vy *= -1;
      }
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = '#6d8ef7';
      context.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
        if (distance >= 140) continue;
        context.beginPath();
        context.moveTo(particles[i].x, particles[i].y);
        context.lineTo(particles[j].x, particles[j].y);
        context.strokeStyle = `rgba(109, 142, 247, ${0.35 * (1 - distance / 140)})`;
        context.stroke();
      }
    }
  }

  function animate(time) {
    draw(lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.05));
    lastTime = time;
    frame = window.requestAnimationFrame(animate);
  }

  function updateAnimation() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    if (motionToggle) {
      motionToggle.textContent = motionEnabled ? 'Pause background animation' : 'Play background animation';
      motionToggle.setAttribute('aria-pressed', String(motionEnabled));
    }
    if (motionEnabled && !document.hidden && inView) {
      frame = window.requestAnimationFrame(animate);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', updateAnimation);
  reducedMotion.addEventListener('change', () => {
    motionEnabled = !reducedMotion.matches;
    updateAnimation();
  });
  if (motionToggle) {
    motionToggle.hidden = false;
    motionToggle.addEventListener('click', () => {
      motionEnabled = !motionEnabled;
      updateAnimation();
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateAnimation();
    }).observe(canvas);
  }
  updateAnimation();
})();
