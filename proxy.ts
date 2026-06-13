import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 제외: Next 정적 리소스, 이미지/아이콘, manifest, 서비스워커,
  // 자체 인증을 쓰는 API(hooks=훅 토큰, cron=크론 시크릿)
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|api/hooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
