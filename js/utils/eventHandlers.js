// ==================== EVENT HANDLERS ====================
import { auth, db } from '../config/firebase.js';
import { state } from '../state/appState.js';
import { navigateWithCurtain } from '../animations/curtain.js';
import { animateGrid, animateApprovals } from '../animations/transitions.js';
import { showNotification } from './notifications.js';
import { 
  subscribeManagerSurveys, 
  subscribeApprovedSurveysForDept,
  renderSurveys, 
  renderRespondentSurveys,
  openSurveyModal, 
  closeSurveyModal,
  submitApprovalRequest,
  attachQuestionListeners,
  subscribeSurveyResponsesForDept,
  renderManagerStats,
  toggleNotificationPanel,
  clearNotificationLog,
  closeStatsModal
} from '../services/surveys.js';
import { renderApprovals, closeApprovalModal } from '../services/approvals.js';
import { createUser, renderUsers, initAdminDropdowns } from '../services/users.js';
import { submitFeedback, submitFeedbackResponse, subscribeUserFeedbackThreads, reviewFeedbackByQMR } from '../services/feedback.js';

const baseDepartmentCatalog = (() => {
  const groups = [
    {
      group: 'Complete Elementary Program',
      items: [{ code: 'K-6', short: 'K-6', name: 'Kindergarten to Grade 6' }]
    },
    {
      group: 'Junior High School',
      items: [{ code: 'G7-10', short: 'G7-10', name: 'Grade 7 to Grade 10' }]
    },
    {
      group: 'Senior High School',
      items: [{ code: 'G11-12', short: 'G11-12', name: 'Grade 11 to Grade 12' }]
    },
    {
      group: 'Academic Tracks',
      items: [
        { code: 'STEM', short: 'STEM', name: 'Science, Technology, Engineering, and Mathematics (STEM) Strand' },
        { code: 'ABM', short: 'ABM', name: 'Accountancy, Business, and Management (ABM) Strand' },
        { code: 'HUMMS', short: 'HUMMS', name: 'Humanities and Social Sciences (HUMMS) Strand' },
        { code: 'GAS', short: 'GAS', name: 'General Academic Strand (GAS)' }
      ]
    },
    {
      group: 'Technical-Vocational and Livelihood Tracks',
      items: [
        { code: 'TVL-ICT', short: 'TVL-ICT', name: 'Information and Communication Technology (ICT) Strand' },
        { code: 'TVL-HE', short: 'TVL-HE', name: 'Home Economics (HE) Strand' },
        { code: 'TVL-IA', short: 'TVL-IA', name: 'Industrial Arts (IA) Strand' }
      ]
    },
    {
      group: 'College of Arts and Sciences',
      items: [{ code: 'BSPsych', short: 'BSPsych', name: 'Bachelor of Science in Psychology' }]
    },
    {
      group: 'College of Business Management Education',
      items: [
        { code: 'BSA', short: 'BSA', name: 'Bachelor of Science in Accountancy' },
        { code: 'BSCA', short: 'BSCA', name: 'Bachelor of Science in Customs Administration' },
        { code: 'BSBA', short: 'BSBA', name: 'Bachelor of Science in Business Administration' },
        { code: 'BSBA-MM', short: 'BSBA-MM', name: 'Major in Marketing Management' },
        { code: 'BSBA-FM', short: 'BSBA-FM', name: 'Major in Financial Management' },
        { code: 'BSHRDM', short: 'BSHRDM', name: 'Major in Human Resource Development Management' }
      ]
    },
    {
      group: 'College of Criminal Justice',
      items: [{ code: 'BSCrim', short: 'BSCrim', name: 'Bachelor of Science in Criminology' }]
    },
    {
      group: 'College of Computer Studies',
      items: [
        { code: 'BSCS', short: 'BSCS', name: 'Bachelor of Science in Computer Science' },
        { code: 'BSIT', short: 'BSIT', name: 'Bachelor of Science in Information Technology' }
      ]
    },
    {
      group: 'College of Education',
      items: [
        { code: 'BEEd', short: 'BEEd', name: 'Bachelor of Elementary Education' },
        { code: 'BSEd-Eng', short: 'BSEd-Eng', name: 'Bachelor of Secondary Education - Major in English' },
        { code: 'BSEd-Fil', short: 'BSEd-Fil', name: 'Bachelor of Secondary Education - Major in Filipino' },
        { code: 'BSEd-Math', short: 'BSEd-Math', name: 'Bachelor of Secondary Education - Major in Mathematics' },
        { code: 'BTVTEd-Auto', short: 'BTVTEd-Auto', name: 'Bachelor of Technical Vocational Teacher Education - Major in Automotive Technology' },
        { code: 'BTVTEd-CP', short: 'BTVTEd-CP', name: 'Bachelor of Technical Vocational Teacher Education - Major in Computer Programming' },
        { code: 'BTVTEd-FSM', short: 'BTVTEd-FSM', name: 'Bachelor of Technical Vocational Teacher Education - Major in Food Service Management' },
        { code: 'BTVTEd-ET', short: 'BTVTEd-ET', name: 'Bachelor of Technical Vocational Teacher Education - Major in Electronics Technology' },
        { code: 'BTVTEd-WF', short: 'BTVTEd-WF', name: 'Bachelor of Technical Vocational Teacher Education - Major in Welding and Fabrication' }
      ]
    },
    {
      group: 'College of Engineering',
      items: [
        { code: 'BSIE', short: 'BSIE', name: 'Bachelor of Science in Industrial Engineering' },
        { code: 'BSCpE', short: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' }
      ]
    },
    {
      group: 'College of Law',
      items: [{ code: 'JD', short: 'JD', name: 'Juris Doctor Program' }]
    },
    {
      group: 'College of Real Estate Management',
      items: [{ code: 'BSREM', short: 'BSREM', name: 'Bachelor of Science in Real Estate Management' }]
    },
    {
      group: 'College of Tourism and Hospitality Management',
      items: [
        { code: 'BSTourism', short: 'BSTourism', name: 'Bachelor of Science in Tourism Management' },
        { code: 'BSHM', short: 'BSHM', name: 'Bachelor of Science in Hospitality Management' }
      ]
    }
  ];
  const flat = groups.flatMap((group) => group.items.map(item => ({ ...item, group: group.group })));
  const map = flat.reduce((acc, item) => {
    acc[item.code] = { label: item.short, full: item.name, group: item.group };
    return acc;
  }, {});
  return { groups, flat, map };
})();

const getDepartmentCodeKey = (code) => String(code || '').trim().toLowerCase();

const buildDepartmentCatalog = (extras = []) => {
  const groups = baseDepartmentCatalog.groups.map(group => ({
    group: group.group,
    items: group.items.map(item => ({ ...item }))
  }));
  const codeKeys = new Set();
  groups.forEach(group => group.items.forEach(item => codeKeys.add(getDepartmentCodeKey(item.code))));

  extras.forEach((item) => {
    if (!item) return;
    const code = String(item.code || '').trim();
    if (!code) return;
    const key = getDepartmentCodeKey(code);
    if (!key || codeKeys.has(key)) return;
    const short = String(item.short || item.label || code).trim();
    const name = String(item.name || short || code).trim();
    const groupName = String(item.group || 'Other Departments').trim() || 'Other Departments';
    let group = groups.find(g => g.group === groupName);
    if (!group) {
      group = { group: groupName, items: [] };
      groups.push(group);
    }
    group.items.push({ code, short: short || code, name: name || short || code });
    codeKeys.add(key);
  });

  const flat = groups.flatMap((group) => group.items.map(item => ({ ...item, group: group.group })));
  const map = flat.reduce((acc, item) => {
    acc[item.code] = { label: item.short, full: item.name, group: item.group };
    return acc;
  }, {});
  return { groups, flat, map };
};

let departmentCatalog = buildDepartmentCatalog();

const renderDepartmentSidebar = () => {
  const list = document.getElementById('departmentsList');
  if (!list) return;
  const searchInput = document.getElementById('deptSearchInput');
  const sortSelect = document.getElementById('deptSortSelect');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const sortMode = sortSelect ? sortSelect.value : 'az';
  const activeDept = state.selectedDept;
  const sortItems = (items) => {
    const sorted = [...items].sort((a, b) => a.short.localeCompare(b.short));
    return sortMode === 'za' ? sorted.reverse() : sorted;
  };

  list.innerHTML = '';
  const fragment = document.createDocumentFragment();
  let hasResults = false;

  departmentCatalog.groups.forEach((group) => {
    const groupMatch = group.group.toLowerCase().includes(query);
    const filteredItems = sortItems(group.items).filter((item) => {
      if (!query) return true;
      if (groupMatch) return true;
      const hay = `${item.short} ${item.name}`.toLowerCase();
      return hay.includes(query);
    });
    if (!filteredItems.length) return;
    hasResults = true;
    const isOpen = query.length > 0 || filteredItems.some(item => item.code === activeDept);
    const groupEl = document.createElement('div');
    groupEl.className = `dept-group${isOpen ? ' open' : ''}`;
    groupEl.dataset.group = group.group;
    const groupBtn = document.createElement('button');
    groupBtn.type = 'button';
    groupBtn.className = 'dept-group-btn';
    groupBtn.innerHTML = `<span>${group.group}</span><span class="dept-caret">▾</span>`;
    const courseList = document.createElement('div');
    courseList.className = 'dept-course-list';
    filteredItems.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dept-btn';
      btn.dataset.dept = item.code;
      btn.dataset.label = item.short;
      btn.dataset.full = item.name;
      btn.dataset.group = group.group;
      btn.innerHTML = `<span class="dept-course-name">${item.short}</span><span class="dept-course-full">${item.name}</span>`;
      if (item.code === activeDept) btn.classList.add('active');
      courseList.appendChild(btn);
    });
    groupEl.appendChild(groupBtn);
    groupEl.appendChild(courseList);
    fragment.appendChild(groupEl);
  });

  if (!hasResults) {
    const empty = document.createElement('div');
    empty.className = 'dept-empty';
    empty.textContent = 'No matching courses found.';
    fragment.appendChild(empty);
  }

  list.appendChild(fragment);
};

const populateDeptSelects = () => {
  const selects = [document.getElementById('surveyDept'), document.getElementById('newUserDept')].filter(Boolean);
  selects.forEach((select) => {
    const selected = select.value;
    select.innerHTML = '<option value="">Select a department</option>';
    departmentCatalog.groups.forEach((group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.group;
      group.items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.short} — ${item.name}`;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    if (selected) select.value = selected;
  });
};

const populateAdminDeptDropdown = () => {
  const dd = document.getElementById('newUserDeptDropdown');
  if (!dd) return;
  const menu = dd.querySelector('.dropdown-menu');
  const hidden = dd.querySelector('input[type="hidden"]');
  if (!menu || !hidden) return;
  const selected = hidden.value;
  menu.innerHTML = '';
  const noneItem = document.createElement('li');
  noneItem.className = 'dropdown-item';
  noneItem.dataset.value = '';
  noneItem.textContent = 'No Department';
  menu.appendChild(noneItem);
  departmentCatalog.groups.forEach((group) => {
    group.items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item';
      li.dataset.value = item.code;
      li.textContent = `${item.short} — ${item.name}`;
      menu.appendChild(li);
    });
  });
  if (!selected) hidden.value = '';
};

const updateDepartmentCatalog = () => {
  departmentCatalog = buildDepartmentCatalog(state.departments || []);
  window.departmentCatalog = departmentCatalog;
  window.departmentDefault = departmentCatalog.flat[0]?.code || '';
  renderDepartmentSidebar();
  populateDeptSelects();
  populateAdminDeptDropdown();
  initAdminDropdowns();
  renderUsers();
  syncActiveDeptButton();
};

const subscribeDepartments = () => {
  if (state.departmentsUnsub) state.departmentsUnsub();
  try {
    state.departmentsUnsub = db.collection('departments')
      .onSnapshot((snap) => {
        state.departments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateDepartmentCatalog();
      }, (err) => {
        console.error('Departments snapshot error:', err);
        state.departments = [];
        updateDepartmentCatalog();
      });
  } catch (e) {
    console.error('subscribeDepartments error:', e);
  }
};

const addDepartment = async ({ group, code, short, name }) => {
  if (!state.currentUser || state.userRole !== 'admin') {
    throw new Error('Only admins can add departments.');
  }
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanGroup = String(group || '').trim();
  const cleanShort = String(short || cleanCode).trim();
  const cleanName = String(name || cleanShort || cleanCode).trim();
  if (!cleanCode || !cleanGroup || !cleanShort || !cleanName) {
    throw new Error('All department fields are required.');
  }
  const key = getDepartmentCodeKey(cleanCode);
  if (departmentCatalog.flat.some(item => getDepartmentCodeKey(item.code) === key)) {
    throw new Error(`Department code "${cleanCode}" already exists.`);
  }
  await db.collection('departments').add({
    group: cleanGroup,
    code: cleanCode,
    short: cleanShort,
    name: cleanName,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: state.currentUser?.email || state.currentUser?.uid || 'admin'
  });
};

const syncActiveDeptButton = () => {
  const activeDept = state.selectedDept;
  if (!activeDept) return;
  document.querySelectorAll('.dept-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.querySelector(`.dept-btn[data-dept="${activeDept}"]`);
  if (btn) {
    btn.classList.add('active');
    const group = btn.closest('.dept-group');
    if (group) group.classList.add('open');
  }
};

export function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await auth.signOut();
        // Clear session storage but preserve preloader_seen flag
        const preloaderSeen = sessionStorage.getItem('preloader_seen');
        sessionStorage.clear();
        sessionStorage.setItem('redirected_to_login', 'true');
        if (preloaderSeen) {
          sessionStorage.setItem('preloader_seen', 'true');
        }
        navigateWithCurtain('/index.html');
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }

  const notificationBtn = document.getElementById('surveyNotificationBtn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      toggleNotificationPanel();
    });
  }

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      navigateWithCurtain('/profile.html');
    });
  }

  const clearNotificationBtn = document.getElementById('clearNotificationBtn');
  if (clearNotificationBtn) {
    clearNotificationBtn.addEventListener('click', () => {
      clearNotificationLog();
    });
  }

  document.addEventListener('click', (event) => {
    const panel = document.getElementById('surveyNotificationPanel');
    const btn = document.getElementById('surveyNotificationBtn');
    if (!panel || !btn) return;
    if (panel.classList.contains('open')) {
      const target = event.target;
      if (panel !== target && !panel.contains(target) && btn !== target && !btn.contains(target)) {
        panel.classList.remove('open');
      }
    }
  });

  updateDepartmentCatalog();
  subscribeDepartments();

  const deptSearchInput = document.getElementById('deptSearchInput');
  if (deptSearchInput) {
    deptSearchInput.addEventListener('input', () => {
      renderDepartmentSidebar();
      syncActiveDeptButton();
    });
  }

  const deptSortSelect = document.getElementById('deptSortSelect');
  if (deptSortSelect) {
    deptSortSelect.addEventListener('change', () => {
      renderDepartmentSidebar();
      syncActiveDeptButton();
    });
  }

  const departmentsList = document.getElementById('departmentsList');
  if (departmentsList) {
    departmentsList.addEventListener('click', (e) => {
      const groupBtn = e.target.closest('.dept-group-btn');
      if (groupBtn) {
        const group = groupBtn.closest('.dept-group');
        if (group) {
          if (window.gsap) {
            const courseList = group.querySelector('.dept-course-list');
            const isOpen = group.classList.contains('open');
            if (courseList) {
              if (isOpen) {
                gsap.to(courseList, { height: 0, opacity: 0, duration: 0.2, ease: 'power2.inOut', onComplete: () => {
                  group.classList.remove('open');
                  courseList.style.height = '';
                  courseList.style.opacity = '';
                }});
              } else {
                group.classList.add('open');
                const targetHeight = courseList.scrollHeight;
                gsap.fromTo(courseList, { height: 0, opacity: 0 }, { height: targetHeight, opacity: 1, duration: 0.25, ease: 'power2.out', onComplete: () => {
                  courseList.style.height = '';
                  courseList.style.opacity = '';
                }});
              }
              return;
            }
          }
          group.classList.toggle('open');
        }
        return;
      }
      const btn = e.target.closest('.dept-btn');
      if (!btn) return;
      const dept = btn.dataset.dept;
      if (!dept) return;
      if (state.userRole === 'manager' && state.userDept && dept !== state.userDept) {
        syncActiveDeptButton();
        showNotification('You can only manage your assigned department.', 'warning');
        return;
      }
      state.selectedDept = state.userRole === 'manager' && state.userDept ? state.userDept : dept;
      syncActiveDeptButton();

      if (state.userRole === 'manager') {
        subscribeManagerSurveys(state.selectedDept);
        renderSurveys();
        subscribeSurveyResponsesForDept(state.selectedDept);
        renderManagerStats();
        animateGrid();
      } else if (state.userRole === 'respondent' || state.userRole === 'student' || state.userRole === 'parent') {
        subscribeApprovedSurveysForDept(state.selectedDept);
        renderRespondentSurveys();
        animateGrid();
      }
    });
  }

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
        const deptField = document.getElementById('surveyDept');
        if (deptField) deptField.value = state.userDept;
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
      if (surveyFormEl.dataset.mode === 'answer') {
        return;
      }

      const title = document.getElementById('surveyTitle').value;
      const desc = document.getElementById('surveyDesc').value;
      const startValue = document.getElementById('surveyStartAt')?.value || '';
      const endValue = document.getElementById('surveyEndAt')?.value || '';
      const startAt = startValue ? new Date(startValue) : null;
      const endAt = endValue ? new Date(endValue) : null;
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
      if (startAt && endAt && endAt < startAt) {
        showNotification('Survey end time must be after the start time', 'warning');
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
            questions,
            startAt,
            endAt
          });
        }
      } else {
        submitApprovalRequest('create', {
          title,
          description: desc,
          department: dept,
          questions,
          startAt,
          endAt
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
      if (modal && !modal.classList.contains('hidden')) {
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
      if (modal && !modal.classList.contains('hidden')) {
        closeApprovalModal();
      }
    }
  });

  const respondentTabs = document.querySelectorAll('#respondentTabs .tab-btn');
  const respondentSurveysSection = document.getElementById('respondentSurveysSection');
  const respondentFeedbackSection = document.getElementById('respondentFeedbackSection');
  if (respondentTabs.length) {
    respondentTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        respondentTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'feedback') {
          if (respondentSurveysSection) respondentSurveysSection.classList.add('hidden');
          if (respondentFeedbackSection) respondentFeedbackSection.classList.remove('hidden');
          subscribeUserFeedbackThreads();
        } else {
          if (respondentSurveysSection) respondentSurveysSection.classList.remove('hidden');
          if (respondentFeedbackSection) respondentFeedbackSection.classList.add('hidden');
        }
      });
    });
  }

  const feedbackModal = document.getElementById('feedbackModal');
  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const closeFeedbackModalBtn = document.getElementById('closeFeedbackModal');
  const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
  const feedbackOverlay = document.getElementById('feedbackOverlay');
  const feedbackForm = document.getElementById('feedbackForm');

  const closeFeedbackModal = () => {
    if (feedbackModal) feedbackModal.classList.add('hidden');
    if (feedbackForm) feedbackForm.reset();
  };

  if (openFeedbackBtn) {
    openFeedbackBtn.addEventListener('click', () => {
      if (feedbackModal) feedbackModal.classList.remove('hidden');
    });
  }
  if (closeFeedbackModalBtn) closeFeedbackModalBtn.addEventListener('click', closeFeedbackModal);
  if (cancelFeedbackBtn) cancelFeedbackBtn.addEventListener('click', closeFeedbackModal);
  if (feedbackOverlay) feedbackOverlay.addEventListener('click', closeFeedbackModal);
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('feedbackMessage')?.value || '';
      const fileInput = document.getElementById('feedbackImage');
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      await submitFeedback(message, file);
      closeFeedbackModal();
    });
  }

  const feedbackResponseModal = document.getElementById('feedbackResponseModal');
  const feedbackResponseForm = document.getElementById('feedbackResponseForm');
  const feedbackResponseOverlay = document.getElementById('feedbackResponseOverlay');
  const closeFeedbackResponseModalBtn = document.getElementById('closeFeedbackResponseModal');
  const cancelFeedbackResponseBtn = document.getElementById('cancelFeedbackResponseBtn');
  const feedbackList = document.getElementById('feedbackList');

  const closeFeedbackResponseModal = () => {
    if (feedbackResponseModal) feedbackResponseModal.classList.add('hidden');
    if (feedbackResponseForm) {
      feedbackResponseForm.reset();
      feedbackResponseForm.dataset.feedbackId = '';
    }
  };

  if (closeFeedbackResponseModalBtn) closeFeedbackResponseModalBtn.addEventListener('click', closeFeedbackResponseModal);
  if (cancelFeedbackResponseBtn) cancelFeedbackResponseBtn.addEventListener('click', closeFeedbackResponseModal);
  if (feedbackResponseOverlay) feedbackResponseOverlay.addEventListener('click', closeFeedbackResponseModal);

  if (feedbackList) {
    feedbackList.addEventListener('click', async (e) => {
      const approveBtn = e.target.closest('.feedback-approve-btn');
      if (approveBtn) {
        const feedbackId = approveBtn.dataset.feedbackId || '';
        await reviewFeedbackByQMR(feedbackId, true);
        return;
      }
      const rejectBtn = e.target.closest('.feedback-reject-btn');
      if (rejectBtn) {
        const feedbackId = rejectBtn.dataset.feedbackId || '';
        await reviewFeedbackByQMR(feedbackId, false);
        return;
      }
      const btn = e.target.closest('.feedback-respond-btn');
      if (!btn) return;
      const feedbackId = btn.dataset.feedbackId || '';
      if (feedbackResponseForm) feedbackResponseForm.dataset.feedbackId = feedbackId;
      if (feedbackResponseModal) feedbackResponseModal.classList.remove('hidden');
    });
  }

  if (feedbackResponseForm) {
    feedbackResponseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedbackId = feedbackResponseForm.dataset.feedbackId || '';
      const message = document.getElementById('feedbackResponseMessage')?.value || '';
      const fileInput = document.getElementById('feedbackResponseImage');
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;
      await submitFeedbackResponse(feedbackId, message, file);
      closeFeedbackResponseModal();
    });
  }

  const closeStatsModalBtn = document.getElementById('closeStatsModal');
  if (closeStatsModalBtn) closeStatsModalBtn.addEventListener('click', closeStatsModal);
  const statsOverlay = document.getElementById('statsModalOverlay');
  if (statsOverlay) statsOverlay.addEventListener('click', closeStatsModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('statsModal');
      if (modal && !modal.classList.contains('hidden')) {
        closeStatsModal();
      }
    }
  });

  // Approval tabs
  document.querySelectorAll('#isoView .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#isoView .tab-btn').forEach(b => b.classList.remove('active'));
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
      const modal = document.getElementById('createUserModal');
      if (modal) modal.classList.remove('hidden');
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
      const modal = document.getElementById('createUserModal');
      if (modal) modal.classList.add('hidden');
      const form = document.getElementById('createUserForm');
      if (form) form.reset();
    });
  }

  const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
  if (cancelCreateUserBtn) {
    cancelCreateUserBtn.addEventListener('click', () => {
      const modal = document.getElementById('createUserModal');
      if (modal) modal.classList.add('hidden');
      const form = document.getElementById('createUserForm');
      if (form) form.reset();
    });
  }

  const createUserOverlay = document.getElementById('createUserOverlay');
  if (createUserOverlay) {
    createUserOverlay.addEventListener('click', () => {
      const modal = document.getElementById('createUserModal');
      if (modal) modal.classList.add('hidden');
      const form = document.getElementById('createUserForm');
      if (form) form.reset();
    });
  }

  // Admin - Add Department Form
  const addDeptForm = document.getElementById('addDeptForm');
  if (addDeptForm) {
    addDeptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const group = document.getElementById('deptGroupInput')?.value || '';
      const code = document.getElementById('deptCodeInput')?.value || '';
      const short = document.getElementById('deptShortInput')?.value || '';
      const name = document.getElementById('deptNameInput')?.value || '';
      try {
        await addDepartment({ group, code, short, name });
        showNotification('Department added', 'success');
        addDeptForm.reset();
      } catch (error) {
        console.error('addDepartment error:', error);
        showNotification('Error adding department: ' + (error.message || error), 'error');
      }
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
