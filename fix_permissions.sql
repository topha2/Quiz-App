-- Enable RLS (Good practice, but we'll make it permissive for this demo)
alter table attempts enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;

-- Create Policies for Anonymous Access (since we are using client-side anon key)
-- Allow Anon to READ everything
create policy "Public Read Attempts" on attempts for select using (true);
create policy "Public Read Quizzes" on quizzes for select using (true);
create policy "Public Read Questions" on questions for select using (true);

-- Allow Anon to INSERT (for Students and Teachers)
create policy "Public Insert Attempts" on attempts for insert with check (true);
create policy "Public Insert Quizzes" on quizzes for insert with check (true);
create policy "Public Insert Questions" on questions for insert with check (true);

-- Allow Anon to UPDATE (for completing quizzes)
create policy "Public Update Attempts" on attempts for update using (true);
