import ImageCompressor from '@/components/ImageCompressor'

export default function ImageCompressPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">图片压缩</h1>
      <ImageCompressor />
    </main>
  )
} 