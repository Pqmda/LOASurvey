
function getNormalizedRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return 'respondent';
  if (r.includes('admin')) return 'admin';
  if (r.includes('iso')) return 'iso_secretary';
  if (r.includes('manager')) return 'manager';
  if (r.includes('pfmo')) return 'pfmo';
  if (r.includes('student')) return 'student';
  if (r.includes('parent')) return 'parent';
  if (r.includes('respondent')) return 'respondent';
  return ['admin', 'manager', 'iso_secretary', 'pfmo', 'respondent', 'student', 'parent'].includes(r) ? r : 'respondent';
}

function computeEffectiveRole(userData) {
  const normalized = getNormalizedRole(userData?.role);
  if (normalized === 'respondent' && userData?.department) {
    return 'manager';
  }
  return normalized;
}

// ── from js/auth/login.js (inline logic) ─────────────────────

function normalizeRoleFromFirestore(roleRaw) {
  let role = String(roleRaw || 'respondent').trim().toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('iso')) return 'iso_secretary';
  if (role.includes('manager')) return 'manager';
  if (role.includes('pfmo')) return 'pfmo';
  if (role.includes('student')) return 'student';
  if (role.includes('parent')) return 'parent';
  if (role.includes('respondent')) return 'respondent';
  return 'respondent';
}

function getLoginDestination(effectiveRole) {
  if (effectiveRole === 'admin') return '/admin.html';
  if (effectiveRole === 'iso_secretary') return '/iso.html';
  if (effectiveRole === 'manager') return '/manager.html';
  if (effectiveRole === 'pfmo') return '/pfmo.html';
  return '/main.html';
}

function validateRegistration({ password, role, studentId }) {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  if (role === 'student' && !studentId) {
    return { valid: false, error: 'Student ID is required for student registration' };
  }
  return { valid: true, error: null };
}

// ── from js/services/surveys.js ──────────────────────────────

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value);
}

function formatDateTimeInput(date) {
  if (!date) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayDate(date) {
  if (!date) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isSurveyActive(survey, now = new Date()) {
  if (survey.status !== 'approved') return false;
  const startAt = toDate(survey.startAt);
  const endAt = toDate(survey.endAt);
  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;
  return true;
}

function getScheduleText(survey) {
  const startAt = toDate(survey.startAt);
  const endAt = toDate(survey.endAt);
  if (!startAt && !endAt) return 'Always active';
  const parts = [];
  if (startAt) parts.push(`Starts ${formatDisplayDate(startAt)}`);
  if (endAt) parts.push(`Ends ${formatDisplayDate(endAt)}`);
  return parts.join(' • ');
}

function getDeptLabel(dept) {
  const catalog = typeof window !== 'undefined' ? window.departmentCatalog : null;
  if (catalog && catalog.map && catalog.map[dept]) {
    const entry = catalog.map[dept];
    return entry.full ? `${entry.label} • ${entry.full}` : entry.label;
  }
  return dept ? `${dept}` : '';
}

function getSurveyTimestamp(survey) {
  const date = toDate(survey.updatedAt || survey.createdAt);
  return date ? date.getTime() : 0;
}

function addNotification(notification, stateObj) {
  const safeNotification = {
    ...notification,
    createdAt: notification.createdAt || Date.now()
  };
  const exists = stateObj.notifications.some(n => n.id === safeNotification.id);
  if (exists) return;
  stateObj.notifications = [safeNotification, ...stateObj.notifications].slice(0, 20);
}

function loadSeenMap(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSeenMap(storage, key, map) {
  try {
    storage.setItem(key, JSON.stringify(map));
  } catch (e) {
    return;
  }
}

function loadNotificationLog(storage, key) {
  try {
    const raw = storage.getItem(key);
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
}

// chart / stats helpers from surveys.js
const chartColors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

function buildPieChartHtml(labels, counts, chartId) {
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
}

function buildTextStatsHtml(answers) {
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
}

function buildSurveyStatsHtml(survey, responses) {
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
}

// ── from js/services/feedback.js ─────────────────────────────

function feedbackToDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value);
}

function formatDate(value) {
  const date = feedbackToDate(value);
  if (!date || Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
}

const MAX_FALLBACK_IMAGE_BYTES = 350 * 1024;

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil(base64.length * 3 / 4);
}

function getSeenResponsesKey(uid) {
  return `feedbackResponsesSeen_${uid || 'guest'}`;
}

// ── from js/services/approvals.js (filtering logic) ──────────

function filterApprovals(approvals, filter) {
  return approvals.filter(a => a.approvalStatus === filter);
}

function countPendingApprovals(approvals) {
  return approvals.filter(a => a.approvalStatus === 'pending').length;
}

// ── from js/services/users.js (search / filter logic) ────────

function filterUsers(users, query) {
  if (!query) return users;
  const q = query.toLowerCase().trim();
  return users.filter(u => {
    const name = String(u.name || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    const dept = String(u.department || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q) || dept.includes(q);
  });
}

function getRoleLabel(role) {
  const roleLabelMap = {
    admin: 'Admin',
    manager: 'Manager',
    iso_secretary: 'ISO Secretary',
    pfmo: 'PFMO',
    student: 'Student',
    parent: 'Parent',
    respondent: 'Respondent'
  };
  return roleLabelMap[role] || roleLabelMap.respondent;
}

// ── from js/auth/authentication.js ───────────────────────────

function updateUserInfoData(user, role) {
  const roleNames = {
    'manager': 'Manager',
    'iso_secretary': 'ISO Secretary',
    'admin': 'Administrator',
    'pfmo': 'PFMO',
    'respondent': 'Respondent',
    'student': 'Student',
    'parent': 'Parent'
  };
  const displayName = user ? (user.displayName || user.email) : 'Respondent User';
  const roleDisplay = role ? (roleNames[role] || role) : (user ? 'Loading...' : 'Respondent');
  return { displayName, roleDisplay };
}

// ── from js/views/dashboard.js (routing logic) ───────────────

function getDashboardRedirect(userRole, currentPath) {
  const path = currentPath.toLowerCase();
  const isMain = path.endsWith('/main.html') || path.endsWith('\\main.html');
  const isAdminPage = path.endsWith('/admin.html');
  const isISOPage = path.endsWith('/iso.html');
  const isManagerPage = path.endsWith('/manager.html');
  const isPFMOPage = path.endsWith('/pfmo.html') || path.endsWith('\\pfmo.html');

  switch (userRole) {
    case 'admin':
      return isAdminPage ? null : '/admin.html';
    case 'iso_secretary':
      return isISOPage ? null : '/iso.html';
    case 'manager':
      return isManagerPage ? null : '/manager.html';
    case 'pfmo':
      return isPFMOPage ? null : '/pfmo.html';
    case 'respondent':
    case 'student':
    case 'parent':
    default:
      return isMain ? null : '/main.html';
  }
}

// ── from js/profile.js ──────────────────────────────────────

const courseCatalog = [
  { code: 'K-6', name: 'Kindergarten to Grade 6' },
  { code: 'G7-10', name: 'Grade 7 to Grade 10' },
  { code: 'G11-12', name: 'Grade 11 to Grade 12' },
  { code: 'STEM', name: 'Science, Technology, Engineering, and Mathematics (STEM) Strand' },
  { code: 'ABM', name: 'Accountancy, Business, and Management (ABM) Strand' },
  { code: 'HUMMS', name: 'Humanities and Social Sciences (HUMMS) Strand' },
  { code: 'GAS', name: 'General Academic Strand (GAS)' },
  { code: 'TVL-ICT', name: 'Information and Communication Technology (ICT) Strand' },
  { code: 'TVL-HE', name: 'Home Economics (HE) Strand' },
  { code: 'TVL-IA', name: 'Industrial Arts (IA) Strand' },
  { code: 'BSPsych', name: 'Bachelor of Science in Psychology' },
  { code: 'BSA', name: 'Bachelor of Science in Accountancy' },
  { code: 'BSCA', name: 'Bachelor of Science in Customs Administration' },
  { code: 'BSBA', name: 'Bachelor of Science in Business Administration' },
  { code: 'BSBA-MM', name: 'Major in Marketing Management' },
  { code: 'BSBA-FM', name: 'Major in Financial Management' },
  { code: 'BSHRDM', name: 'Major in Human Resource Development Management' },
  { code: 'BSCrim', name: 'Bachelor of Science in Criminology' },
  { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
  { code: 'BEEd', name: 'Bachelor of Elementary Education' },
  { code: 'BSEd-Eng', name: 'Bachelor of Secondary Education - Major in English' },
  { code: 'BSEd-Fil', name: 'Bachelor of Secondary Education - Major in Filipino' },
  { code: 'BSEd-Math', name: 'Bachelor of Secondary Education - Major in Mathematics' },
  { code: 'BTVTEd-Auto', name: 'Bachelor of Technical Vocational Teacher Education - Major in Automotive Technology' },
  { code: 'BTVTEd-CP', name: 'Bachelor of Technical Vocational Teacher Education - Major in Computer Programming' },
  { code: 'BTVTEd-FSM', name: 'Bachelor of Technical Vocational Teacher Education - Major in Food Service Management' },
  { code: 'BTVTEd-ET', name: 'Bachelor of Technical Vocational Teacher Education - Major in Electronics Technology' },
  { code: 'BTVTEd-WF', name: 'Bachelor of Technical Vocational Teacher Education - Major in Welding and Fabrication' },
  { code: 'BSIE', name: 'Bachelor of Science in Industrial Engineering' },
  { code: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' },
  { code: 'JD', name: 'Juris Doctor Program' },
  { code: 'BSREM', name: 'Bachelor of Science in Real Estate Management' },
  { code: 'BSTourism', name: 'Bachelor of Science in Tourism Management' },
  { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management' }
];

// ── from js/utils/eventHandlers.js (department catalog) ──────

function buildDepartmentCatalog() {
  const groups = [
    { group: 'Complete Elementary Program', items: [{ code: 'K-6', short: 'K-6', name: 'Kindergarten to Grade 6' }] },
    { group: 'Junior High School', items: [{ code: 'G7-10', short: 'G7-10', name: 'Grade 7 to Grade 10' }] },
    { group: 'Senior High School', items: [{ code: 'G11-12', short: 'G11-12', name: 'Grade 11 to Grade 12' }] },
    { group: 'Academic Tracks', items: [
      { code: 'STEM', short: 'STEM', name: 'Science, Technology, Engineering, and Mathematics (STEM) Strand' },
      { code: 'ABM', short: 'ABM', name: 'Accountancy, Business, and Management (ABM) Strand' },
      { code: 'HUMMS', short: 'HUMMS', name: 'Humanities and Social Sciences (HUMMS) Strand' },
      { code: 'GAS', short: 'GAS', name: 'General Academic Strand (GAS)' }
    ]},
    { group: 'Technical-Vocational and Livelihood Tracks', items: [
      { code: 'TVL-ICT', short: 'TVL-ICT', name: 'Information and Communication Technology (ICT) Strand' },
      { code: 'TVL-HE', short: 'TVL-HE', name: 'Home Economics (HE) Strand' },
      { code: 'TVL-IA', short: 'TVL-IA', name: 'Industrial Arts (IA) Strand' }
    ]},
    { group: 'College of Arts and Sciences', items: [{ code: 'BSPsych', short: 'BSPsych', name: 'Bachelor of Science in Psychology' }] },
    { group: 'College of Business Management Education', items: [
      { code: 'BSA', short: 'BSA', name: 'Bachelor of Science in Accountancy' },
      { code: 'BSCA', short: 'BSCA', name: 'Bachelor of Science in Customs Administration' },
      { code: 'BSBA', short: 'BSBA', name: 'Bachelor of Science in Business Administration' },
      { code: 'BSBA-MM', short: 'BSBA-MM', name: 'Major in Marketing Management' },
      { code: 'BSBA-FM', short: 'BSBA-FM', name: 'Major in Financial Management' },
      { code: 'BSHRDM', short: 'BSHRDM', name: 'Major in Human Resource Development Management' }
    ]},
    { group: 'College of Criminal Justice', items: [{ code: 'BSCrim', short: 'BSCrim', name: 'Bachelor of Science in Criminology' }] },
    { group: 'College of Computer Studies', items: [
      { code: 'BSCS', short: 'BSCS', name: 'Bachelor of Science in Computer Science' },
      { code: 'BSIT', short: 'BSIT', name: 'Bachelor of Science in Information Technology' }
    ]},
    { group: 'College of Education', items: [
      { code: 'BEEd', short: 'BEEd', name: 'Bachelor of Elementary Education' },
      { code: 'BSEd-Eng', short: 'BSEd-Eng', name: 'Bachelor of Secondary Education - Major in English' },
      { code: 'BSEd-Fil', short: 'BSEd-Fil', name: 'Bachelor of Secondary Education - Major in Filipino' },
      { code: 'BSEd-Math', short: 'BSEd-Math', name: 'Bachelor of Secondary Education - Major in Mathematics' },
      { code: 'BTVTEd-Auto', short: 'BTVTEd-Auto', name: 'Bachelor of Technical Vocational Teacher Education - Major in Automotive Technology' },
      { code: 'BTVTEd-CP', short: 'BTVTEd-CP', name: 'Bachelor of Technical Vocational Teacher Education - Major in Computer Programming' },
      { code: 'BTVTEd-FSM', short: 'BTVTEd-FSM', name: 'Bachelor of Technical Vocational Teacher Education - Major in Food Service Management' },
      { code: 'BTVTEd-ET', short: 'BTVTEd-ET', name: 'Bachelor of Technical Vocational Teacher Education - Major in Electronics Technology' },
      { code: 'BTVTEd-WF', short: 'BTVTEd-WF', name: 'Bachelor of Technical Vocational Teacher Education - Major in Welding and Fabrication' }
    ]},
    { group: 'College of Engineering', items: [
      { code: 'BSIE', short: 'BSIE', name: 'Bachelor of Science in Industrial Engineering' },
      { code: 'BSCpE', short: 'BSCpE', name: 'Bachelor of Science in Computer Engineering' }
    ]},
    { group: 'College of Law', items: [{ code: 'JD', short: 'JD', name: 'Juris Doctor Program' }] },
    { group: 'College of Real Estate Management', items: [{ code: 'BSREM', short: 'BSREM', name: 'Bachelor of Science in Real Estate Management' }] },
    { group: 'College of Tourism and Hospitality Management', items: [
      { code: 'BSTourism', short: 'BSTourism', name: 'Bachelor of Science in Tourism Management' },
      { code: 'BSHM', short: 'BSHM', name: 'Bachelor of Science in Hospitality Management' }
    ]}
  ];
  const flat = groups.flatMap((group) => group.items.map(item => ({ ...item, group: group.group })));
  const map = flat.reduce((acc, item) => {
    acc[item.code] = { label: item.short, full: item.name, group: item.group };
    return acc;
  }, {});
  return { groups, flat, map };
}

// ── from js/utils/notifications.js (color mapping) ──────────

function getNotificationColor(type) {
  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.2)', text: '#86efac', border: '1px solid rgba(16, 185, 129, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' },
    info: { bg: 'rgba(99, 102, 241, 0.2)', text: '#a78bfa', border: '1px solid rgba(99, 102, 241, 0.3)' }
  };
  return colors[type] || colors.info;
}


// ╔═══════════════════════════════════════════════════════════╗
// ║  TESTS                                                   ║
// ╚═══════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════
// 1. appState.js — getNormalizedRole
// ═══════════════════════════════════════════════════════════
describe('appState — getNormalizedRole', () => {
  test.each([
    ['admin', 'admin'],
    ['Admin', 'admin'],
    ['ADMIN', 'admin'],
    ['super_admin', 'admin'],
  ])('returns "admin" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test.each([
    ['iso', 'iso_secretary'],
    ['iso_secretary', 'iso_secretary'],
    ['ISO Secretary', 'iso_secretary'],
  ])('returns "iso_secretary" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test.each([
    ['manager', 'manager'],
    ['Manager', 'manager'],
    ['dept_manager', 'manager'],
  ])('returns "manager" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test.each([
    ['pfmo', 'pfmo'],
    ['PFMO', 'pfmo'],
  ])('returns "pfmo" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test.each([
    ['student', 'student'],
    ['Student', 'student'],
  ])('returns "student" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test.each([
    ['parent', 'parent'],
    ['Parent', 'parent'],
  ])('returns "parent" for input "%s"', (input, expected) => {
    expect(getNormalizedRole(input)).toBe(expected);
  });

  test('returns "respondent" for role containing "respondent"', () => {
    expect(getNormalizedRole('respondent')).toBe('respondent');
  });

  test.each([null, undefined, '', '   '])('returns "respondent" for empty/null/undefined: %p', (input) => {
    expect(getNormalizedRole(input)).toBe('respondent');
  });

  test.each(['xyz', 'unknown_role', 'foobar'])('returns "respondent" for unrecognized: "%s"', (input) => {
    expect(getNormalizedRole(input)).toBe('respondent');
  });
});

// ═══════════════════════════════════════════════════════════
// 2. appState.js — computeEffectiveRole
// ═══════════════════════════════════════════════════════════
describe('appState — computeEffectiveRole', () => {
  test('promotes respondent to manager when department exists', () => {
    expect(computeEffectiveRole({ role: 'respondent', department: 'IT' })).toBe('manager');
  });

  test('keeps respondent when no department', () => {
    expect(computeEffectiveRole({ role: 'respondent', department: null })).toBe('respondent');
    expect(computeEffectiveRole({ role: 'respondent' })).toBe('respondent');
  });

  test('does not promote non-respondent roles even with department', () => {
    expect(computeEffectiveRole({ role: 'admin', department: 'IT' })).toBe('admin');
    expect(computeEffectiveRole({ role: 'student', department: 'Science' })).toBe('student');
    expect(computeEffectiveRole({ role: 'iso_secretary', department: 'HR' })).toBe('iso_secretary');
  });

  test('handles null/undefined userData', () => {
    expect(computeEffectiveRole(null)).toBe('respondent');
    expect(computeEffectiveRole(undefined)).toBe('respondent');
  });

  test('handles empty object', () => {
    expect(computeEffectiveRole({})).toBe('respondent');
  });
});

// ═══════════════════════════════════════════════════════════
// 3. login.js — normalizeRoleFromFirestore
// ═══════════════════════════════════════════════════════════
describe('login — normalizeRoleFromFirestore', () => {
  test.each([
    ['Admin', 'admin'],
    ['ISO Secretary', 'iso_secretary'],
    ['Manager', 'manager'],
    ['PFMO', 'pfmo'],
    ['Student', 'student'],
    ['Parent', 'parent'],
    ['Respondent', 'respondent'],
  ])('normalizes "%s" → "%s"', (input, expected) => {
    expect(normalizeRoleFromFirestore(input)).toBe(expected);
  });

  test.each([null, undefined, '', 'xyz'])('defaults to "respondent" for: %p', (input) => {
    expect(normalizeRoleFromFirestore(input)).toBe('respondent');
  });
});

// ═══════════════════════════════════════════════════════════
// 4. login.js — getLoginDestination
// ═══════════════════════════════════════════════════════════
describe('login — getLoginDestination', () => {
  test.each([
    ['admin', '/admin.html'],
    ['iso_secretary', '/iso.html'],
    ['manager', '/manager.html'],
    ['pfmo', '/pfmo.html'],
    ['student', '/main.html'],
    ['respondent', '/main.html'],
    ['parent', '/main.html'],
    ['other', '/main.html'],
  ])('routes "%s" → "%s"', (role, dest) => {
    expect(getLoginDestination(role)).toBe(dest);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. login.js — validateRegistration
// ═══════════════════════════════════════════════════════════
describe('login — validateRegistration', () => {
  test('rejects password shorter than 6 chars', () => {
    const res = validateRegistration({ password: '123', role: 'student', studentId: 'S001' });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/6 characters/);
  });

  test('accepts password of exactly 6 chars', () => {
    expect(validateRegistration({ password: '123456', role: 'parent', studentId: '' }).valid).toBe(true);
  });

  test('rejects student without student ID', () => {
    const res = validateRegistration({ password: 'password123', role: 'student', studentId: '' });
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Student ID/);
  });

  test('accepts student with student ID', () => {
    expect(validateRegistration({ password: 'password123', role: 'student', studentId: 'S12345' }).valid).toBe(true);
  });

  test('does not require student ID for non-student', () => {
    expect(validateRegistration({ password: 'password123', role: 'parent', studentId: '' }).valid).toBe(true);
    expect(validateRegistration({ password: 'password123', role: 'admin', studentId: '' }).valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. login.js — input validation
// ═══════════════════════════════════════════════════════════
describe('login — input validation', () => {
  test('email is trimmed', () => {
    expect('  user@example.com  '.trim()).toBe('user@example.com');
  });

  test('empty email stays empty after trim', () => {
    expect('   '.trim()).toBe('');
  });

  test('password is not trimmed (used as-is)', () => {
    const pw = '  secret  ';
    expect(pw).toBe('  secret  ');
    expect(pw.length).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. surveys.js — toDate
// ═══════════════════════════════════════════════════════════
describe('surveys — toDate', () => {
  test('returns null for falsy input', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate(0)).toBeNull();
    expect(toDate('')).toBeNull();
  });

  test('handles Firestore Timestamp-like object (.toDate method)', () => {
    const fakeTimestamp = { toDate: () => new Date('2025-06-15T10:00:00Z') };
    const result = toDate(fakeTimestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-06-15T10:00:00.000Z');
  });

  test('handles {seconds} object (Firestore serialized)', () => {
    const ts = { seconds: 1718445600 }; // 2024-06-15 ...
    const result = toDate(ts);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(1718445600 * 1000);
  });

  test('handles Date string', () => {
    const result = toDate('2025-01-01');
    expect(result).toBeInstanceOf(Date);
  });

  test('handles Date object', () => {
    const d = new Date('2025-03-01T12:00:00Z');
    expect(toDate(d)).toEqual(d);
  });

  test('handles numeric millisecond timestamp', () => {
    const ms = 1700000000000;
    const result = toDate(ms);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ms);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. surveys.js — formatDateTimeInput
// ═══════════════════════════════════════════════════════════
describe('surveys — formatDateTimeInput', () => {
  test('returns empty string for null', () => {
    expect(formatDateTimeInput(null)).toBe('');
  });

  test('formats date correctly for HTML datetime-local', () => {
    const d = new Date(2025, 5, 15, 9, 5); // June 15, 2025 09:05
    expect(formatDateTimeInput(d)).toBe('2025-06-15T09:05');
  });

  test('pads single-digit months, days, hours, minutes', () => {
    const d = new Date(2025, 0, 3, 2, 7); // Jan 3, 2025 02:07
    expect(formatDateTimeInput(d)).toBe('2025-01-03T02:07');
  });
});

// ═══════════════════════════════════════════════════════════
// 9. surveys.js — formatDisplayDate
// ═══════════════════════════════════════════════════════════
describe('surveys — formatDisplayDate', () => {
  test('returns empty string for null', () => {
    expect(formatDisplayDate(null)).toBe('');
  });

  test('returns a non-empty string for a valid date', () => {
    const d = new Date('2025-06-15T10:30:00Z');
    const result = formatDisplayDate(d);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. surveys.js — isSurveyActive
// ═══════════════════════════════════════════════════════════
describe('surveys — isSurveyActive', () => {
  const now = new Date('2025-06-15T12:00:00Z');

  test('returns false if status is not approved', () => {
    expect(isSurveyActive({ status: 'pending' }, now)).toBe(false);
    expect(isSurveyActive({ status: 'rejected' }, now)).toBe(false);
    expect(isSurveyActive({ status: 'draft' }, now)).toBe(false);
  });

  test('returns true for approved survey with no schedule', () => {
    expect(isSurveyActive({ status: 'approved' }, now)).toBe(true);
  });

  test('returns false if now is before startAt', () => {
    expect(isSurveyActive({
      status: 'approved',
      startAt: '2025-07-01T00:00:00Z'
    }, now)).toBe(false);
  });

  test('returns false if now is after endAt', () => {
    expect(isSurveyActive({
      status: 'approved',
      endAt: '2025-06-01T00:00:00Z'
    }, now)).toBe(false);
  });

  test('returns true if now is within start and end', () => {
    expect(isSurveyActive({
      status: 'approved',
      startAt: '2025-06-01T00:00:00Z',
      endAt: '2025-07-01T00:00:00Z'
    }, now)).toBe(true);
  });

  test('returns true if only startAt and now is after it', () => {
    expect(isSurveyActive({
      status: 'approved',
      startAt: '2025-01-01T00:00:00Z'
    }, now)).toBe(true);
  });

  test('returns true if only endAt and now is before it', () => {
    expect(isSurveyActive({
      status: 'approved',
      endAt: '2025-12-31T00:00:00Z'
    }, now)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 11. surveys.js — getScheduleText
// ═══════════════════════════════════════════════════════════
describe('surveys — getScheduleText', () => {
  test('returns "Always active" when no start/end', () => {
    expect(getScheduleText({ startAt: null, endAt: null })).toBe('Always active');
    expect(getScheduleText({})).toBe('Always active');
  });

  test('returns "Starts ..." when only startAt', () => {
    const result = getScheduleText({ startAt: '2025-06-01', endAt: null });
    expect(result).toMatch(/^Starts /);
  });

  test('returns "Ends ..." when only endAt', () => {
    const result = getScheduleText({ startAt: null, endAt: '2025-07-01' });
    expect(result).toMatch(/^Ends /);
  });

  test('returns both separated by bullet when both exist', () => {
    const result = getScheduleText({ startAt: '2025-06-01', endAt: '2025-07-01' });
    expect(result).toMatch(/Starts .+ • Ends .+/);
  });
});

// ═══════════════════════════════════════════════════════════
// 12. surveys.js — getDeptLabel
// ═══════════════════════════════════════════════════════════
describe('surveys — getDeptLabel', () => {
  test('returns dept code string when no catalog available', () => {
    expect(getDeptLabel('BSIT')).toBe('BSIT');
  });

  test('returns empty string for falsy dept', () => {
    expect(getDeptLabel(null)).toBe('');
    expect(getDeptLabel('')).toBe('');
    expect(getDeptLabel(undefined)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 13. surveys.js — getSurveyTimestamp
// ═══════════════════════════════════════════════════════════
describe('surveys — getSurveyTimestamp', () => {
  test('returns 0 for survey with no dates', () => {
    expect(getSurveyTimestamp({})).toBe(0);
  });

  test('prefers updatedAt over createdAt', () => {
    const survey = {
      updatedAt: '2025-06-15T10:00:00Z',
      createdAt: '2025-01-01T00:00:00Z'
    };
    expect(getSurveyTimestamp(survey)).toBe(new Date('2025-06-15T10:00:00Z').getTime());
  });

  test('falls back to createdAt when no updatedAt', () => {
    const survey = { createdAt: '2025-01-01T00:00:00Z' };
    expect(getSurveyTimestamp(survey)).toBe(new Date('2025-01-01T00:00:00Z').getTime());
  });

  test('handles Firestore Timestamp-like objects', () => {
    const survey = { updatedAt: { toDate: () => new Date('2025-03-01') } };
    expect(getSurveyTimestamp(survey)).toBe(new Date('2025-03-01').getTime());
  });
});

// ═══════════════════════════════════════════════════════════
// 14. surveys.js — addNotification
// ═══════════════════════════════════════════════════════════
describe('surveys — addNotification', () => {
  let mockState;
  beforeEach(() => {
    mockState = { notifications: [] };
  });

  test('adds a notification to empty state', () => {
    addNotification({ id: 'n1', title: 'Test' }, mockState);
    expect(mockState.notifications).toHaveLength(1);
    expect(mockState.notifications[0].id).toBe('n1');
  });

  test('does not add duplicate notification', () => {
    addNotification({ id: 'n1', title: 'Test' }, mockState);
    addNotification({ id: 'n1', title: 'Test again' }, mockState);
    expect(mockState.notifications).toHaveLength(1);
  });

  test('prepends new notifications (newest first)', () => {
    addNotification({ id: 'n1', title: 'First' }, mockState);
    addNotification({ id: 'n2', title: 'Second' }, mockState);
    expect(mockState.notifications[0].id).toBe('n2');
    expect(mockState.notifications[1].id).toBe('n1');
  });

  test('caps at 20 notifications', () => {
    for (let i = 0; i < 25; i++) {
      addNotification({ id: `n${i}`, title: `Notif ${i}` }, mockState);
    }
    expect(mockState.notifications).toHaveLength(20);
  });

  test('sets createdAt if not provided', () => {
    addNotification({ id: 'n1', title: 'Test' }, mockState);
    expect(mockState.notifications[0].createdAt).toBeDefined();
    expect(typeof mockState.notifications[0].createdAt).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════
// 15. surveys.js — loadSeenMap / saveSeenMap
// ═══════════════════════════════════════════════════════════
describe('surveys — loadSeenMap / saveSeenMap', () => {
  let storage;
  beforeEach(() => {
    storage = new Map();
    storage.getItem = (k) => storage.get(k) || null;
    storage.setItem = (k, v) => storage.set(k, v);
  });

  test('returns empty object when key not found', () => {
    expect(loadSeenMap(storage, 'missing')).toEqual({});
  });

  test('saves and loads correctly', () => {
    const data = { survey1: 12345, survey2: 67890 };
    saveSeenMap(storage, 'test_key', data);
    expect(loadSeenMap(storage, 'test_key')).toEqual(data);
  });

  test('handles corrupted JSON gracefully', () => {
    storage.set('bad', '{invalid json');
    expect(loadSeenMap(storage, 'bad')).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════
// 16. surveys.js — loadNotificationLog
// ═══════════════════════════════════════════════════════════
describe('surveys — loadNotificationLog', () => {
  let storage;
  beforeEach(() => {
    storage = new Map();
    storage.getItem = (k) => storage.get(k) || null;
    storage.setItem = (k, v) => storage.set(k, v);
  });

  test('returns empty array when key not found', () => {
    expect(loadNotificationLog(storage, 'missing')).toEqual([]);
  });

  test('returns parsed array', () => {
    const log = [{ id: 'a_123', surveyId: 'a', surveyTimestamp: 123 }];
    storage.set('key', JSON.stringify(log));
    expect(loadNotificationLog(storage, 'key')).toEqual(log);
  });

  test('backfills surveyId/surveyTimestamp from id field', () => {
    const log = [{ id: 'survey1_99999' }];
    storage.set('key', JSON.stringify(log));
    const result = loadNotificationLog(storage, 'key');
    expect(result[0].surveyId).toBe('survey1');
    expect(result[0].surveyTimestamp).toBe(99999);
  });

  test('handles non-array JSON gracefully', () => {
    storage.set('key', '"not an array"');
    expect(loadNotificationLog(storage, 'key')).toEqual([]);
  });

  test('handles corrupted JSON', () => {
    storage.set('key', '{bad}');
    expect(loadNotificationLog(storage, 'key')).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// 17. surveys.js — buildPieChartHtml
// ═══════════════════════════════════════════════════════════
describe('surveys — buildPieChartHtml', () => {
  test('returns "No responses" when all counts are zero', () => {
    const result = buildPieChartHtml(['Yes', 'No'], [0, 0], 'chart1');
    expect(result.html).toContain('No responses yet.');
    expect(result.chart).toBeNull();
  });

  test('returns chart data and legend HTML for non-zero counts', () => {
    const result = buildPieChartHtml(['Yes', 'No', 'Maybe'], [10, 5, 3], 'chart1');
    expect(result.chart).not.toBeNull();
    expect(result.chart.id).toBe('chart1');
    expect(result.chart.labels).toEqual(['Yes', 'No', 'Maybe']);
    expect(result.chart.counts).toEqual([10, 5, 3]);
    expect(result.html).toContain('legend-item');
    expect(result.html).toContain('chart1');
  });

  test('calculates percentages correctly', () => {
    const result = buildPieChartHtml(['A', 'B'], [75, 25], 'chart2');
    expect(result.html).toContain('75 (75%)');
    expect(result.html).toContain('25 (25%)');
  });
});

// ═══════════════════════════════════════════════════════════
// 18. surveys.js — buildTextStatsHtml
// ═══════════════════════════════════════════════════════════
describe('surveys — buildTextStatsHtml', () => {
  test('returns "No responses" for empty array', () => {
    expect(buildTextStatsHtml([])).toContain('No responses yet.');
  });

  test('returns "No responses" for array of only whitespace', () => {
    expect(buildTextStatsHtml(['   ', '', '  '])).toContain('No responses yet.');
  });

  test('aggregates frequencies case-insensitively', () => {
    const html = buildTextStatsHtml(['Good', 'good', 'GOOD', 'Bad']);
    expect(html).toContain('text-stat');
    expect(html).toContain('3'); // "good" count
    expect(html).toContain('1'); // "bad" count
  });

  test('limits to top 5 entries', () => {
    const answers = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const html = buildTextStatsHtml(answers);
    const matches = html.match(/class="text-stat"/g);
    expect(matches.length).toBeLessThanOrEqual(5);
  });

  test('preserves original casing for display', () => {
    const html = buildTextStatsHtml(['Hello World']);
    expect(html).toContain('Hello World');
  });
});

// ═══════════════════════════════════════════════════════════
// 19. surveys.js — buildSurveyStatsHtml
// ═══════════════════════════════════════════════════════════
describe('surveys — buildSurveyStatsHtml', () => {
  test('renders title and response count', () => {
    const survey = { id: 's1', title: 'Test Survey', questions: [] };
    const result = buildSurveyStatsHtml(survey, []);
    expect(result.html).toContain('Test Survey');
    expect(result.html).toContain('0 responses');
  });

  test('uses singular "response" for 1 response', () => {
    const survey = { id: 's1', title: 'S', questions: [{ question: 'Q1', type: 'Text' }] };
    const responses = [{ answers: { answer_0: 'yes' } }];
    const result = buildSurveyStatsHtml(survey, responses);
    expect(result.html).toContain('1 response');
    expect(result.html).not.toContain('1 responses');
  });

  test('generates chart data for Multiple Choice questions', () => {
    const survey = { id: 's1', title: 'S', questions: [{ question: 'Q1', type: 'Multiple Choice' }] };
    const responses = [
      { answers: { answer_0: 'Yes' } },
      { answers: { answer_0: 'No' } },
      { answers: { answer_0: 'Yes' } },
    ];
    const result = buildSurveyStatsHtml(survey, responses);
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0].labels).toEqual(['Yes', 'No', 'Maybe']);
    expect(result.charts[0].counts).toEqual([2, 1, 0]);
  });

  test('generates chart data for Rating questions', () => {
    const survey = { id: 's1', title: 'S', questions: [{ question: 'Q1', type: 'Rating' }] };
    const responses = [
      { answers: { answer_0: '5' } },
      { answers: { answer_0: '5' } },
      { answers: { answer_0: '3' } },
    ];
    const result = buildSurveyStatsHtml(survey, responses);
    expect(result.charts).toHaveLength(1);
    expect(result.charts[0].counts[4]).toBe(2); // '5' count
    expect(result.charts[0].counts[2]).toBe(1); // '3' count
  });

  test('handles Text questions without charts', () => {
    const survey = { id: 's1', title: 'S', questions: [{ question: 'Q1', type: 'Text' }] };
    const responses = [{ answers: { answer_0: 'Great service' } }];
    const result = buildSurveyStatsHtml(survey, responses);
    expect(result.charts).toHaveLength(0);
    expect(result.html).toContain('Great service');
  });

  test('handles survey with no questions', () => {
    const survey = { id: 's1', title: 'S', questions: [] };
    const result = buildSurveyStatsHtml(survey, []);
    expect(result.charts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 20. feedback.js — feedbackToDate (same logic as surveys toDate)
// ═══════════════════════════════════════════════════════════
describe('feedback — feedbackToDate', () => {
  test('returns null for falsy', () => {
    expect(feedbackToDate(null)).toBeNull();
    expect(feedbackToDate(undefined)).toBeNull();
  });

  test('handles .toDate() method', () => {
    const fake = { toDate: () => new Date('2025-01-01') };
    expect(feedbackToDate(fake)).toBeInstanceOf(Date);
  });

  test('handles {seconds} object', () => {
    expect(feedbackToDate({ seconds: 1000 })).toEqual(new Date(1000000));
  });
});

// ═══════════════════════════════════════════════════════════
// 21. feedback.js — formatDate
// ═══════════════════════════════════════════════════════════
describe('feedback — formatDate', () => {
  test('returns "Unknown date" for null', () => {
    expect(formatDate(null)).toBe('Unknown date');
  });

  test('returns "Unknown date" for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('Unknown date');
  });

  test('returns locale string for valid date', () => {
    const result = formatDate('2025-06-15T10:00:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('Unknown date');
  });

  test('handles Firestore timestamp', () => {
    const result = formatDate({ seconds: 1718445600 });
    expect(result).not.toBe('Unknown date');
  });
});

// ═══════════════════════════════════════════════════════════
// 22. feedback.js — estimateDataUrlBytes
// ═══════════════════════════════════════════════════════════
describe('feedback — estimateDataUrlBytes', () => {
  test('returns 0 for null/empty', () => {
    expect(estimateDataUrlBytes(null)).toBe(0);
    expect(estimateDataUrlBytes('')).toBe(0);
  });

  test('estimates bytes from base64 data URL', () => {
    // "data:image/png;base64,AAAA" → base64 part = "AAAA" = 3 bytes
    const result = estimateDataUrlBytes('data:image/png;base64,AAAA');
    expect(result).toBe(3);
  });

  test('handles data URL without comma gracefully', () => {
    const result = estimateDataUrlBytes('nocomma');
    expect(result).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 23. feedback.js — MAX_FALLBACK_IMAGE_BYTES
// ═══════════════════════════════════════════════════════════
describe('feedback — MAX_FALLBACK_IMAGE_BYTES', () => {
  test('equals 350 KB', () => {
    expect(MAX_FALLBACK_IMAGE_BYTES).toBe(350 * 1024);
    expect(MAX_FALLBACK_IMAGE_BYTES).toBe(358400);
  });
});

// ═══════════════════════════════════════════════════════════
// 24. feedback.js — getSeenResponsesKey
// ═══════════════════════════════════════════════════════════
describe('feedback — getSeenResponsesKey', () => {
  test('returns key with uid', () => {
    expect(getSeenResponsesKey('user123')).toBe('feedbackResponsesSeen_user123');
  });

  test('returns key with "guest" for null/undefined', () => {
    expect(getSeenResponsesKey(null)).toBe('feedbackResponsesSeen_guest');
    expect(getSeenResponsesKey(undefined)).toBe('feedbackResponsesSeen_guest');
  });

  test('returns key with "guest" for empty string', () => {
    expect(getSeenResponsesKey('')).toBe('feedbackResponsesSeen_guest');
  });
});

// ═══════════════════════════════════════════════════════════
// 25. approvals.js — filterApprovals
// ═══════════════════════════════════════════════════════════
describe('approvals — filterApprovals', () => {
  const approvals = [
    { id: '1', approvalStatus: 'pending' },
    { id: '2', approvalStatus: 'approved' },
    { id: '3', approvalStatus: 'pending' },
    { id: '4', approvalStatus: 'rejected' },
  ];

  test('filters by pending', () => {
    expect(filterApprovals(approvals, 'pending')).toHaveLength(2);
  });

  test('filters by approved', () => {
    expect(filterApprovals(approvals, 'approved')).toHaveLength(1);
  });

  test('filters by rejected', () => {
    expect(filterApprovals(approvals, 'rejected')).toHaveLength(1);
  });

  test('returns empty for unknown status', () => {
    expect(filterApprovals(approvals, 'draft')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 26. approvals.js — countPendingApprovals
// ═══════════════════════════════════════════════════════════
describe('approvals — countPendingApprovals', () => {
  test('counts pending approvals', () => {
    const approvals = [
      { approvalStatus: 'pending' },
      { approvalStatus: 'approved' },
      { approvalStatus: 'pending' },
    ];
    expect(countPendingApprovals(approvals)).toBe(2);
  });

  test('returns 0 when no pending', () => {
    expect(countPendingApprovals([{ approvalStatus: 'approved' }])).toBe(0);
  });

  test('returns 0 for empty array', () => {
    expect(countPendingApprovals([])).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 27. users.js — filterUsers
// ═══════════════════════════════════════════════════════════
describe('users — filterUsers', () => {
  const users = [
    { name: 'Alice Smith', email: 'alice@school.edu', role: 'admin', department: 'IT' },
    { name: 'Bob Jones', email: 'bob@school.edu', role: 'student', department: 'BSIT' },
    { name: 'Carol White', email: 'carol@school.edu', role: 'manager', department: 'BSCS' },
    { name: 'Dan Brown', email: 'dan@school.edu', role: 'respondent', department: '' },
  ];

  test('returns all users when query is empty', () => {
    expect(filterUsers(users, '')).toHaveLength(4);
    expect(filterUsers(users, null)).toHaveLength(4);
    expect(filterUsers(users, undefined)).toHaveLength(4);
  });

  test('filters by name', () => {
    expect(filterUsers(users, 'alice')).toHaveLength(1);
    expect(filterUsers(users, 'Alice')).toHaveLength(1);
  });

  test('filters by email', () => {
    expect(filterUsers(users, 'bob@')).toHaveLength(1);
  });

  test('filters by role', () => {
    expect(filterUsers(users, 'admin')).toHaveLength(1);
    expect(filterUsers(users, 'student')).toHaveLength(1);
  });

  test('filters by department', () => {
    expect(filterUsers(users, 'BSIT')).toHaveLength(1);
  });

  test('returns empty for no matches', () => {
    expect(filterUsers(users, 'zzzzz')).toHaveLength(0);
  });

  test('handles partial matches', () => {
    const result = filterUsers(users, 'school');
    expect(result).toHaveLength(4); // all emails contain "school"
  });
});

// ═══════════════════════════════════════════════════════════
// 28. users.js — getRoleLabel
// ═══════════════════════════════════════════════════════════
describe('users — getRoleLabel', () => {
  test.each([
    ['admin', 'Admin'],
    ['manager', 'Manager'],
    ['iso_secretary', 'ISO Secretary'],
    ['pfmo', 'PFMO'],
    ['student', 'Student'],
    ['parent', 'Parent'],
    ['respondent', 'Respondent'],
  ])('maps "%s" → "%s"', (role, label) => {
    expect(getRoleLabel(role)).toBe(label);
  });

  test('defaults to "Respondent" for unknown role', () => {
    expect(getRoleLabel('unknown')).toBe('Respondent');
    expect(getRoleLabel(undefined)).toBe('Respondent');
  });
});

// ═══════════════════════════════════════════════════════════
// 29. authentication.js — updateUserInfoData
// ═══════════════════════════════════════════════════════════
describe('authentication — updateUserInfoData', () => {
  test('uses displayName when available', () => {
    const result = updateUserInfoData({ displayName: 'John', email: 'john@test.com' }, 'admin');
    expect(result.displayName).toBe('John');
    expect(result.roleDisplay).toBe('Administrator');
  });

  test('falls back to email when no displayName', () => {
    const result = updateUserInfoData({ displayName: null, email: 'john@test.com' }, 'student');
    expect(result.displayName).toBe('john@test.com');
  });

  test('returns "Respondent User" when user is null', () => {
    const result = updateUserInfoData(null, null);
    expect(result.displayName).toBe('Respondent User');
    expect(result.roleDisplay).toBe('Respondent');
  });

  test('displays "Loading..." when role is null but user exists', () => {
    const result = updateUserInfoData({ displayName: 'Test' }, null);
    expect(result.roleDisplay).toBe('Loading...');
  });

  test.each([
    ['manager', 'Manager'],
    ['iso_secretary', 'ISO Secretary'],
    ['admin', 'Administrator'],
    ['pfmo', 'PFMO'],
    ['respondent', 'Respondent'],
    ['student', 'Student'],
    ['parent', 'Parent'],
  ])('role "%s" displays as "%s"', (role, display) => {
    const result = updateUserInfoData({ displayName: 'User' }, role);
    expect(result.roleDisplay).toBe(display);
  });
});

// ═══════════════════════════════════════════════════════════
// 30. dashboard.js — getDashboardRedirect
// ═══════════════════════════════════════════════════════════
describe('dashboard — getDashboardRedirect', () => {
  test('admin on /admin.html → null (no redirect needed)', () => {
    expect(getDashboardRedirect('admin', '/admin.html')).toBeNull();
  });

  test('admin on /main.html → /admin.html', () => {
    expect(getDashboardRedirect('admin', '/main.html')).toBe('/admin.html');
  });

  test('iso_secretary on /iso.html → null', () => {
    expect(getDashboardRedirect('iso_secretary', '/iso.html')).toBeNull();
  });

  test('iso_secretary on /main.html → /iso.html', () => {
    expect(getDashboardRedirect('iso_secretary', '/main.html')).toBe('/iso.html');
  });

  test('manager on /manager.html → null', () => {
    expect(getDashboardRedirect('manager', '/manager.html')).toBeNull();
  });

  test('manager on /admin.html → /manager.html', () => {
    expect(getDashboardRedirect('manager', '/admin.html')).toBe('/manager.html');
  });

  test('pfmo on /pfmo.html → null', () => {
    expect(getDashboardRedirect('pfmo', '/pfmo.html')).toBeNull();
  });

  test('pfmo on /main.html → /pfmo.html', () => {
    expect(getDashboardRedirect('pfmo', '/main.html')).toBe('/pfmo.html');
  });

  test('student on /main.html → null', () => {
    expect(getDashboardRedirect('student', '/main.html')).toBeNull();
  });

  test('student on /admin.html → /main.html', () => {
    expect(getDashboardRedirect('student', '/admin.html')).toBe('/main.html');
  });

  test('respondent on /main.html → null', () => {
    expect(getDashboardRedirect('respondent', '/main.html')).toBeNull();
  });

  test('parent on /main.html → null', () => {
    expect(getDashboardRedirect('parent', '/main.html')).toBeNull();
  });

  test('handles backslash paths (Windows)', () => {
    expect(getDashboardRedirect('pfmo', '\\pfmo.html')).toBeNull();
    expect(getDashboardRedirect('student', '\\main.html')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// 31. profile.js — courseCatalog
// ═══════════════════════════════════════════════════════════
describe('profile — courseCatalog', () => {
  test('has 35 courses', () => {
    expect(courseCatalog).toHaveLength(35);
  });

  test('every entry has code and name', () => {
    courseCatalog.forEach((item) => {
      expect(item.code).toBeDefined();
      expect(item.name).toBeDefined();
      expect(typeof item.code).toBe('string');
      expect(typeof item.name).toBe('string');
    });
  });

  test('all codes are unique', () => {
    const codes = courseCatalog.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('contains key programs', () => {
    const codes = courseCatalog.map(c => c.code);
    expect(codes).toContain('BSIT');
    expect(codes).toContain('BSCS');
    expect(codes).toContain('STEM');
    expect(codes).toContain('BSCrim');
    expect(codes).toContain('JD');
  });
});

// ═══════════════════════════════════════════════════════════
// 32. eventHandlers.js — departmentCatalog builder
// ═══════════════════════════════════════════════════════════
describe('eventHandlers — buildDepartmentCatalog', () => {
  const catalog = buildDepartmentCatalog();

  test('has groups array', () => {
    expect(Array.isArray(catalog.groups)).toBe(true);
    expect(catalog.groups.length).toBeGreaterThan(0);
  });

  test('has flat array with all departments', () => {
    expect(Array.isArray(catalog.flat)).toBe(true);
    expect(catalog.flat.length).toBeGreaterThan(30);
  });

  test('has map with code keys', () => {
    expect(typeof catalog.map).toBe('object');
    expect(catalog.map['BSIT']).toBeDefined();
    expect(catalog.map['BSIT'].label).toBe('BSIT');
    expect(catalog.map['BSIT'].full).toContain('Information Technology');
  });

  test('every flat entry has code, short, name, group', () => {
    catalog.flat.forEach((item) => {
      expect(item.code).toBeDefined();
      expect(item.short).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.group).toBeDefined();
    });
  });

  test('all codes in flat are unique', () => {
    const codes = catalog.flat.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('map contains entry for every flat item', () => {
    catalog.flat.forEach((item) => {
      expect(catalog.map[item.code]).toBeDefined();
    });
  });

  test('groups contain expected group names', () => {
    const groupNames = catalog.groups.map(g => g.group);
    expect(groupNames).toContain('Academic Tracks');
    expect(groupNames).toContain('College of Computer Studies');
    expect(groupNames).toContain('College of Education');
    expect(groupNames).toContain('College of Law');
  });
});

// ═══════════════════════════════════════════════════════════
// 33. notifications.js — getNotificationColor
// ═══════════════════════════════════════════════════════════
describe('notifications — getNotificationColor', () => {
  test('returns success colors', () => {
    const c = getNotificationColor('success');
    expect(c.bg).toContain('16, 185, 129');
    expect(c.text).toBe('#86efac');
  });

  test('returns error colors', () => {
    const c = getNotificationColor('error');
    expect(c.bg).toContain('239, 68, 68');
    expect(c.text).toBe('#fca5a5');
  });

  test('returns warning colors', () => {
    const c = getNotificationColor('warning');
    expect(c.bg).toContain('245, 158, 11');
    expect(c.text).toBe('#fcd34d');
  });

  test('returns info colors', () => {
    const c = getNotificationColor('info');
    expect(c.bg).toContain('99, 102, 241');
    expect(c.text).toBe('#a78bfa');
  });

  test('defaults to info for unknown type', () => {
    expect(getNotificationColor('unknown')).toEqual(getNotificationColor('info'));
  });
});

// ═══════════════════════════════════════════════════════════
// 34. surveys.js — chartColors constant
// ═══════════════════════════════════════════════════════════
describe('surveys — chartColors', () => {
  test('has 6 colors', () => {
    expect(chartColors).toHaveLength(6);
  });

  test('all are valid hex strings', () => {
    chartColors.forEach((c) => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 35. Integration — login flow end-to-end logic
// ═══════════════════════════════════════════════════════════
describe('Integration — login flow', () => {
  test('admin user is routed to /admin.html', () => {
    const role = normalizeRoleFromFirestore('Admin');
    const effective = computeEffectiveRole({ role, department: null });
    const dest = getLoginDestination(effective);
    expect(dest).toBe('/admin.html');
  });

  test('respondent with department is promoted to manager', () => {
    const role = normalizeRoleFromFirestore('Respondent');
    const effective = computeEffectiveRole({ role, department: 'BSIT' });
    const dest = getLoginDestination(effective);
    expect(effective).toBe('manager');
    expect(dest).toBe('/manager.html');
  });

  test('student without department goes to /main.html', () => {
    const role = normalizeRoleFromFirestore('Student');
    const effective = computeEffectiveRole({ role, department: null });
    const dest = getLoginDestination(effective);
    expect(effective).toBe('student');
    expect(dest).toBe('/main.html');
  });

  test('ISO secretary goes to /iso.html', () => {
    const role = normalizeRoleFromFirestore('ISO Secretary');
    const effective = computeEffectiveRole({ role, department: null });
    const dest = getLoginDestination(effective);
    expect(effective).toBe('iso_secretary');
    expect(dest).toBe('/iso.html');
  });

  test('unknown role defaults to respondent → /main.html', () => {
    const role = normalizeRoleFromFirestore('xyz');
    const effective = computeEffectiveRole({ role, department: null });
    const dest = getLoginDestination(effective);
    expect(effective).toBe('respondent');
    expect(dest).toBe('/main.html');
  });
});

// ═══════════════════════════════════════════════════════════
// 36. Integration — survey lifecycle
// ═══════════════════════════════════════════════════════════
describe('Integration — survey lifecycle', () => {
  test('newly created survey (pending) is not active', () => {
    const survey = { status: 'pending', startAt: null, endAt: null };
    expect(isSurveyActive(survey)).toBe(false);
  });

  test('approved survey within schedule is active', () => {
    const now = new Date('2025-06-15');
    const survey = {
      status: 'approved',
      startAt: '2025-06-01',
      endAt: '2025-07-01'
    };
    expect(isSurveyActive(survey, now)).toBe(true);
    expect(getScheduleText(survey)).toMatch(/Starts .+ • Ends .+/);
  });

  test('approved survey past its end date is not active', () => {
    const now = new Date('2025-08-01');
    const survey = {
      status: 'approved',
      startAt: '2025-06-01',
      endAt: '2025-07-01'
    };
    expect(isSurveyActive(survey, now)).toBe(false);
  });

  test('approval filtering works in pipeline', () => {
    const approvals = [
      { id: '1', approvalStatus: 'pending', title: 'Survey A' },
      { id: '2', approvalStatus: 'approved', title: 'Survey B' },
      { id: '3', approvalStatus: 'pending', title: 'Survey C' },
    ];
    expect(countPendingApprovals(approvals)).toBe(2);
    expect(filterApprovals(approvals, 'approved')).toHaveLength(1);
    expect(filterApprovals(approvals, 'approved')[0].title).toBe('Survey B');
  });
});

// ═══════════════════════════════════════════════════════════
// 37. Integration — dashboard routing guard
// ═══════════════════════════════════════════════════════════
describe('Integration — dashboard routing guard', () => {
  test('admin on wrong page gets redirected', () => {
    const redirect = getDashboardRedirect('admin', '/main.html');
    expect(redirect).toBe('/admin.html');
  });

  test('admin on correct page stays (null)', () => {
    expect(getDashboardRedirect('admin', '/admin.html')).toBeNull();
  });

  test('student on wrong page gets redirected to main', () => {
    expect(getDashboardRedirect('student', '/admin.html')).toBe('/main.html');
  });

  test('respondent promoted to manager goes to manager page', () => {
    const effectiveRole = computeEffectiveRole({ role: 'respondent', department: 'BSCS' });
    const redirect = getDashboardRedirect(effectiveRole, '/main.html');
    expect(effectiveRole).toBe('manager');
    expect(redirect).toBe('/manager.html');
  });
});

// ═══════════════════════════════════════════════════════════
// 38. Integration — notification pipeline
// ═══════════════════════════════════════════════════════════
describe('Integration — notification pipeline', () => {
  let mockState, storage;

  beforeEach(() => {
    mockState = { notifications: [] };
    storage = new Map();
    storage.getItem = (k) => storage.get(k) || null;
    storage.setItem = (k, v) => storage.set(k, v);
  });

  test('notification added, saved, loaded correctly', () => {
    addNotification({ id: 'survey1_1000', title: 'New Survey', read: false }, mockState);
    expect(mockState.notifications).toHaveLength(1);

    // Save to storage
    storage.set('log', JSON.stringify(mockState.notifications));

    // Load from storage
    const loaded = loadNotificationLog(storage, 'log');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('survey1_1000');
    expect(loaded[0].surveyId).toBe('survey1');
    expect(loaded[0].surveyTimestamp).toBe(1000);
  });

  test('seen map persists across loads', () => {
    saveSeenMap(storage, 'seen', { survey1: 1000 });
    const loaded = loadSeenMap(storage, 'seen');
    expect(loaded.survey1).toBe(1000);
  });
});

