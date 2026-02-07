"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"; 
import { signOut } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

// ▼ 作った部品たちを読み込む
import Login from "../components/Login";
import RoomList from "../components/RoomList";
import ChatRoom from "../components/ChatRoom";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);

  // 1. ユーザー監視
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. 部屋リスト監視
  useEffect(() => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 3. ログアウト処理
  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRoom(null);
  };

  // --- 画面の出し分け ---

  // A. ログインしていなければ「ログイン画面」
  if (!user) {
    return <Login />;
  }

  // B. 部屋を選んでいなければ「ロビー画面」
  if (!currentRoom) {
    return (
      <RoomList 
        user={user} 
        rooms={rooms} 
        setCurrentRoom={setCurrentRoom} 
        handleLogout={handleLogout} 
      />
    );
  }

  // C. それ以外なら「チャット画面」
  return (
    <ChatRoom 
      user={user} 
      currentRoom={currentRoom} 
      setCurrentRoom={setCurrentRoom} 
    />
  );
}
