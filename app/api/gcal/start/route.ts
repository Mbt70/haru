import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildAuthUrl, gcalConfigured } from "@/lib/gcal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!gcalConfigured()) {
    return NextResponse.redirect(new URL("/settings?gcal=unconfigured", request.url));
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const origin = new URL(request.url).origin;
  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(origin, state));
  res.cookies.set("gcal_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
