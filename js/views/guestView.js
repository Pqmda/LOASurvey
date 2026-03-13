// ==================== GUEST/RESPONDENT VIEW ====================
import { state } from '../state/appState.js';
import { animateGrid } from '../animations/transitions.js';
import { subscribeApprovedSurveysForDept, subscribeApprovedSurveysForNotifications, renderRespondentSurveys } from '../services/surveys.js';
import { subscribeUserFeedbackThreads } from '../services/feedback.js';

export function showGuestView() {
  const guestView = document.getElementById('guestView');
  if (guestView) guestView.classList.add('hidden');
  const respondentView = document.getElementById('respondentView');
  if (respondentView) respondentView.classList.remove('hidden');
  const managerView = document.getElementById('managerView');
  if (managerView) managerView.classList.add('hidden');
  const isoView = document.getElementById('isoView');
  if (isoView) isoView.classList.add('hidden');
  const adminView = document.getElementById('adminView');
  if (adminView) adminView.classList.add('hidden');
  const managerSection = document.getElementById('managerSection');
  if (managerSection) managerSection.classList.add('hidden');
  const isoSection = document.getElementById('isoSection');
  if (isoSection) isoSection.classList.add('hidden');
  const adminSection = document.getElementById('adminSection');
  if (adminSection) adminSection.classList.add('hidden');

  if (!state.selectedDept && state.userDept) {
    state.selectedDept = state.userDept;
  }

  if (!state.selectedDept) {
    state.selectedDept = window.departmentDefault || '';
  }

  if (state.selectedDept) {
    document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
    const deptBtn = document.querySelector(`.dept-btn[data-dept="${state.selectedDept}"]`);
    if (deptBtn) {
      deptBtn.classList.add('active');
      const group = deptBtn.closest('.dept-group');
      if (group) group.classList.add('open');
    }
  }
  state.surveys = [];
  
  subscribeApprovedSurveysForNotifications();
  subscribeApprovedSurveysForDept(state.selectedDept);
  subscribeUserFeedbackThreads();
  renderRespondentSurveys();
  animateGrid();
}
