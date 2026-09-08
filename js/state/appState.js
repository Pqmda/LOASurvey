// ==================== APPLICATION STATE ====================
export const state = {
  currentUser: null,
  userRole: null,
  userDept: null, 
  selectedDept: null,
  surveys: [],
  approvals: [],
  users: [],
  departments: [],
  responses: [],
  feedbackThreads: [],
  feedbackUserThreads: [],
  notifications: [],
  editingSurveyId: null,
  currentFilter: 'pending',
  surveysUnsub: null,
  feedbackUnsub: null,
  feedbackUserUnsub: null,
  notificationsUnsub: null,
  approvalsUnsub: null,
  usersUnsub: null,
  responsesUnsub: null,
  departmentsUnsub: null
};

export function getNormalizedRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return 'respondent';
  if (r.includes('admin')) return 'admin';
  if (r.includes('qmr')) return 'qmr';
  if (r.includes('iso')) return 'iso_secretary';
  if (r.includes('manager')) return 'manager';
  if (r.includes('pfmo') || r.includes('qr')) return 'pfmo';
  if (r.includes('student')) return 'student';
  if (r.includes('parent')) return 'parent';
  if (r.includes('respondent')) return 'respondent';
  return ['admin', 'manager', 'iso_secretary', 'qmr', 'pfmo', 'respondent', 'student', 'parent'].includes(r) ? r : 'respondent';
}

export function computeEffectiveRole(userData) {
  const normalized = getNormalizedRole(userData?.role);
  if (normalized === 'respondent' && userData?.department) {
    return 'manager';
  }
  return normalized;
}
