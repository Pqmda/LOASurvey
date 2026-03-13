// ==================== DASHBOARD RENDERING ====================
import { state } from '../state/appState.js';
import { updateUserInfo } from '../auth/authentication.js';
import { navigateWithCurtain } from '../animations/curtain.js';
import { showAdminView } from './adminView.js';
import { showManagerView } from './managerView.js';
import { showISOView } from './isoView.js';
import { showPFMOView } from './qrView.js';
import { showGuestView } from './guestView.js';

export function renderDashboard() {
  updateUserInfo(state.currentUser, state.userRole);
  if (state.currentUser && !state.userRole) {
    return;
  }
  const path = window.location.pathname.toLowerCase();
  const isMain = path.endsWith('/main.html') || path.endsWith('\\main.html');
  const isAdminPage = path.endsWith('/admin.html');
  const isISOPage = path.endsWith('/iso.html');
  const isManagerPage = path.endsWith('/manager.html');
  const isPFMOPage = path.endsWith('/pfmo.html') || path.endsWith('\\pfmo.html');
  const isGuest = sessionStorage.getItem('guest') === 'true';
  
  if (isGuest && isMain && !state.currentUser) {
    showGuestView();
    return;
  }
  
  switch (state.userRole) {
    case 'admin':
      if (!isAdminPage) {
        navigateWithCurtain('/admin.html');
        return;
      }
      showAdminView();
      break;
    case 'iso_secretary':
      if (!isISOPage) {
        navigateWithCurtain('/iso.html');
        return;
      }
      showISOView();
      break;
    case 'manager':
      if (!isManagerPage) {
        navigateWithCurtain('/manager.html');
        return;
      }
      showManagerView();
      break;
    case 'qmr':
      if (!isPFMOPage) {
        navigateWithCurtain('/pfmo.html');
        return;
      }
      showPFMOView();
      break;
    case 'pfmo':
      if (!isPFMOPage) {
        navigateWithCurtain('/pfmo.html');
        return;
      }
      showPFMOView();
      break;
    case 'respondent':
    case 'student':
    case 'parent':
    default:
      if (!isMain) {
        navigateWithCurtain('/main.html');
        return;
      }
      showGuestView();
  }
}
