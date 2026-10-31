// Server-Sent Events from an async generator: `event: name` + `data: json` per event.
export function sseResponse(events: AsyncIterable<{ event: string; data: unknown }>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const e of events) send(e.event, e.data);
      } catch (err) {
        console.error("[sse]", err);
        send("error", { message: "Something went wrong" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // don't let a proxy hold the stream back
    },
  });
}
