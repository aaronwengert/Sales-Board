// Derive an opaque cookie token from the PIN so the raw PIN never lives in the
// cookie. Uses Web Crypto, which is available in both the Edge (middleware) and
// Node (route handler) runtimes.
export async function pinToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode("oaktree-board:v1:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "board_auth";
