import { getCompressionProgress } from "@/lib/compression";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldReset = searchParams.get("reset") === "true";

  if (shouldReset) {
    return new Response(
      `data: ${JSON.stringify({
        progress: "已重置",
        percentage: 0,
      })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { progress, isCompleted } = await getCompressionProgress();

          const message = isCompleted ? "压缩成功" : progress === 0 ? "准备开始压缩..." : `正在压缩... ${progress}%`;

          const data = encoder.encode(
            `data: ${JSON.stringify({
              progress: message,
              percentage: progress,
            })}\n\n`
          );

          controller.enqueue(data);

          if (isCompleted) {
            break;
          }

          // 减少轮询间隔到100ms以提高实时性
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        const errorData = encoder.encode(
          `data: ${JSON.stringify({
            error: "压缩过程发生错误",
            details: error instanceof Error ? error.message : "未知错误",
          })}\n\n`
        );
        controller.enqueue(errorData);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
