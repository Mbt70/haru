import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminClient } from "@/lib/gcal";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = adminClient();
  await admin.from("google_accounts").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
