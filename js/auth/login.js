document.addEventListener('DOMContentLoaded', () => {
  
  const firebaseConfig = {
    apiKey: "AIzaSyBEYA5OHcc5zIWiJMHBwFQSIT3j9VrilaI",
    authDomain: "school-survey-system.firebaseapp.com",
    projectId: "school-survey-system",
    storageBucket: "school-survey-system.firebasestorage.app",
    messagingSenderId: "99847713017",
    appId: "1:99847713017:web:556670dde6d4246387f228",
    measurementId: "G-0CTS1WN8F9"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const guestBtn = document.getElementById('guest-btn');
  const authMsg = document.getElementById('auth-message');
  const preloader = document.querySelector('.preloader');
  const authContainer = document.querySelector('.auth-container');
  const preloaderCounter = document.querySelector('.preloader-counter');
  const authTabs = document.querySelector('.auth-tabs');
  const authSelects = document.querySelectorAll('.auth-form select');
  let tabsUnderline = null;

  function ensureCurtain() {
    const overlay = document.querySelector('.page-transition');
    return overlay || null;
  }

  function playCurtainIn(onComplete) {
    const overlay = ensureCurtain();
    if (!overlay || !window.gsap) { if (onComplete) onComplete(); return; }
    overlay.classList.add('active');
    const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
    const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
    gsap.set(topBlocks, { y: '-100%' });
    gsap.set(bottomBlocks, { y: '100%' });
    gsap.timeline({ onComplete })
      .to(topBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
      .to(bottomBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
  }

  function playCurtainOut() {
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
    })
    .to(topBlocks, { y: '-100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
    .to(bottomBlocks, { y: '100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
  }

  function animateTransition() {
    return new Promise((resolve) => {
      const overlay = ensureCurtain();
      if (!overlay || !window.gsap) { resolve(); return; }
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

  function navigateWithCurtain(url) {
    animateTransition().then(() => {
      window.location.href = resolveAppUrl(url);
    });
  }

  if (sessionStorage.getItem('redirected_to_login') === 'true') {
    sessionStorage.removeItem('redirected_to_login');
    sessionStorage.setItem('preloader_seen', 'true');
    if (authContainer) {
      authContainer.style.opacity = 1;
      authContainer.style.transform = 'translateY(0)';
    }
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

// Animate Entrance 
  ScrollTrigger.create({
    trigger: '.auth-container',
    start: 'top bottom',
    once: true,
    onEnter: () => gsap.from('.auth-container', {
      opacity: 0,
      y: 80,
      duration: 1,
      ease: 'power4.inOut'
    })
  });


  function animateAuthForm(form) {
    if (!window.gsap || !form) return;
    const heading = form.querySelector('h2');
    if (heading && !heading.dataset.split) {
      const text = heading.textContent;
      const frag = document.createDocumentFragment();
      heading.textContent = '';
      text.split('').forEach((ch) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.display = 'inline-block';
        frag.appendChild(span);
      });
      heading.appendChild(frag);
      heading.dataset.split = 'true';
    }
    const chars = heading ? heading.querySelectorAll('span') : [];
    const fields = form.querySelectorAll('input, select, button[type="submit"]');
    const ddTrigger = form.querySelector('.role-dropdown .dropdown-trigger');
    const allTargets = Array.from(fields);
    if (ddTrigger) allTargets.push(ddTrigger);
    if (chars.length) {
      gsap.fromTo(chars, { y: 10, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.03,
        ease: 'power4.inout'
      });
    }
    if (allTargets.length) {
      gsap.fromTo(allTargets, { y: 10, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.35,
        stagger: 0.05,
        ease: 'power4.inout',
      });
    }
    if (ddTrigger) {
      const caret = ddTrigger.querySelector('.dropdown-caret');
      if (caret) {
        gsap.fromTo(caret, { rotate: -12, opacity: 0 }, {
          rotate: 0,
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out',
          delay: 0.12
        });
      }
    }
  }

  if (window.gsap && !sessionStorage.getItem('redirected_to_login') && !sessionStorage.getItem('preloader_seen')) {
    const overlay = ensureCurtain();
    if (overlay && preloaderCounter) {
      overlay.classList.add('active');
      const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
      const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
      gsap.set(topBlocks, { y: '0%' });
      gsap.set(bottomBlocks, { y: '0%' });
      const counterState = { value: 0 };
      preloaderCounter.textContent = '0%';
      gsap.to(preloaderCounter, { opacity: 1, duration: 1, ease: 'power2.inout' });
      gsap.to(counterState, {
        value: 100,
        duration: 2,
        ease: 'none',
        onUpdate: () => {
          preloaderCounter.textContent = `${Math.round(counterState.value)}%`;
        },
        onComplete: () => {
          try { sessionStorage.setItem('preloader_seen', 'true'); } catch (e) {}
          gsap.to(preloaderCounter, { opacity: 0, duration: 1, ease: 'power2.inout' });
          gsap.delayedCall(2, () => {
            playCurtainOut();
          });
          if (authContainer) {
            authContainer.style.opacity = 1;
            authContainer.style.transform = 'translateY(0)';
          }
        }
      });
    }
  } else {
    if (authContainer) {
      authContainer.style.opacity = 1;
      authContainer.style.transform = 'translateY(0)';
    }
  }

  if (authTabs && window.gsap) {
    tabsUnderline = document.createElement('div');
    tabsUnderline.className = 'auth-tabs-underline';
    authTabs.appendChild(tabsUnderline);
    gsap.set(tabsUnderline, { xPercent: 0 });
  }

  if (window.gsap && authSelects.length) {
    authSelects.forEach((selectEl) => {
      selectEl.addEventListener('focus', () => {
        gsap.to(selectEl, {
          duration: 0.18,
          scale: 1.02,
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
          ease: 'power2.out'
        });
      });
      selectEl.addEventListener('blur', () => {
        gsap.to(selectEl, {
          duration: 0.18,
          scale: 1,
          boxShadow: '0 0 0 rgba(0,0,0,0)',
          ease: 'power2.inOut'
        });
      });
    });
  }

  const resizeAuthContainer = (updateLayout) => {
    if (!authContainer) {
      updateLayout();
      return;
    }
    const startHeight = authContainer.getBoundingClientRect().height;
    authContainer.style.height = `${startHeight}px`;
    authContainer.style.overflow = 'hidden';
    updateLayout();
    authContainer.style.height = 'auto';
    const endHeight = authContainer.getBoundingClientRect().height;
    authContainer.style.height = `${startHeight}px`;
    if (!window.gsap) {
      authContainer.style.transition = 'height 0.35s ease';
      requestAnimationFrame(() => {
        authContainer.style.height = `${endHeight}px`;
        setTimeout(() => {
          authContainer.style.transition = '';
          authContainer.style.height = '';
          authContainer.style.overflow = '';
        }, 360);
      });
      return;
    }
    gsap.to(authContainer, {
      height: endHeight,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        authContainer.style.height = '';
        authContainer.style.overflow = '';
      }
    });
  };

  tabLogin.addEventListener('click', () => {
    if (tabLogin.classList.contains('active')) return;
    resizeAuthContainer(() => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
    if (tabsUnderline && window.gsap) {
      gsap.to(tabsUnderline, {
        xPercent: 0,
        duration: 0.3,
        ease: 'power3.out'
      });
    }
    animateAuthForm(loginForm);
  });

  tabRegister.addEventListener('click', () => {
    if (tabRegister.classList.contains('active')) return;
    resizeAuthContainer(() => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    });
    if (tabsUnderline && window.gsap) {
      gsap.to(tabsUnderline, {
        xPercent: 130,
        duration: 0.3,
        ease: 'power3.out'
      });
    }
    animateAuthForm(registerForm);
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMsg.textContent = 'Signing in...';
    authMsg.className = '';
    try {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) {
        await auth.signOut();
        authMsg.textContent = 'Account removed. Contact admin.';
        authMsg.className = '';
        return;
      }
      const roleRaw = doc.data().role || 'respondent';
      let role = String(roleRaw).trim().toLowerCase();
      if (role.includes('admin')) role = 'admin';
      else if (role.includes('qmr')) role = 'qmr';
      else if (role.includes('iso')) role = 'iso_secretary';
      else if (role.includes('manager')) role = 'manager';
      else if (role.includes('pfmo') || role.includes('qr')) role = 'pfmo';
      else if (role.includes('student')) role = 'student';
      else if (role.includes('parent')) role = 'parent';
      else if (role.includes('respondent')) role = 'respondent';
      else role = 'respondent';
      const dept = doc.exists ? (doc.data().department || null) : null;
      const effectiveRole = role === 'respondent' && dept ? 'manager' : role;
      sessionStorage.removeItem('guest');
      let dest = '/main.html';
      if (effectiveRole === 'admin') dest = '/admin.html';
      else if (effectiveRole === 'iso_secretary') dest = '/iso.html';
      else if (effectiveRole === 'qmr') dest = '/pfmo.html';
      else if (effectiveRole === 'manager') dest = '/manager.html';
      else if (effectiveRole === 'pfmo') dest = '/pfmo.html';
      authMsg.textContent = 'Welcome! Redirecting...';
      authMsg.className = 'success';
      sessionStorage.setItem('redirected_from_login', 'true');
      setTimeout(() => navigateWithCurtain(dest), 800);
    } catch (err) {
      authMsg.textContent = err.message;
    }
  });

  const studentIdInput = document.getElementById('register-student-id');
  const updateStudentIdVisibility = () => {
    const roleDropdown = document.getElementById('registerRoleDropdown');
    const roleValue = roleDropdown ? (roleDropdown.dataset.value || 'student') : 'student';
    if (!studentIdInput) return;
    if (roleValue === 'student') {
      studentIdInput.classList.remove('hidden');
      studentIdInput.setAttribute('required', 'true');
    } else {
      studentIdInput.classList.add('hidden');
      studentIdInput.removeAttribute('required');
      studentIdInput.value = '';
    }
  };

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMsg.textContent = 'Creating account...';
    authMsg.className = '';
    try {
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const roleDropdown = document.getElementById('registerRoleDropdown');
      const roleValue = roleDropdown ? (roleDropdown.dataset.value || 'student') : 'student';
      const studentId = studentIdInput ? studentIdInput.value.trim() : '';
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      if (roleValue === 'student' && !studentId) throw new Error('Student ID is required for student registration');
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.updateProfile({ displayName: name });
      await db.collection('users').doc(userCredential.user.uid).set({
        name,
        email,
        role: roleValue,
        studentId: roleValue === 'student' ? studentId : null,
        department: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      authMsg.textContent = 'Account created! Redirecting...';
      authMsg.className = 'success';
      sessionStorage.setItem('redirected_from_login', 'true');
      setTimeout(() => navigateWithCurtain('/main.html'), 800);
    } catch (err) {
      authMsg.textContent = err.message;
    }
  });

  guestBtn.addEventListener('click', () => {
    sessionStorage.setItem('guest', 'true');
    sessionStorage.setItem('redirected_from_login', 'true');
    authMsg.textContent = 'Continuing as guest...';
    authMsg.className = 'success';
    setTimeout(() => navigateWithCurtain('/main.html'), 600);
  });

  (function initRoleDropdown() {
    const dd = document.getElementById('registerRoleDropdown');
    if (!dd) return;
    const trigger = dd.querySelector('.dropdown-trigger');
    const menu = dd.querySelector('.dropdown-menu');
    const label = dd.querySelector('.dropdown-label');
    let open = false;
    const showMenu = () => {
      if (open) return;
      open = true;
      trigger.setAttribute('aria-expanded', 'true');
      menu.classList.remove('hidden');
      if (window.gsap) {
        const items = menu.querySelectorAll('.dropdown-item');
        gsap.fromTo(menu, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' });
        gsap.fromTo(items, { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, stagger: 0.04, ease: 'power2.out' });
      }
    };
    const hideMenu = () => {
      if (!open) return;
      open = false;
      if (window.gsap) {
        gsap.to(menu, {
          y: -6, opacity: 0, duration: 0.15, ease: 'power2.inOut',
          onComplete: () => {
            menu.classList.add('hidden');
            trigger.setAttribute('aria-expanded', 'false');
          }
        });
      } else {
        menu.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
      }
    };
    trigger.addEventListener('click', () => open ? hideMenu() : showMenu());
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) hideMenu(); });
    dd.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
    menu.querySelectorAll('.dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const val = item.dataset.value;
        dd.dataset.value = val;
        label.textContent = item.textContent;
        menu.querySelectorAll('.dropdown-item').forEach(i => i.setAttribute('aria-selected', i === item ? 'true' : 'false'));
        hideMenu();
        updateStudentIdVisibility();
      });
    });
  })();

  updateStudentIdVisibility();
});
