// src/components/ChatRoom.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc, where, getDoc, setDoc, // ← setDoc, getDocを追加
  arrayUnion, arrayRemove
} from "firebase/firestore"; 
import { db } from "../firebaseConfig";

// ▼ 定数・ヘルパー関数
const STAMPS = ["👍", "🎉", "😂", "🙏", "❤️", "😭"];

const formatDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ja-JP', { 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

type Props = {
  user: any;
  currentRoom: any;
  setCurrentRoom: (room: any) => void;
};

export default function ChatRoom({ user, currentRoom, setCurrentRoom }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showStamps, setShowStamps] = useState(false);

  // スクロール関連のrefs
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const prevPostsLength = useRef(0);
  const isRoomChanged = useRef(false);

  // 1. 投稿データの監視
  useEffect(() => {
    const q = query(
      collection(db, "posts"), 
      where("roomId", "==", currentRoom.id),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // 2. 部屋変更フラグ
  useEffect(() => {
    isRoomChanged.current = true;
  }, [currentRoom]);

  // 3. 自動スクロール制御
  useEffect(() => {
    if (posts.length === 0) return;
    const currentLength = posts.length;
    const prevLength = prevPostsLength.current;

    if (isRoomChanged.current || currentLength > prevLength) {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      isRoomChanged.current = false;
    }
    prevPostsLength.current = currentLength;
  }, [posts.length]);

  // --- アクション ---
  const handleAddPost = async () => {
    if (inputText === "") return;
    await addDoc(collection(db, "posts"), {
      text: inputText,
      author: user.displayName,
      uid: user.uid,
      photoURL: user.photoURL,
      roomId: currentRoom.id,
      createdAt: new Date(),
      likedBy: [],
      type: "text"
    });
    setInputText("");
  };

  const handleSendStamp = async (stamp: string) => {
    await addDoc(collection(db, "posts"), {
      text: stamp,
      author: user.displayName,
      uid: user.uid,
      photoURL: user.photoURL,
      roomId: currentRoom.id,
      createdAt: new Date(),
      likedBy: [],
      type: "stamp"
    });
    setShowStamps(false);
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "posts", id));
  };

  const handleLike = async (post: any) => {
    const currentLikedBy = post.likedBy || [];
    const isLiked = currentLikedBy.includes(user.uid);
    const postRef = doc(db, "posts", post.id);

    if (isLiked) {
      await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
    }
  };

  // ▼ DMを開始する機能
  const handleStartDM = async (targetUser: any) => {
    if (targetUser.uid === user.uid) return; // 自分自身にはDM送れない
    if (!window.confirm(`${targetUser.author}さんにDMを送りますか？`)) return;

    // 1. 2人のUIDをソートして、常に同じ部屋IDになるようにする
    // (Aさん→Bさん でも Bさん→Aさん でも同じ部屋IDにするため)
    const memberIds = [user.uid, targetUser.uid].sort();
    const dmRoomId = `dm_${memberIds[0]}_${memberIds[1]}`;

    try {
      // 2. 部屋がすでにあるか確認
      const roomRef = doc(db, "rooms", dmRoomId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        // 3. なければ作成 (setDocを使ってIDを指定して作る)
        await setDoc(roomRef, {
          title: `DM: ${user.displayName} & ${targetUser.author}`,
          createdAt: new Date(),
          createdBy: "system",
          members: memberIds, // メンバーを記録
          type: "dm",         // タイプをDMにする
          ownerId: user.uid   // 一応作った人を記録
        });
      }

      // 4. その部屋に移動
      // 移動するために必要なデータを整形
      const roomData = { 
        id: dmRoomId, 
        title: roomSnap.exists() ? roomSnap.data().title : `DM: ${user.displayName} & ${targetUser.author}`,
        type: "dm"
      };
      setCurrentRoom(roomData);

    } catch (error) {
      console.error("DM Error:", error);
      alert("DMの開始に失敗しました");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-40">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4 border-b pb-4 sticky top-0 bg-white z-10">
        <button 
          onClick={() => setCurrentRoom(null)}
          className="text-gray-500 hover:text-black font-bold"
        >
          ← 戻る
        </button>
        <h2 className="text-xl font-bold truncate text-black">
          {/* DMの場合は特別なアイコンを表示 */}
          {currentRoom.type === "dm" ? "🔒 " : "# "}
          {currentRoom.title}
        </h2>
        <div className="w-10"></div>
      </div>

      {/* タイムライン */}
      <div className="space-y-4">
      {posts.map((post) => {
          const isLiked = post.likedBy ? post.likedBy.includes(user.uid) : false;
          const likeCount = post.likedBy ? post.likedBy.length : (post.likes || 0);

          return (
            <div key={post.id} className={`flex gap-2 mb-4 max-w-[80%] ${post.uid === user.uid ? "ml-auto flex-row-reverse" : ""}`}>
              
              {/* アイコン画像 (クリックでDM開始) */}
              <div 
                className="cursor-pointer hover:opacity-80"
                onClick={() => handleStartDM(post)}
                title="クリックしてDMを送る"
              >
                {post.photoURL ? (
                  <img src={post.photoURL} alt="icon" className="w-10 h-10 rounded-full border border-gray-300"/>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0"></div>
                )}
              </div>

              {/* 吹き出しエリア */}
              <div className={`p-3 rounded-lg ${post.uid === user.uid ? "bg-blue-100" : "bg-gray-100"}`}>
                <div className="flex justify-between items-end mb-1 min-w-[100px]">
                  {/* 名前もクリックでDM開始 */}
                  <p 
                    className="text-xs text-gray-500 font-bold cursor-pointer hover:underline"
                    onClick={() => handleStartDM(post)}
                  >
                    {post.author}
                  </p>
                  <p className="text-[10px] text-gray-400 ml-2">{formatDate(post.createdAt)}</p>
                </div>
                
                {post.type === "stamp" ? (
                  <p className="text-6xl">{post.text}</p>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
                )}
                
                <div className="flex justify-end mt-2 gap-2 items-center">
                  <button 
                    onClick={() => handleLike(post)} 
                    className={`text-xs rounded px-2 py-1 transition flex items-center gap-1 ${
                      isLiked 
                        ? "bg-pink-100 text-pink-500 font-bold border border-pink-200"
                        : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {isLiked ? "❤️" : "🤍"} <span>{likeCount}</span>
                  </button>

                  {post.uid === user.uid && (
                    <button onClick={() => handleDelete(post.id)} className="text-gray-400 text-xs hover:text-red-500 ml-2">
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && <p className="text-center text-gray-400 mt-10">まだ投稿がありません。</p>}
        <div ref={scrollBottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          {showStamps && (
            <div className="flex gap-4 mb-4 overflow-x-auto p-2 bg-gray-50 rounded-lg">
              {STAMPS.map((stamp) => (
                <button 
                  key={stamp} 
                  onClick={() => handleSendStamp(stamp)}
                  className="text-4xl hover:bg-gray-200 rounded p-2 transition"
                >
                  {stamp}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button 
              onClick={() => setShowStamps(!showStamps)}
              className="bg-yellow-400 text-white px-3 py-2 rounded-lg text-xl mb-1"
            >
              ☺
            </button>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 border p-2 rounded-lg text-black bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="メッセージを入力..."
              rows={2}
            />
            
            <button 
              onClick={handleAddPost}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold mb-1"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
