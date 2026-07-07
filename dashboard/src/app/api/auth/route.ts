import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken, safeNext } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const next = safeNext(form.get("next"));
  const pw = form.get("password");

  if (
    typeof pw !== "string" ||
    !process.env.APP_PASSWORD ||
    pw !== process.env.APP_PASSWORD
  ) {
    const url = new URL("/enter", req.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const token = await sessionToken();
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, token!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
