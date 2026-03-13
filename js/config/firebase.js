// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
  apiKey: "AIzaSyBEYA5OHcc5zIWiJMHBwFQSIT3j9VrilaI",
  authDomain: "school-survey-system.firebaseapp.com",
  projectId: "school-survey-system",
  storageBucket: "school-survey-system.firebasestorage.app",
  messagingSenderId: "99847713017",
  appId: "1:99847713017:web:556670dde6d4246387f228",
  measurementId: "G-0CTS1WN8F9"
};

// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();
