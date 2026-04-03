import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBO123VPV6CMYpLJsLhsYutCwafugs9s7o",
  authDomain:        "aquaguide-fbb70.firebaseapp.com",
  projectId:         "aquaguide-fbb70",
  storageBucket:     "aquaguide-fbb70.firebasestorage.app",
  messagingSenderId: "873670792972",
  appId:             "1:873670792972:web:e5598c6c3f02b42ed75b29",
  measurementId:     "G-GE1YRZ53PP",
};

const app = initializeApp(firebaseConfig);

// Analytics only initialises in browser environments (safe for SSR / Vite)
isSupported().then(yes => { if (yes) getAnalytics(app); });

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;