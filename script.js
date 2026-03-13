// ==================== GSAP SETUP ====================
gsap.registerPlugin(ScrollTrigger);

// ==================== FIREBASE INITIALIZATION ====================
const firebaseConfig = {
  apiKey: "AIzaSyBEYA5OHcc5zIWiJMHBwFQSIT3j9VrilaI",
  authDomain: "school-survey-system.firebaseapp.com",
  projectId: "school-survey-system",
  storageBucket: "school-survey-system.firebasestorage.app",
  messagingSenderId: "99847713017",
  appId: "1:99847713017:web:556670dde6d4246387f228",
  measurementId: "G-0CTS1WN8F9"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== STATE MANAGEMENT ====================
const state = {
  currentUser: null,
  userRole: null,
  userDept: null, 
  selectedDept: null,
  surveys: [],
  approvals: [],
  users: [],
  editingSurveyId: null,
  currentFilter: 'pending',
  surveysUnsub: null,
  approvalsUnsub: null,
  usersUnsub: null
};

function getNormalizedRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return 'respondent';
  if (r.includes('admin')) return 'admin';
  if (r.includes('iso')) return 'iso_secretary';
  if (r.includes('manager')) return 'manager';
  if (r.includes('student')) return 'student';
  if (r.includes('parent')) return 'parent';
  if (r.includes('respondent')) return 'respondent';
  return ['admin', 'manager', 'iso_secretary', 'respondent', 'student', 'parent'].includes(r) ? r : 'respondent';
}

function computeEffectiveRole(userData) {
  const normalized = getNormalizedRole(userData?.role);
  if (normalized === 'respondent' && userData?.department) {
    return 'manager';
  }
  return normalized;
}

// ==================== SAMPLE DATA ====================
const sampleSurveys = {
  cafeteria: [
    {
      id: 'survey_1',
      title: 'Meal Quality Feedback',
      description: 'Help us improve our meal quality and variety',
      department: 'cafeteria',
      status: 'approved',
      createdBy: 'manager1@school.edu',
      questions: [
        { question: 'Rate the quality of today\'s meal', type: 'Rating' },
        { question: 'What improvements would you suggest?', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_1b',
      title: 'Menu Variety Suggestions',
      description: 'Tell us what dishes you want added',
      department: 'cafeteria',
      status: 'approved',
      createdBy: 'manager1@school.edu',
      questions: [
        { question: 'Rate current menu variety', type: 'Rating' },
        { question: 'Suggest new dishes', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_1c',
      title: 'Dining Experience Check',
      description: 'Share your overall dining experience',
      department: 'cafeteria',
      status: 'pending',
      createdBy: 'manager1@school.edu',
      questions: [
        { question: 'Is seating comfortable?', type: 'Multiple Choice' },
        { question: 'Cleanliness rating', type: 'Rating' }
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ],
  library: [
    {
      id: 'survey_2',
      title: 'Library Services Survey',
      description: 'Feedback on our library services and resources',
      department: 'library',
      status: 'approved',
      createdBy: 'manager2@school.edu',
      questions: [
        { question: 'Are the opening hours convenient?', type: 'Multiple Choice' },
        { question: 'Book collection quality rating', type: 'Rating' }
      ],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_2b',
      title: 'Study Space Feedback',
      description: 'Help improve study areas',
      department: 'library',
      status: 'approved',
      createdBy: 'manager2@school.edu',
      questions: [
        { question: 'Noise level rating', type: 'Rating' },
        { question: 'Are seats sufficient?', type: 'Multiple Choice' }
      ],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_2c',
      title: 'Digital Resources Survey',
      description: 'Evaluate e-books and databases',
      department: 'library',
      status: 'pending',
      createdBy: 'manager2@school.edu',
      questions: [
        { question: 'Ease of access to e-books', type: 'Rating' },
        { question: 'What resources should be added?', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  ],
  finance: [
    {
      id: 'survey_3',
      title: 'Fee Structure Feedback',
      description: 'Opinion on current fee structure',
      department: 'finance',
      status: 'pending',
      createdBy: 'manager3@school.edu',
      questions: [
        { question: 'Is the fee structure transparent?', type: 'Multiple Choice' },
        { question: 'Payment process feedback', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_3b',
      title: 'Cashier Service Feedback',
      description: 'Rate your experience with the cashier',
      department: 'finance',
      status: 'approved',
      createdBy: 'manager3@school.edu',
      questions: [
        { question: 'Queue time rating', type: 'Rating' },
        { question: 'Staff helpfulness', type: 'Multiple Choice' }
      ],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    }
  ],
  bookstore: [
    {
      id: 'survey_4',
      title: 'Bookstore Inventory Survey',
      description: 'Help us stock the books you need',
      department: 'bookstore',
      status: 'approved',
      createdBy: 'manager4@school.edu',
      questions: [
        { question: 'Book availability rating', type: 'Rating' },
        { question: 'What books would you like?', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_4b',
      title: 'Pricing Feedback',
      description: 'Share thoughts on pricing and discounts',
      department: 'bookstore',
      status: 'approved',
      createdBy: 'manager4@school.edu',
      questions: [
        { question: 'Fair pricing rating', type: 'Rating' },
        { question: 'Preferred discount types', type: 'Multiple Choice' }
      ],
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'survey_4c',
      title: 'Checkout Experience',
      description: 'Help us improve checkout flow',
      department: 'bookstore',
      status: 'pending',
      createdBy: 'manager4@school.edu',
      questions: [
        { question: 'Was checkout quick?', type: 'Multiple Choice' },
        { question: 'Suggestions for improvement', type: 'Text' }
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeAuthListener();
  setupEventListeners();
  setupAnimations();
  setupLinkTransitions();
  if (sessionStorage.getItem('redirected_from_login') === 'true') {
    const overlay = ensureCurtain();
    if (overlay) overlay.classList.add('active');
    // Defer curtain reveal until role is resolved
  }
});

// ==================== FIREBASE AUTH ====================
function initializeAuthListener() {
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
        } else {
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
        state.currentUser = null;
        state.userRole = 'respondent';
        renderDashboard();
      } else {
        navigateWithCurtain('/index.html');
      }
    }
  });
}

function updateUserInfo(user, role) {
  const userInfoEl = document.getElementById('userInfo');
  const roleDisplayEl = document.getElementById('roleDisplay');

  if (user) {
    userInfoEl.textContent = user.displayName || user.email;
    const roleNames = {
      'manager': 'Manager',
      'iso_secretary': 'ISO Secretary',
      'admin': 'Administrator',
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

// ==================== VIEW MANAGEMENT ====================
function showAppropriateView() {
  console.log('Showing view for role:', state.userRole);
  switch (state.userRole) {
    case 'admin':
      showAdminView();
      break;
    case 'manager':
      showManagerView();
      break;
    case 'iso_secretary':
      showISOView();
      break;
    case 'respondent':
    case 'student':
    case 'parent':
      showGuestView();
      break;
    default:
      showGuestView();
  }
}

function renderDashboard() {
  updateUserInfo(state.currentUser, state.userRole);
  if (state.currentUser && !state.userRole) {
    return;
  }
  const path = window.location.pathname.toLowerCase();
  const isMain = path.endsWith('/main.html') || path.endsWith('\\main.html');
  const isAdminPage = path.endsWith('/admin.html');
  const isISOPage = path.endsWith('/iso.html');
  const isManagerPage = path.endsWith('/manager.html');
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

function showRespondentView() {
  state.userRole = 'respondent';
  document.getElementById('respondentView').classList.remove('hidden');
  document.getElementById('managerView').classList.add('hidden');
  document.getElementById('isoView').classList.add('hidden');
  document.getElementById('managerSection').classList.add('hidden');
  document.getElementById('isoSection').classList.add('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  
  gsap.from('.welcome-section', {
    duration: 0.6,
    opacity: 0,
    y: 20,
    ease: 'power2.out'
  });
}

function showGuestView() {
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

  if (!state.selectedDept) {
    state.selectedDept = 'cafeteria';
    const cafBtn = document.querySelector('.dept-btn[data-dept="cafeteria"]');
    if (cafBtn) cafBtn.classList.add('active');
  }
  state.surveys = [];
  subscribeApprovedSurveysForDept(state.selectedDept);
  renderRespondentSurveys();
  animateGrid();
}
function showManagerView() {
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
    const btn = document.querySelector(`.dept-btn[data-dept="${state.userDept}"]`);
    if (btn) {
      document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  }

  if (state.userDept) {
    state.selectedDept = state.userDept;
  }
  subscribeManagerSurveys(state.userDept || state.selectedDept || 'cafeteria');
  renderSurveys();
  animateGrid();
}

function showISOView() {
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

function showAdminView() {
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
    gsap.from('.users-list', { opacity: 0, y: 12, duration: 0.5, ease: 'power2.out', delay: 0.7 });
  }
}

function showRespondentView() {
  state.userRole = 'respondent';
  document.getElementById('respondentView').classList.add('hidden');
  document.getElementById('managerView').classList.add('hidden');
  document.getElementById('isoView').classList.add('hidden');
  document.getElementById('respondentView').classList.remove('hidden');
  document.getElementById('adminView').classList.add('hidden');
  document.getElementById('managerSection').classList.add('hidden');
  document.getElementById('isoSection').classList.add('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  
  // Set default department if not set
  if (!state.selectedDept) {
    state.selectedDept = 'cafeteria';
    const cafBtn = document.querySelector('.dept-btn[data-dept="cafeteria"]');
    if (cafBtn) cafBtn.classList.add('active');
  }
  
  renderRespondentSurveys();
  animateGrid();
}

function renderRespondentSurveys() {
  const grid = document.getElementById('respondentSurveysGrid');
  const emptySurveys = document.getElementById('emptyRespondentSurveys');

  // Show only approved surveys, filtered by selected department
  let approvedSurveys = state.surveys.filter(s => s.status === 'approved');
  
  if (state.selectedDept) {
    approvedSurveys = approvedSurveys.filter(s => s.department === state.selectedDept);
  }

  if (approvedSurveys.length === 0) {
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
  } else {
    emptySurveys.style.display = 'none';
    grid.innerHTML = approvedSurveys.map((survey, idx) => `
      <div class="survey-card" style="animation-delay: ${idx * 0.1}s" onclick="openAnswerSurveyModal('${survey.id}')">
        <span class="survey-status approved">Available</span>
        <h3>${survey.title}</h3>
        <p>${survey.description}</p>
        <div class="survey-actions">
          <button class="btn btn-primary" style="width: 100%;">Answer Survey</button>
        </div>
      </div>
    `).join('');
  }
}

function openAnswerSurveyModal(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) return;

  const modal = document.getElementById('surveyModal');
  const form = document.getElementById('surveyForm');
  const title = document.getElementById('modalTitle');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  title.textContent = `Answer Survey: ${survey.title}`;
  form.reset();
  
  // Hide add question button for respondents
  if (addQuestionBtn) {
    addQuestionBtn.style.display = 'none';
  }
  // Hide creation fields
  if (titleInput) titleInput.closest('.form-group').style.display = 'none';
  if (descInput) descInput.closest('.form-group').style.display = 'none';
  if (deptSelect) deptSelect.closest('.form-group').style.display = 'none';
  if (submitBtn) submitBtn.textContent = 'Submit Answers';
  
  // Render survey questions as read-only display
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
  
  // Replace form submit to handle survey submission
  const surveyForm = document.getElementById('surveyForm');
  surveyForm.onsubmit = (e) => {
    e.preventDefault();
    submitSurveyAnswers(survey.id);
  };
  
  modal.classList.remove('hidden');
}

function submitSurveyAnswers(surveyId) {
  const answers = {};
  const form = document.getElementById('surveyForm');
  const formData = new FormData(form);
  
  for (let [key, value] of formData.entries()) {
    answers[key] = value;
  }
  
  console.log('Survey answered:', surveyId, answers);
  showNotification('Thank you! Your response has been submitted.', 'success');
  document.getElementById('surveyModal').classList.add('hidden');
  renderRespondentSurveys();
}

// ==================== SURVEY MANAGEMENT ====================
function loadSampleSurveys() {
  state.surveys = [];
  Object.values(sampleSurveys).forEach(deptSurveys => {
    state.surveys.push(...deptSurveys);
  });

  // Initialize sample approvals
  state.approvals = state.surveys.filter(s => s.status === 'pending').map(s => ({
    ...s,
    requestedAction: 'create',
    approvalStatus: 'pending'
  }));
}

function subscribeApprovedSurveysForDept(dept) {
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

function subscribeManagerSurveys(dept) {
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

function subscribeApprovals() {
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

async function submitApprovalRequest(action, payload) {
  const base = {
    requestedAction: action,
    approvalStatus: 'pending',
    createdBy: state.currentUser?.email || 'manager@school.edu',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const docData = { ...base, ...payload };
  try {
    // Prevent duplicate pending approvals for the same target
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

function renderSurveys() {
  const grid = document.getElementById('surveysGrid');
  const emptySurveys = document.getElementById('emptySurveys');
  const deptTitle = document.getElementById('managerDeptTitle');

  if (!state.selectedDept) {
    deptTitle.textContent = 'Select a Department';
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
    emptySurveys.querySelector('p').textContent = 'Select a department from the sidebar to manage surveys.';
    return;
  }

  deptTitle.textContent = `${state.selectedDept.charAt(0).toUpperCase() + state.selectedDept.slice(1)} Surveys`;
  document.getElementById('currentDept').textContent = state.selectedDept.charAt(0).toUpperCase() + state.selectedDept.slice(1);

  const filteredSurveys = state.surveys.filter(s => s.department === state.selectedDept);

  if (filteredSurveys.length === 0) {
    grid.innerHTML = '';
    emptySurveys.style.display = 'flex';
    emptySurveys.querySelector('p').textContent = 'No surveys yet. Create one to get started!';
  } else {
    emptySurveys.style.display = 'none';
    const editLabel = state.userRole === 'manager' ? 'Request Update' : 'Edit';
    const deleteLabel = state.userRole === 'manager' ? 'Request Delete' : 'Delete';
    grid.innerHTML = filteredSurveys.map((survey, idx) => `
      <div class="survey-card" style="animation-delay: ${idx * 0.1}s">
        <span class="survey-status ${survey.status}">${survey.status}</span>
        <h3>${survey.title}</h3>
        <p>${survey.description}</p>
        <div class="survey-actions">
          <button class="edit-survey" onclick="editSurvey('${survey.id}')">${editLabel}</button>
          <button class="delete-survey" onclick="deleteSurvey('${survey.id}')">${deleteLabel}</button>
        </div>
      </div>
    `).join('');
  }
}

function editSurvey(surveyId) {
  const survey = state.surveys.find(s => s.id === surveyId);
  if (!survey) return;

  state.editingSurveyId = surveyId;
  openSurveyModal(survey);
}

function deleteSurvey(surveyId) {
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

function openSurveyModal(survey = null) {
  const modal = document.getElementById('surveyModal');
  const form = document.getElementById('surveyForm');
  const title = document.getElementById('modalTitle');
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (survey) {
    title.textContent = state.userRole === 'manager' ? 'Request Update' : 'Edit Survey';
    titleInput.value = survey.title;
    descInput.value = survey.description;
    deptSelect.value = survey.department;
    renderQuestions(survey.questions);
  } else {
    title.textContent = state.userRole === 'manager' ? 'Request Approval' : 'Create Survey';
    form.reset();
    titleInput.value = '';
    descInput.value = '';
    deptSelect.value = state.selectedDept || 'cafeteria';
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
  }

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

function attachQuestionListeners() {
  document.querySelectorAll('.remove-question').forEach(btn => {
    btn.style.display = 'block';
    btn.onclick = (e) => {
      e.preventDefault();
      e.target.closest('.question-item').remove();
    };
  });
}

function closeSurveyModal() {
  document.getElementById('surveyModal').classList.add('hidden');
  state.editingSurveyId = null;
  // Restore creation fields if they were hidden for answering
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  if (addQuestionBtn) addQuestionBtn.style.display = 'inline-block';
  const titleInput = document.getElementById('surveyTitle');
  const descInput = document.getElementById('surveyDesc');
  const deptSelect = document.getElementById('surveyDept');
  const form = document.getElementById('surveyForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (titleInput) titleInput.closest('.form-group').style.display = '';
  if (descInput) descInput.closest('.form-group').style.display = '';
  if (deptSelect) deptSelect.closest('.form-group').style.display = '';
  if (deptSelect) deptSelect.disabled = false;
  if (submitBtn) submitBtn.textContent = 'Save Survey';
  // Remove custom submit override to restore default handler
  form.onsubmit = null;
}

// ==================== APPROVALS ====================
function renderApprovals() {
  const list = document.getElementById('approvalsList');
  const emptyState = document.getElementById('emptyApprovals');
  const filter = state.currentFilter;

  const filtered = state.approvals.filter(a => a.approvalStatus === filter);
  const approvalCount = state.approvals.filter(a => a.approvalStatus === 'pending').length;
  document.getElementById('approvalCount').textContent = approvalCount;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    list.innerHTML = filtered.map((approval, idx) => `
      <div class="approval-item" onclick="openApprovalModal('${approval.id}')" style="animation-delay: ${idx * 0.1}s">
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

function openApprovalModal(approvalId) {
  const approval = state.approvals.find(a => a.id === approvalId);
  if (!approval) return;

  const modal = document.getElementById('approvalModal');
  const details = document.getElementById('approvalDetails');

  details.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h3 style="color: #e0e0e0; margin-bottom: 1rem;">${approval.title}</h3>
      <p style="color: #a0aec0; margin-bottom: 0.5rem;"><strong>Department:</strong> ${approval.department}</p>
      <p style="color: #a0aec0; margin-bottom: 0.5rem;"><strong>Requested by:</strong> ${approval.createdBy}</p>
      <p style="color: #a0aec0; margin-bottom: 1rem;"><strong>Request Type:</strong> ${approval.requestedAction}</p>
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

function approveChange(approvalId) {
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showNotification('Survey creation approved', 'success');
    } else if (approval.requestedAction === 'update') {
      if (approval.surveyId) {
        await surveysCol.doc(approval.surveyId).update({
          title: approval.title,
          description: approval.description,
          department: approval.department,
          questions: approval.questions,
          status: 'approved'
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

function rejectChange(approvalId) {
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

function closeApprovalModal() {
  document.getElementById('approvalModal').classList.add('hidden');
}

// ==================== ADMIN USER MANAGEMENT ====================
async function createUser(name, email, password, role, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await user.updateProfile({ displayName: name });

    await db.collection('users').doc(user.uid).set({
      name: name,
      email: email,
      role: role,
      department: department || null,
      createdAt: new Date(),
      createdBy: state.currentUser.email
    });

    showNotification(`User "${name}" created successfully with role: ${role}`, 'success');
    document.getElementById('createUserModal').classList.add('hidden');
    document.getElementById('createUserForm').reset();
    return true;
  } catch (error) {
    showNotification('Error creating user: ' + error.message, 'error');
    return false;
  }
}

function subscribeUsers() {
  if (state.usersUnsub) state.usersUnsub();
  try {
    state.usersUnsub = db.collection('users')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => {
        state.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUsers();
      }, (err) => {
        console.error('Users snapshot error:', err);
      });
  } catch (e) {
    console.error('subscribeUsers error:', e);
  }
}

function renderUsers() {
  const list = document.getElementById('usersList');
  const emptyUsers = document.getElementById('emptyUsers');
  if (!list || !emptyUsers) return;

  const query = String(state.usersSearchQuery || '').toLowerCase().trim();
  const users = !query ? state.users : state.users.filter(u => {
    const name = String(u.name || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    const dept = String(u.department || '').toLowerCase();
    return name.includes(query) || email.includes(query) || role.includes(query) || dept.includes(query);
  });

  if (!users || users.length === 0) {
    list.innerHTML = '';
    emptyUsers.style.display = 'flex';
    return;
  }

  emptyUsers.style.display = 'none';

  list.innerHTML = users.map(user => {
    const role = String(user.role || 'respondent');
    const department = user.department || '';
    const roleLabelMap = {
      admin: 'Admin',
      manager: 'Manager',
      iso_secretary: 'ISO Secretary',
      student: 'Student',
      parent: 'Parent',
      respondent: 'Respondent'
    };
    const deptLabelMap = {
      '': 'No Department',
      cafeteria: 'Cafeteria',
      library: 'Library',
      finance: 'Finance',
      bookstore: 'Bookstore'
    };
    const roleLabel = roleLabelMap[role] || roleLabelMap.respondent;
    const deptLabel = deptLabelMap[department] || deptLabelMap[''];
    return `
      <div class="user-item">
        <div class="user-main">
          <div class="user-name">${user.name || ''}</div>
          <div class="user-email">${user.email || ''}</div>
        </div>
        <div class="user-controls">
          <div class="dropdown user-role-dropdown" data-user-id="${user.id}">
            <input type="hidden" class="user-role-input" value="${role}">
            <button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="dropdown-label">${roleLabel}</span>
              <span class="dropdown-icon">▾</span>
            </button>
            <ul class="dropdown-menu hidden" role="listbox">
              <li class="dropdown-item" data-value="admin">Admin</li>
              <li class="dropdown-item" data-value="manager">Manager</li>
              <li class="dropdown-item" data-value="iso_secretary">ISO Secretary</li>
              <li class="dropdown-item" data-value="student">Student</li>
              <li class="dropdown-item" data-value="parent">Parent</li>
              <li class="dropdown-item" data-value="respondent">Respondent</li>
            </ul>
          </div>
          <div class="dropdown user-dept-dropdown" data-user-id="${user.id}">
            <input type="hidden" class="user-dept-input" value="${department}">
            <button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="dropdown-label">${deptLabel}</span>
              <span class="dropdown-icon">▾</span>
            </button>
            <ul class="dropdown-menu hidden" role="listbox">
              <li class="dropdown-item" data-value="">No Department</li>
              <li class="dropdown-item" data-value="cafeteria">Cafeteria</li>
              <li class="dropdown-item" data-value="library">Library</li>
              <li class="dropdown-item" data-value="finance">Finance</li>
              <li class="dropdown-item" data-value="bookstore">Bookstore</li>
            </ul>
          </div>
          <button class="btn btn-secondary user-save-btn" data-user-id="${user.id}">Save</button>
          <button class="btn btn-danger user-delete-btn" data-user-id="${user.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  attachUserEventHandlers();
  if (window.gsap) {
    const items = document.querySelectorAll('.users-list .user-item');
    if (items.length) {
      gsap.from(items, { opacity: 0, y: 10, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
    }
  }
}

function attachUserEventHandlers() {
  document.querySelectorAll('.user-save-btn').forEach(btn => {
    btn.onclick = async () => {
      const userId = btn.dataset.userId;
      if (!userId) return;
      const roleInput = document.querySelector(`.user-role-dropdown[data-user-id="${userId}"] .user-role-input`);
      const deptInput = document.querySelector(`.user-dept-dropdown[data-user-id="${userId}"] .user-dept-input`);
      const role = roleInput ? roleInput.value : 'respondent';
      const department = deptInput ? deptInput.value : '';
      try {
        const updates = {
          role: role,
          department: role === 'manager' && department ? department : null
        };
        await db.collection('users').doc(userId).update(updates);
        showNotification('User updated', 'success');
      } catch (e) {
        console.error('updateUser error:', e);
        showNotification('Error updating user: ' + (e.message || e), 'error');
      }
    };
  });

  document.querySelectorAll('.user-delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const userId = btn.dataset.userId;
      if (!userId) return;
      const user = state.users.find(u => u.id === userId);
      const label = user && user.email ? user.email : userId;
      if (!confirm(`Delete user document for "${label}"?`)) return;
      try {
        await db.collection('users').doc(userId).delete();
        showNotification('User document deleted', 'success');
      } catch (e) {
        console.error('deleteUser error:', e);
        showNotification('Error deleting user: ' + (e.message || e), 'error');
      }
    };
  });

  document.querySelectorAll('.user-role-dropdown').forEach(initDropdown);
  document.querySelectorAll('.user-dept-dropdown').forEach(initDropdown);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        sessionStorage.removeItem('respondent');
        sessionStorage.setItem('redirected_to_login', 'true');
        navigateWithCurtain('/index.html');
      });
    });
  }

  // Department buttons
  document.querySelectorAll('.dept-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
      const dept = btn.dataset.dept;
      if (state.userRole === 'manager' && state.userDept && dept !== state.userDept) {
        const assignedBtn = document.querySelector(`.dept-btn[data-dept="${state.userDept}"]`);
        if (assignedBtn) assignedBtn.classList.add('active');
        showNotification('You can only manage your assigned department.', 'warning');
        return;
      }
      btn.classList.add('active');
      state.selectedDept = state.userRole === 'manager' && state.userDept ? state.userDept : dept;

      if (state.userRole === 'manager') {
        subscribeManagerSurveys(state.selectedDept);
        renderSurveys();
        animateGrid();
      } else if (state.userRole === 'respondent' || state.userRole === 'student' || state.userRole === 'parent') {
        subscribeApprovedSurveysForDept(state.selectedDept);
        renderRespondentSurveys();
        animateGrid();
      }
    });
  });

  // Create survey
  const createSurveyBtn = document.getElementById('createSurveyBtn');
  if (createSurveyBtn) {
    createSurveyBtn.addEventListener('click', () => {
      if (state.userRole === 'manager') {
        if (!state.userDept) {
          if (state.selectedDept) {
            state.userDept = state.selectedDept;
          } else {
            alert('Please select your department first');
            return;
          }
        }
        document.getElementById('surveyDept').value = state.userDept;
      }
      openSurveyModal();
    });
  }

  const createSurveyAdminBtn = document.getElementById('createSurveyAdminBtn');
  if (createSurveyAdminBtn) {
    createSurveyAdminBtn.addEventListener('click', () => {
      openSurveyModal();
    });
  }

  // Survey form
  const surveyFormEl = document.getElementById('surveyForm');
  if (surveyFormEl) {
    surveyFormEl.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('surveyTitle').value;
      const desc = document.getElementById('surveyDesc').value;
      if (state.userRole === 'manager' && !state.userDept && state.selectedDept) {
        state.userDept = state.selectedDept;
      }
      const dept = state.userRole === 'manager' && state.userDept ? state.userDept : document.getElementById('surveyDept').value;
      const questions = Array.from(document.querySelectorAll('.question-item')).map(item => ({
        question: item.querySelector('.question-input').value,
        type: item.querySelector('.question-type').value
      })).filter(q => q.question.trim());

      if (state.userRole === 'manager' && !state.userDept) {
        showNotification('Manager department is required', 'warning');
        return;
      }

      if (!title || !questions.length) {
        showNotification('Please fill in all required fields', 'warning');
        return;
      }

      if (state.editingSurveyId) {
        const survey = state.surveys.find(s => s.id === state.editingSurveyId);
        if (!survey) {
          showNotification('Survey not found', 'error');
        } else {
          submitApprovalRequest('update', {
            surveyId: survey.id,
            title,
            description: desc,
            department: dept,
            questions
          });
        }
      } else {
        submitApprovalRequest('create', {
          title,
          description: desc,
          department: dept,
          questions
        });
      }

      closeSurveyModal();
      renderApprovals();
      animateGrid();
    });
  }

  // Add question button
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const container = document.getElementById('questionsContainer');
      const newQuestion = document.createElement('div');
      newQuestion.className = 'question-item';
      newQuestion.innerHTML = `
        <input type="text" class="question-input" placeholder="Enter question">
        <select class="question-type">
          <option>Multiple Choice</option>
          <option>Text</option>
          <option>Rating</option>
        </select>
        <button type="button" class="btn-icon remove-question">🗑️</button>
      `;
      container.appendChild(newQuestion);
      attachQuestionListeners();
    });
  }

  // Modal close buttons
  const closeModalBtn = document.getElementById('closeModal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeSurveyModal);
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeSurveyModal);
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('surveyModal');
      if (!modal.classList.contains('hidden')) {
        closeSurveyModal();
      }
    }
  });

  const closeApprovalModalBtn = document.getElementById('closeApprovalModal');
  if (closeApprovalModalBtn) closeApprovalModalBtn.addEventListener('click', closeApprovalModal);
  // Escape key to close approval modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('approvalModal');
      if (!modal.classList.contains('hidden')) {
        closeApprovalModal();
      }
    }
  });

  // Approval tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.tab;
      renderApprovals();
      animateApprovals();
    });
  });

  // Admin - Create User Button
  const createUserBtn = document.getElementById('createUserBtn');
  if (createUserBtn) {
    createUserBtn.addEventListener('click', () => {
      document.getElementById('createUserModal').classList.remove('hidden');
    });
  }

  // Admin - Create User Form
  const createUserForm = document.getElementById('createUserForm');
  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('newUserName').value;
      const email = document.getElementById('newUserEmail').value;
      const password = document.getElementById('newUserPassword').value;
      const role = document.getElementById('newUserRole').value;
      const department = document.getElementById('newUserDept').value;

      await createUser(name, email, password, role, role === 'manager' ? department : null);
    });
  }

  // Admin - Close Create User Modal
  const closeCreateUserModal = document.getElementById('closeCreateUserModal');
  if (closeCreateUserModal) {
    closeCreateUserModal.addEventListener('click', () => {
      document.getElementById('createUserModal').classList.add('hidden');
      document.getElementById('createUserForm').reset();
    });
  }

  const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
  if (cancelCreateUserBtn) {
    cancelCreateUserBtn.addEventListener('click', () => {
      document.getElementById('createUserModal').classList.add('hidden');
      document.getElementById('createUserForm').reset();
    });
  }

  const createUserOverlay = document.getElementById('createUserOverlay');
  if (createUserOverlay) {
    createUserOverlay.addEventListener('click', () => {
      document.getElementById('createUserModal').classList.add('hidden');
      document.getElementById('createUserForm').reset();
    });
  }

  // Toggle department select based on role
  const newUserRole = document.getElementById('newUserRole');
  const deptSelectGroup = document.getElementById('deptSelectGroup');
  if (newUserRole && deptSelectGroup) {
    newUserRole.addEventListener('change', (e) => {
      if (e.target.value === 'manager') {
        deptSelectGroup.style.display = 'block';
      } else {
        deptSelectGroup.style.display = 'none';
      }
    });
  }
  initAdminDropdowns();

  // Users search toolbar
  const userSearchInput = document.getElementById('userSearchInput');
  const userSearchBtn = document.getElementById('userSearchBtn');
  const userSearchClearBtn = document.getElementById('userSearchClearBtn');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', () => {
      state.usersSearchQuery = userSearchInput.value;
      renderUsers();
    });
    userSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        state.usersSearchQuery = userSearchInput.value;
        renderUsers();
      }
    });
  }
  if (userSearchBtn) {
    userSearchBtn.addEventListener('click', () => {
      state.usersSearchQuery = userSearchInput ? userSearchInput.value : '';
      renderUsers();
    });
  }
  if (userSearchClearBtn) {
    userSearchClearBtn.addEventListener('click', () => {
      if (userSearchInput) userSearchInput.value = '';
      state.usersSearchQuery = '';
      renderUsers();
    });
  }
}

function initDropdown(dd) {
  if (!dd) return;
  const trigger = dd.querySelector('.dropdown-trigger');
  const menu = dd.querySelector('.dropdown-menu');
  const label = dd.querySelector('.dropdown-label');
  const hidden = dd.querySelector('input[type="hidden"]');
  let open = false;
  let backdrop = null;
  let originalParent = null;
  let originalNextSibling = null;
  const showMenu = () => {
    if (open) return;
    open = true;
    trigger.setAttribute('aria-expanded', 'true');
    // Portal the menu to body to escape stacking contexts
    originalParent = menu.parentNode;
    originalNextSibling = menu.nextSibling;
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.style.zIndex = '3001';
    document.body.appendChild(menu);
    menu.classList.remove('hidden');
    backdrop = document.createElement('div');
    backdrop.className = 'dropdown-backdrop';
    backdrop.addEventListener('click', () => hideMenu());
    document.body.appendChild(backdrop);
    if (window.gsap) {
      const items = menu.querySelectorAll('.dropdown-item');
      gsap.fromTo(menu, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' });
      gsap.fromTo(items, { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, stagger: 0.04, ease: 'power2.out' });
    }
  };
  const hideMenu = () => {
    if (!open) return;
    open = false;
    if (window.gsap) {
      gsap.to(menu, {
        y: -6, opacity: 0, duration: 0.15, ease: 'power2.inOut',
        onComplete: () => {
          menu.classList.add('hidden');
          trigger.setAttribute('aria-expanded', 'false');
          if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
          backdrop = null;
          // restore menu to original parent
          if (originalParent) {
            if (originalNextSibling) {
              originalParent.insertBefore(menu, originalNextSibling);
            } else {
              originalParent.appendChild(menu);
            }
          }
          menu.style.position = '';
          menu.style.top = '';
          menu.style.left = '';
          menu.style.width = '';
          menu.style.zIndex = '';
        }
      });
    } else {
      menu.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      backdrop = null;
      if (originalParent) {
        if (originalNextSibling) {
          originalParent.insertBefore(menu, originalNextSibling);
        } else {
          originalParent.appendChild(menu);
        }
      }
      menu.style.position = '';
      menu.style.top = '';
      menu.style.left = '';
      menu.style.width = '';
      menu.style.zIndex = '';
    }
  };
  const setInitial = () => {
    const value = hidden ? hidden.value : null;
    const items = menu.querySelectorAll('.dropdown-item');
    let match = null;
    items.forEach(i => {
      const selected = i.dataset.value === value;
      i.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected) match = i;
    });
    if (match && label) label.textContent = match.textContent;
  };
  setInitial();
  trigger.addEventListener('click', () => open ? hideMenu() : showMenu());
  document.addEventListener('click', (e) => { if (!(dd.contains(e.target) || menu.contains(e.target))) hideMenu(); });
  dd.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
  menu.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.dataset.value;
      if (hidden) hidden.value = val;
      if (label) label.textContent = item.textContent;
      menu.querySelectorAll('.dropdown-item').forEach(i => i.setAttribute('aria-selected', i === item ? 'true' : 'false'));
      hideMenu();
      if (hidden) hidden.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function initAdminDropdowns() {
  const roleDd = document.getElementById('newUserRoleDropdown');
  const deptDd = document.getElementById('newUserDeptDropdown');
  if (roleDd) initDropdown(roleDd);
  if (deptDd) initDropdown(deptDd);
}

function ensureCurtain() {
  const overlay = document.querySelector('.page-transition');
  return overlay || null;
}

function playCurtainIn(onComplete) {
  const overlay = ensureCurtain();
  if (!overlay || !window.gsap) { if (onComplete) onComplete(); return; }
  overlay.classList.add('active');
  const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
  const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
  gsap.set(topBlocks, { y: '-100%' });
  gsap.set(bottomBlocks, { y: '100%' });
  const tl = gsap.timeline({ onComplete });
  tl.to(topBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
    .to(bottomBlocks, { y: '0%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
}

function playCurtainOut() {
  const overlay = ensureCurtain();
  if (!overlay || !window.gsap) return;
  overlay.classList.add('active');
  const topBlocks = overlay.querySelectorAll('.curtain.top .curtain-block');
  const bottomBlocks = overlay.querySelectorAll('.curtain.bottom .curtain-block');
  gsap.set(topBlocks, { y: '0%' });
  gsap.set(bottomBlocks, { y: '0%' });
  gsap.timeline({
    onComplete: () => {
      requestAnimationFrame(() => overlay.classList.remove('active'));
    }
  }).to(topBlocks, { y: '-100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0)
    .to(bottomBlocks, { y: '100%', duration: 0.45, ease: 'power4.inout', stagger: 0.10 }, 0);
}

function animateTransition() {
  return new Promise((resolve) => {
    const overlay = ensureCurtain();
    if (!overlay || !window.gsap) { resolve(); return; }
    playCurtainIn(resolve);
  });
}

function navigateWithCurtain(url) {
  animateTransition().then(() => {
    window.location.href = url;
  });
}

function setupLinkTransitions() {
  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href === window.location.pathname) return;
      event.preventDefault();
      animateTransition().then(() => {
        window.location.href = href;
      });
    });
  });
}
// ==================== ANIMATIONS ====================
function setupAnimations() {
  // Animate logo on page load
  gsap.from('.logo', {
    duration: 0.8,
    opacity: 0,
    x: -30,
    ease: 'power2.inout'
  });

  // Animate sidebar on page load
  gsap.from('.sidebar', {
    duration: 0.8,
    opacity: 0,
    x: -50,
    ease: 'power2.inout',
    delay: 1
  });

  // Animate content on page load
  gsap.from('.content', {
    duration: 0.8,
    opacity: 0,
    y: 30,
    ease: 'power2.inout',
    delay: 1
  });
}

function animateGrid() {
  gsap.from('.survey-card', {
    duration: 0.5,
    opacity: 0,
    y: 20,
    stagger: {
      amount: 0.3,
      from: 'start'
    },
    ease: 'power2.out'
  });

  // Add hover animations to cards
  document.querySelectorAll('.survey-card').forEach((card, idx) => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        duration: 0.3,
        scale: 1.02,
        ease: 'power2.out'
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        duration: 0.3,
        scale: 1,
        ease: 'power2.out'
      });
    });
  });
}

function animateApprovals() {
  gsap.from('.approval-item', {
    duration: 0.5,
    opacity: 0,
    x: -20,
    stagger: {
      amount: 0.2,
      from: 'start'
    },
    ease: 'power2.out'
  });
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    z-index: 2000;
    animation: slideInRight 0.3s ease;
  `;

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.2)', text: '#86efac', border: '1px solid rgba(16, 185, 129, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' },
    info: { bg: 'rgba(99, 102, 241, 0.2)', text: '#a78bfa', border: '1px solid rgba(99, 102, 241, 0.3)' }
  };

  const color = colors[type] || colors.info;
  notification.style.background = color.bg;
  notification.style.color = color.text;
  notification.style.border = color.border;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    gsap.to(notification, {
      duration: 0.3,
      opacity: 0,
      x: 50,
      onComplete: () => notification.remove()
    });
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
