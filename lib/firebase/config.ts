import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions"; // Add this import

const firebaseConfig = {
  apiKey: "AIzaSyCYsXyPi-AVT51-yzwD2FrAe9OsDoSIIvQ",
  authDomain: "skillx-v0.firebaseapp.com",
  projectId: "skillx-v0",
  storageBucket: "skillx-v0.appspot.com", // Fixed the storage bucket format
  messagingSenderId: "877364613016",
  appId: "1:877364613016:web:fbbc0ee627c78e0a19a5ed"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app); // Initialize Functions

// Optional: If you want to use Firebase Functions emulator during development
if (process.env.NODE_ENV === 'development') {
  import('firebase/functions').then(({ connectFunctionsEmulator }) => {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  });
}

export { app, auth, db, storage, functions }; // Export functions