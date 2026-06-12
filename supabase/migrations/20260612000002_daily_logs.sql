create table public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date    date not null,
  focus       text,            -- 아침 한 줄 포커스
  planned_at  timestamptz,     -- 아침 계획 완료 시각 (Today 카드 상태 구동)
  reflection  text,            -- 저녁 회고
  reviewed_at timestamptz,
  unique (user_id, log_date)   -- 하루 한 행, upsert 대상
);

-- "오늘 완료한 일"은 여기 저장하지 않는다 — tasks.completed_at 범위로 파생

alter table public.daily_logs enable row level security;

create policy "owner_all" on public.daily_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
