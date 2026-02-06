import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCqsg5K4Uywof-32YRcP83tlsiM2FxH5o",
  authDomain: "my-sns-app-3c4c9.firebaseapp.com",
  projectId: "my-sns-app-3c4c9",
  storageBucket: "my-sns-app-3c4c9.firebasestorage.app",
  messagingSenderId: "114433316635",
  appId: "1:114433316635:web:6f1ef19c065c2e7b9ba5be"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
