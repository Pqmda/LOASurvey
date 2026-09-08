// ==================== SURVEY SERVICE ====================
import { db, auth } from '../config/firebase.js';
import { state } from '../state/appState.js';
import { showNotification } from '../utils/notifications.js';
import { animateGrid } from '../animations/transitions.js';

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value);
};

const formatDateTimeInput = (date) => {
  if (!date) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDisplayDate = (date) => {
  if (!date) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const isSurveyActive = (survey, now = new Date()) => {
  if (survey.status !== 'approved') return false;
  const startAt = toDate(survey.startAt);
  const endAt = toDate(survey.endAt);
  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;
  return true;
};

const getScheduleText = (survey) => {
  const startAt = toDate(survey.startAt);
  const endAt = toDate(survey.endAt);
  if (!startAt && !endAt) return 'Always active';
  const parts = [];
  if (startAt) parts.push(`Starts ${formatDisplayDate(startAt)}`);
  if (endAt) parts.push(`Ends ${formatDisplayDate(endAt)}`);
  return parts.join(' • ');
};

const getDeptLabel = (dept) => {
  const catalog = window.departmentCatalog;
  if (catalog && catalog.map && catalog.map[dept]) {
    const entry = catalog.map[dept];
    return entry.full ? `${entry.label} • ${entry.full}` : entry.label;
  }
  return dept ? `${dept}` : '';
};

const notificationStorageKey = 'survey_notifications_seen';
const notificationLogKey = 'survey_notifications_log';
let activeNotificationLogKey = `${notificationLogKey}_all`;

const getSurveyTimestamp = (survey) => {
  const date = toDate(survey.updatedAt || survey.createdAt);
  return date ? date.getTime() : 0;
};

const loadSeenMap = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveSeenMap = (key, map) => {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    return;
  }
};

const loadNotificationLog = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      if (entry && (!entry.surveyId || !entry.surveyTimestamp) && typeof entry.id === 'string') {
        const parts = entry.id.split('_');
        if (parts.length >= 2) {
          const ts = Number(parts[parts.length - 1]);
          if (!Number.isNaN(ts)) {
            return {
              ...entry,
              surveyId: entry.surveyId || parts.slice(0, -1).join('_'),
              surveyTimestamp: entry.surveyTimestamp || ts
            };
          }
        }
      }
      return entry;
    });
  } catch (e) {
    return [];
  }
};

export const saveNotificationLog = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    return;
  }
};

export const addNotification = (notification) => {
  const safeNotification = {
    ...notification,
    createdAt: notification.createdAt || Date.now()
  };
  const exists = state.notifications.some(n => n.id === safeNotification.id);
  if (exists) return;
  state.notifications = [safeNotification, ...state.notifications].slice(0, 20);
};

const markAllNotificationsRead = () => {
  state.notifications = state.notifications.map(n => ({ ...n, read: true }));
  saveNotificationLog(activeNotificationLogKey, state.notifications);
  updateSurveyNotification();
  renderNotificationPanel();
};

export const getActiveNotificationLogKey = () => activeNotificationLogKey;

export const updateSurveyNotification = () => {
  const btn = document.getElementById('surveyNotificationBtn');
  const countEl = document.getElementById('surveyNotificationCount');
  if (!btn || !countEl) return;
  const unreadCount = state.notifications.filter(n => !n.read).length;
  btn.classList.remove('hidden');
  countEl.textContent = String(unreadCount);
};

export const renderNotificationPanel = () => {
  const panel = document.getElementById('surveyNotificationPanel');
  const list = document.getElementById('surveyNotificationList');
  if (!panel || !list) return;
  if (state.notifications.length === 0) {
    list.innerHTML = '<div class="notification-empty">No new notifications.</div>';
    return;
  }
  list.innerHTML = state.notifications.map((n) => `
    <div class="notification-item ${n.read ? '' : 'unread'}">
      <div class="notification-title">${n.title}</div>
      <div class="notification-meta">${n.message}</div>
      <div class="notification-time">${formatDisplayDate(toDate(n.createdAt))}</div>
    </div>
  `).join('');
};

export const toggleNotificationPanel = () => {
  const panel = document.getElementById('surveyNotificationPanel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    if (window.gsap) {
      gsap.to(panel, {
        opacity: 0,
        y: -8,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          panel.classList.remove('open');
          panel.style.opacity = '';
          panel.style.transform = '';
        }
      });
    } else {
      panel.classList.remove('open');
    }
  } else {
    panel.classList.add('open');
    if (window.gsap) {
      gsap.fromTo(panel, { opacity: 0, y: -8 }, {
        opacity: 1,
        y: 0,
        duration: 0.25,
        ease: 'power2.out'
      });
    }
    markAllNotificationsRead();
  }
};

export const clearNotificationLog = () => {
  state.notifications = [];
  saveNotificationLog(activeNotificationLogKey, []);
  renderNotificationPanel();
  updateSurveyNotification();
};

const syncSurveyNotifications = (surveys, dept) => {
  const storageKey = `${notificationStorageKey}_${dept || 'all'}`;
  const logKey = `${notificationLogKey}_${dept || 'all'}`;
  activeNotificationLogKey = logKey;
  const seenMap = loadSeenMap(storageKey);
  const currentMap = { ...seenMap };
  const activeSurveys = surveys.filter(s => isSurveyActive(s));
  const storedLog = loadNotificationLog(logKey);
  if (storedLog.length && state.notifications.length === 0) {
    state.notifications = storedLog.slice(0, 20).map(entry => ({ ...entry, read: true }));
    saveNotificationLog(logKey, state.notifications);
  }

  if (storedLog.length) {
    storedLog.forEach((entry) => {
      if (entry?.surveyId && entry?.surveyTimestamp) {
        currentMap[entry.surveyId] = Math.max(currentMap[entry.surveyId] || 0, entry.surveyTimestamp);
      }
    });
  }

  const hasSeen = Object.keys(currentMap).length > 0;
  if (!hasSeen) {
    activeSurveys.forEach((survey) => {
      const currentTimestamp = getSurveyTimestamp(survey);
      addNotification({
        id: `${survey.id}_${currentTimestamp}`,
        title: survey.title,
        message: 'New survey is now active.',
        read: false,
        createdAt: currentTimestamp || Date.now(),
        surveyId: survey.id,
        surveyTimestamp: currentTimestamp || Date.now()
      });
      showNotification(`${survey.title} is now available.`, 'info');
      currentMap[survey.id] = currentTimestamp;
    });
    saveSeenMap(storageKey, currentMap);
    saveNotificationLog(logKey, state.notifications);
    renderNotificationPanel();
    updateSurveyNotification();
    return;
  }

  activeSurveys.forEach((survey) => {
    const currentTimestamp = getSurveyTimestamp(survey);
    const lastSeen = currentMap[survey.id] || 0;
    if (currentTimestamp > lastSeen) {
      const isUpdate = lastSeen > 0;
      const alreadyLogged = state.notifications.some(n => n.surveyId === survey.id && n.surveyTimestamp === currentTimestamp);
      if (alreadyLogged) {
        currentMap[survey.id] = currentTimestamp;
        return;
      }
      addNotification({
        id: `${survey.id}_${currentTimestamp}`,
        title: survey.title,
        message: isUpdate ? 'Survey updated and active now.' : 'New survey is now active.',
        read: false,
        createdAt: currentTimestamp || Date.now(),
        surveyId: survey.id,
        surveyTimestamp: currentTimestamp || Date.now()
      });
      showNotification(isUpdate ? `${survey.title} was updated.` : `${survey.title} is now available.`, 'info');
      currentMap[survey.id] = currentTimestamp;
    }
  });
  saveSeenMap(storageKey, currentMap);
  saveNotificationLog(logKey, state.notifications);
  renderNotificationPanel();
  updateSurveyNotification();
};

// Subscribe to approved surveys for specific department (for respondents)
export function subscribeApprovedSurveysForDept(dept) {
  if (state.surveysUnsub) state.surveysUnsub();
  try {
    state.surveysUnsub = db.collection('surveys')
      .where('status', '==', 'approved')
      .where('department', '==', dept)
      .onSnapshot((snap) => {
        state.surveys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderRespondentSurveys();
      }, (err) => {
        console.error('Surveys snapshot error:', err);
        state.surveys = [];
        showNotification('Unable to load approved surveys for department', 'warning');
        renderRespondentSurveys();
      });
  } catch (e) {
    console.error('subscribeApprovedSurveysForDept error:', e);
    state.surveys = [];
    showNotification('Failed to connect to surveys database', 'error');
    renderRespondentSurveys();
  }
}

export function subscribeApprovedSurveysForNotifications() {
  if (state.notificationsUnsub) state.notificationsUnsub();
  try {
    state.notificationsUnsub = db.collection('surveys')
      .where('status', '==', 'approved')
      .onSnapshot((snap) => {
        const surveys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        syncSurveyNotifications(surveys, 'all');
      }, (err) => {
        console.error('Surveys notification snapshot error:', err);
      });
  } catch (e) {
    console.error('subscribeApprovedSurveysForNotifications error:', e);
  }
}

// Subscribe to manager surveys for specific department
export function subscribeManagerSurveys(dept) {
  if (state.surveysUnsub) state.surveysUnsub();
  try {
    state.surveysUnsub = db.collection('surveys')
      .where('department', '==', dept)
      .onSnapshot((snap) => {
        state.surveys = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderSurveys();
      }, (err) => console.error('Manager surveys snapshot error:', err));
  } catch (e) {
    console.error('subscribeManagerSurveys error:', e);
  }
}

// Render surveys for respondents
export function renderRespondentSurveys() {
  const grid = document.getElementById('respondentSurveysGrid');
  const emptySurveys = document.getElementById('emptyRespondentSurveys');
  if (!grid || !emptySurveys) return;

  let approvedSurveys = state.surveys.filter(s => s.status === 'approved');
  
  if (state.selectedDept) {
    approvedSurveys = approvedSurveys.filter(s => s.department === state.selectedDept);
  }
  const activeSurveys = approvedSurveys.filter(s => isSurveyActive(s));

  if (activeSurveys.length === 0) {
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
  } else {
    emptySurveys.style.display = 'none';
    grid.innerHTML = activeSurveys.map((survey, idx) => `
      <div class="survey-card" style="animation-delay: ${idx * 0.1}s" onclick="window.openAnswerSurveyModal('${survey.id}')">
        <span class="survey-status approved">Available</span>
        <h3>${survey.title}</h3>
        <p>${survey.description}</p>
        <div class="survey-actions">
          <button class="btn btn-primary" style="width: 100%;">Answer Survey</button>
        </div>
      </div>
    `).join('');
  }
  updateSurveyNotification();
}

// Render surveys for managers
export function renderSurveys() {
  const grid = document.getElementById('surveysGrid');
  const emptySurveys = document.getElementById('emptySurveys');
  const deptTitle = document.getElementById('managerDeptTitle');
  if (!grid || !emptySurveys) return;

  if (!state.selectedDept) {
    if (deptTitle) deptTitle.textContent = 'Select a Department';
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
    const emptyText = emptySurveys.querySelector('p');
    if (emptyText) emptyText.textContent = 'Select a department from the sidebar to manage surveys.';
    return;
  }

  if (deptTitle) deptTitle.textContent = `${getDeptLabel(state.selectedDept)} Surveys`;
  const currentDept = document.getElementById('currentDept');
  if (currentDept) currentDept.textContent = getDeptLabel(state.selectedDept);

  const filteredSurveys = state.surveys.filter(s => s.department === state.selectedDept);

  if (filteredSurveys.length === 0) {
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
    const emptyText = emptySurveys.querySelector('p');
    if (emptyText) emptyText.textContent = 'No surveys yet. Create one to get started!';
  } else {
    emptySurveys.style.display = 'none';
    const editLabel = state.userRole === 'manager' ? 'Request Update' : 'Edit';
    const deleteLabel = state.userRole === 'manager' ? 'Request Delete' : 'Delete';
    grid.innerHTML = filteredSurveys.map((survey, idx) => `
      <div class="survey-card" style="animation-delay: ${idx * 0.1}s">
        <span class="survey-status ${survey.status}">${survey.status}</span>
        <h3>${survey.title}</h3>
        <p>${survey.description}</p>
        <p>${getScheduleText(survey)}</p>
        <div class="survey-actions">
          <button class="edit-survey" onclick="window.editSurvey('${survey.id}')">${editLabel}</button>
          <button class="delete-survey" onclick="window.deleteSurvey('${survey.id}')">${deleteLabel}</button>
        </div>
      </div>
    `).join('');
  }
  renderManagerStats();
}

// Edit survey
export function editSurvey(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) return;
  state.editingSurveyId = surveyId;
  openSurveyModal(survey);
}

// Delete survey
export function deleteSurvey(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) return;
  if (confirm('Request deletion approval for this survey?')) {
    submitApprovalRequest('delete', {
      surveyId: survey.id,
      title: survey.title,
      description: survey.description,
      department: survey.department,
      questions: survey.questions
    });
  }
}

// Open survey modal
export function openSurveyModal(survey = null) {
  const modal = document.getElementById('surveyModal');
  const form = document.getElementById('surveyForm');
  const title = document.getElementById('modalTitle');
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const startInput = document.getElementById('surveyStartAt');
  const endInput = document.getElementById('surveyEndAt');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (survey) {
    title.textContent = state.userRole === 'manager' ? 'Request Update' : 'Edit Survey';
    titleInput.value = survey.title;
    descInput.value = survey.description;
    deptSelect.value = survey.department;
    renderQuestions(survey.questions);
    if (startInput) startInput.value = formatDateTimeInput(toDate(survey.startAt));
    if (endInput) endInput.value = formatDateTimeInput(toDate(survey.endAt));
  } else {
    title.textContent = state.userRole === 'manager' ? 'Request Approval' : 'Create Survey';
    form.reset();
    titleInput.value = '';
    descInput.value = '';
    const defaultDept = window.departmentDefault || deptSelect?.options?.[0]?.value || '';
    deptSelect.value = state.selectedDept || defaultDept;
    document.getElementById('questionsContainer').innerHTML = `
      <div class="question-item">
        <input type="text" class="question-input" placeholder="Enter question">
        <select class="question-type">
          <option>Multiple Choice</option>
          <option>Text</option>
          <option>Rating</option>
        </select>
        <button type="button" class="btn-icon remove-question" style="display: none;">🗑️</button>
      </div>
    `;
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
  }
  if (titleInput) titleInput.required = true;
  if (deptSelect) deptSelect.required = true;

  if (state.userRole === 'manager') {
    if (state.userDept) {
      deptSelect.value = state.userDept;
    }
    deptSelect.disabled = true;
    if (submitBtn) submitBtn.textContent = 'Request Approval';
  } else {
    deptSelect.disabled = false;
    if (submitBtn) submitBtn.textContent = survey ? 'Save Survey' : 'Save Survey';
  }

  modal.classList.remove('hidden');
}

// Close survey modal
export function closeSurveyModal() {
  document.getElementById('surveyModal').classList.add('hidden');
  state.editingSurveyId = null;
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  if (addQuestionBtn) addQuestionBtn.style.display = 'inline-block';
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const startInput = document.getElementById('surveyStartAt');
  const endInput = document.getElementById('surveyEndAt');
  const form = document.getElementById('surveyForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (titleInput) titleInput.closest('.form-group').style.display = '';
  if (descInput) descInput.closest('.form-group').style.display = '';
  if (deptSelect) deptSelect.closest('.form-group').style.display = '';
  if (startInput) startInput.closest('.form-group').style.display = '';
  if (endInput) endInput.closest('.form-group').style.display = '';
  if (deptSelect) deptSelect.disabled = false;
  if (submitBtn) submitBtn.textContent = 'Save Survey';
  if (titleInput) titleInput.required = true;
  if (deptSelect) deptSelect.required = true;
  if (form) delete form.dataset.mode;
  form.onsubmit = null;
}

// Render questions
function renderQuestions(questions) {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = questions.map(q => `
    <div class="question-item">
      <input type="text" class="question-input" placeholder="Enter question" value="${q.question}">
      <select class="question-type">
        <option ${q.type === 'Multiple Choice' ? 'selected' : ''}>Multiple Choice</option>
        <option ${q.type === 'Text' ? 'selected' : ''}>Text</option>
        <option ${q.type === 'Rating' ? 'selected' : ''}>Rating</option>
      </select>
      <button type="button" class="btn-icon remove-question">🗑️</button>
    </div>
  `).join('');

  attachQuestionListeners();
}

// Attach question listeners
export function attachQuestionListeners() {
  document.querySelectorAll('.remove-question').forEach(btn => {
    btn.style.display = 'block';
    btn.onclick = (e) => {
      e.preventDefault();
      e.target.closest('.question-item').remove();
    };
  });
}

// Open answer survey modal
export function openAnswerSurveyModal(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) return;

  const modal = document.getElementById('surveyModal');
  const form = document.getElementById('surveyForm');
  const title = document.getElementById('modalTitle');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const startInput = document.getElementById('surveyStartAt');
  const endInput = document.getElementById('surveyEndAt');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  title.textContent = `Answer Survey: ${survey.title}`;
  form.reset();
  
  if (addQuestionBtn) addQuestionBtn.style.display = 'none';
  if (titleInput) titleInput.closest('.form-group').style.display = 'none';
  if (descInput) descInput.closest('.form-group').style.display = 'none';
  if (deptSelect) deptSelect.closest('.form-group').style.display = 'none';
  if (startInput) startInput.closest('.form-group').style.display = 'none';
  if (endInput) endInput.closest('.form-group').style.display = 'none';
  if (submitBtn) submitBtn.textContent = 'Submit Answers';
  if (titleInput) titleInput.required = false;
  if (deptSelect) deptSelect.required = false;
  
  const questionsHtml = survey.questions.map((q, idx) => {
    let inputHtml = '';
    if (q.type === 'Multiple Choice') {
      inputHtml = `
        <div style="margin: 10px 0;">
          <label><input type="radio" name="answer_${idx}" value="Yes"> Yes</label>
          <label><input type="radio" name="answer_${idx}" value="No"> No</label>
          <label><input type="radio" name="answer_${idx}" value="Maybe"> Maybe</label>
        </div>
      `;
    } else if (q.type === 'Rating') {
      inputHtml = `
        <div style="margin: 10px 0;">
          <label><input type="radio" name="answer_${idx}" value="1"> ⭐</label>
          <label><input type="radio" name="answer_${idx}" value="2"> ⭐⭐</label>
          <label><input type="radio" name="answer_${idx}" value="3"> ⭐⭐⭐</label>
          <label><input type="radio" name="answer_${idx}" value="4"> ⭐⭐⭐⭐</label>
          <label><input type="radio" name="answer_${idx}" value="5"> ⭐⭐⭐⭐⭐</label>
        </div>
      `;
    } else if (q.type === 'Text') {
      inputHtml = `<textarea name="answer_${idx}" placeholder="Your answer" rows="3" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #444; background: rgba(0,0,0,0.2);"></textarea>`;
    }
    return `
      <div class="form-group">
        <label>${q.question}</label>
        ${inputHtml}
      </div>
    `;
  }).join('');
  
  document.getElementById('questionsContainer').innerHTML = questionsHtml;
  
  const surveyForm = document.getElementById('surveyForm');
  if (surveyForm) surveyForm.dataset.mode = 'answer';
  surveyForm.onsubmit = (e) => {
    e.preventDefault();
    submitSurveyAnswers(survey.id);
  };
  
  modal.classList.remove('hidden');
}

const ensureResponseAuth = async () => {
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

// Submit survey answers
async function submitSurveyAnswers(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) {
    showNotification('Survey not found. Please refresh and try again.', 'error');
    return;
  }
  const answers = {};
  const form = document.getElementById('surveyForm');
  const formData = new FormData(form);
  
  for (let [key, value] of formData.entries()) {
    answers[key] = value;
  }

  try {
    const user = await ensureResponseAuth();
    await db.collection('responses').add({
      surveyId,
      department: survey.department || null,
      answers,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      submittedBy: user ? user.uid : null,
      role: state.userRole || 'Student'
    });
    showNotification('Thank you! Your response has been submitted.', 'success');
    document.getElementById('surveyModal').classList.add('hidden');
    renderRespondentSurveys();
  } catch (err) {
    console.error('submitSurveyAnswers error:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      showNotification('Firestore permission denied. Check Firestore rules.', 'error');
    } else if (code === 'unavailable') {
      showNotification('Firestore is unavailable. Check your network.', 'error');
    } else if (code) {
      showNotification(`Submit failed: ${code}`, 'error');
    } else {
      showNotification('Failed to submit survey. Please try again.', 'error');
    }
  }
}

// Submit approval request
export async function submitApprovalRequest(action, payload) {
  const base = {
    requestedAction: action,
    approvalStatus: 'pending',
    createdBy: state.currentUser?.email || 'manager@school.edu',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const docData = { ...base, ...payload };
  try {
    let exists = false;
    if (action === 'create') {
      const q = await db.collection('approvals')
        .where('requestedAction', '==', 'create')
        .where('title', '==', payload.title)
        .where('department', '==', payload.department)
        .where('approvalStatus', '==', 'pending')
        .get();
      exists = !q.empty;
    } else if ((action === 'update' || action === 'delete') && payload.surveyId) {
      const q = await db.collection('approvals')
        .where('requestedAction', '==', action)
        .where('surveyId', '==', payload.surveyId)
        .where('approvalStatus', '==', 'pending')
        .get();
      exists = !q.empty;
    }
    if (exists) {
      showNotification('Duplicate pending approval already exists', 'warning');
      return;
    }
    await db.collection('approvals').add(docData);
    showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} request sent to ISO`, 'success');
  } catch (e) {
    console.error('submitApprovalRequest error:', e);
    showNotification(`Failed to send approval request: ${e.message || e}`, 'error');
  }
}

export function subscribeSurveyResponsesForDept(dept) {
  if (state.responsesUnsub) state.responsesUnsub();
  try {
    state.responsesUnsub = db.collection('responses')
      .where('department', '==', dept)
      .onSnapshot((snap) => {
        state.responses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderManagerStats();
      }, (err) => {
        console.error('Responses snapshot error:', err);
      });
  } catch (e) {
    console.error('subscribeSurveyResponsesForDept error:', e);
  }
}

const chartColors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];
const statsChartInstances = new Map();

const destroyStatsCharts = () => {
  statsChartInstances.forEach((chart) => {
    chart.destroy();
  });
  statsChartInstances.clear();
};

const buildPieChartHtml = (labels, counts, chartId) => {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) {
    return { html: '<div class="stats-empty">No responses yet.</div>', chart: null };
  }
  const legend = labels.map((label, idx) => {
    const count = counts[idx] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="legend-item">
        <div class="legend-label">
          <span class="legend-swatch" style="background:${chartColors[idx % chartColors.length]};"></span>
          <span>${label}</span>
        </div>
        <div class="legend-count">${count} (${pct}%)</div>
      </div>
    `;
  }).join('');
  const html = `
    <div class="stats-chart">
      <div class="pie-canvas-wrap">
        <canvas class="stats-pie-canvas" id="${chartId}"></canvas>
      </div>
      <div class="chart-legend">
        ${legend}
      </div>
    </div>
  `;
  return { html, chart: { id: chartId, labels, counts } };
};

const buildTextStatsHtml = (answers) => {
  if (!answers.length) {
    return '<div class="stats-empty">No responses yet.</div>';
  }
  const freq = {};
  const original = {};
  answers.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    freq[key] = (freq[key] || 0) + 1;
    if (!original[key]) original[key] = trimmed;
  });
  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!entries.length) {
    return '<div class="stats-empty">No responses yet.</div>';
  }
  const max = entries[0][1];
  const rows = entries.map(([key, count]) => {
    const width = max ? Math.round((count / max) * 100) : 0;
    return `
      <div class="text-stat">
        <div class="text-label">${original[key]}</div>
        <div class="text-bar"><div class="text-bar-fill" style="width:${width}%"></div></div>
        <div class="text-count">${count}</div>
      </div>
    `;
  }).join('');
  return `
    <div class="text-stats">
      ${rows}
    </div>
  `;
};

const buildSurveyStatsHtml = (survey, responses) => {
  const charts = [];
  const questionBlocks = (survey.questions || []).map((question, idx) => {
    const key = `answer_${idx}`;
    const answerValues = responses.map(r => r.answers?.[key]).filter(v => v !== undefined && v !== null);
    let body = '';
    if (question.type === 'Multiple Choice') {
      const labels = ['Yes', 'No', 'Maybe'];
      const counts = labels.map(label => answerValues.filter(v => v === label).length);
      const chartId = `stats_${survey.id}_${idx}`;
      const result = buildPieChartHtml(labels, counts, chartId);
      body = result.html;
      if (result.chart) charts.push(result.chart);
    } else if (question.type === 'Rating') {
      const labels = ['1', '2', '3', '4', '5'];
      const counts = labels.map(label => answerValues.filter(v => String(v) === label).length);
      const chartId = `stats_${survey.id}_${idx}`;
      const result = buildPieChartHtml(labels, counts, chartId);
      body = result.html;
      if (result.chart) charts.push(result.chart);
    } else {
      const texts = answerValues.map(v => String(v));
      body = buildTextStatsHtml(texts);
    }
    return `
      <div class="stats-question-card">
        <div class="stats-question-title">${idx + 1}. ${question.question}</div>
        <div class="stats-question-type">${question.type}</div>
        ${body}
      </div>
    `;
  }).join('');
  const totalResponses = responses.length;
  const html = `
    <div class="stats-detail-header">
      <div class="stats-detail-title">${survey.title}</div>
      <div class="stats-detail-meta">${totalResponses} response${totalResponses === 1 ? '' : 's'}</div>
    </div>
    <div class="stats-detail-list">
      ${questionBlocks || '<div class="stats-empty">No questions available.</div>'}
    </div>
  `;
  return { html, charts };
};

const addWrappedPdfText = (doc, text, x, y, maxWidth, lineHeight = 6) => {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y.value);
    y.value += lineHeight;
  });
};

const ensurePdfPageSpace = (doc, y, needed = 10) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y.value + needed > pageHeight - 12) {
    doc.addPage();
    y.value = 16;
  }
};

const downloadSurveyStatsPdf = (surveyId) => {
  if (!surveyId) return;
  
  const survey = state.surveys.find(s => s.id === surveyId);
  const responses = (state.responses || []).filter(r => r.surveyId === surveyId);
  
  if (!survey) {
    showNotification('Survey not found', 'error');
    return;
  }
  
  // Try jsPDF first if available
  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      generatePdfWithJsPDF(survey, responses);
      return;
    } catch (error) {
      console.warn('jsPDF failed, falling back to CSV:', error);
    }
  }
  
  // Fallback to CSV export (more reliable)
  generateCsvExport(survey, responses);
};

// Generate PDF using jsPDF (if available)
const generatePdfWithJsPDF = (survey, responses) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(`Survey: ${survey.title}`, 20, 20);
  
  // Add metadata
  doc.setFontSize(12);
  doc.text(`Department: ${getDeptLabel(survey.department)}`, 20, 35);
  doc.text(`Total Responses: ${responses.length}`, 20, 45);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
  
  let y = 70;
  
  // Add questions and statistics
  (survey.questions || []).forEach((question, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.text(`${idx + 1}. ${question.question}`, 20, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.text(`Type: ${question.type}`, 20, y);
    y += 10;
    
    // Add response data
    const key = `answer_${idx}`;
    const answerValues = responses.map(r => r.answers?.[key]).filter(v => v !== undefined && v !== null);
    
    if (answerValues.length > 0) {
      if (question.type === 'Multiple Choice') {
        const counts = { Yes: 0, No: 0, Maybe: 0 };
        answerValues.forEach(v => counts[v] = (counts[v] || 0) + 1);
        
        Object.entries(counts).forEach(([option, count]) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`  ${option}: ${count} (${Math.round((count / answerValues.length) * 100)}%)`, 25, y);
          y += 7;
        });
      } else if (question.type === 'Rating') {
        const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        answerValues.forEach(v => counts[String(v)] = (counts[String(v)] || 0) + 1);
        
        Object.entries(counts).forEach(([rating, count]) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          const stars = '⭐'.repeat(parseInt(rating));
          doc.text(`  ${stars}: ${count} (${Math.round((count / answerValues.length) * 100)}%)`, 25, y);
          y += 7;
        });
      } else {
        // Text responses - show top 5
        const freq = {};
        answerValues.forEach(v => {
          const trimmed = String(v).trim();
          if (trimmed) {
            const key = trimmed.toLowerCase();
            freq[key] = (freq[key] || 0) + 1;
          }
        });
        
        const topEntries = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        topEntries.forEach(([key, count], i) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(`  ${i + 1}. ${key}: ${count}`, 25, y);
          y += 7;
        });
      }
    } else {
      doc.text('No responses yet', 25, y);
      y += 7;
    }
    
    y += 10; // Space between questions
  });
  
  // Save the PDF
  doc.save(`survey-stats-${survey.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
};

// Generate CSV export (more reliable on Infinity Free)
const generateCsvExport = (survey, responses) => {
  try {
    const csvRows = [];
    
    // Header row
    const headers = ['Question', 'Type', 'Responses', 'Statistics'];
    csvRows.push(headers.join(','));
    
    // Data rows
    (survey.questions || []).forEach((question, idx) => {
      const key = `answer_${idx}`;
      const answerValues = responses.map(r => r.answers?.[key]).filter(v => v !== undefined && v !== null);
      
      let stats = '';
      if (answerValues.length > 0) {
        if (question.type === 'Multiple Choice') {
          const counts = { Yes: 0, No: 0, Maybe: 0 };
          answerValues.forEach(v => counts[v] = (counts[v] || 0) + 1);
          stats = Object.entries(counts)
            .map(([option, count]) => `${option}: ${count} (${Math.round((count / answerValues.length) * 100)}%)`)
            .join('; ');
        } else if (question.type === 'Rating') {
          const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
          answerValues.forEach(v => counts[String(v)] = (counts[String(v)] || 0) + 1);
          stats = Object.entries(counts)
            .map(([rating, count]) => `${'⭐'.repeat(parseInt(rating))}: ${count} (${Math.round((count / answerValues.length) * 100)}%)`)
            .join('; ');
        } else {
          // Text responses - show top 5
          const freq = {};
          answerValues.forEach(v => {
            const trimmed = String(v).trim();
            if (trimmed) {
              const key = trimmed.toLowerCase();
              freq[key] = (freq[key] || 0) + 1;
            }
          });
          
          const topEntries = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          
          stats = topEntries
            .map(([key, count], i) => `${i + 1}. ${key}: ${count}`)
            .join('; ');
        }
      } else {
        stats = 'No responses yet';
      }
      
      const row = [
        `"${question.question.replace(/"/g, '""')}"`,
        question.type,
        answerValues.length,
        `"${stats.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-stats-${survey.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('CSV file downloaded successfully', 'success');
    
  } catch (error) {
    console.error('CSV export failed:', error);
    showNotification('Export failed. Using print fallback.', 'error');
    
    // Ultimate fallback: print
    document.body.classList.add('printing-stats');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-stats');
    }, 300);
  }
};

export function openSurveyStatsModal(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  const modal = document.getElementById('statsModal');
  const content = document.getElementById('surveyStatsContent');
  if (!survey || !modal || !content) return;
  const responses = (state.responses || []).filter(r => r.surveyId === surveyId);
  const result = buildSurveyStatsHtml(survey, responses);
  content.innerHTML = result.html;
  const downloadBtn = document.getElementById('downloadStatsPdfBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadSurveyStatsPdf(surveyId);
    downloadBtn.disabled = false;
  }
  destroyStatsCharts();
  if (!window.Chart) {
    showNotification('Chart.js failed to load. Check the CDN script.', 'error');
  } else {
    requestAnimationFrame(() => {
      result.charts.forEach((chartData) => {
        const canvas = document.getElementById(chartData.id);
        if (!canvas) return;
        const chart = new Chart(canvas, {
          type: 'pie',
          data: {
            labels: chartData.labels,
            datasets: [{
              data: chartData.counts,
              backgroundColor: chartColors.slice(0, chartData.labels.length),
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            }
          }
        });
        statsChartInstances.set(chartData.id, chart);
      });
    });
  }
  modal.classList.remove('hidden');
  const modalContent = modal.querySelector('.stats-modal-content');
  if (window.gsap && modalContent) {
    gsap.fromTo(modalContent, { opacity: 0, y: 12, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' });
  }
}

export function closeStatsModal() {
  const modal = document.getElementById('statsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  const content = document.getElementById('surveyStatsContent');
  if (content) content.innerHTML = '';
  destroyStatsCharts();
}

export function renderManagerStats() {
  const panel = document.getElementById('managerStats');
  if (!panel) return;
  if (!state.selectedDept) {
    panel.innerHTML = '';
    return;
  }
  const deptSurveys = state.surveys.filter(s => s.department === state.selectedDept);
  const counts = deptSurveys.reduce((acc, survey) => {
    acc[survey.id] = 0;
    return acc;
  }, {});
  state.responses.forEach((response) => {
    if (counts[response.surveyId] !== undefined) {
      counts[response.surveyId] += 1;
    }
  });
  const maxCount = Math.max(0, ...Object.values(counts));
  const rows = deptSurveys.map((survey) => {
    const count = counts[survey.id] || 0;
    const width = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100);
    return `
      <div class="stats-row">
        <div class="stats-label">${survey.title}</div>
        <div class="stats-bar"><div class="stats-bar-fill" style="width: ${width}%;"></div></div>
        <div class="stats-value">${count}</div>
        <button class="btn btn-secondary stats-action" data-survey-id="${survey.id}">View</button>
      </div>
    `;
  }).join('');
  panel.innerHTML = `
    <div class="stats-title">Survey Responses</div>
    <div class="stats-list">
      ${rows || '<div class="stats-label">No responses yet.</div>'}
    </div>
  `;
  panel.querySelectorAll('.stats-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-survey-id');
      if (id) openSurveyStatsModal(id);
    });
  });
}

// Export for global access
if (typeof window !== 'undefined') {
  window.editSurvey = editSurvey;
  window.deleteSurvey = deleteSurvey;
  window.openAnswerSurveyModal = openAnswerSurveyModal;
  window.openSurveyStatsModal = openSurveyStatsModal;
}

