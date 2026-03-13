// ==================== USERS SERVICE ====================
import { auth, db } from '../config/firebase.js';
import { state } from '../state/appState.js';
import { showNotification } from '../utils/notifications.js';

// Subscribe to users
export function subscribeUsers() {
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

// Render users
export function renderUsers() {
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
      qmr: 'QMR',
      pfmo: 'PFMO',
      student: 'Student',
      parent: 'Parent',
      respondent: 'Respondent'
    };
    const deptCatalog = window.departmentCatalog;
    const deptLabelMap = deptCatalog?.map || {};
    const roleLabel = roleLabelMap[role] || roleLabelMap.respondent;
    const deptLabel = department ? (deptLabelMap[department]?.label || department) : 'No Department';
    const deptFull = department ? (deptLabelMap[department]?.full || '') : '';
    const deptDisplay = deptFull ? `${deptLabel} — ${deptFull}` : deptLabel;
    const deptItems = deptCatalog?.flat?.length
      ? deptCatalog.flat.map(item => `<li class="dropdown-item" data-value="${item.code}">${item.short} — ${item.name}</li>`).join('')
      : `
              <li class="dropdown-item" data-value="cafeteria">Cafeteria</li>
              <li class="dropdown-item" data-value="library">Library</li>
              <li class="dropdown-item" data-value="finance">Finance</li>
              <li class="dropdown-item" data-value="bookstore">Bookstore</li>
              <li class="dropdown-item" data-value="faculty">Faculty</li>
            `;
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
              <li class="dropdown-item" data-value="qmr">QMR</li>
              <li class="dropdown-item" data-value="pfmo">PFMO</li>
              <li class="dropdown-item" data-value="student">Student</li>
              <li class="dropdown-item" data-value="parent">Parent</li>
              <li class="dropdown-item" data-value="respondent">Respondent</li>
            </ul>
          </div>
          <div class="dropdown user-dept-dropdown dropdown-searchable" data-user-id="${user.id}">
            <input type="hidden" class="user-dept-input" value="${department}">
            <button type="button" class="dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="dropdown-label">${deptDisplay}</span>
              <span class="dropdown-icon">▾</span>
            </button>
            <ul class="dropdown-menu hidden" role="listbox">
              <li class="dropdown-item" data-value="">No Department</li>
              ${deptItems}
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

// Attach user event handlers
export function attachUserEventHandlers() {
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

// Create user
export async function createUser(name, email, password, role, department) {
  let secondaryApp = null;
  let createdUser = null;
  try {
    if (!state.currentUser || state.userRole !== 'admin') {
      throw new Error('Only admins can create users.');
    }

    const firebaseConfig = auth.app && auth.app.options ? auth.app.options : null;
    if (!firebaseConfig) {
      throw new Error('Firebase configuration not available. Refresh and try again.');
    }

    const appName = `admin-create-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    secondaryApp = firebase.initializeApp(firebaseConfig, appName);
    const secondaryAuth = secondaryApp.auth();

    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    createdUser = userCredential.user;
    await createdUser.updateProfile({ displayName: name });

    try {
      await db.collection('users').doc(createdUser.uid).set({
        name: name,
        email: email,
        role: role,
        department: department || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: state.currentUser.email || state.currentUser.uid || 'admin'
      });
    } catch (writeErr) {
      // Roll back auth user if profile document creation fails.
      if (createdUser) {
        try {
          await createdUser.delete();
        } catch (deleteErr) {
          console.error('Rollback delete failed:', deleteErr);
        }
      }
      throw writeErr;
    }

    await secondaryAuth.signOut();

    showNotification(`User "${name}" created successfully with role: ${role}`, 'success');
    document.getElementById('createUserModal').classList.add('hidden');
    document.getElementById('createUserForm').reset();
    return true;
  } catch (error) {
    console.error('createUser error:', error);
    const knownMessage = {
      'auth/email-already-in-use': 'That email is already in use.',
      'auth/invalid-email': 'Please provide a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/operation-not-allowed': 'Email/password auth is disabled in Firebase Authentication.',
      'permission-denied': 'You do not have permission to create users.'
    }[error.code] || error.message;
    showNotification('Error creating user: ' + knownMessage, 'error');
    return false;
  } finally {
    if (secondaryApp) {
      try {
        await secondaryApp.delete();
      } catch (cleanupErr) {
        console.warn('Secondary app cleanup warning:', cleanupErr);
      }
    }
  }
}

// Initialize dropdown
export function initDropdown(dd) {
  if (!dd) return;
  const trigger = dd.querySelector('.dropdown-trigger');
  const menu = dd.querySelector('.dropdown-menu');
  const label = dd.querySelector('.dropdown-label');
  const hidden = dd.querySelector('input[type="hidden"]');
  const searchable = dd.classList.contains('dropdown-searchable');
  let open = false;
  let backdrop = null;
  let originalParent = null;
  let originalNextSibling = null;
  let searchInput = null;
  let emptyItem = null;
  
  const applyFilter = () => {
    if (!searchInput) return;
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    menu.querySelectorAll('.dropdown-item').forEach((item) => {
      const text = item.textContent.toLowerCase();
      const matches = !query || text.includes(query);
      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount += 1;
    });
    if (emptyItem) {
      emptyItem.style.display = visibleCount ? 'none' : 'block';
    }
  };

  const ensureSearch = () => {
    if (!searchable) return;
    searchInput = menu.querySelector('.dropdown-search-input');
    if (!searchInput) {
      const searchItem = document.createElement('li');
      searchItem.className = 'dropdown-search-item';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'dropdown-search-input';
      input.placeholder = 'Type to search';
      searchItem.appendChild(input);
      menu.insertBefore(searchItem, menu.firstChild);
      searchInput = input;
      searchInput.addEventListener('input', applyFilter);
      emptyItem = document.createElement('li');
      emptyItem.className = 'dropdown-empty';
      emptyItem.textContent = 'No matching departments';
      menu.insertBefore(emptyItem, searchItem.nextSibling);
    } else {
      emptyItem = menu.querySelector('.dropdown-empty');
    }
    applyFilter();
    searchInput.focus();
  };
  
  const showMenu = () => {
    if (open) return;
    open = true;
    trigger.setAttribute('aria-expanded', 'true');
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
    ensureSearch();
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
    if (searchInput) {
      searchInput.value = '';
      applyFilter();
    }
    if (window.gsap) {
      gsap.to(menu, {
        y: -6, opacity: 0, duration: 0.15, ease: 'power2.inOut',
        onComplete: () => {
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

// Initialize admin dropdowns
export function initAdminDropdowns() {
  const roleDd = document.getElementById('newUserRoleDropdown');
  const deptDd = document.getElementById('newUserDeptDropdown');
  if (roleDd) initDropdown(roleDd);
  if (deptDd) initDropdown(deptDd);
}
