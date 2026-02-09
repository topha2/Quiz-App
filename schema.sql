-- 1. Create Tables
create table if not exists quizzes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  duration_minutes integer default 60,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references quizzes(id) on delete cascade,
  text text not null,
  options jsonb not null,
  correct_answer text not null,
  points integer default 1
);

create table if not exists attempts (
  id uuid default uuid_generate_v4() primary key,
  student_name text not null,
  quiz_id uuid references quizzes(id) on delete cascade,
  status text check (status in ('in-progress', 'completed', 'disqualified')) default 'in-progress',
  score integer default 0,
  warnings integer default 0,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- 2. Enable Realtime
-- We use a DO block to safely check if the publication exists and add the table
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
  when undefined_object then null; -- Handle case where publication doesn't exist
end $$;

-- 3. Seed Data
insert into quizzes (title, description, duration_minutes) values 
('Advanced Mathematics Midterm', 'Covering Calculus I and II', 60),
('Physics 101 Finals', 'Mechanics and Thermodynamics', 90);
