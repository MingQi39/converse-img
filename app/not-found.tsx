"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">页面未找到</h2>
      <p className="mb-4">无法找到请求的资源</p>
      <Link href="/" className="text-blue-500 hover:text-blue-700 underline">
        返回首页
      </Link>
    </div>
  );
}
