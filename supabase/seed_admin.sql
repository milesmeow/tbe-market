-- Seed the first admin. Run AFTER creating the auth user for this email in the
-- Supabase dashboard (Authentication → Users → Add user, set a password, and
-- check "Auto Confirm User"). Then run this to grant admin and skip the forced
-- password change for the founder account.

insert into public.profiles (id, display_name, contact_email, is_admin, must_change_password)
select id, 'James', 'james@2-bit-toys.com', true, false
from auth.users
where email = 'james@2-bit-toys.com'
on conflict (id) do update
  set is_admin = true,
      must_change_password = false;
