<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 하루 (productivity)

1인용 개인 생산성 PWA. 모듈 4개: 데일리 루프(/today), 할 일(/tasks), AI 세션 의도 게이트·아카이브(/sessions), 목표·마일스톤(/goals). UI 카피는 한국어, 식별자는 영어.

## Commands

- `npm run dev` / `npm run build` / `npm run lint` — build를 푸시 전에 반드시 통과시킬 것
- `npm run db:new <name>` → write SQL in `supabase/migrations/` → `npm run db:push` → `npm run db:types` — 스키마 변경의 유일한 경로. 마이그레이션은 forward-only, 이미 푸시된 파일은 수정 금지
- 테스트 없음 (의도적). 검증은 build + dev 서버에서 직접 클릭
- Dev DB = Prod DB (클라우드 Supabase 프로젝트 하나). 로컬 Supabase/Docker 안 씀

## Architecture

- **Next.js 16 App Router + Supabase, API 레이어 없음.** 모든 데이터 fetch/mutation은 클라이언트 컴포넌트에서 `createClient()`(lib/supabase/client.ts, browser client) 직접 호출. 서버 액션·route handler를 CRUD에 쓰지 말 것. 보안은 전적으로 RLS(`auth.uid() = user_id`)가 담당
- **인증 게이트는 `proxy.ts`** (Next 16에서 middleware.ts의 새 이름) → `lib/supabase/middleware.ts`의 `updateSession`. matcher가 /login, /api/hooks, 정적 파일을 제외함 — 새 공개 라우트를 추가하면 matcher도 수정
- **타입은 생성 파일**: `lib/database.types.ts`는 `npm run db:types`로 재생성. 손으로 고치지 말 것
- **타임존 규칙**: date 컬럼 비교용 "오늘"은 항상 클라이언트에서 `todayStr()`(lib/dates.ts) 계산. Vercel 서버는 UTC라 서버 계산 시 하루 어긋남. timestamptz 필터는 `dayRange()` 사용
- **`due_date` vs `planned_for` 구분 유지**: due_date = 외부 마감, planned_for = "이 날 하기로 함"(아침 계획이 설정). 완료 여부는 boolean이 아니라 `completed_at timestamptz` (null = 미완료) — tasks, milestones 공통 패턴
- **시트 간 데이터 동기화**: 전역 시트(QuickAddSheet 등)에서 변경 후 `emitDataChanged(table)`(lib/events.ts) 호출 → 열려 있는 페이지들이 `useDataChanged`로 refetch. 상태 라이브러리 없음
- **폼 상태 리셋은 key-리마운트 패턴**: 시트 내부 폼을 별도 컴포넌트로 분리하고 props 초기값 사용 (Radix가 닫힐 때 언마운트). 동기화 useEffect 금지 — `react-hooks/set-state-in-effect` 규칙은 fetch-on-mount 오탐 때문에 꺼져 있지만 동기 setState-in-effect는 여전히 쓰지 말 것
- **이벤트/마감 통합 뷰**: 별도 events 테이블 없음. 대회 마감 = goals의 milestones(due_date). 일정 뷰는 tasks ∪ milestones를 클라이언트에서 병합
- 의존성 추가는 보수적으로 (현재 date-fns만). 추상화는 두 번째 사용처가 생길 때 추출

## 사용자 액션이 필요한 것

Supabase/Vercel/GitHub 계정, 키 발급, `npx supabase login/link`는 사용자가 직접. `.env.local`의 placeholder 값이 실제 키로 채워져 있지 않으면 런타임 인증이 실패함 (build는 통과).
