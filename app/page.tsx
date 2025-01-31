import Image from "next/image";
import ImageCompressor from "@/components/ImageCompressor";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">图片压缩工具</h1>
        <ImageCompressor />
      </div>
    </main>
  );
}
