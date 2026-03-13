// ==================== APPROVALS SERVICE ====================
import { db } from '../config/firebase.js';
import { state } from '../state/appState.js';
import { showNotification } from '../utils/notifications.js';
import { animateApprovals } from '../animations/transitions.js';

// Subscribe to approvals
export function subscribeApprovals() {
  if (state.approvalsUnsub) state.approvalsUnsub();
  try {
    state.approvalsUnsub = db.collection('approvals')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => {
        state.approvals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderApprovals();
      }, (err) => console.error('Approvals snapshot error:', err));
  } catch (e) {
    console.error('subscribeApprovals error:', e);
  }
}

// Render approvals
export function renderApprovals() {
  const list = document.getElementById('approvalsList');
  const emptyState = document.getElementById('emptyApprovals');
  if (!list || !emptyState) return;
  
  const filter = state.currentFilter;
  const filtered = state.approvals.filter(a => a.approvalStatus === filter);
  const approvalCount = state.approvals.filter(a => a.approvalStatus === 'pending').length;
  const countEl = document.getElementById('approvalCount');
  if (countEl) countEl.textContent = approvalCount;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    list.innerHTML = filtered.map((approval, idx) => `
      <div class="approval-item" onclick="window.openApprovalModal('${approval.id}')" style="animation-delay: ${idx * 0.1}s">
        <div class="approval-header">
          <h3>${approval.title}</h3>
          <span class="approval-badge">${approval.approvalStatus}</span>
        </div>
        <div class="approval-detail"><strong>Department:</strong> ${approval.department}</div>
        <div class="approval-detail"><strong>Requested by:</strong> ${approval.createdBy}</div>
        <div class="approval-detail"><strong>Action:</strong> ${approval.requestedAction}</div>
      </div>
    `).join('');
  }
}

// Open approval modal
export function openApprovalModal(approvalId) {
  const approval = state.approvals.find(a => a.id === approvalId);
  if (!approval) return;

  const modal = document.getElementById('approvalModal');
  const details = document.getElementById('approvalDetails');
  const formatDateTime = (value) => {
    if (!value) return '';
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };
  const scheduleText = (() => {
    const startText = formatDateTime(approval.startAt);
    const endText = formatDateTime(approval.endAt);
    if (!startText && !endText) return 'Always active';
    if (startText && endText) return `Starts ${startText} • Ends ${endText}`;
    if (startText) return `Starts ${startText}`;
    return `Ends ${endText}`;
  })();

  details.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h3 style="color: #e0e0e0; margin-bottom: 1rem;">${approval.title}</h3>
      <p style="color: #a0aec0; margin-bottom: 0.5rem;"><strong>Department:</strong> ${approval.department}</p>
      <p style="color: #a0aec0; margin-bottom: 0.5rem;"><strong>Requested by:</strong> ${approval.createdBy}</p>
      <p style="color: #a0aec0; margin-bottom: 1rem;"><strong>Request Type:</strong> ${approval.requestedAction}</p>
      <p style="color: #a0aec0; margin-bottom: 1rem;"><strong>Schedule:</strong> ${scheduleText}</p>
      <p style="color: #a0aec0;">${approval.description}</p>
      <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1rem 0;">
      <div style="margin-top: 1rem;">
        <h4 style="color: #e0e0e0; margin-bottom: 0.75rem;">Questions:</h4>
        ${approval.questions.map(q => `<p style="color: #a0aec0; margin-bottom: 0.5rem;">• ${q.question} <span style="color: #8b5cf6;">(${q.type})</span></p>`).join('')}
      </div>
    </div>
  `;

  document.getElementById('approveBtn').onclick = () => approveChange(approvalId);
  document.getElementById('rejectBtn').onclick = () => rejectChange(approvalId);

  modal.classList.remove('hidden');
}

// Close approval modal
export function closeApprovalModal() {
  const modal = document.getElementById('approvalModal');
  if (modal) modal.classList.add('hidden');
}

// Approve change
export function approveChange(approvalId) {
  const docRef = db.collection('approvals').doc(approvalId);
  docRef.get().then(async (doc) => {
    if (!doc.exists) return;
    const approval = doc.data();
    const surveysCol = db.collection('surveys');
    if (approval.requestedAction === 'create') {
      await surveysCol.add({
        title: approval.title,
        description: approval.description,
        department: approval.department,
        status: 'approved',
        createdBy: approval.createdBy,
        questions: approval.questions,
        startAt: approval.startAt || null,
        endAt: approval.endAt || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showNotification('Survey creation approved', 'success');
    } else if (approval.requestedAction === 'update') {
      if (approval.surveyId) {
        await surveysCol.doc(approval.surveyId).update({
          title: approval.title,
          description: approval.description,
          department: approval.department,
          questions: approval.questions,
          startAt: approval.startAt || null,
          endAt: approval.endAt || null,
          status: 'approved',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Survey update approved', 'success');
      }
    } else if (approval.requestedAction === 'delete') {
      if (approval.surveyId) {
        await surveysCol.doc(approval.surveyId).delete();
        showNotification('Survey deletion approved', 'success');
      }
    }
    await docRef.update({ approvalStatus: 'approved' });
    renderApprovals();
    closeApprovalModal();
  }).catch(err => {
    console.error('approveChange error:', err);
    showNotification(`Failed to approve change: ${err.message || err}`, 'error');
  });
}

// Reject change
export function rejectChange(approvalId) {
  db.collection('approvals').doc(approvalId).update({ approvalStatus: 'rejected' })
    .then(() => {
      showNotification('Request rejected', 'info');
      renderApprovals();
      closeApprovalModal();
    })
    .catch(err => {
      console.error('rejectChange error:', err);
      showNotification(`Failed to reject request: ${err.message || err}`, 'error');
    });
}

// Export for global access
if (typeof window !== 'undefined') {
  window.openApprovalModal = openApprovalModal;
}
