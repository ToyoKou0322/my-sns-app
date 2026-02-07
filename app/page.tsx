"use client";

import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc, where
} from "firebase/firestore"; 
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  updateProfile 
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";

// ▼ スタンプのリスト（ここを好きに変えればスタンプが増えます）
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

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  
  // ▼ スタンプパネルを開くかどうか
  const [showStamps, setShowStamps] = useState(false);

  const scrollBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => setUser(u));
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribeRooms = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubscribeAuth();
      unsubscribeRooms();
    };
  }, []);

  useEffect(() => {
    if (!currentRoom) return;
    const q = query(
      collection(db, "posts"), 
      where("roomId", "==", currentRoom.id),
      orderBy("createdAt", "asc")
    );
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribePosts();
  }, [currentRoom]);

  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [posts]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRoom(null);
  };

  const handleCreateRoom = async () => {
    if (newRoomName === "") return;
    try {
      await addDoc(collection(db, "rooms"), {
        title: newRoomName,
        createdAt: new Date(),
        createdBy: user.displayName
      });
      setNewRoomName("");
      alert("部屋を作成しました！");
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddPost = async () => {
    if (inputText === "") return;
    try {
      await addDoc(collection(db, "posts"), {
        text: inputText,
        author: user.displayName,
        uid: user.uid,
        roomId: currentRoom.id,
        createdAt: new Date(),
        likes: 0,
        type: "text" // 普通のテキストだよ、という印
      });
      setInputText("");
    } catch (error) {
      console.error(error);
    }
  };

  // ▼ スタンプを送信する機能
  const handleSendStamp = async (stamp: string) => {
    try {
      await addDoc(collection(db, "posts"), {
        text: stamp, // 絵文字そのものをテキストとして保存
        author: user.displayName,
        uid: user.uid,
        roomId: currentRoom.id,
        createdAt: new Date(),
        likes: 0,
        type: "stamp" // 「これはスタンプだよ」という印をつける
      });
      setShowStamps(false); // 送信したらパネルを閉じる
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "posts", id));
  };
  const handleLike = async (id: string, currentLikes: number) => {
    await updateDoc(doc(db, "posts", id), { likes: currentLikes + 1 });
  };
  
  const handleUpdateName = async () => {
    if (!newName || !auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: newName });
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
    setIsEditingName(false);
  };

  if (!user) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">スレッドSNS</h1>
        <button onClick={handleLogin} className="bg-blue-500 text-white px-6 py-3 rounded-lg font-bold">
          Googleでログインして始める
        </button>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold mt-2">スレッド一覧</h1>
          <div className="text-right">
            {isEditingName ? (
              <div className="flex items-center justify-end gap-2 mb-2">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="border p-1 text-sm rounded text-black w-32 bg-white"
                />
                <button onClick={handleUpdateName} className="bg-blue-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">保存</button>
                <button onClick={() => setIsEditingName(false)} className="bg-gray-400 text-white px-2 py-1 rounded text-xs">✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 mb-2">
                <p className="text-gray-800 font-bold">{user.displayName}</p>
                <button 
                  onClick={() => {
                    setNewName(user.displayName);
                    setIsEditingName(true);
                  }} 
                  className="text-gray-400 hover:text-blue-500"
                >
                  ✎
                </button>
              </div>
            )}
            <button onClick={handleLogout} className="text-xs text-red-500 underline">ログアウト</button>
          </div>
        </div>

        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-bold mb-2 text-black">新しい部屋を作る</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="部屋の名前（例：雑談、アニメの話）"
              className="border p-2 rounded flex-1 text-black"
            />
            <button onClick={handleCreateRoom} className="bg-green-600 text-white px-4 py-2 rounded font-bold">
              作成
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              onClick={() => setCurrentRoom(room)}
              className="border p-4 rounded-lg shadow-sm hover:bg-blue-50 cursor-pointer transition"
            >
              <h3 className="text-xl font-bold text-blue-600">{room.title}</h3>
              <p className="text-xs text-gray-400">作成者: {room.createdBy}</p>
            </div>
          ))}
          {rooms.length === 0 && <p>まだ部屋がありません。作ってみよう！</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto pb-40"> {/* スタンプパネル分、下を空ける */}
      <div className="flex justify-between items-center mb-4 border-b pb-4 sticky top-0 bg-white z-10">
        <button 
          onClick={() => setCurrentRoom(null)}
          className="text-gray-500 hover:text-black font-bold"
        >
          ← 戻る
        </button>
        <h2 className="text-xl font-bold truncate text-black">{currentRoom.title}</h2>
        <div className="w-10"></div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className={`p-4 rounded-lg max-w-[80%] ${post.uid === user.uid ? "bg-blue-100 ml-auto" : "bg-gray-100"}`}>
            <div className="flex justify-between items-end mb-1">
              <p className="text-xs text-gray-500 font-bold">{post.author}</p>
              <p className="text-[10px] text-gray-400 ml-2">{formatDate(post.createdAt)}</p>
            </div>
            
            {/* ▼ スタンプなら大きく、文字なら普通に表示する分岐処理 ▼ */}
            {post.type === "stamp" ? (
              <p className="text-6xl">{post.text}</p> // スタンプは超巨大に！
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
            )}
            
            <div className="flex justify-end mt-2 gap-2 items-center">
               <button onClick={() => handleLike(post.id, post.likes || 0)} className="text-pink-500 text-xs hover:bg-white rounded px-1">🩷 {post.likes || 0}</button>
               {post.uid === user.uid && <button onClick={() => handleDelete(post.id)} className="text-gray-400 text-xs hover:text-red-500">🗑️</button>}
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-gray-400 mt-10">まだ投稿がありません。</p>}
        <div ref={scrollBottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          {/* ▼ スタンプパネル（ボタンを押すと出現） ▼ */}
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

          <div className="flex gap-2">
            <button 
              onClick={() => setShowStamps(!showStamps)} // パネルの開閉
              className="bg-yellow-400 text-white px-3 rounded-lg text-xl"
            >
              ☺
            </button>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 border p-2 rounded-lg text-black bg-gray-50"
              placeholder="メッセージを入力..."
            />
            <button 
              onClick={handleAddPost}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
