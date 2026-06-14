import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminClient, gcalConfigured } from "@/lib/gcal";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const admin = adminClient();
  const { data } = await admin
    .from("google_accounts")
    .select("email, refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    configured: gcalConfigured(),
    connected: !!data?.refresh_token,
    email: data?.email ?? null,
  });
}
