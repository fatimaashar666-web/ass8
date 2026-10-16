import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "campus_admin";
const sessionDuration = 60 * 60 * 8;

function sign(expiry: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(expiry).digest("hex");
}

export function createAdminSession() {
  const expiry = String(Date.now() + sessionDuration * 1000);
  const signature = sign(expiry);
  return signature ? { value: `${expiry}.${signature}`, maxAge: sessionDuration } : null;
}

export async function hasAdminSession() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;

  const [expiry, signature] = value.split(".");
  const expected = expiry ? sign(expiry) : null;
  if (!expiry || !signature || !expected || Number(expiry) <= Date.now()) return false;

  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export const adminCookieName = cookieName;