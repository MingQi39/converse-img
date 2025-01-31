import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const quality = parseInt(formData.get("quality") as string);

    if (!file) {
      return NextResponse.json({ error: "没有上传文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();

    const base64Image = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;

    return NextResponse.json({
      compressedImage: base64Image,
      size: compressedBuffer.length,
    });
  } catch (error) {
    console.error("压缩过程出错:", error);
    return NextResponse.json({ error: "压缩失败" }, { status: 500 });
  }
}
