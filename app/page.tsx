"use client";

import { useState, useEffect } from "react"; // useEffect を追加
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot // データをリアルタイムで監視する機能
} from "firebase/firestore"; 
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  // 投稿データを保存するリスト
  const [posts, setPosts] = useState<any[]>([]);

  // アプリが起動したら、自動でデータを監視スタート！
  useEffect(() => {
    // "posts" の中身を、新しい順（desc）に並べて取得する命令
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    // データベースに変更があるたびに、この処理が動く（リアルタイム更新）
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    });

    return () => unsubscribe(); // 画面を閉じた時に監視を終了
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleAddPost = async () => {
    if (inputText === "") return;
    try {
      await addDoc(collection(db, "posts"), {
        text: inputText,
        author: user.displayName,
        createdAt: new Date(),
      });
      setInputText("");
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">簡易SNSアプリ</h1>

      {user ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p>こんにちは、<b>{user.displayName}</b> さん</p>
            <button onClick={handleLogout} className="text-sm text-gray-500 underline">ログアウト</button>
          </div>

          <div className="mb-8">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-black bg-white"
              placeholder="今なにしてる？"
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
        <div className="mb-8">
          <p className="mb-4">ログインして会話に参加しよう！</p>
          <button 
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Googleでログイン
          </button>
        </div>
      )}

      {/* ▼ ここから下：タイムライン表示エリア ▼ */}
      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">タイムライン</h2>
        
        {posts.map((post) => (
          <div key={post.id} className="bg-gray-100 p-4 mb-3 rounded-lg">
            <p className="font-bold text-sm text-gray-600 mb-1">{post.author}</p>
            <p className="text-lg text-gray-800">{post.text}</p>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="text-gray-400">まだ投稿がありません。</p>
        )}
      </div>
    </div>
  );
}
