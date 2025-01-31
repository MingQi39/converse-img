import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { setCompressionProgress } from "@/lib/compression";

// 设置 FFmpeg 路径
try {
  ffmpeg.setFfmpegPath(ffmpegPath.path);
  console.log("FFmpeg path set successfully:", ffmpegPath.path);
} catch (error) {
  console.error("Error setting FFmpeg path:", error);
}

// 最大文件大小限制 (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// 处理文件名，移除特殊字符并编码中文
const sanitizeFileName = (fileName: string): string => {
  // 移除文件扩展名
  const extname = path.extname(fileName);
  const basename = path.basename(fileName, extname);

  // 移除特殊字符，只保留字母、数字、中文字符
  const sanitized = basename.replace(/[^\w\u4e00-\u9fa5]/g, "");

  // 如果文件名全是特殊字符被清空了，使用默认名称
  const finalName = sanitized || "video";

  // 返回处理后的文件名加上原扩展名
  return `${finalName}${extname}`;
};

// 编码文件名为 RFC 5987 兼容格式
const encodeRFC5987 = (str: string): string => {
  return encodeURIComponent(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A")
    .replace(/%(?:7C|60|5E)/g, unescape);
};

// 确保临时目录存在
const ensureTmpDir = async () => {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
    console.log("临时目录创建成功:", tmpDir);
  }
  return tmpDir;
};

// 压缩视频函数
const compressVideo = (inputPath: string, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("开始压缩视频处理");
      console.log("输入文件路径:", inputPath);
      console.log("输出文件路径:", outputPath);

      if (!existsSync(inputPath)) {
        throw new Error(`输入文件不存在: ${inputPath}`);
      }

      // 获取视频信息并选择合适的压缩策略
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`获取视频信息失败: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === "video");
        if (!videoStream) {
          reject(new Error("未找到视频流"));
          return;
        }

        // 根据视频分辨率和比特率选择压缩参数
        const width = videoStream.width || 1920;
        const height = videoStream.height || 1080;
        const bitrate = videoStream.bit_rate ? parseInt(videoStream.bit_rate) : 0;
        const fps = videoStream.r_frame_rate ? Math.round(eval(videoStream.r_frame_rate)) : 30;

        // 计算目标比特率，考虑分辨率和帧率
        let targetBitrate = "1M"; // 默认目标比特率
        if (bitrate) {
          // 根据分辨率和帧率调整比特率
          const resolutionFactor = (width * height) / (1920 * 1080);
          const fpsFactor = fps / 30;
          const targetBitrateValue = Math.min(
            bitrate * 0.7 * resolutionFactor * fpsFactor,
            4000000 // 最大4Mbps
          );
          targetBitrate = `${Math.round(targetBitrateValue / 1000)}k`;
        }

        // 根据分辨率和视频长度选择编码预设
        let preset = "medium";
        const duration =
          typeof metadata.format.duration === "string"
            ? parseFloat(metadata.format.duration)
            : metadata.format.duration || 0;
        if (width * height > 1920 * 1080 || duration > 600) {
          // 10分钟以上的视频
          preset = "slow"; // 高分辨率或长视频使用更好的压缩
        } else if (width * height < 1280 * 720 && duration < 60) {
          // 1分钟以下的小视频
          preset = "faster";
        }

        // 设置编码参数
        const command = ffmpeg(inputPath).outputOptions(
          [
            "-c:v libx264", // 使用 H.264 编码
            `-preset ${preset}`,
            `-b:v ${targetBitrate}`,
            `-maxrate ${parseInt(targetBitrate) * 1.5}k`, // 最大比特率
            `-bufsize ${parseInt(targetBitrate) * 2}k`, // 缓冲区大小
            "-crf 28",
            "-profile:v high", // 使用高规格配置
            "-level:v 4.0",
            "-movflags +faststart",
            fps > 30 ? "-r 30" : "", // 限制最大帧率为30fps
            "-c:a aac",
            "-b:a 128k",
            "-ar 44100", // 音频采样率
            "-y",
          ].filter(Boolean)
        ); // 移除空字符串

        // 对于高分辨率视频，考虑降低分辨率
        if (width * height > 1920 * 1080) {
          const scale = Math.min(1920 / width, 1080 / height);
          const newWidth = Math.round((width * scale) / 2) * 2; // 确保是2的倍数
          const newHeight = Math.round((height * scale) / 2) * 2;
          command.size(`${newWidth}x${newHeight}`);
        }

        command
          .output(outputPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg 开始执行，命令行:", commandLine);
          })
          .on("progress", (progress) => {
            const percent = progress.percent ? Math.min(Math.round(progress.percent * 10) / 10, 100) : 0;
            console.log("压缩进度:", `${percent}%`);
            setCompressionProgress(percent);
          })
          .on("end", () => {
            console.log("视频压缩完成");
            if (existsSync(outputPath)) {
              resolve();
            } else {
              reject(new Error("压缩完成但输出文件不存在"));
            }
          })
          .on("error", (err, stdout, stderr) => {
            console.error("FFmpeg 错误:", err);
            console.error("FFmpeg stdout:", stdout);
            console.error("FFmpeg stderr:", stderr);
            reject(new Error(`视频压缩失败: ${err.message}`));
          })
          .run();
      });
    } catch (error) {
      console.error("压缩过程中出错:", error);
      reject(error);
    }
  });
};

export async function POST(request: NextRequest) {
  let inputPath = "";
  let outputPath = "";

  try {
    console.log("开始处理请求...");

    // 确保临时目录存在
    const tmpDir = await ensureTmpDir().catch((error) => {
      console.error("创建临时目录失败:", error);
      throw new Error("无法创建临时目录: " + error.message);
    });

    const formData = await request.formData().catch((error) => {
      console.error("解析 FormData 失败:", error);
      throw new Error("无法解析上传的文件数据: " + error.message);
    });

    const video = formData.get("video") as File;

    if (!video) {
      console.error("没有接收到视频文件");
      return NextResponse.json({ message: "没有找到视频文件" }, { status: 400 });
    }

    console.log("接收到的文件信息:", {
      name: video.name,
      size: video.size,
      type: video.type,
      lastModified: video.lastModified,
    });

    if (video.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "文件大小不能超过500MB" }, { status: 400 });
    }

    if (!video.type.startsWith("video/")) {
      return NextResponse.json({ message: "请上传正确的视频文件格式" }, { status: 400 });
    }

    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(7);

    inputPath = path.join(tmpDir, `input-${timestamp}-${uniqueId}-${video.name}`);
    outputPath = path.join(tmpDir, `output-${timestamp}-${uniqueId}-${video.name}`);

    console.log("保存文件到:", inputPath);
    const bytes = await video.arrayBuffer().catch((error) => {
      console.error("读取文件内容失败:", error);
      throw new Error("无法读取上传的文件内容: " + error.message);
    });

    const buffer = Buffer.from(bytes);
    await writeFile(inputPath, buffer).catch((error) => {
      console.error("写入文件失败:", error);
      throw new Error("无法保存上传的文件: " + error.message);
    });

    console.log("文件保存成功，文件大小:", buffer.length);

    console.log("开始压缩视频...");
    await compressVideo(inputPath, outputPath);
    console.log("压缩完成，读取压缩后的文件");

    const compressedVideo = await readFile(outputPath).catch((error) => {
      console.error("读取压缩后的文件失败:", error);
      throw new Error("无法读取压缩后的文件: " + error.message);
    });

    const sanitizedFileName = sanitizeFileName(video.name);
    const encodedFileName = encodeRFC5987(sanitizedFileName);

    return new NextResponse(compressedVideo, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("处理过程中发生错误:", error);
    console.error("错误堆栈:", error instanceof Error ? error.stack : "无堆栈信息");

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "视频压缩失败，请稍后重试",
        details: error instanceof Error ? error.stack : undefined,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      },
      { status: 500 }
    );
  } finally {
    // 清理临时文件
    try {
      if (inputPath && existsSync(inputPath)) {
        await unlink(inputPath);
      }
      if (outputPath && existsSync(outputPath)) {
        await unlink(outputPath);
      }
    } catch (error) {
      console.error("清理临时文件失败:", error);
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
