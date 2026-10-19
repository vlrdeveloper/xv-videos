-- 0002_storage.sql: public bucket for compressed thumbnails. No storage policies on purpose:
-- browsers cannot write; only the server (service role) writes after an admin check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-thumbnails', 'video-thumbnails', true, 204800, '{image/webp}')
on conflict (id) do update set public = true, file_size_limit = 204800, allowed_mime_types = '{image/webp}';
