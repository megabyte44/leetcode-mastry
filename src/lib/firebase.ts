import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiICYEkGo52Sw5nybHLrOAG5hbTiQY_-4",
  authDomain: "memoria-5db64.firebaseapp.com",
  projectId: "memoria-5db64",
  storageBucket: "memoria-5db64.firebasestorage.app",
  messagingSenderId: "828526817933",
  appId: "1:828526817933:web:554948f6fdc3b595cbe8c4",
  measurementId: "G-PK5GDR099Z"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
