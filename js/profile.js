import { auth, db } from './config/firebase.js';
import { navigateWithCurtain, playCurtainOut } from './animations/curtain.js';
import { showNotification } from './utils/notifications.js';

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

const populateCourseList = () => {
  const list = document.getElementById('courseList');
  if (!list) return;
  list.innerHTML = '';
  courseCatalog.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.code;
    option.textContent = `${item.code} — ${item.name}`;
    list.appendChild(option);
    const optionFull = document.createElement('option');
    optionFull.value = item.name;
    list.appendChild(optionFull);
  });
};

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
};

const setDisplay = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
};

const loadProfile = async (user) => {
  const doc = await db.collection('users').doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};
  setText('profileName', user.displayName || data.name || '');
  setText('profileEmail', user.email || data.email || '');
  setText('profileGrade', data.gradeLevel || '');
  setText('profileCourse', data.course || '');
  setText('profileAge', data.age || '');
  setDisplay('roleDisplay', data.role ? data.role : 'Student');
};

const saveProfile = async (user) => {
  const grade = document.getElementById('profileGrade').value.trim();
  const course = document.getElementById('profileCourse').value.trim();
  const ageRaw = document.getElementById('profileAge').value.trim();
  const age = ageRaw ? Number(ageRaw) : null;
  const payload = {
    gradeLevel: grade || null,
    course: course || null,
    age: Number.isFinite(age) ? age : null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await db.collection('users').doc(user.uid).set(payload, { merge: true });
};

document.addEventListener('DOMContentLoaded', () => {
  populateCourseList();
  const form = document.getElementById('profileForm');
  const msg = document.getElementById('profileMessage');
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await auth.signOut();
      navigateWithCurtain('/index.html');
    });
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      navigateWithCurtain('/index.html');
      return;
    }
    setDisplay('userInfo', user.displayName || user.email);
    await loadProfile(user);
    playCurtainOut();

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msg) msg.textContent = 'Saving...';
        try {
          await saveProfile(user);
          showNotification('Profile updated', 'success');
          if (msg) msg.textContent = 'Profile saved.';
        } catch (err) {
          showNotification('Failed to update profile', 'error');
          if (msg) msg.textContent = 'Save failed.';
        }
      });
    }
  });
});
