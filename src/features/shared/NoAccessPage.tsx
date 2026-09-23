import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { ROLE_HOME, ROLE_LABEL } from '@/lib/constants';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Shown when a role reaches a screen outside its scope (FR-VER-08 to
 * FR-VER-10). The message names the boundary rather than blaming the person.
 */
export function NoAccessPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <EmptyState
        icon={<ShieldAlert className="h-10 w-10" />}
        title="This area is outside your role"
        description={
          user
            ? `You are signed in as ${ROLE_LABEL[user.role].toLowerCase()}. That role does not include this screen.`
            : 'Sign in to continue.'
        }
        action={<LinkButton to={user ? ROLE_HOME[user.role] : '/sign-in'}>Go to my dashboard</LinkButton>}
      />
    </div>
  );
}
