// src/components/Login.tsx
"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold mb-4">TalkRoom</h1>
      <button onClick={handleLogin} className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold">
        Googleでログインして始める
      </button>
    </div>
  );
}
