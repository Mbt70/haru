create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  notes        text,
  due_date     date,                          -- 외부 마감일
  planned_for  date,                          -- "오늘 할 일"로 선택된 날 (마감과 분리)
  priority     smallint not null default 2,   -- 1 높음 / 2 보통 / 3 낮음
  completed_at timestamptz,                   -- null = 미완료
  created_at   timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "owner_all" on public.tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
