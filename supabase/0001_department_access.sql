-- 0001_department_access.sql
--
-- Lets the hub's Admin panel choose which departments each person can open.
--
-- The list itself already exists: app.staff.departments (text[]). The Account,
-- GM and Warehouse dashboards each refuse anyone who is not is_admin and does
-- not have their key ('account', 'gm', 'warehouse') in that array. The `app`
-- schema is deliberately not exposed through PostgREST, so the hub cannot touch
-- it directly. These three functions are the only door, in `public`, and the
-- two admin ones re-check current_user_is_admin() inside Postgres exactly like
-- the admin_* functions the Sales dashboard's Users tab already uses.
--
-- Run this once in Supabase Studio -> SQL Editor (project: salesreport).
-- Idempotent. It changes no existing rows and no existing function.
--
-- Until it is run the hub keeps working: the Admin panel shows a notice instead
-- of the Sections controls, and no tile is locked.

-- ---------------------------------------------------------------------------
-- 1. Admin: read every person's department list
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_staff_access()
returns table (user_id uuid, departments text[], active boolean)
language plpgsql
stable
security definer
set search_path = public, app, auth
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_list_staff_access: caller is not an admin';
  end if;
  return query
    select s.user_id, s.departments::text[], s.active
      from app.staff s;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Admin: replace one person's department list
--    Creates their app.staff row if they have none yet (people added from the
--    Users panel only get an sp_user_map row).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_departments(
  p_user_id     uuid,
  p_departments text[]
)
returns void
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_depts text[];
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_set_user_departments: caller is not an admin';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'admin_set_user_departments: user not found';
  end if;

  -- Normalise: lower-case, trimmed, no blanks, no duplicates.
  select coalesce(array_agg(distinct lower(trim(d)) order by lower(trim(d))), '{}'::text[])
    into v_depts
    from unnest(coalesce(p_departments, '{}'::text[])) as d
   where trim(d) <> '';

  update app.staff set departments = v_depts where user_id = p_user_id;

  if not found then
    insert into app.staff (user_id, email, full_name, departments, is_admin, active)
    select u.id, u.email, null, v_depts, false, true
      from auth.users u
     where u.id = p_user_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Anyone signed in: read their own list (the hub uses it to lock tiles)
-- ---------------------------------------------------------------------------
create or replace function public.my_department_access()
returns table (departments text[], is_admin boolean, active boolean)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select s.departments::text[], s.is_admin, s.active
    from app.staff s
   where s.user_id = auth.uid()
   limit 1;
$$;

-- authenticated only, never anon (same rule as 0017/0018 in the Sales repo).
revoke all on function public.admin_list_staff_access()                  from public, anon;
revoke all on function public.admin_set_user_departments(uuid, text[])   from public, anon;
revoke all on function public.my_department_access()                     from public, anon;
grant execute on function public.admin_list_staff_access()                to authenticated;
grant execute on function public.admin_set_user_departments(uuid, text[]) to authenticated;
grant execute on function public.my_department_access()                   to authenticated;
