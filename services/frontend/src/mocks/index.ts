export async function initMocks() {
  if (typeof window === "undefined") {
    // Server-side
    const { server } = await import("./node");
    server.listen({ onUnhandledRequest: "bypass" });
  } else {
    // Client-side
    const { worker } = await import("./browser");
    await worker.start({
      onUnhandledRequest: "bypass",
      quiet: true,
    });
  }
}
