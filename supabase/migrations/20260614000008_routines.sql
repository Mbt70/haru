-- 반복 작업(루틴): 템플릿에서 매일/매주 할 일 인스턴스를 생성.
create table public.routines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title          text not null,
  notes          text,
  priority       smallint not null default 2,
  goal_id        uuid references public.goals (id) on delete set null,
  freq           text not null check (freq in ('daily', 'weekly')),
  weekdays       smallint[],          -- weekly일 때 0=일 .. 6=토
  active         boolean not null default true,
  last_generated date,                -- 멱등: 같은 날 두 번 생성 안 함
  created_at     timestamptz not null default now()
);

alter table public.routines enable row level security;
create policy "owner_all" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 생성된 할 일이 어느 루틴에서 왔는지 + 하루 한 번만 생성되게 보장
alter table public.tasks
  add column routine_id uuid references public.routines (id) on delete set null;
create unique index tasks_routine_day_uniq
  on public.tasks (routine_id, planned_for)
  where routine_id is not null;
