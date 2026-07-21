-- Photo dedup: store SHA-256 of uploaded image bytes on each submission.
alter table public.submissions add column if not exists photo_hash text;

create index if not exists submissions_photo_hash_idx
  on public.submissions(photo_hash)
  where photo_hash is not null;
