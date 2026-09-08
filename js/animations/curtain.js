// ==================== CURTAIN ANIMATIONS ====================

export function ensureCurtain() {
  const overlay = document.querySelector('.page-transition');
  return overlay || null;
}

export function playCurtainIn(onComplete) {
  const overlay = ensureCurtain();
  if (!overlay || !window.gsap) { 
    if (onComplete) onComplete(); 
    return; 
  }
  overlay.classList.add('active');
  const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
  const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
  gsap.set(topBlocks, { y: '-100%' });
  gsap.set(bottomBlocks, { y: '100%' });
  const tl = gsap.timeline({ onComplete });
  tl.to(topBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
    .to(bottomBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
}

export function playCurtainOut() {
  const overlay = ensureCurtain();
  if (!overlay || !window.gsap) return;
  overlay.classList.add('active');
  const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
  const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
  gsap.set(topBlocks, { y: '0%' });
  gsap.set(bottomBlocks, { y: '0%' });
  gsap.timeline({
    onComplete: () => {
      requestAnimationFrame(() => overlay.classList.remove('active'));
    }
  }).to(topBlocks, { y: '-100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
    .to(bottomBlocks, { y: '100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
}

export function animateTransition() {
  return new Promise((resolve) => {
    const overlay = ensureCurtain();
    if (!overlay || !window.gsap) { 
      resolve(); 
      return; 
    }
    playCurtainIn(resolve);
  });
}

function resolveAppUrl(url) {
  if (!url) return url;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//')) {
    return url;
  }
  if (url.startsWith('/')) {
    const currentPath = window.location.pathname || '/';
    const basePath = currentPath.replace(/\/[^/]*$/, '');
    return `${basePath}${url}`;
  }
  return url;
}

export function navigateWithCurtain(url) {
  animateTransition().then(() => {
    window.location.href = resolveAppUrl(url);
  });
}
