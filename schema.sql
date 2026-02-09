-- Make Quiz - RESET & CLEAN REBUILD
-- Run this in Supabase SQL Editor to ensure a perfect setup.

-- 1. DROP EXISTING TO START CLEAN
drop table if exists questions cascade;
drop table if exists attempts cascade;
drop table if exists quizzes cascade;

-- 2. CREATE TABLES
create table quizzes (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    duration_minutes integer default 60,
    created_at timestamp with time zone default now(),
    is_active boolean default true
);

create table questions (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references quizzes(id) on delete cascade,
    text text not null,
    options jsonb not null, 
    correct_answer text not null,
    created_at timestamp with time zone default now()
);

create table attempts (
    id uuid default gen_random_uuid() primary key,
    quiz_id uuid references quizzes(id) on delete cascade,
    student_email text not null,
    student_name text not null,
    status text default 'in-progress',
    score integer default 0,
    started_at timestamp with time zone default now(),
    completed_at timestamp with time zone,
    constraint one_attempt_per_student unique (quiz_id, student_email)
);

-- 3. ENABLE REALTIME (Bypassing syntax errors with safer DO block)
do $$
begin
  -- Try to add the table. If it's already there or publication doesn't exist, it will handle it via exception.
  begin
    alter publication supabase_realtime add table attempts;
  exception
    when others then 
      raise notice 'Publication table attempts already exists or publication missing. Skipping...';
  end;
end $$;

-- 4. PERMISSIONS (ALLOW ANONYMOUS ACCESS)
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;

-- Drop any old policies if they exist (though cascade above handles most)
drop policy if exists "Enable access for all" on quizzes;
drop policy if exists "Enable access for all" on questions;
drop policy if exists "Enable access for all" on attempts;

-- Create fresh policies
create policy "Enable access for all" on quizzes for all using (true) with check (true);
create policy "Enable access for all" on questions for all using (true) with check (true);
create policy "Enable access for all" on attempts for all using (true) with check (true);

-- Explicitly grant permissions to the anon role
grant all on quizzes to anon;
grant all on questions to anon;
grant all on attempts to anon;
