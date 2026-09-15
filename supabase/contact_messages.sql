-- Contact form submissions from /contact.
-- Inserted only by /api/contact using the service role key.
-- RLS is enabled with no policies, so the public anon key can neither read nor write this table.

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('general', 'feedback', 'removal', 'abuse', 'privacy', 'other')),
  name text not null default '',
  email text not null,
  link text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created_at on contact_messages(created_at desc);

alter table contact_messages enable row level security;
