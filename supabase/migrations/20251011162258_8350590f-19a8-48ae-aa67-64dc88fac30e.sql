-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  bio text,
  profile_photo_url text,
  resume_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create domains table (predefined list)
create table public.domains (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  icon text,
  created_at timestamp with time zone default now()
);

alter table public.domains enable row level security;

create policy "Domains are viewable by everyone"
  on public.domains for select
  using (true);

-- Insert predefined domains
insert into public.domains (name, icon) values
  ('Professional Services', 'briefcase'),
  ('Psychology & Mental Wellness', 'brain'),
  ('Spirituality & Mindfulness', 'sparkles'),
  ('IT / Software Development', 'code'),
  ('Cybersecurity', 'shield'),
  ('Leadership Coaching', 'users'),
  ('Life Coaching', 'heart'),
  ('Financial Advice', 'dollar-sign'),
  ('Legal Advice', 'scale'),
  ('Graphic Design & Arts', 'palette'),
  ('Skilled Trades & Home Services', 'wrench'),
  ('Plumbing & Electrical', 'plug'),
  ('Carpentry & Handyman', 'hammer'),
  ('Painting & Decorating', 'paint-bucket'),
  ('HVAC & Appliance Repair', 'wind'),
  ('Automotive Care & Repair', 'car'),
  ('Gardening & Landscaping', 'flower'),
  ('DIY & Home Repair', 'home'),
  ('Community & Personal Support', 'handshake'),
  ('Elderly Support', 'user-check'),
  ('Transportation Assistance', 'bus'),
  ('Tech Help for Seniors', 'smartphone'),
  ('Grocery & Shopping Aid', 'shopping-bag'),
  ('Tutoring & Education', 'book'),
  ('Health & Fitness Coaching', 'activity'),
  ('Other', 'more-horizontal');

-- Create profile_domains junction table
create table public.profile_domains (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  domain_id uuid references public.domains(id) on delete cascade not null,
  unique(profile_id, domain_id)
);

alter table public.profile_domains enable row level security;

create policy "Profile domains are viewable by everyone"
  on public.profile_domains for select
  using (true);

create policy "Users can insert their own profile domains"
  on public.profile_domains for insert
  with check (auth.uid() = profile_id);

create policy "Users can delete their own profile domains"
  on public.profile_domains for delete
  using (auth.uid() = profile_id);

-- Create expertise_tags table
create table public.expertise_tags (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  tag text not null,
  created_at timestamp with time zone default now()
);

alter table public.expertise_tags enable row level security;

create policy "Expertise tags are viewable by everyone"
  on public.expertise_tags for select
  using (true);

create policy "Users can manage their own expertise tags"
  on public.expertise_tags for all
  using (auth.uid() = profile_id);

-- Create hobby_tags table
create table public.hobby_tags (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  tag text not null,
  created_at timestamp with time zone default now()
);

alter table public.hobby_tags enable row level security;

create policy "Hobby tags are viewable by everyone"
  on public.hobby_tags for select
  using (true);

create policy "Users can manage their own hobby tags"
  on public.hobby_tags for all
  using (auth.uid() = profile_id);

-- Create storage bucket for profile photos
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true);

-- Storage policies for profile photos
create policy "Profile photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "Users can upload their own profile photo"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own profile photo"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own profile photo"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage bucket for resumes
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false);

-- Storage policies for resumes
create policy "Users can view their own resume"
  on storage.objects for select
  using (
    bucket_id = 'resumes' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload their own resume"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own resume"
  on storage.objects for update
  using (
    bucket_id = 'resumes' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own resume"
  on storage.objects for delete
  using (
    bucket_id = 'resumes' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for profiles updated_at
create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();