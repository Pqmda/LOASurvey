// ==================== MANAGER VIEW ====================
import { state } from '../state/appState.js';
import { animateGrid } from '../animations/transitions.js';
import { subscribeManagerSurveys, renderSurveys, subscribeSurveyResponsesForDept, renderManagerStats } from '../services/surveys.js';

export function showManagerView() {
  state.userRole = 'manager';
  const respondentView = document.getElementById('respondentView');
  if (respondentView) respondentView.classList.add('hidden');
  const managerView = document.getElementById('managerView');
  if (managerView) managerView.classList.remove('hidden');
  const isoView = document.getElementById('isoView');
  if (isoView) isoView.classList.add('hidden');
  const managerSection = document.getElementById('managerSection');
  if (managerSection) managerSection.classList.remove('hidden');
  const isoSection = document.getElementById('isoSection');
  if (isoSection) isoSection.classList.add('hidden');
  const adminSection = document.getElementById('adminSection');
  if (adminSection) adminSection.classList.add('hidden');

  if (state.userDept && !state.selectedDept) {
    state.selectedDept = state.userDept;
  }

  if (state.userDept) {
    state.selectedDept = state.userDept;
  }

  if (!state.selectedDept) {
    state.selectedDept = window.departmentDefault || '';
  }

  if (state.selectedDept) {
    document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.dept-btn[data-dept="${state.selectedDept}"]`);
    if (btn) {
      btn.classList.add('active');
      const group = btn.closest('.dept-group');
      if (group) group.classList.add('open');
    }
  }
  
  subscribeManagerSurveys(state.userDept || state.selectedDept || window.departmentDefault || '');
  renderSurveys();
  subscribeSurveyResponsesForDept(state.userDept || state.selectedDept || window.departmentDefault || '');
  renderManagerStats();
  animateGrid();
}
