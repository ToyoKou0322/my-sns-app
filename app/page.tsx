"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  deleteDoc, // 削除用に追加
  doc,       // 特定のデータを指定する用に追加
  updateDoc  // 更新(いいね)用に追加
} from "firebase/firestore"; 
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
    });
    return () => unsubscribe();
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
        uid: user.uid, // 誰が書いたか識別するためのIDを追加
        createdAt: new Date(),
        likes: 0, // いいね数の初期値は0
      });
      setInputText("");
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
  };

  // ▼ [削除機能] 
  const handleDelete = async (id: string) => {
    // 確認ダイアログを出す
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      // postsコレクションの中の、指定されたidのドキュメントを削除
      await deleteDoc(doc(db, "posts", id));
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  // ▼ [いいね機能]
  const handleLike = async (id: string, currentLikes: number) => {
    try {
      // postsコレクションの中の、指定されたidのデータを更新
      await updateDoc(doc(db, "posts", id), {
        likes: currentLikes + 1 // 現在の数に+1する
      });
    } catch (error) {
      console.error("いいねエラー:", error);
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

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">タイムライン</h2>
        
        {posts.map((post) => (
          <div key={post.id} className="bg-gray-100 p-4 mb-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-gray-600 mb-1">{post.author}</p>
                <p className="text-lg text-gray-800 mb-2">{post.text}</p>
              </div>
              
              {/* 自分の投稿の時だけ削除ボタンを表示 */}
              {user && post.uid === user.uid && (
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="text-gray-400 hover:text-red-500 text-sm"
                  title="削除"
                >
                  🗑️
                </button>
              )}
            </div>

            {/* いいねボタンエリア */}
            <div className="flex items-center mt-2">
              <button 
                onClick={() => handleLike(post.id, post.likes || 0)}
                className="flex items-center text-pink-500 hover:bg-pink-100 px-2 py-1 rounded transition"
              >
                <span className="mr-1">🩷</span>
                <span>{post.likes || 0}</span>
              </button>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="text-gray-400">まだ投稿がありません。</p>
        )}
      </div>
    </div>
  );
}
