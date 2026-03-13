// ==================== AUTHENTICATION ====================
import { auth, db } from '../config/firebase.js';
import { state, computeEffectiveRole } from '../state/appState.js';
import { renderDashboard } from '../views/dashboard.js';
import { navigateWithCurtain } from '../animations/curtain.js';
import { playCurtainOut } from '../animations/curtain.js';
import { showNotification } from '../utils/notifications.js';

export function initializeAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          state.currentUser = user;
          state.userRole = computeEffectiveRole(userData);
          state.userDept = userData.department || null;
          
          // Render based on actual role
          renderDashboard();
          if (sessionStorage.getItem('redirected_from_login') === 'true') {
            sessionStorage.removeItem('redirected_from_login');
            // Use requestAnimationFrame to ensure DOM is painted before curtain opens
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                playCurtainOut();
              });
            });
          }
        } else if (user.isAnonymous) {
          state.currentUser = user;
          state.userRole = 'respondent';
          state.userDept = null;
          renderDashboard();
          if (sessionStorage.getItem('redirected_from_login') === 'true') {
            sessionStorage.removeItem('redirected_from_login');
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                playCurtainOut();
              });
            });
          }
        } else {
          await auth.signOut();
          state.currentUser = null;
          state.userRole = null;
          state.userDept = null;
          showNotification('Account removed. Contact admin.', 'error');
          navigateWithCurtain('/index.html');
          return;
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        state.userRole = 'respondent';
        renderDashboard();
        if (sessionStorage.getItem('redirected_from_login') === 'true') {
          sessionStorage.removeItem('redirected_from_login');
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              playCurtainOut();
            });
          });
        }
      }
    } else {
      const isGuest = sessionStorage.getItem('guest') === 'true';
      const path = window.location.pathname.toLowerCase();
      const isMain = path.endsWith('/main.html') || path.endsWith('\\main.html');
      if (isGuest && isMain) {
        try {
          await auth.signInAnonymously();
        } catch (err) {
          console.error('Anonymous sign-in error:', err);
          showNotification('Unable to connect as guest. Check Firebase auth settings.', 'error');
          state.currentUser = null;
          state.userRole = 'respondent';
          renderDashboard();
          if (sessionStorage.getItem('redirected_from_login') === 'true') {
            sessionStorage.removeItem('redirected_from_login');
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                playCurtainOut();
              });
            });
          }
        }
      } else {
        navigateWithCurtain('/index.html');
      }
    }
  });
}

export function updateUserInfo(user, role) {
  const userInfoEl = document.getElementById('userInfo');
  const roleDisplayEl = document.getElementById('roleDisplay');

  if (user) {
    userInfoEl.textContent = user.displayName || user.email;
    const roleNames = {
      'manager': 'Manager',
      'iso_secretary': 'ISO Secretary',
      'qmr': 'QMR',
      'admin': 'Administrator',
      'pfmo': 'PFMO',
      'respondent': 'Respondent',
      'student': 'Student',
      'parent': 'Parent'
    };
    roleDisplayEl.textContent = role ? (roleNames[role] || role) : 'Loading...';
  } else {
    userInfoEl.textContent = 'Respondent User';
    roleDisplayEl.textContent = 'Respondent';
  }
}
