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
