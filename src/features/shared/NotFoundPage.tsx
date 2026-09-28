


/**
 * Sign-in page for BikeGuard.
 *
 * Allows users to select their role, enter their student/staff number
 * and password and sign in to the appropriate BikeGuard portal.
 *
 * The selected role is sent to the authentication system and the user
 * is redirected to the dashboard associated with their actual role.
 */


import { useAuth } from '@/auth/AuthContext';
import { ROLE_HOME } from '@/lib/constants';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <EmptyState
        title="That page does not exist"
        description="The link may be out of date. Head back to your dashboard and try again from there."
        action={<LinkButton to={user ? ROLE_HOME[user.role] : '/sign-in'}>Back to BikeGuard</LinkButton>}
      />
    </div>
  );
}
