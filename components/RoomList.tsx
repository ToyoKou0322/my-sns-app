// src/components/RoomList.tsx
"use client";

import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

type Props = {
  user: any;
  rooms: any[];
  setCurrentRoom: (room: any) => void;
  handleLogout: () => void;
};

// ランダムなアバター画像のURLを作る関数
const getRandomAvatar = () => {
  const randomSeed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${randomSeed}`;
};

export default function RoomList({ user, rooms, setCurrentRoom, handleLogout }: Props) {
  const [newRoomName, setNewRoomName] = useState("");
  
  // 編集用のステート
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(""); // 新しいアイコンURLの一時保存場所
  const [isEditing, setIsEditing] = useState(false);

  // 部屋作成
  const handleCreateRoom = async () => {
    if (!newRoomName) return;
    try {
      await addDoc(collection(db, "rooms"), {
        title: newRoomName,
        createdAt: new Date(),
        createdBy: user.displayName,
      });
      setNewRoomName("");
      alert("部屋を作成しました！");
    } catch (error) {
      console.error(error);
    }
  };

  // プロフィール更新（名前とアイコン）
  const handleUpdateProfile = async () => {
    if (!newName || !auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { 
        displayName: newName,
        photoURL: newIcon // アイコンも更新！
      });
      await auth.currentUser.reload();
      window.location.reload(); 
    } catch (error) {
      console.error(error);
    }
  };

  // 編集モードを開始する時の処理
  const startEditing = () => {
    setNewName(user.displayName || "");
    // 今のアイコンがあればそれを、なければランダムなものをセット
    setNewIcon(user.photoURL || getRandomAvatar());
    setIsEditing(true);
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold mt-2">スレッド一覧</h1>
        
        <div className="text-right">
          {isEditing ? (
            // ▼▼▼ 編集モード ▼▼▼
            <div className="flex flex-col items-end gap-2 mb-2">
              <div className="flex items-center gap-2">
                {/* アイコンプレビュー */}
                <img 
                  src={newIcon} 
                  alt="New Icon" 
                  className="w-10 h-10 rounded-full border border-gray-300 bg-white"
                />
                {/* サイコロボタン（ランダム生成） */}
                <button 
                  onClick={() => setNewIcon(getRandomAvatar())}
                  className="bg-yellow-400 text-white w-8 h-8 rounded-full text-lg hover:bg-yellow-500 transition"
                  title="別のアイコンにする"
                >
                  🎲
                </button>
                
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="border p-1 text-sm rounded text-black w-32 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleUpdateProfile} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">保存</button>
                <button onClick={() => setIsEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded text-xs">キャンセル</button>
              </div>
            </div>
          ) : (
            // ▼▼▼ 通常モード ▼▼▼
            <div className="flex items-center justify-end gap-3 mb-2">
              {/* 現在のアイコン表示 */}
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="My Icon" 
                  className="w-10 h-10 rounded-full border border-gray-300 bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  No img
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-gray-800 font-bold">{user.displayName}</p>
                <button 
                  onClick={startEditing} 
                  className="text-gray-400 hover:text-blue-500"
                >
                  ✎
                </button>
              </div>
            </div>
          )}
          
          {!isEditing && (
            <button onClick={handleLogout} className="text-xs text-red-500 underline">ログアウト</button>
          )}
        </div>
      </div>

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
        {rooms.length === 0 && <p>まだ部屋がありません。</p>}
      </div>
    </div>
  );
}
