
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values are placeholders. To use your own Firebase project,
// replace this config with the one from your Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyAs-MOCK-KEY-FOR-DEMO",
  authDomain: "coinwise-ai.firebaseapp.com",
  projectId: "coinwise-ai",
  storageBucket: "coinwise-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:mockid"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
