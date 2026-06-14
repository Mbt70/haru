-- 구글 캘린더 OAuth 토큰 저장. 정책을 만들지 않아 RLS가 클라이언트 접근을
-- 전부 차단한다 — 토큰(특히 refresh_token)은 서버 라우트가 service_role로만 접근.
create table public.google_accounts (
  user_id       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  access_token  text,
  refresh_token text,
  expiry        timestamptz,
  email         text,
  created_at    timestamptz not null default now()
);
alter table public.google_accounts enable row level security;
