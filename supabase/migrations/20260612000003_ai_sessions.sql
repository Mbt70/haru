create table public.ai_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tool             text not null,        -- 'Claude Code' | 'ChatGPT' | ... (UI는 칩, 컬럼은 자유 텍스트)
  intent           text not null,        -- "왜 쓰는지" — 이걸 입력하는 행위가 곧 게이트
  expected_outcome text,                 -- 선택 입력
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,          -- null = 진행 중 → Today 배너가 마감 독촉
  result           text check (result in ('achieved', 'partial', 'abandoned')),
  outcome          text                  -- 아카이브 요약, 검색 대상
);

alter table public.ai_sessions enable row level security;

create policy "owner_all" on public.ai_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
