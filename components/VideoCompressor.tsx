"use client";
import { useState, useCallback, useEffect, useRef } from "react";

export default function VideoCompressor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // 清理函数
  const cleanupCompression = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // 重置服务器端的进度
    await fetch("/api/compress/progress?reset=true");

    setProgress(0);
    setCompressing(false);
    setCompressionProgress("");
    setCompressionRatio(null);
    setError(null);
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size > 500 * 1024 * 1024) {
          setError("文件大小不能超过500MB");
          return;
        }
        // 清理之前的压缩状态
        cleanupCompression();

        setSelectedFile(file);
        setDownloadUrl(null);
      }
    },
    [cleanupCompression]
  );

  const handleCompress = useCallback(async () => {
    if (!selectedFile) return;

    try {
      // 先重置所有状态
      await cleanupCompression();

      setCompressing(true);
      setError(null);

      const formData = new FormData();
      formData.append("video", selectedFile);

      // 先开始上传和压缩
      const response = fetch("/api/compress", {
        method: "POST",
        body: formData,
      });

      // 等待一小段时间确保压缩进程已经启动
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 然后再开始监听进度
      eventSourceRef.current = new EventSource("/api/compress/progress");

      // 创建一个 Promise 来处理进度更新
      const progressPromise = new Promise((resolve, reject) => {
        if (!eventSourceRef.current) return;

        eventSourceRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setCompressionProgress(data.progress);
          setProgress(data.percentage || 0);

          // 如果进度到达100%，关闭连接
          if (data.percentage >= 100) {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            resolve(true);
          }
        };

        eventSourceRef.current.onerror = (error) => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          reject(error);
        };
      });

      // 等待压缩完成
      const result = await response;

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.message || "压缩失败");
      }

      // 等待进度更新完成
      await progressPromise;

      const blob = await result.blob();
      const compressionRatio = (blob.size / selectedFile.size) * 100;
      setCompressionRatio(Number(compressionRatio.toFixed(2)));

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
    } catch (error) {
      console.error("完整错误信息:", error);
      setError(error instanceof Error ? error.message : "视频压缩过程中发生错误");
    } finally {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setCompressing(false);
    }
  }, [selectedFile, cleanupCompression, downloadUrl]);

  // 组件卸载时清理资源
  const cleanup = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    cleanupCompression();
  }, [downloadUrl, cleanupCompression]);

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
          accept="video/mp4,video/webm,video/x-matroska,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/mpeg,video/3gpp,video/x-flv"
          onChange={handleFileSelect}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {selectedFile && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">
            已选择文件: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
          <p className="text-xs text-gray-500 mb-2">
            支持的格式：MP4、WebM、MKV、MOV、AVI、WMV、MPEG、3GP、FLV
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
          <div className="mt-2 text-sm text-gray-600">
            <p className="text-center">处理中，请耐心等待...</p>
            {compressionProgress && <p className="text-sm text-gray-600 text-center">{compressionProgress}</p>}
          </div>
        </div>
      )}

      {downloadUrl && (
        <div className="mt-4">
          {compressionRatio && (
            <div className="mb-3 text-sm text-gray-700">
              <p className="font-medium">压缩结果:</p>
              <p>原始大小: {(selectedFile?.size || 0 / (1024 * 1024)).toFixed(2)} MB</p>
              <p>
                压缩后大小: {(((selectedFile?.size || 0) * (compressionRatio / 100)) / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className={`font-semibold ${compressionRatio < 50 ? "text-green-600" : "text-yellow-600"}`}>
                压缩率: {(100 - compressionRatio).toFixed(2)}%
              </p>
            </div>
          )}
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
