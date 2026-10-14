
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { PROFILE_PATH, ROLE_HOME } from '@/lib/constants';
import { FullPageSpinner, SkeletonRows } from '@/components/ui/Spinner';

import { SignInPage } from '@/features/shared/SignInPage';
import { NotFoundPage } from '@/features/shared/NotFoundPage';
import { NoAccessPage } from '@/features/shared/NoAccessPage';
import { CrossingLogPage } from '@/features/shared/CrossingLogPage';
import { ProfilePage } from '@/features/shared/ProfilePage';

import { MyBikesPage } from '@/features/student/MyBikesPage';
import { RegisterBikePage } from '@/features/student/RegisterBikePage';
import { BikeDetailPage } from '@/features/student/BikeDetailPage';
import { NotificationsPage } from '@/features/student/NotificationsPage';
import { GatesPage } from '@/features/admin/GatesPage';
import { GuardDashboardPage } from '@/features/guard/GuardDashboardPage';
import { ManualChecksPage } from '@/features/guard/ManualChecksPage';
import { AlarmHistoryPage } from '@/features/manager/AlarmHistoryPage';
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';
import { RegistrationsPage } from '@/features/admin/RegistrationsPage';
import { TagsPage } from '@/features/admin/TagsPage';
import { PeoplePage } from '@/features/admin/PeoplePage';
import { AuditPage } from '@/features/admin/AuditPage';
import { PhotoReviewsPage } from '@/features/admin/PhotoReviewsPage';

const AdminReportsPage = lazy(() =>
  import('@/features/admin/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);

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

              <Route path={PROFILE_PATH} element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

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
                  element={<CrossingLogPage preventFutureDates />}
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
                <Route path="/admin/alarms" element={<AlarmHistoryPage />} />
                <Route path="/admin/gates" element={<GatesPage />} />
                <Route
                  path="/admin/crossings"
                  element={<CrossingLogPage canExport />}
                />
                <Route path="/admin/people" element={<PeoplePage />} />
                <Route path="/admin/photo-reviews" element={<PhotoReviewsPage />} />
                <Route path="/admin/audit" element={<AuditPage />} />
                <Route
                  path="/reports"
                  element={
                    <Suspense fallback={<SkeletonRows rows={5} />}>
                      <AdminReportsPage />
                    </Suspense>
                  }
                />
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

