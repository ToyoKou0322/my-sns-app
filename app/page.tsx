"use client";

import { useState, useEffect } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc, where // ← 'where' (条件検索) を追加
} from "firebase/firestore"; 
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  updateProfile 
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  
  // ▼ 部屋（スレッド）関連の変数
  const [rooms, setRooms] = useState<any[]>([]);       // 部屋リスト
  const [currentRoom, setCurrentRoom] = useState<any>(null); // 今いる部屋
  const [newRoomName, setNewRoomName] = useState("");  // 新しい部屋の名前入力

  // ▼ 投稿・チャット関連の変数
  const [posts, setPosts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  // ▼ ユーザー情報変更用
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // 1. 起動時に「部屋リスト」を監視する
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => setUser(u));

    // 部屋一覧は「作られた順」に取得
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribeRooms = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRooms();
    };
  }, []);

  // 2. 「今いる部屋」が変わったら、その部屋の投稿だけを取得し直す
  useEffect(() => {
    if (!currentRoom) return; // 部屋に入っていない時は何もしない

    // 「posts」の中から「roomId が今の部屋と同じ」ものだけを探す
    const q = query(
      collection(db, "posts"), 
      where("roomId", "==", currentRoom.id), // ← ここが重要！
      orderBy("createdAt", "asc") // チャットっぽく古い順（上から下）に表示
    );

    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      // ※重要：インデックスエラー対策
      console.error("データ取得エラー:", error);
    });

    return () => unsubscribePosts();
  }, [currentRoom]); // currentRoomが変わるたびに実行

  // --- ログイン・ログアウト ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRoom(null); // ログアウトしたら部屋から出る
  };

  // --- 部屋を作る機能 ---
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

  // --- 投稿する機能 ---
  const handleAddPost = async () => {
    if (inputText === "") return;
    try {
      await addDoc(collection(db, "posts"), {
        text: inputText,
        author: user.displayName,
        uid: user.uid,
        roomId: currentRoom.id, // どの部屋の投稿か記録する
        createdAt: new Date(),
        likes: 0,
      });
      setInputText("");
    } catch (error) {
      console.error(error);
    }
  };
  
  // --- その他の機能（削除・いいね・名前変更） ---
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

  // ================= 画面表示 =================

  // 1. ログインしていない時
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

  // 2. 部屋に入っていない時（ロビー画面）
  if (!currentRoom) {
    return (
      <div className="p-10 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">スレッド一覧</h1>
          <div className="text-right">
             <p className="text-sm text-gray-600 mb-1">{user.displayName}</p>
             <button onClick={handleLogout} className="text-xs text-red-500 underline">ログアウト</button>
          </div>
        </div>

        {/* 部屋作成フォーム */}
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

        {/* 部屋リスト表示 */}
        <div className="grid gap-4">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              onClick={() => setCurrentRoom(room)} // クリックしたらその部屋に入る
              className="border p-4 rounded-lg shadow-sm hover:bg-blue-50 cursor-pointer transition"
            >
              <h3 className="text-xl font-bold text-blue-600">{room.title}</h3>
              <p className="text-xs text-gray-400">作成者: {room.createdBy}</p>
            </div>
          ))}
          {rooms.length === 0 && <p>まだ部屋がありません。作ってみよう！</p>}
        </div>
        
        {/* 名前変更エリア */}
        <div className="mt-10 pt-4 border-t">
            {isEditingName ? (
              <div className="flex gap-2">
                <input type="text" value={newName} onChange={(e)=>setNewName(e.target.value)} className="border p-1 text-black bg-white"/>
                <button onClick={handleUpdateName} className="bg-blue-500 text-white px-2 rounded">保存</button>
              </div>
            ) : (
              <button onClick={()=>setIsEditingName(true)} className="text-gray-500 text-sm">名前を変更する</button>
            )}
        </div>
      </div>
    );
  }

  // 3. 部屋に入っている時（チャット画面）
  return (
    <div className="p-6 max-w-2xl mx-auto pb-24"> {/* pb-24は下の入力欄とかぶらないように */}
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4 border-b pb-4 sticky top-0 bg-white z-10">
        <button 
          onClick={() => setCurrentRoom(null)} // 部屋を空に＝ロビーに戻る
          className="text-gray-500 hover:text-black font-bold"
        >
          ← 戻る
        </button>
        <h2 className="text-xl font-bold truncate text-black">{currentRoom.title}</h2>
        <div className="w-10"></div> {/* レイアウト調整用の空白 */}
      </div>

      {/* タイムライン */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className={`p-4 rounded-lg max-w-[80%] ${post.uid === user.uid ? "bg-blue-100 ml-auto" : "bg-gray-100"}`}>
            <p className="text-xs text-gray-500 mb-1">{post.author}</p>
            <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
            <div className="flex justify-end mt-2 gap-2">
               <button onClick={() => handleLike(post.id, post.likes || 0)} className="text-pink-500 text-xs">🩷 {post.likes || 0}</button>
               {post.uid === user.uid && <button onClick={() => handleDelete(post.id)} className="text-gray-400 text-xs">🗑️</button>}
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-gray-400 mt-10">まだ投稿がありません。<br/>一番乗りでコメントしよう！</p>}
      </div>

      {/* 投稿フォーム（下に固定） */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
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
  );
}
