-- 하루 앱 전체 스키마 (마이그레이션 4개 합본)
-- Supabase 대시보드 SQL Editor에 전체 붙여넣고 Run.
-- supabase/migrations/ 의 개별 파일과 내용 동일.

-- 1) tasks ---------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  notes        text,
  due_date     date,
  planned_for  date,
  priority     smallint not null default 2,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "owner_all" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) daily_logs ----------------------------------------------------------
create table public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date    date not null,
  focus       text,
  planned_at  timestamptz,
  reflection  text,
  reviewed_at timestamptz,
  unique (user_id, log_date)
);
alter table public.daily_logs enable row level security;
create policy "owner_all" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) ai_sessions ---------------------------------------------------------
create table public.ai_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tool             text not null,
  intent           text not null,
  expected_outcome text,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  result           text check (result in ('achieved', 'partial', 'abandoned')),
  outcome          text
);
alter table public.ai_sessions enable row level security;
create policy "owner_all" on public.ai_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 컨텍스트 앵커링 (세션↔목표 연결, 이어가기) — goals보다 뒤에 alter 필요 시 7번 마이그레이션 참고

-- 4) goals + milestones + tasks.goal_id ---------------------------------
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  category    text,
  target_date date,
  status      text not null default 'active'
              check (status in ('active', 'completed', 'archived')),
  created_at  timestamptz not null default now()
);
create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id      uuid not null references public.goals (id) on delete cascade,
  title        text not null,
  due_date     date,
  completed_at timestamptz,
  sort_order   smallint not null default 0
);
alter table public.tasks
  add column goal_id uuid references public.goals (id) on delete set null;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
create policy "owner_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) push_subscriptions (웹 푸시 알림) ----------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "owner_all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) reminder_prefs (알림 시간 설정) ------------------------------------
create table public.reminder_prefs (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  morning_time text,
  evening_time text,
  last_morning date,
  last_evening  date,
  updated_at   timestamptz not null default now()
);
alter table public.reminder_prefs enable row level security;
create policy "owner_all" on public.reminder_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7) ai_sessions 컨텍스트 앵커링 (goals 생성 이후라 여기서 alter) -----------
alter table public.ai_sessions
  add column if not exists goal_id   uuid references public.goals (id) on delete set null,
  add column if not exists next_step text,
  add column if not exists parent_id uuid references public.ai_sessions (id) on delete set null;

-- 8) routines (반복 작업 템플릿) -----------------------------------------
create table public.routines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null,
  notes          text,
  priority       smallint not null default 2,
  goal_id        uuid references public.goals (id) on delete set null,
  freq           text not null check (freq in ('daily', 'weekly')),
  weekdays       smallint[],
  active         boolean not null default true,
  last_generated date,
  created_at     timestamptz not null default now()
);
alter table public.routines enable row level security;
create policy "owner_all" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.tasks
  add column if not exists routine_id uuid references public.routines (id) on delete set null;
create unique index if not exists tasks_routine_day_uniq
  on public.tasks (routine_id, planned_for)
  where routine_id is not null;

-- 9) google_accounts (캘린더 OAuth 토큰, RLS로 클라이언트 차단) -------------
create table public.google_accounts (
  user_id       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  access_token  text,
  refresh_token text,
  expiry        timestamptz,
  email         text,
  created_at    timestamptz not null default now()
);
alter table public.google_accounts enable row level security;
