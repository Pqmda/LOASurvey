// ==================== MAIN ENTRY POINT ====================
import { initializeAuthListener } from './auth/authentication.js';
import { setupAnimations, setupLinkTransitions } from './animations/transitions.js';
import { setupEventListeners } from './utils/eventHandlers.js';
import { ensureCurtain } from './animations/curtain.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeAuthListener();
  setupEventListeners();
  setupAnimations();
  setupLinkTransitions();
  
  if (sessionStorage.getItem('redirected_from_login') === 'true') {
    const overlay = ensureCurtain();
    if (overlay) overlay.classList.add('active');
    // Defer curtain reveal until role is resolved
  }
});
