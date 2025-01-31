"use client";
import { useState, useCallback, useEffect } from "react";

export default function VideoCompressor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        setError("文件大小不能超过500MB");
        return;
      }
      setSelectedFile(file);
      setDownloadUrl(null);
      setError(null);
      setProgress(0);
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setCompressing(true);
      setError(null);
      setProgress(0);

      const formData = new FormData();
      formData.append("video", selectedFile);

      console.log('开始上传文件:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });

      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData,
      });

      console.log('服务器响应:', response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('服务器错误详情:', errorData);
        throw new Error(errorData.message || '压缩失败');
      }

      const blob = await response.blob();
      // 释放之前的 URL
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
    } catch (error) {
      console.error('完整错误信息:', error);
      setError(error instanceof Error ? error.message : '视频压缩过程中发生错误');
    } finally {
      setCompressing(false);
    }
  }, [selectedFile]);

  // 组件卸载时清理资源
  const cleanup = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }, [downloadUrl]);

  // 使用 useEffect 在组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">选择视频文件 (最大500MB)</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {selectedFile && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">
            已选择文件: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
          <button
            onClick={handleCompress}
            disabled={compressing}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors ${
              compressing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {compressing ? "压缩中..." : "开始压缩"}
          </button>
        </div>
      )}

      {compressing && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 text-center mt-2">处理中，请耐心等待...</p>
        </div>
      )}

      {downloadUrl && (
        <div className="mt-4">
          <a
            href={downloadUrl}
            download={`compressed-${selectedFile?.name}`}
            className="block w-full text-center bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
          >
            下载压缩后的视频
          </a>
        </div>
      )}

      {error && <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-md border border-red-200">{error}</div>}
    </div>
  );
}
