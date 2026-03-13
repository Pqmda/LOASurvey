// ==================== ISO SECRETARY VIEW ====================
import { state } from '../state/appState.js';
import { animateApprovals } from '../animations/transitions.js';
import { subscribeApprovals, renderApprovals } from '../services/approvals.js';

export function showISOView() {
  state.userRole = 'iso_secretary';
  const respondentView = document.getElementById('respondentView');
  if (respondentView) respondentView.classList.add('hidden');
  const managerView = document.getElementById('managerView');
  if (managerView) managerView.classList.add('hidden');
  const isoView = document.getElementById('isoView');
  if (isoView) isoView.classList.remove('hidden');
  const managerSection = document.getElementById('managerSection');
  if (managerSection) managerSection.classList.add('hidden');
  const isoSection = document.getElementById('isoSection');
  if (isoSection) isoSection.classList.remove('hidden');
  const adminSection = document.getElementById('adminSection');
  if (adminSection) adminSection.classList.add('hidden');

  subscribeApprovals();
  renderApprovals();
  animateApprovals();
}
