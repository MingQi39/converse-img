import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const video = formData.get('video') as File
    
    if (!video) {
      return NextResponse.json(
        { error: '没有找到视频文件' },
        { status: 400 }
      )
    }

    // 创建临时文件路径
    const bytes = await video.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const inputPath = join('/tmp', `${randomUUID()}-${video.name}`)
    const outputPath = join('/tmp', `compressed-${randomUUID()}-${video.name}`)
    
    await writeFile(inputPath, buffer)

    // 使用 ffmpeg 压缩视频
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',  // 使用 H.264 编码
          '-crf 28',       // 压缩质量（0-51，越大压缩率越高，质量越低）
          '-preset medium' // 压缩速度
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    // 读取压缩后的文件
    const compressedVideo = await readFile(outputPath)
    
    // 清理临时文件
    await Promise.all([
      unlink(inputPath),
      unlink(outputPath)
    ])

    return new NextResponse(compressedVideo, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="compressed-${video.name}"`
      }
    })
    
  } catch (error) {
    console.error('视频压缩失败:', error)
    return NextResponse.json(
      { error: '视频压缩失败' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
} 