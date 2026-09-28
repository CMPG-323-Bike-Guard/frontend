
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { ROLE_HOME } from '@/lib/constants';
import { FullPageSpinner } from '@/components/ui/Spinner';

import { SignInPage } from '@/features/shared/SignInPage';
import { NotFoundPage } from '@/features/shared/NotFoundPage';
import { NoAccessPage } from '@/features/shared/NoAccessPage';
import { CrossingLogPage } from '@/features/shared/CrossingLogPage';

import { MyBikesPage } from '@/features/student/MyBikesPage';
import { RegisterBikePage } from '@/features/student/RegisterBikePage';
import { BikeDetailPage } from '@/features/student/BikeDetailPage';
import { NotificationsPage } from '@/features/student/NotificationsPage';

import { GuardDashboardPage } from '@/features/guard/GuardDashboardPage';
import { ManualChecksPage } from '@/features/guard/ManualChecksPage';

import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';
import { RegistrationsPage } from '@/features/admin/RegistrationsPage';
import { TagsPage } from '@/features/admin/TagsPage';
import { PeoplePage } from '@/features/admin/PeoplePage';
import { AuditPage } from '@/features/admin/AuditPage';

/** Sends a signed-in person to the screen their role starts on. */
function RoleHome() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <FullPageSpinner label="Opening BikeGuard" />;
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />

          {/* Protected application */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>

              {/* Home */}
              <Route path="/" element={<RoleHome />} />

              {/* Student and staff */}
              <Route element={<ProtectedRoute roles={['student']} />}>
                <Route path="/my-bikes" element={<MyBikesPage />} />
                <Route
                  path="/my-bikes/register"
                  element={<RegisterBikePage />}
                />
                <Route
                  path="/my-bikes/:bikeId"
                  element={<BikeDetailPage />}
                />
                <Route
                  path="/notifications"
                  element={<NotificationsPage />}
                />
              </Route>

              {/* Security guards */}
              <Route element={<ProtectedRoute roles={['guard']} />}>
                <Route path="/guard" element={<GuardDashboardPage />} />
                <Route
                  path="/guard/manual"
                  element={<ManualChecksPage />}
                />
                <Route
                  path="/guard/crossings"
                  element={<CrossingLogPage />}
                />
              </Route>

              {/* Administrators */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route
                  path="/admin/registrations"
                  element={<RegistrationsPage />}
                />
                <Route path="/admin/tags" element={<TagsPage />} />
                <Route
                  path="/admin/crossings"
                  element={<CrossingLogPage canExport />}
                />
                <Route path="/admin/people" element={<PeoplePage />} />
                <Route path="/admin/audit" element={<AuditPage />} />
              </Route>

            </Route>
          </Route>

          {/* Unknown routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

