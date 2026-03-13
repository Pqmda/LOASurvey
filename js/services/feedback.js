import { auth, db } from '../config/firebase.js';
import { state } from '../state/appState.js';
import { showNotification } from '../utils/notifications.js';
import {
  addNotification,
  saveNotificationLog,
  renderNotificationPanel,
  updateSurveyNotification,
  getActiveNotificationLogKey
} from './surveys.js';

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value);
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
};

const normalizeQMRStatus = (thread) => {
  const status = String(thread?.qmrStatus || '').toLowerCase();
  if (status === 'pending' || status === 'approved' || status === 'rejected') return status;
  // Older records without qmrStatus are treated as already approved.
  return 'approved';
};

const ensureFeedbackAuth = async () => {
  if (auth.currentUser) return auth.currentUser;
  try {
    const credential = await auth.signInAnonymously();
    return credential.user;
  } catch (err) {
    const code = err?.code || '';
    if (code === 'auth/operation-not-allowed') {
      showNotification('Anonymous sign-in is disabled in Firebase Auth.', 'error');
    } else if (code) {
      showNotification(`Auth error: ${code}`, 'error');
    } else {
      showNotification('Authentication failed. Check Firebase Auth settings.', 'error');
    }
    throw err;
  }
};

const MAX_FALLBACK_IMAGE_BYTES = 350 * 1024;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const loadImageFromFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = reader.result;
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const estimateDataUrlBytes = (dataUrl) => {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil(base64.length * 3 / 4);
};

const renderCompressedDataUrl = (img, maxSize, quality) => {
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
};

const getImageDataUrl = async (file) => {
  if (!file) return null;
  try {
    if (file.size <= MAX_FALLBACK_IMAGE_BYTES) {
      return await readFileAsDataUrl(file);
    }
    const img = await loadImageFromFile(file);
    const attempts = [
      { max: 1280, quality: 0.8 },
      { max: 1024, quality: 0.75 },
      { max: 800, quality: 0.7 },
      { max: 640, quality: 0.65 }
    ];
    for (const attempt of attempts) {
      const dataUrl = renderCompressedDataUrl(img, attempt.max, attempt.quality);
      if (!dataUrl) continue;
      if (estimateDataUrlBytes(dataUrl) <= MAX_FALLBACK_IMAGE_BYTES) {
        return dataUrl;
      }
    }
    showNotification('Image too large for upload. Use a smaller image.', 'error');
    return null;
  } catch (err) {
    showNotification('Image upload failed.', 'error');
    return null;
  }
};

const getSeenResponsesKey = (uid) => `feedbackResponsesSeen_${uid || 'guest'}`;

const getSeenResponses = (uid) => {
  try {
    const raw = localStorage.getItem(getSeenResponsesKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveSeenResponses = (uid, list) => {
  try {
    localStorage.setItem(getSeenResponsesKey(uid), JSON.stringify(list));
  } catch (e) {
    return;
  }
};

export async function submitFeedback(message, file) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    showNotification('Feedback message is required.', 'error');
    return;
  }
  try {
    const user = await ensureFeedbackAuth();
    const feedbackRef = db.collection('feedback').doc();
    let imageUrl = null;
    if (file) {
      imageUrl = await getImageDataUrl(file);
      if (!imageUrl) return;
    }
    await feedbackRef.set({
      message: trimmed,
      imageUrl: imageUrl || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user ? user.uid : null,
      createdByName: user?.displayName || user?.email || 'Anonymous',
      createdByRole: state.userRole || 'respondent',
      status: 'pending_qmr',
      qmrStatus: 'pending',
      qmrReviewedAt: null,
      qmrReviewedBy: null,
      qmrReviewedByName: null,
      responseMessage: null,
      responseImageUrl: null,
      respondedAt: null,
      respondedBy: null,
      respondedByName: null
    });
    showNotification('Feedback sent to QMR for approval.', 'success');
  } catch (err) {
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showNotification('Firestore permission denied. Check Firestore rules.', 'error');
    } else if (code) {
      showNotification(`Submit failed: ${code}`, 'error');
    } else {
      showNotification('Failed to send feedback. Please try again.', 'error');
    }
  }
}

export async function submitFeedbackResponse(feedbackId, message, file) {
  const trimmed = String(message || '').trim();
  if (!trimmed || !feedbackId) {
    showNotification('Response message is required.', 'error');
    return;
  }
  try {
    const feedbackDoc = await db.collection('feedback').doc(feedbackId).get();
    if (!feedbackDoc.exists) {
      showNotification('Feedback thread not found.', 'error');
      return;
    }
    const qmrStatus = normalizeQMRStatus(feedbackDoc.data());
    if (qmrStatus !== 'approved') {
      showNotification('Feedback must be approved by QMR before PFMO can respond.', 'error');
      return;
    }
    let responseImageUrl = null;
    if (file) {
      responseImageUrl = await getImageDataUrl(file);
      if (!responseImageUrl) return;
    }
    const user = auth.currentUser;
    await db.collection('feedback').doc(feedbackId).set({
      responseMessage: trimmed,
      responseImageUrl: responseImageUrl || null,
      respondedAt: firebase.firestore.FieldValue.serverTimestamp(),
      respondedBy: user ? user.uid : null,
      respondedByName: user?.displayName || user?.email || 'PFMO',
      status: 'responded'
    }, { merge: true });
    showNotification('Response sent.', 'success');
  } catch (err) {
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showNotification('Firestore permission denied. Check Firestore rules.', 'error');
    } else if (code) {
      showNotification(`Response failed: ${code}`, 'error');
    } else {
      showNotification('Failed to send response. Please try again.', 'error');
    }
  }
}

export async function reviewFeedbackByQMR(feedbackId, approved) {
  if (!feedbackId) {
    showNotification('Feedback item is missing.', 'error');
    return;
  }
  try {
    const user = auth.currentUser;
    const qmrStatus = approved ? 'approved' : 'rejected';
    await db.collection('feedback').doc(feedbackId).set({
      qmrStatus,
      qmrReviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      qmrReviewedBy: user ? user.uid : null,
      qmrReviewedByName: user?.displayName || user?.email || 'QMR',
      status: approved ? 'open' : 'qmr_rejected'
    }, { merge: true });
    showNotification(approved ? 'Feedback approved and forwarded to PFMO.' : 'Feedback rejected.', 'success');
  } catch (err) {
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showNotification('Firestore permission denied. Check Firestore rules.', 'error');
    } else if (code) {
      showNotification(`Review failed: ${code}`, 'error');
    } else {
      showNotification('Failed to review feedback. Please try again.', 'error');
    }
  }
}

export function subscribeFeedbackThreads() {
  if (state.feedbackUnsub) state.feedbackUnsub();
  try {
    state.feedbackUnsub = db.collection('feedback')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => {
        const allThreads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (state.userRole === 'qmr') {
          state.feedbackThreads = allThreads.filter((thread) => normalizeQMRStatus(thread) === 'pending');
        } else if (state.userRole === 'pfmo') {
          state.feedbackThreads = allThreads.filter((thread) => normalizeQMRStatus(thread) === 'approved');
        } else {
          state.feedbackThreads = allThreads;
        }
        renderFeedbackThreads();
      }, (err) => {
        console.error('Feedback snapshot error:', err);
      });
  } catch (e) {
    console.error('subscribeFeedbackThreads error:', e);
  }
}

export async function subscribeUserFeedbackThreads() {
  const user = await ensureFeedbackAuth();
  const uid = user ? user.uid : null;
  if (!uid) return;
  if (state.feedbackUserUnsub) state.feedbackUserUnsub();
  try {
    state.feedbackUserUnsub = db.collection('feedback')
      .where('createdBy', '==', uid)
      .onSnapshot((snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        state.feedbackUserThreads = docs.sort((a, b) => {
          const aTime = toDate(a.createdAt)?.getTime?.() || 0;
          const bTime = toDate(b.createdAt)?.getTime?.() || 0;
          return bTime - aTime;
        });
        renderUserFeedbackThreads();
        notifyUserFeedbackResponses(uid, state.feedbackUserThreads || []);
      }, (err) => {
        console.error('User feedback snapshot error:', err);
      });
  } catch (e) {
    console.error('subscribeUserFeedbackThreads error:', e);
  }
}

const notifyUserFeedbackResponses = (uid, threads) => {
  const seen = new Set(getSeenResponses(uid));
  let updated = false;
  threads.forEach((thread) => {
    if (thread.responseMessage && !seen.has(thread.id)) {
      addNotification({
        id: `feedback_response_${thread.id}`,
        title: 'Feedback Response',
        message: 'Your feedback has received a response.',
        read: false,
        createdAt: Date.now()
      });
      showNotification('Your feedback has a new response.', 'success');
      seen.add(thread.id);
      updated = true;
    }
  });
  if (updated) {
    saveSeenResponses(uid, Array.from(seen));
    saveNotificationLog(getActiveNotificationLogKey(), state.notifications);
    renderNotificationPanel();
    updateSurveyNotification();
  }
};

export function renderFeedbackThreads() {
  const list = document.getElementById('feedbackList');
  const empty = document.getElementById('emptyFeedback');
  if (!list || !empty) return;
  const threads = state.feedbackThreads || [];
  if (!threads.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = threads.map((thread) => {
    const qmrStatus = normalizeQMRStatus(thread);
    const isResponded = Boolean(thread.responseMessage || thread.responseImageUrl);
    const isQMR = state.userRole === 'qmr';
    const isPFMO = state.userRole === 'pfmo';
    const createdAt = formatDate(thread.createdAt);
    const respondedAt = thread.respondedAt ? formatDate(thread.respondedAt) : '';
    const qmrReviewedAt = thread.qmrReviewedAt ? formatDate(thread.qmrReviewedAt) : '';
    const responseMessage = thread.responseMessage ? `<p>${thread.responseMessage}</p>` : '';
    const responseImage = thread.responseImageUrl ? `
      <button class="feedback-attachment-toggle" onclick="this.nextElementSibling.classList.toggle('show');this.textContent=this.nextElementSibling.classList.contains('show')?'Hide Attached File':'Show Attached File'">Show Attached File</button>
      <div class="feedback-attachment-container"><img class="feedback-image" src="${thread.responseImageUrl}" alt="Response attachment"></div>` : '';
    const responseBlock = thread.responseMessage || thread.responseImageUrl ? `
      <div class="feedback-response">
        <div class="feedback-meta">Response${respondedAt ? ` • ${respondedAt}` : ''}${thread.respondedByName ? ` • ${thread.respondedByName}` : ''}</div>
        ${responseMessage}
        ${responseImage}
      </div>
    ` : '';
    const attachment = thread.imageUrl ? `
      <button class="feedback-attachment-toggle" onclick="this.nextElementSibling.classList.toggle('show');this.textContent=this.nextElementSibling.classList.contains('show')?'Hide Attached File':'Show Attached File'">Show Attached File</button>
      <div class="feedback-attachment-container"><img class="feedback-image" src="${thread.imageUrl}" alt="Feedback attachment"></div>` : '';
    const qmrReviewMeta = thread.qmrReviewedByName || qmrReviewedAt ? `<div class="feedback-meta">QMR Review${qmrReviewedAt ? ` • ${qmrReviewedAt}` : ''}${thread.qmrReviewedByName ? ` • ${thread.qmrReviewedByName}` : ''}</div>` : '';
    const statusConfig = (() => {
      if (isResponded) return { css: 'approved', text: 'Responded' };
      if (qmrStatus === 'pending') return { css: 'pending', text: 'Pending QMR Approval' };
      if (qmrStatus === 'rejected') return { css: 'rejected', text: 'Rejected by QMR' };
      return { css: 'approved', text: 'Waiting for PFMO Response' };
    })();
    const qmrActions = isQMR && qmrStatus === 'pending'
      ? `
      <button class="btn btn-primary feedback-approve-btn" data-feedback-id="${thread.id}">Approve</button>
      <button class="btn btn-danger feedback-reject-btn" data-feedback-id="${thread.id}">Reject</button>
    `
      : '';
    const respondBtn = isPFMO && qmrStatus === 'approved' && !isResponded
      ? `<button class="btn btn-primary feedback-respond-btn" data-feedback-id="${thread.id}">Respond</button>`
      : '';
    return `
      <div class="survey-card">
        <div class="survey-status ${statusConfig.css}">${statusConfig.text}</div>
        <h3>${thread.createdByName || 'Anonymous'}</h3>
        <div class="feedback-meta">${createdAt}${thread.createdByRole ? ` • ${thread.createdByRole}` : ''}</div>
        <p>${thread.message || ''}</p>
        ${attachment}
        ${qmrReviewMeta}
        ${responseBlock}
        <div class="approval-actions">
          ${qmrActions}
          ${respondBtn}
        </div>
      </div>
    `;
  }).join('');
}

export function renderUserFeedbackThreads() {
  const list = document.getElementById('feedbackUserList');
  const empty = document.getElementById('emptyFeedbackUser');
  if (!list || !empty) return;
  const threads = state.feedbackUserThreads || [];
  if (!threads.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = threads.map((thread) => {
    const qmrStatus = normalizeQMRStatus(thread);
    const isResponded = Boolean(thread.responseMessage || thread.responseImageUrl);
    const createdAt = formatDate(thread.createdAt);
    const respondedAt = thread.respondedAt ? formatDate(thread.respondedAt) : '';
    const qmrReviewedAt = thread.qmrReviewedAt ? formatDate(thread.qmrReviewedAt) : '';
    const responseMessage = thread.responseMessage ? `<p>${thread.responseMessage}</p>` : '';
    const responseImage = thread.responseImageUrl ? `
      <button class="feedback-attachment-toggle" onclick="this.nextElementSibling.classList.toggle('show');this.textContent=this.nextElementSibling.classList.contains('show')?'Hide Attached File':'Show Attached File'">Show Attached File</button>
      <div class="feedback-attachment-container"><img class="feedback-image" src="${thread.responseImageUrl}" alt="Response attachment"></div>` : '';
    const responseBlock = thread.responseMessage || thread.responseImageUrl ? `
      <div class="feedback-response">
        <div class="feedback-meta">Response${respondedAt ? ` • ${respondedAt}` : ''}${thread.respondedByName ? ` • ${thread.respondedByName}` : ''}</div>
        ${responseMessage}
        ${responseImage}
      </div>
    ` : '';
    const attachment = thread.imageUrl ? `
      <button class="feedback-attachment-toggle" onclick="this.nextElementSibling.classList.toggle('show');this.textContent=this.nextElementSibling.classList.contains('show')?'Hide Attached File':'Show Attached File'">Show Attached File</button>
      <div class="feedback-attachment-container"><img class="feedback-image" src="${thread.imageUrl}" alt="Feedback attachment"></div>` : '';
    const statusConfig = (() => {
      if (isResponded) return { css: 'approved', text: 'Responded' };
      if (qmrStatus === 'pending') return { css: 'pending', text: 'Pending QMR Approval' };
      if (qmrStatus === 'rejected') return { css: 'rejected', text: 'Rejected by QMR' };
      return { css: 'approved', text: 'Waiting for PFMO Response' };
    })();
    const qmrMeta = qmrStatus !== 'pending'
      ? `<div class="feedback-meta">QMR ${qmrStatus === 'approved' ? 'Approved' : 'Rejected'}${qmrReviewedAt ? ` • ${qmrReviewedAt}` : ''}${thread.qmrReviewedByName ? ` • ${thread.qmrReviewedByName}` : ''}</div>`
      : '';
    return `
      <div class="survey-card">
        <div class="survey-status ${statusConfig.css}">${statusConfig.text}</div>
        <h3>Your feedback</h3>
        <div class="feedback-meta">${createdAt}</div>
        <p>${thread.message || ''}</p>
        ${attachment}
        ${qmrMeta}
        ${responseBlock}
      </div>
    `;
  }).join('');
}
