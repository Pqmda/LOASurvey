import { state } from '../state/appState.js';
import { subscribeFeedbackThreads, renderFeedbackThreads } from '../services/feedback.js';

export function showPFMOView() {
  const respondentView = document.getElementById('respondentView');
  if (respondentView) respondentView.classList.add('hidden');
  const managerView = document.getElementById('managerView');
  if (managerView) managerView.classList.add('hidden');
  const isoView = document.getElementById('isoView');
  if (isoView) isoView.classList.add('hidden');
  const adminView = document.getElementById('adminView');
  if (adminView) adminView.classList.add('hidden');
  const pfmoView = document.getElementById('pfmoView');
  if (pfmoView) pfmoView.classList.remove('hidden');
  const feedbackTitle = pfmoView ? pfmoView.querySelector('.view-header h1') : null;
  if (feedbackTitle) {
    feedbackTitle.textContent = state.userRole === 'qmr' ? 'Feedback Approval Queue' : 'Feedback Inbox';
  }
  const managerSection = document.getElementById('managerSection');
  if (managerSection) managerSection.classList.add('hidden');
  const isoSection = document.getElementById('isoSection');
  if (isoSection) isoSection.classList.add('hidden');
  const adminSection = document.getElementById('adminSection');
  if (adminSection) adminSection.classList.add('hidden');

  subscribeFeedbackThreads();
  renderFeedbackThreads();
}

export const showQRView = showPFMOView;
