"use client";
import { useState } from "react";
import ImageCompressor from "@/components/ImageCompressor";
import VideoCompressor from "@/components/VideoCompressor";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">文件压缩工具</h1>

        {/* Tab 切换按钮 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
            <button
              onClick={() => setActiveTab("image")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "image" ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              图片压缩
            </button>
            <button
              onClick={() => setActiveTab("video")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "video" ? "bg-blue-500 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              视频压缩
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="mt-4">{activeTab === "image" ? <ImageCompressor /> : <VideoCompressor />}</div>
      </div>
    </main>
  );
}
