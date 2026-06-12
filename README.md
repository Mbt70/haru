# 하루

태스크, 목표, AI 사용까지 — 나를 위한 하루 운영 시스템.

전역 후 새 출발점에서 (1) 흩어진 할 일과 대회(OGC·한이음) 일정, (2) AI 세션 남용으로 인한
인지 과부하, (3) 장기 역량 로드맵을 한 곳에서 관리하기 위해 만든 1인용 PWA.

## 구성

| 모듈 | 설명 |
|---|---|
| 오늘 (`/today`) | 아침 계획 → 포커스 배너 → 할 일 → 마감 스트립 → 저녁 회고로 이어지는 데일리 루프 |
| 할 일 (`/tasks`) | 목록(지연/오늘/예정/날짜 없음) + 다가오는 일정(할 일 ∪ 마일스톤 통합) |
| AI 세션 (`/sessions`) | **의도 게이트**: 세션 시작 전 "왜 쓰는지" 기록 → **아카이브**: 결과 요약 저장·검색 |
| 목표 (`/goals`) | 대회·역량 목표를 마일스톤으로 분해, 진행률 추적, 할 일 연결 |

스택: Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + Auth, RLS) · Vercel

## 처음 설정 (1회, ~30분)

### 1. Supabase

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 — 리전 **Seoul (ap-northeast-2)**, DB 비밀번호는 안전한 곳에 보관
2. **Authentication → Sign In / Providers**: Email **ON**, "Confirm email" **OFF**
3. **Authentication → Settings**: "Allow new users to sign up" **OFF** ← 1인용 잠금
4. **Authentication → Users → Add user**: 본인 이메일 + 강한 비밀번호, *Auto Confirm User* 체크
5. **Settings → API**에서 Project URL과 anon(publishable) key 복사

### 2. 로컬

```bash
cp .env.example .env.local   # URL과 anon key 채우기
npm install
npx supabase login           # 브라우저 인증
npx supabase link --project-ref <프로젝트-ref>   # DB 비밀번호 입력
npm run db:push              # 마이그레이션 4개 적용
npm run db:types             # 타입 재생성
npm run dev                  # http://localhost:3000
```

### 3. 배포 (Vercel)

1. GitHub에 리포 푸시
2. [vercel.com](https://vercel.com)에서 GitHub로 로그인 → 리포 import
3. 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 → Deploy
4. 폰에서 배포 URL 접속 → 로그인 → 홈 화면에 추가 (PWA)

> Supabase 무료 티어는 ~1주 무활동 시 일시정지됨 — 매일 쓰면 발생하지 않고,
> 발생해도 대시보드에서 원클릭 복구.

## 개발 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드 (푸시 전 확인)
npm run lint       # ESLint
npm run db:new <이름>   # 새 마이그레이션 파일
npm run db:push    # 마이그레이션을 클라우드 DB에 적용
npm run db:types   # lib/database.types.ts 재생성
```

## 스키마 변경 흐름

`npm run db:new 이름` → `supabase/migrations/`의 새 SQL 작성 → `npm run db:push` → `npm run db:types` → 새 타입으로 코딩. 마이그레이션은 항상 추가식(forward-only).
