// src/components/ChatRoom.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, query, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc, where, getDoc, setDoc,
  arrayUnion, arrayRemove, serverTimestamp
} from "firebase/firestore"; 
import { db } from "../firebaseConfig";
import UrlPreview from "./UrlPreview"; // ← ★追加

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

// ▼ URLを抽出する正規表現
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type Props = {
  user: any;
  currentRoom: any;
  setCurrentRoom: (room: any) => void;
};

export default function ChatRoom({ user, currentRoom, setCurrentRoom }: Props) {
  const [posts, setPosts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showStamps, setShowStamps] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const prevPostsLength = useRef(0);
  const isRoomChanged = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const safeReadTime = Date.now() + 5000;
    localStorage.setItem(`lastRead_${currentRoom.id}`, safeReadTime.toString());
  }, [currentRoom.id, posts]); 

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

  useEffect(() => {
    isRoomChanged.current = true;
  }, [currentRoom]);

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 500;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
          canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAddPost = async () => {
    if (inputText === "" || isSending) return;
    setIsSending(true);
    try {
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
      await updateDoc(doc(db, "rooms", currentRoom.id), { lastPostedAt: serverTimestamp() });
      setInputText("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendStamp = async (stamp: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
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
      await updateDoc(doc(db, "rooms", currentRoom.id), { lastPostedAt: serverTimestamp() });
      setShowStamps(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending) return;
    
    setIsSending(true);
    try {
      const base64String = await compressImage(file);
      await addDoc(collection(db, "posts"), {
        text: base64String,
        author: user.displayName,
        uid: user.uid,
        photoURL: user.photoURL,
        roomId: currentRoom.id,
        createdAt: new Date(),
        likedBy: [],
        type: "image"
      });
      await updateDoc(doc(db, "rooms", currentRoom.id), { lastPostedAt: serverTimestamp() });
    } catch (error) {
      console.error("Image send error:", error);
      alert("画像の送信に失敗しました");
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  const handleStartDM = async (targetUser: any) => {
    if (targetUser.uid === user.uid) return; 
    if (!window.confirm(`${targetUser.author}さんにDMを送りますか？`)) return;

    const memberIds = [user.uid, targetUser.uid].sort();
    const dmRoomId = `dm_${memberIds[0]}_${memberIds[1]}`;

    try {
      const roomRef = doc(db, "rooms", dmRoomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          title: `DM: ${user.displayName} & ${targetUser.author}`,
          createdAt: new Date(),
          createdBy: "system",
          members: memberIds,
          type: "dm",
          ownerId: user.uid,
          lastPostedAt: serverTimestamp() 
        });
      }
      const roomData = { 
        id: dmRoomId, 
        title: roomSnap.exists() ? roomSnap.data().title : `DM: ${user.displayName} & ${targetUser.author}`,
        type: "dm"
      };
      const safeReadTime = Date.now() + 5000;
      localStorage.setItem(`lastRead_${dmRoomId}`, safeReadTime.toString());
      setCurrentRoom(roomData);
    } catch (error) {
      console.error("DM Error:", error);
    }
  };

  // ▼ テキスト内のURLをリンクにして、プレビュー用のURLを見つける関数
  const renderTextWithLinks = (text: string) => {
    // 1. URLが含まれているかチェック
    const urls = text.match(URL_REGEX);
    // 2. 最初のURLだけプレビュー表示用に取得 (複数あると邪魔なので)
    const firstUrl = urls ? urls[0] : null;

    // 3. テキストをURLで分割して、リンクタグに置き換える
    const parts = text.split(URL_REGEX);
    
    return (
      <>
        <p className="text-gray-800 whitespace-pre-wrap">
          {parts.map((part, i) => 
            part.match(URL_REGEX) ? (
              <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                {part}
              </a>
            ) : part
          )}
        </p>
        
        {/* ▼ URLが見つかったらプレビューを表示 */}
        {firstUrl && <UrlPreview url={firstUrl} />}
      </>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-40">
      <div className="flex justify-between items-center mb-4 border-b pb-4 sticky top-0 bg-white z-10">
        <button onClick={() => setCurrentRoom(null)} className="text-gray-500 hover:text-black font-bold">
          ← 戻る
        </button>
        <h2 className="text-xl font-bold truncate text-black">
          {currentRoom.type === "dm" ? "🔒 " : "# "}
          {currentRoom.title}
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="space-y-4">
      {posts.map((post) => {
          const isLiked = post.likedBy ? post.likedBy.includes(user.uid) : false;
          const likeCount = post.likedBy ? post.likedBy.length : (post.likes || 0);

          return (
            <div key={post.id} className={`flex gap-2 mb-4 max-w-[80%] ${post.uid === user.uid ? "ml-auto flex-row-reverse" : ""}`}>
              <div className="cursor-pointer hover:opacity-80" onClick={() => handleStartDM(post)} title="クリックしてDMを送る">
                {post.photoURL ? (
                  <img src={post.photoURL} alt="icon" className="w-10 h-10 rounded-full border border-gray-300 object-cover"/>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0"></div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${post.uid === user.uid ? "bg-blue-100" : "bg-gray-100"}`}>
                <div className="flex justify-between items-end mb-1 min-w-[100px]">
                  <p className="text-xs text-gray-500 font-bold cursor-pointer hover:underline" onClick={() => handleStartDM(post)}>
                    {post.author}
                  </p>
                  <p className="text-[10px] text-gray-400 ml-2">{formatDate(post.createdAt)}</p>
                </div>
                
                {/* ▼ 表示処理の分岐 ▼ */}
                {post.type === "stamp" ? (
                  <p className="text-6xl">{post.text}</p>
                ) : post.type === "image" ? (
                  <img 
                    src={post.text} 
                    alt="posted image" 
                    className="max-w-full rounded-lg border border-gray-200 cursor-pointer"
                    onClick={() => window.open(post.text, '_blank')} 
                  />
                ) : (
                  // ★ ここで新しい関数を使う
                  renderTextWithLinks(post.text)
                )}
                
                <div className="flex justify-end mt-2 gap-2 items-center">
                  <button onClick={() => handleLike(post)} className={`text-xs rounded px-2 py-1 transition flex items-center gap-1 ${isLiked ? "bg-pink-100 text-pink-500 font-bold border border-pink-200" : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50"}`}>
                    {isLiked ? "❤️" : "🤍"} <span>{likeCount}</span>
                  </button>
                  {post.uid === user.uid && (
                    <button onClick={() => handleDelete(post.id)} className="text-gray-400 text-xs hover:text-red-500 ml-2">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && <p className="text-center text-gray-400 mt-10">まだ投稿がありません。</p>}
        <div ref={scrollBottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          {showStamps && (
            <div className="flex gap-4 mb-4 overflow-x-auto p-2 bg-gray-50 rounded-lg">
              {STAMPS.map((stamp) => (
                <button key={stamp} onClick={() => handleSendStamp(stamp)} className="text-4xl hover:bg-gray-200 rounded p-2 transition">{stamp}</button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xl mb-1 hover:bg-gray-300"
              disabled={isSending}
              title="画像を送る"
            >
              📷
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleSendImage}
              className="hidden"
            />

            <button onClick={() => setShowStamps(!showStamps)} className="bg-yellow-400 text-white px-3 py-2 rounded-lg text-xl mb-1 hover:bg-yellow-500">☺</button>
            
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="flex-1 border p-2 rounded-lg text-black bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="メッセージを入力..." rows={2}/>
            
            <button 
              onClick={handleAddPost}
              disabled={isSending}
              className={`${isSending ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"} text-white px-6 py-2 rounded-lg font-bold mb-1`}
            >
              {isSending ? "..." : "送信"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
