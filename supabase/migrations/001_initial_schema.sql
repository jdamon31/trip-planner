-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Trips
create table trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  destination   text,
  description   text,
  confirmed_date date,
  created_at    timestamptz default now()
);

-- Members (anonymous, identified by UUID stored in localStorage)
create table members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips on delete cascade,
  display_name  text not null,
  joined_at     timestamptz default now()
);

-- Availability
create table availability (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members on delete cascade,
  date        date not null,
  status      text not null check (status in ('available', 'maybe', 'unavailable')),
  unique(member_id, date)
);

-- Polls
create table polls (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  created_by  uuid not null references members on delete cascade,
  question    text not null,
  options     jsonb not null,  -- [{id: string, label: string}]
  created_at  timestamptz default now()
);

-- Votes (one per member per poll)
create table votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references polls on delete cascade,
  member_id   uuid not null references members on delete cascade,
  option_id   text not null,
  unique(poll_id, member_id)
);

-- Expenses
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  paid_by     uuid not null references members on delete cascade,
  description text not null,
  amount      numeric(10,2) not null,
  splits      jsonb not null,  -- [{member_id: string, amount: number}]
  created_at  timestamptz default now()
);

-- Itinerary items
create table itinerary_items (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  day         date,
  time        time,
  activity    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- Trip links
create table trip_links (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips on delete cascade,
  label       text not null,
  url         text not null,
  added_by    uuid references members on delete set null
);

-- Indexes for common queries
create index on members(trip_id);
create index on availability(member_id);
create index on polls(trip_id);
create index on votes(poll_id);
create index on expenses(trip_id);
create index on itinerary_items(trip_id, sort_order);
create index on trip_links(trip_id);

-- RLS: enable for all tables, allow all operations (no auth in v1)
alter table trips enable row level security;
alter table members enable row level security;
alter table availability enable row level security;
alter table polls enable row level security;
alter table votes enable row level security;
alter table expenses enable row level security;
alter table itinerary_items enable row level security;
alter table trip_links enable row level security;

create policy "public read/write trips" on trips for all using (true) with check (true);
create policy "public read/write members" on members for all using (true) with check (true);
create policy "public read/write availability" on availability for all using (true) with check (true);
create policy "public read/write polls" on polls for all using (true) with check (true);
create policy "public read/write votes" on votes for all using (true) with check (true);
create policy "public read/write expenses" on expenses for all using (true) with check (true);
create policy "public read/write itinerary_items" on itinerary_items for all using (true) with check (true);
create policy "public read/write trip_links" on trip_links for all using (true) with check (true);
