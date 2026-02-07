// src/components/RoomList.tsx
"use client";

import { useState } from "react";
import { 
  addDoc, collection, doc, updateDoc, 
  arrayUnion, arrayRemove // ← 追加
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

type Props = {
  user: any;
  rooms: any[];
  setCurrentRoom: (room: any) => void;
  handleLogout: () => void;
};

// ランダムなアバター画像のURLを作る関数 (ドット絵スタイル)
const getRandomAvatar = () => {
  const randomSeed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${randomSeed}`;
};

export default function RoomList({ user, rooms, setCurrentRoom, handleLogout }: Props) {
  const [newRoomName, setNewRoomName] = useState("");
  
  // 編集用のステート
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ▼ 表示モード（all = 全て, bookmarked = お気に入りのみ）
  const [filterMode, setFilterMode] = useState<"all" | "bookmarked">("all");

  // 部屋作成
  const handleCreateRoom = async () => {
    if (!newRoomName) return;
    try {
      await addDoc(collection(db, "rooms"), {
        title: newRoomName,
        createdAt: new Date(),
        createdBy: user.displayName,
        bookmarkedBy: [], // 初期値は空っぽ
      });
      setNewRoomName("");
      alert("部屋を作成しました！");
    } catch (error) {
      console.error(error);
    }
  };

  // プロフィール更新
  const handleUpdateProfile = async () => {
    if (!newName || !auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { 
        displayName: newName,
        photoURL: newIcon
      });
      await auth.currentUser.reload();
      window.location.reload(); 
    } catch (error) {
      console.error(error);
    }
  };

  const startEditing = () => {
    setNewName(user.displayName || "");
    setNewIcon(user.photoURL || getRandomAvatar());
    setIsEditing(true);
  };

  // ▼ ブックマークの切り替え処理
  const handleBookmark = async (e: React.MouseEvent, room: any) => {
    e.stopPropagation(); // 親の「部屋に入る」クリックイベントを止める
    
    const currentBookmarkedBy = room.bookmarkedBy || [];
    const isBookmarked = currentBookmarkedBy.includes(user.uid);
    const roomRef = doc(db, "rooms", room.id);

    if (isBookmarked) {
      await updateDoc(roomRef, { bookmarkedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(roomRef, { bookmarkedBy: arrayUnion(user.uid) });
    }
  };

  // ▼ 表示する部屋をフィルタリング
  const displayedRooms = rooms.filter((room) => {
    if (filterMode === "all") return true;
    // bookmarked モードなら、自分のIDが含まれている部屋だけ残す
    return room.bookmarkedBy?.includes(user.uid);
  });

  return (
    <div className="p-10 max-w-2xl mx-auto">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold mt-2">スレッド一覧</h1>
        
        <div className="text-right">
          {isEditing ? (
            <div className="flex flex-col items-end gap-2 mb-2">
              <div className="flex items-center gap-2">
                <img src={newIcon} alt="New Icon" className="w-10 h-10 rounded-full border border-gray-300 bg-white"/>
                <button onClick={() => setNewIcon(getRandomAvatar())} className="bg-yellow-400 text-white w-8 h-8 rounded-full text-lg hover:bg-yellow-500 transition">🎲</button>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="border p-1 text-sm rounded text-black w-32 bg-white"/>
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdateProfile} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">保存</button>
                <button onClick={() => setIsEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded text-xs">キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 mb-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt="My Icon" className="w-10 h-10 rounded-full border border-gray-300 bg-white"/>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">No img</div>
              )}
              <div className="flex items-center gap-2">
                <p className="text-gray-800 font-bold">{user.displayName}</p>
                <button onClick={startEditing} className="text-gray-400 hover:text-blue-500">✎</button>
              </div>
            </div>
          )}
          {!isEditing && (
            <button onClick={handleLogout} className="text-xs text-red-500 underline">ログアウト</button>
          )}
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
            placeholder="部屋の名前"
            className="border p-2 rounded flex-1 text-black"
          />
          <button onClick={handleCreateRoom} className="bg-green-600 text-white px-4 py-2 rounded font-bold">
            作成
          </button>
        </div>
      </div>

      {/* ▼ タブ切り替えボタン */}
      <div className="flex gap-4 mb-4 border-b">
        <button 
          onClick={() => setFilterMode("all")}
          className={`pb-2 px-2 ${filterMode === "all" ? "border-b-2 border-blue-500 font-bold text-blue-600" : "text-gray-400"}`}
        >
          すべて
        </button>
        <button 
          onClick={() => setFilterMode("bookmarked")}
          className={`pb-2 px-2 ${filterMode === "bookmarked" ? "border-b-2 border-yellow-500 font-bold text-yellow-600" : "text-gray-400"}`}
        >
          お気に入り ★
        </button>
      </div>

      {/* 部屋リスト表示 */}
      <div className="grid gap-4">
        {displayedRooms.map((room) => {
          const isBookmarked = room.bookmarkedBy?.includes(user.uid);

          return (
            <div 
              key={room.id} 
              onClick={() => setCurrentRoom(room)}
              className="border p-4 rounded-lg shadow-sm hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group"
            >
              <div>
                <h3 className="text-xl font-bold text-blue-600 group-hover:underline">{room.title}</h3>
                <p className="text-xs text-gray-400">作成者: {room.createdBy}</p>
              </div>
              
              {/* ▼ ブックマークボタン（星マーク） */}
              <button 
                onClick={(e) => handleBookmark(e, room)}
                className={`text-2xl transition hover:scale-110 ${isBookmarked ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"}`}
                title="お気に入りに追加"
              >
                {isBookmarked ? "★" : "☆"}
              </button>
            </div>
          );
        })}
        
        {displayedRooms.length === 0 && (
          <p className="text-gray-400 py-4">
            {filterMode === "bookmarked" ? "お気に入りの部屋はまだありません。" : "部屋がありません。"}
          </p>
        )}
      </div>
    </div>
  );
}
