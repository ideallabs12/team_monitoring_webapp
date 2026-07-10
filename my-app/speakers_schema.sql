-- 1. Create Speakers Table
create table public.speakers (
  id uuid default gen_random_uuid() primary key,
  speaker_type text not null check (speaker_type in ('past', 'present', 'future')),
  speaker_name text not null,
  email text,
  profile_url text,
  company text,
  connected_by text,
  event_name text,
  calling_executive text, -- 'geetha', 'prasad sir', 'srinath'
  payment_status text default 'pending', -- 'pending', 'partial', 'paid', 'refunded', 'transferred', 'not_applicable'
  agreed_amount numeric(12, 2) default 0.00,
  paid_amount numeric(12, 2) default 0.00,
  pending_amount numeric(12, 2) default 0.00,
  refund_status text default 'none', -- 'none', 'refund_requested', 'refunded', 'transferred'
  transferred_to_event text,
  package_type text,
  current_main_status text,
  current_sub_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for speakers
alter table public.speakers enable row level security;

-- Speakers policies (Open for everyone for now, adjust based on roles later)
create policy "Anyone can view speakers." on speakers for select using (true);
create policy "Anyone can insert speakers." on speakers for insert with check (true);
create policy "Anyone can update speakers." on speakers for update using (true);

-- 2. Create Speaker Timeline Events Table
create table public.speaker_timeline_events (
  id uuid default gen_random_uuid() primary key,
  speaker_id uuid references public.speakers(id) on delete cascade not null,
  main_status text not null,
  sub_status text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for speaker_timeline_events
alter table public.speaker_timeline_events enable row level security;

-- Speaker Timeline Events policies
create policy "Anyone can view timeline events." on speaker_timeline_events for select using (true);
create policy "Anyone can insert timeline events." on speaker_timeline_events for insert with check (true);
-- Note: Intentionally missing UPDATE policy so that timeline events cannot be edited (immutable log)
