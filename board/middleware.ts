import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pinToken, AUTH_COOKIE } from "@/lib/pin";

// Protect every board route. If a matching unlock cookie is present the request
// passes through; otherwise the visitor is sent to /unlock. The gate is a no-op
// unless BOARD_PIN is set in the environment, so a fresh deploy is never locked
// out before the PIN is configured.
export const config = {
  matcher: ["/((?!api/unlock|unlock|_next/static|_next/image|favicon.ico|logo.png).*)"],
};

export async function middleware(req: NextRequest) {
  const pin = process.env.BOARD_PIN;
  if (!pin) return NextResponse.next(); // gate disabled when no PIN is configured

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await pinToken(pin);
  if (cookie === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
