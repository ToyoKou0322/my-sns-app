// src/components/RoomList.tsx
"use client";

import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

// 親(page.tsx)から受け取るデータの形を定義
type Props = {
  user: any;
  rooms: any[];
  setCurrentRoom: (room: any) => void;
  handleLogout: () => void;
};

export default function RoomList({ user, rooms, setCurrentRoom, handleLogout }: Props) {
  const [newRoomName, setNewRoomName] = useState("");
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

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

  // 名前変更
  const handleUpdateName = async () => {
    if (!newName || !auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      await auth.currentUser.reload();
      window.location.reload(); // 名前変更を反映させるためリロード
    } catch (error) {
      console.error(error);
    }
  };

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
