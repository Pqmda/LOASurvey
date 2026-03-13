// ==================== PAGE TRANSITIONS & ANIMATIONS ====================
import { animateTransition } from './curtain.js';
import { playCurtainOut } from './curtain.js';

export function setupLinkTransitions() {
  if (sessionStorage.getItem('redirected_to_login') === 'true') {
    sessionStorage.removeItem('redirected_to_login');
    playCurtainOut();
  }

  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href === window.location.pathname) return;
      event.preventDefault();
      animateTransition().then(() => {
        window.location.href = href;
      });
    });
  });
}

export function setupAnimations() {
  // Animate logo on page load
  gsap.from('.logo', {
    duration: 0.8,
    opacity: 0,
    x: -30,
    ease: 'power2.out'
  });

  // Animate sidebar on page load
  gsap.from('.sidebar', {
    duration: 0.8,
    opacity: 0,
    x: -100,
    ease: 'power2.out',
    delay: 0.7
  });

  // Animate content on page load
  gsap.from('.content', {
    duration: 0.8,
    opacity: 0,
    y: 50,
    ease: 'power2.out',
    delay: 0.7
  });
}

export function animateGrid() {
  gsap.from('.survey-card', {
    duration: 0.5,
    opacity: 0,
    y: 20,
    stagger: {
      amount: 0.3,
      from: 'start'
    },
    ease: 'power2.out'
  });

  // Add hover animations to cards
  document.querySelectorAll('.survey-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        duration: 0.3,
        scale: 1.02,
        ease: 'power2.out'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        duration: 0.3,
        scale: 1,
        ease: 'power2.out'
      });
    });
  });
}

export function animateApprovals() {
  gsap.from('.approval-item', {
    duration: 0.5,
    opacity: 0,
    x: -20,
    stagger: {
      amount: 0.2,
      from: 'start'
    },
    ease: 'power2.out'
  });
}
