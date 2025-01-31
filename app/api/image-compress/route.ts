import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// 定义支持的图片格式类型
type SupportedFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'gif' | 'tiff' | 'avif';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const quality = parseInt(formData.get("quality") as string) || 80;

    if (!image) {
      return NextResponse.json(
        { error: "没有上传图片" },
        { status: 400 }
      );
    }

    // 将File对象转换为Buffer
    const buffer = Buffer.from(await image.arrayBuffer());
    
    // 获取图片信息
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format as SupportedFormat;

    if (!format) {
      throw new Error("不支持的图片格式");
    }

    // 根据原始图片格式选择压缩方式
    let compressedImageBuffer;
    let outputFormat: SupportedFormat = format;

    switch (format) {
      case 'png':
        compressedImageBuffer = await sharp(buffer)
          .png({
            quality,
            compressionLevel: Math.floor((100 - quality) / 10),
            palette: true,
            colors: quality < 50 ? 128 : 256 // 低质量时减少颜色数量
          })
          .toBuffer();
        break;

      case 'jpeg':
      case 'jpg':
        compressedImageBuffer = await sharp(buffer)
          .jpeg({
            quality,
            chromaSubsampling: quality > 90 ? '4:4:4' : '4:2:0',
            mozjpeg: true,
            trellisQuantisation: true // 使用网格量化
          })
          .toBuffer();
        break;

      case 'webp':
        compressedImageBuffer = await sharp(buffer)
          .webp({
            quality,
            lossless: quality > 90,
            nearLossless: quality > 80,
            smartSubsample: true,
            effort: 6 // 增加压缩效果，范围0-6
          })
          .toBuffer();
        break;

      case 'gif':
        // GIF保持原格式，但可以优化帧数和颜色
        compressedImageBuffer = await sharp(buffer, { animated: true })
          .gif({
            colours: quality < 50 ? 128 : 256,
            dither: quality > 50 ? 1.0 : 0.5
          })
          .toBuffer();
        break;

      case 'tiff':
        // TIFF转换为无损PNG或高质量JPEG
        if (quality > 90) {
          outputFormat = 'png';
          compressedImageBuffer = await sharp(buffer)
            .png({
              quality: 100,
              compressionLevel: 9
            })
            .toBuffer();
        } else {
          outputFormat = 'jpeg';
          compressedImageBuffer = await sharp(buffer)
            .jpeg({
              quality,
              chromaSubsampling: '4:4:4',
              mozjpeg: true
            })
            .toBuffer();
        }
        break;

      default:
        // 对于其他格式（包括HEIC/HEIF/BMP等），转换为高质量WebP
        outputFormat = 'webp';
        compressedImageBuffer = await sharp(buffer)
          .webp({
            quality: Math.max(quality, 75), // 确保至少75%的质量
            lossless: quality > 90,
            nearLossless: quality > 80,
            smartSubsample: true,
            effort: 6
          })
          .toBuffer();
    }

    // 转换为Base64
    const base64Image = `data:image/${outputFormat};base64,${compressedImageBuffer.toString("base64")}`;

    // 计算压缩率
    const compressionRatio = ((buffer.length - compressedImageBuffer.length) / buffer.length * 100).toFixed(2);

    return NextResponse.json({
      compressedImage: base64Image,
      size: compressedImageBuffer.length,
      originalFormat: format,
      outputFormat,
      width: metadata.width,
      height: metadata.height,
      compressionRatio: `${compressionRatio}%`
    });
  } catch (error) {
    console.error("图片压缩失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片压缩失败" },
      { status: 500 }
    );
  }
} 