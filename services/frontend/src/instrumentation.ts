export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_API_MOCKING === "true"
  ) {
    const { server } = await import("@/mocks/node");
    server.listen({ onUnhandledRequest: "bypass" });
    console.log("played");
  }
}
