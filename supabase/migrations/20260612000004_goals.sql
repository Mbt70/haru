create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  category    text,                       -- '공모전' | '스킬' | '기타' (자유 텍스트)
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
  due_date     date,                      -- 대회 접수/제출/발표 마감일은 여기
  completed_at timestamptz,
  sort_order   smallint not null default 0
);

-- 할 일을 목표에 연결 (목표 삭제 시 할 일은 살아남고 연결만 해제)
alter table public.tasks
  add column goal_id uuid references public.goals (id) on delete set null;

alter table public.goals enable row level security;
alter table public.milestones enable row level security;

create policy "owner_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on public.milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
