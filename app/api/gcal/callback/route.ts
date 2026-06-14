import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminClient, exchangeCode, getUserEmail } from "@/lib/gcal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (await cookies()).get("gcal_state")?.value;
  const settings = (q: string) =>
    NextResponse.redirect(new URL(`/settings?gcal=${q}`, request.url));

  if (!code || !state || state !== cookieState) return settings("error");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const tokens = await exchangeCode(url.origin, code);
  if (!tokens.access_token) return settings("error");

  const email = await getUserEmail(tokens.access_token);
  const expiry = new Date(
    Date.now() + (tokens.expires_in ?? 3600) * 1000,
  ).toISOString();

  const admin = adminClient();
  // refresh_token은 첫 동의 때만 옴 — 없으면 기존 값을 덮어쓰지 않는다.
  const payload: Record<string, unknown> = {
    user_id: user.id,
    access_token: tokens.access_token,
    expiry,
    email,
  };
  if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;
  await admin.from("google_accounts").upsert(payload, { onConflict: "user_id" });

  return settings("connected");
}
