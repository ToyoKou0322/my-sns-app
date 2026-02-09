// src/components/UrlPreview.tsx
"use client";

import { useState, useEffect } from "react";

export default function UrlPreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 無料のMicrolink APIを使ってメタデータを取得
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        
        if (json.status === "success") {
          setData(json.data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  if (loading) return <span className="text-xs text-gray-400">読み込み中...</span>;
  if (error || !data) return null; // 失敗したら何も表示しない

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block mt-2 mb-1 bg-white border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition no-underline text-black max-w-sm"
    >
      {/* 画像がある場合 */}
      {data.image?.url && (
        <div className="h-32 w-full overflow-hidden bg-gray-100">
          <img 
            src={data.image.url} 
            alt="preview" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* タイトルと説明 */}
      <div className="p-3">
        <h4 className="font-bold text-sm truncate text-blue-800 mb-1">{data.title}</h4>
        <p className="text-xs text-gray-500 line-clamp-2">{data.description}</p>
        <span className="text-[10px] text-gray-400 mt-2 block">{new URL(url).hostname}</span>
      </div>
    </a>
  );
}
