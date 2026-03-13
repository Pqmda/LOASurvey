// ==================== NOTIFICATIONS ====================

export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    z-index: 2000;
    animation: slideInRight 0.3s ease;
  `;

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.2)', text: '#86efac', border: '1px solid rgba(16, 185, 129, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' },
    info: { bg: 'rgba(99, 102, 241, 0.2)', text: '#a78bfa', border: '1px solid rgba(99, 102, 241, 0.3)' }
  };

  const color = colors[type] || colors.info;
  notification.style.background = color.bg;
  notification.style.color = color.text;
  notification.style.border = color.border;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    gsap.to(notification, {
      duration: 0.3,
      opacity: 0,
      x: 20,
      ease: 'power2.in',
      onComplete: () => notification.remove()
    });
  }, 3000);
}
