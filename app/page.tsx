"use client";

import { useState, useEffect } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc 
} from "firebase/firestore"; 
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  updateProfile // ← 名前変更のために追加
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  // 名前変更用の入力ボックス
  const [newName, setNewName] = useState("");
  // 名前変更モードかどうか
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    // ユーザーの状態を監視（ログイン・ログアウト・名前変更などを検知）
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAddPost = async () => {
    if (inputText === "") return;
    try {
      await addDoc(collection(db, "posts"), {
        text: inputText,
        author: user.displayName, // その時の最新の名前で投稿される
        uid: user.uid,
        createdAt: new Date(),
        likes: 0,
      });
      setInputText("");
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "posts", id));
  };

  const handleLike = async (id: string, currentLikes: number) => {
    await updateDoc(doc(db, "posts", id), { likes: currentLikes + 1 });
  };

  // ▼ 修正版：名前変更の処理
  const handleUpdateName = async () => {
    if (!newName) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // 1. Firebaseサーバー上の名前を更新
      await updateProfile(currentUser, {
        displayName: newName
      });
      
      await currentUser.reload();
      
      setUser({ ...currentUser });
      
      setIsEditingName(false);
      setNewName("");
      alert("名前を変更しました！");
    } catch (error) {
      console.error("名前変更エラー:", error);
      alert("変更できませんでした");
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">簡易SNSアプリ</h1>

      {user ? (
        <div>
          {/* ▼ ユーザー情報エリア（名前変更機能付き） ▼ */}
          <div className="flex flex-col mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-black">ログイン中: <b>{user.displayName}</b></p>
              <button onClick={handleLogout} className="text-sm text-gray-500 underline">ログアウト</button>
            </div>
            
            {/* 名前変更ボタンまたは入力フォーム */}
            {isEditingName ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="新しい名前"
                  className="border p-1 rounded text-black bg-white"
                />
                <button 
                  onClick={handleUpdateName}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  保存
                </button>
                <button 
                  onClick={() => setIsEditingName(false)}
                  className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingName(true)}
                className="text-blue-600 text-sm text-left hover:underline w-fit"
              >
                名前を変更する ✎
              </button>
            )}
          </div>

          <div className="mb-8">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-black bg-white"
              placeholder={`今なにしてる？ (${user.displayName}として投稿)`}
              rows={3}
            />
            <button 
              onClick={handleAddPost}
              className="mt-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold"
            >
              投稿する
            </button>
          </div>
        </div>
      ) : (
        <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">Googleでログイン</button>
      )}

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">タイムライン</h2>
        {posts.map((post) => (
          <div key={post.id} className="bg-white border p-4 mb-3 rounded-lg shadow-sm">
            <div className="flex justify-between">
              <p className="font-bold text-gray-700">{post.author}</p>
              {user && post.uid === user.uid && (
                <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
              )}
            </div>
            <p className="text-lg text-gray-800 my-2">{post.text}</p>
            <button onClick={() => handleLike(post.id, post.likes || 0)} className="text-pink-500 hover:bg-pink-50 px-2 py-1 rounded">
              🩷 {post.likes || 0}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
