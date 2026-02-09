"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore"; 
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

  // 1. ユーザー監視（ここをより強力に修正！）
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        // まずAuthの基本情報だけでセットしておく
        // (これをしないとデータベース読み込み完了まで一瞬消えてしまうため)
        setUser(u); 

        // データベース(usersコレクション)の最新情報を監視する
        const userRef = doc(db, "users", u.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            
            // ★ここが重要：Authの情報(u)と、DBの情報(userData)を合体させる
            // DBに photoURL があれば、それを優先して使う！
            setUser({
              uid: u.uid,
              email: u.email,
              displayName: userData.displayName || u.displayName,
              photoURL: userData.photoURL || u.photoURL, // ← ここでDBの画像を優先
            });
          }
        });
        
        return () => unsubscribeUser();
      } else {
        setUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. 部屋リスト監視
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

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
