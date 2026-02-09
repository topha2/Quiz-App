-- Make Quiz - Final Rebuild Schema

-- 1. Quizzes Table
create table if not exists quizzes (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    duration_minutes integer default 60,
    created_at timestamp with time zone default now(),
    is_active boolean default true
);

-- 2. Questions Table
create table if not exists questions (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references quizzes(id) on delete cascade,
    text text not null,
    options jsonb not null, -- Array of strings
    correct_answer text not null,
    created_at timestamp with time zone default now()
);

-- 3. Attempts Table
create table if not exists attempts (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references quizzes(id) on delete cascade,
    student_email text not null,
    student_name text not null,
    status text default 'in-progress', -- 'in-progress', 'completed', 'disqualified'
    score integer default 0,
    started_at timestamp with time zone default now(),
    completed_at timestamp with time zone,
    
    -- Enforce One-Entry Rule
    constraint one_attempt_per_student unique (quiz_id, student_email)
);

-- Realtime Setup
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'attempts'
  ) then
    alter publication supabase_realtime add table attempts;
  end if;
exception
  when undefined_object then null;
end $$;

-- Permissions (RLS)
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;

create policy "Enable access for all" on quizzes for all using (true) with check (true);
create policy "Enable access for all" on questions for all using (true) with check (true);
create policy "Enable access for all" on attempts for all using (true) with check (true);
