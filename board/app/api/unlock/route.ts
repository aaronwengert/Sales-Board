import { NextResponse } from "next/server";
import { pinToken, AUTH_COOKIE } from "@/lib/pin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pin = process.env.BOARD_PIN || "";
  let entered = "";
  try {
    const body = await req.json();
    entered = String(body?.pin || "");
  } catch {
    entered = "";
  }

  if (pin && entered && entered === pin) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, await pinToken(pin), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year — the TV/phone stays unlocked
    });
    return res;
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
