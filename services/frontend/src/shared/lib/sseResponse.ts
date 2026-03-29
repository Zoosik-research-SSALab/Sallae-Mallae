export function createSseResponse(getPayload: () => unknown, intervalMs = 12000) {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let ticker: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }

    if (ticker) {
      clearInterval(ticker);
      ticker = undefined;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const pushEvent = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(getPayload())}\n\n`));
      };

      pushEvent();

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, intervalMs);

      ticker = setInterval(() => {
        pushEvent();
      }, intervalMs);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
    },
  });
}
