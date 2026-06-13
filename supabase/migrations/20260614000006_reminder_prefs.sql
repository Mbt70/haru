create table public.reminder_prefs (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  morning_time text,          -- "08:00" (KST), null = 끔
  evening_time text,          -- "21:00" (KST), null = 끔
  last_morning date,          -- 멱등: 같은 날 두 번 보내지 않게
  last_evening  date,
  updated_at   timestamptz not null default now()
);

alter table public.reminder_prefs enable row level security;

create policy "owner_all" on public.reminder_prefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
