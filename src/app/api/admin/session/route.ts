import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  adminCookieName,
  createAdminSession,
  hasAdminSession,
} from "@/lib/admin-session";

export async function GET() {
  return NextResponse.json({ authenticated: await hasAdminSession() });
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!configuredPassword || !secret) {
    return NextResponse.json(
      { error: "Admin access is not configured on this server." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const submitted = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  const valid =
    submitted.length === expected.length && timingSafeEqual(submitted, expected);

  if (!valid) {
    return NextResponse.json({ error: "That password did not match." }, { status: 401 });
  }

  const session = createAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookieName, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}