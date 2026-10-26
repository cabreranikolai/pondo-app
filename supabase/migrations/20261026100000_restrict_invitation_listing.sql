revoke all on function public.admin_list_invitations()
from public, anon, authenticated;

comment on function public.admin_list_invitations() is
  'Disabled for client roles. Invitation rows must not be exposed as a directory.';
