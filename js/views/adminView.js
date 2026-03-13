// ==================== ADMIN VIEW ====================
import { state } from '../state/appState.js';
import { subscribeUsers } from '../services/users.js';

export function showAdminView() {
  state.userRole = 'admin';
  const respondentView = document.getElementById('respondentView');
  if (respondentView) respondentView.classList.add('hidden');
  const managerView = document.getElementById('managerView');
  if (managerView) managerView.classList.add('hidden');
  const isoView = document.getElementById('isoView');
  if (isoView) isoView.classList.add('hidden');
  const adminView = document.getElementById('adminView');
  if (adminView) adminView.classList.remove('hidden');
  const managerSection = document.getElementById('managerSection');
  if (managerSection) managerSection.classList.add('hidden');
  const isoSection = document.getElementById('isoSection');
  if (isoSection) isoSection.classList.add('hidden');
  const adminSection = document.getElementById('adminSection');
  if (adminSection) adminSection.classList.remove('hidden');
  
  subscribeUsers();
  
  if (window.gsap) {
    gsap.from('.view-header h1', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out', delay: 0.4});
    gsap.from('.users-toolbar', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out', delay: 0.4 });
    gsap.from('.users-list', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out', delay: 0.4 });
  }
}
