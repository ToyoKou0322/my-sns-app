// src/components/RoomList.tsx
"use client";

import { useState } from "react";
import { 
  addDoc, collection, doc, updateDoc, deleteDoc, setDoc, // ← setDocを追加
  arrayUnion, arrayRemove
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig"; // storageは不要

type Props = {
  user: any;
  rooms: any[];
  setCurrentRoom: (room: any) => void;
  handleLogout: () => void;
};

const getRandomAvatar = () => {
  const randomSeed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${randomSeed}`;
};

export default function RoomList({ user, rooms, setCurrentRoom, handleLogout }: Props) {
  const [newRoomName, setNewRoomName] = useState("");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [filterMode, setFilterMode] = useState<"all" | "bookmarked" | "dm">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateRoom = async () => {
    if (!newRoomName) return;
    try {
      await addDoc(collection(db, "rooms"), {
        title: newRoomName,
        createdAt: new Date(),
        createdBy: user.displayName,
        ownerId: user.uid,
        bookmarkedBy: [],
        type: "public",
        lastPostedAt: null 
      });
      setNewRoomName("");
      alert("部屋を作成しました！");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!window.confirm("本当にこの部屋を削除しますか？\n（中のメッセージは見れなくなります）")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "rooms", roomId));
      alert("部屋を削除しました。");
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    }
  };

  // ▼ プロフィール更新処理（ここを大きく変更！）
  const handleUpdateProfile = async () => {
    if (!newName || !auth.currentUser) return;
    try {
      // 1. 名前だけはAuthプロフィールに保存（これは今まで通り）
      await updateProfile(auth.currentUser, { 
        displayName: newName
        // photoURLは文字数制限でエラーになるのでここでは保存しない！
      });

      // 2. 画像データと名前を「users」コレクション（データベース）に保存
      //    ここなら1MBまで入るので、Base64画像も余裕で入ります
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        displayName: newName,
        photoURL: newIcon, // ← ここに長い画像データを保存
        uid: auth.currentUser.uid
      }, { merge: true }); // merge: true は、既存データを消さずに上書きする設定

      alert("プロフィールを更新しました！");
      setIsEditing(false);
      
      // 画面を更新するためにリロードしてもいいですが、
      // page.tsxの監視機能で自動更新されるのでそのままでもOK
    } catch (error) {
      console.error("Update Error:", error);
      alert("更新に失敗しました");
    }
  };

  const startEditing = () => {
    setNewName(user.displayName || "");
    setNewIcon(user.photoURL || getRandomAvatar());
    setIsEditing(true);
  };

  const handleBookmark = async (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    const currentBookmarkedBy = room.bookmarkedBy || [];
    const isBookmarked = currentBookmarkedBy.includes(user.uid);
    const roomRef = doc(db, "rooms", room.id);

    if (isBookmarked) {
      await updateDoc(roomRef, { bookmarkedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(roomRef, { bookmarkedBy: arrayUnion(user.uid) });
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 150;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          // 画質を0.7にして容量を節約
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64String = await compressImage(file);
      setNewIcon(base64String);
    } catch (error) {
      console.error("Image Error:", error);
      alert("画像の処理に失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const displayedRooms = rooms.filter((room) => {
    const matchSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filterMode === "dm") return room.type === "dm" && room.members?.includes(user.uid);
    if (room.type === "dm") return false;
    if (filterMode === "bookmarked") return room.bookmarkedBy?.includes(user.uid);
    return true;
  });

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold mt-2">トークルーム一覧</h1>
        
        <div className="text-right">
          {isEditing ? (
            <div className="flex flex-col items-end gap-2 mb-2">
              <div className="flex items-center gap-2">
                <img 
                  src={newIcon} 
                  alt="New Icon" 
                  className="w-16 h-16 rounded-full border border-gray-300 bg-white object-cover"
                />
                
                <div className="flex flex-col gap-2">
                   <label className={`bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs cursor-pointer hover:bg-gray-300 text-center ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                     {isUploading ? "処理中..." : "📁 画像を選択"}
                     <input 
                       type="file" 
                       accept="image/*" 
                       onChange={handleImageUpload} 
                       className="hidden"
                       disabled={isUploading}
                     />
                   </label>

                   <button 
                      onClick={() => setNewIcon(getRandomAvatar())} 
                      className="text-xs text-blue-500 underline"
                    >
                      またはランダム生成
                    </button>
                  
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="border p-1 text-sm rounded text-black w-32 bg-white"/>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleUpdateProfile} className="bg-blue-500 text-white px-3 py-1 rounded text-xs" disabled={isUploading}>保存</button>
                <button onClick={() => setIsEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded text-xs">キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 mb-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt="My Icon" className="w-10 h-10 rounded-full border border-gray-300 bg-white object-cover"/>
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

      {filterMode !== "dm" && (
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
      )}

      <div className="flex gap-4 mb-4 border-b">
        <button onClick={() => setFilterMode("all")} className={`pb-2 px-2 ${filterMode === "all" ? "border-b-2 border-blue-500 font-bold text-blue-600" : "text-gray-400"}`}>
          すべて
        </button>
        <button onClick={() => setFilterMode("bookmarked")} className={`pb-2 px-2 ${filterMode === "bookmarked" ? "border-b-2 border-yellow-500 font-bold text-yellow-600" : "text-gray-400"}`}>
          お気に入り ★
        </button>
        <button onClick={() => setFilterMode("dm")} className={`pb-2 px-2 ${filterMode === "dm" ? "border-b-2 border-purple-500 font-bold text-purple-600" : "text-gray-400"}`}>
          DM 🔒
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={filterMode === "dm" ? "DM相手の名前..." : "部屋名で検索..."}
            className="w-full border p-2 pl-10 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {displayedRooms.map((room) => {
          const isBookmarked = room.bookmarkedBy?.includes(user.uid);
          const isMyRoom = room.ownerId ? room.ownerId === user.uid : false;
          const lastPostedAt = room.lastPostedAt ? room.lastPostedAt.toMillis() : 0;
          const lastReadAt = Number(localStorage.getItem(`lastRead_${room.id}`)) || 0;
          const isUnread = lastPostedAt > lastReadAt;

          return (
            <div 
              key={room.id} 
              onClick={() => setCurrentRoom(room)}
              className={`border p-4 rounded-lg shadow-sm hover:bg-opacity-50 cursor-pointer transition flex justify-between items-center group relative
                ${room.type === "dm" ? "bg-purple-50 hover:bg-purple-100 border-purple-100" : "hover:bg-blue-50"}
              `}
            >
              <div>
                <h3 className={`text-xl font-bold group-hover:underline flex items-center ${room.type === "dm" ? "text-purple-600" : "text-blue-600"}`}>
                  {room.type === "dm" ? "🔒 " : "# "}
                  {room.title}
                  {isUnread && (
                    <span className="text-red-500 text-xs ml-2 animate-pulse">● New</span>
                  )}
                </h3>
                {room.type !== "dm" && (
                  <p className="text-xs text-gray-400">作成者: {room.createdBy}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isMyRoom && room.type !== "dm" && (
                  <button 
                    onClick={(e) => handleDeleteRoom(e, room.id)}
                    className="text-gray-300 hover:text-red-500 transition p-1"
                    title="部屋を削除"
                  >
                    🗑️
                  </button>
                )}
                {room.type !== "dm" && (
                  <button 
                    onClick={(e) => handleBookmark(e, room)}
                    className={`text-2xl transition hover:scale-110 ${isBookmarked ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"}`}
                    title="お気に入りに追加"
                  >
                    {isBookmarked ? "★" : "☆"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {displayedRooms.length === 0 && (
          <p className="text-gray-400 py-4 text-center">
            {filterMode === "dm" ? "DMの履歴はありません。" : "部屋がありません。"}
          </p>
        )}
      </div>
    </div>
  );
}
