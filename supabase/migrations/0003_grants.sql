-- 0003_grants.sql: projects created after 30 May 2026 do not auto-grant table access.
-- Without this, sign-in wrongly reports "This account is disabled".
grant usage on schema public to authenticated, service_role;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.tags, public.videos,
  public.video_tags, public.video_categories to authenticated;
grant all on all tables in schema public to service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('create_video','update_video','delete_video',
      'set_video_popular','search_videos','similar_videos','list_tags_with_counts',
      'list_categories_with_counts','delete_category','video_word_score','is_admin','is_member')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop; end $$;
