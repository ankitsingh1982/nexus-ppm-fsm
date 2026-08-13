import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// (You can copy your actual API Key and App ID from your Firebase Console under Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyAbAI-PT3HVp1WB634GZQezn0XBUr0rFMg",
  authDomain: "ppm-fsm-2.firebaseapp.com",
  projectId: "ppm-fsm-2",
  storageBucket: "ppm-fsm-2.firebasestorage.app",
  messagingSenderId: "867167058601",
  appId: "1:867167058601:web:da1ff6018b374aa59ec7b8",
  measurementId: "G-TLZTJHE2D0"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const db = getFirestore(app);
export const auth = getAuth(app);