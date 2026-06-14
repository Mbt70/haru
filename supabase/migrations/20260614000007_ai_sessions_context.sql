-- 컨텍스트 앵커링: AI 세션을 목표에 묶고, "다음 단계"로 이어갈 수 있게.
alter table public.ai_sessions
  add column goal_id   uuid references public.goals (id) on delete set null,
  add column next_step text,
  add column parent_id uuid references public.ai_sessions (id) on delete set null;
