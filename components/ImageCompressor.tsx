"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function ImageCompressor() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const compressImage = async (file: File, compressionQuality: number) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("quality", compressionQuality.toString());

    try {
      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setCompressedImage(data.compressedImage);
      setCompressedSize(data.size);
    } catch (error) {
      console.error("压缩失败:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalImage(file);
    setOriginalSize(file.size);

    await compressImage(file, quality);
  };

  const handleQualityChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuality = Number(e.target.value);
    setQuality(newQuality);

    if (originalImage) {
      await compressImage(originalImage, newQuality);
    }
  };

  const handleDownload = () => {
    if (!compressedImage) return;

    const link = document.createElement("a");
    link.href = compressedImage;
    link.download = "compressed-image.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="space-y-6">
        {/* 上传区域 */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="imageInput" />
          <label htmlFor="imageInput" className="cursor-pointer block">
            <div className="space-y-2">
              <div className="text-gray-600">点击或拖拽上传图片</div>
              <div className="text-sm text-gray-500">支持 PNG、JPG 等格式</div>
            </div>
          </label>
        </div>

        {/* 压缩质量滑块 */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">压缩质量: {quality}%</label>
          <input type="range" min="1" max="100" value={quality} onChange={handleQualityChange} className="w-full" />
        </div>

        {/* 预览区域 */}
        {originalImage && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">原图</div>
              <img src={URL.createObjectURL(originalImage)} alt="原图" className="w-full rounded-lg" />
              <div className="text-sm text-gray-500">大小: {(originalSize / 1024).toFixed(2)} KB</div>
            </div>

            {compressedImage && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">压缩后</div>
                <img src={compressedImage} alt="压缩后" className="w-full rounded-lg" />
                <div className="text-sm text-gray-500">大小: {(compressedSize / 1024).toFixed(2)} KB</div>
              </div>
            )}
          </div>
        )}

        {/* 下载按钮 */}
        {compressedImage && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            className="w-full bg-blue-500 text-white rounded-lg py-2 px-4 flex items-center justify-center space-x-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>下载压缩后的图片</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
