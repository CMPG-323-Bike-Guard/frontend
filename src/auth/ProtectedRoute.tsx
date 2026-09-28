import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/types';
import { useAuth } from './AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';

/**
 * Route-level access control (FR-VER-08 to FR-VER-10). Rendering is gated here
 * so a guard never sees admin navigation and a student never sees another
 * person's records.
 */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Checking your session" />;
  if (status === 'anonymous' || !user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/no-access" replace />;
  }
  return <Outlet />;
}
