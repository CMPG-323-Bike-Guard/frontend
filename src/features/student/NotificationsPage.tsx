import { BellOff, Tag } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useMarkNotificationRead, useNotifications } from '@/api/queries';
import { relativeTime } from '@/lib/format';
import { cx } from '@/lib/cx';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

/**
 * FR-STU-06: the system confirms a tag has been registered and tells the
 * student when it is ready for collection. Security messages (a flagged tag,
 * a returned registration) arrive in the same place.
 */
export function NotificationsPage() {
  const user = useCurrentUser();
  const query = useNotifications(user.userId);
  const markRead = useMarkNotificationRead();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Notifications" description="Updates from Protection Services about your bikes and tags." />

      {query.isLoading && <SkeletonRows rows={4} />}
      {query.isError && <Alert tone="alert">{(query.error as Error).message}</Alert>}

      {query.isSuccess && query.data.length === 0 && (
        <Card>
          <EmptyState
            icon={<BellOff className="h-10 w-10" />}
            title="Nothing to read"
            description="Messages about your registrations and tags will appear here."
          />
        </Card>
      )}

      {query.isSuccess && query.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {query.data.map((notification) => (
            <li key={notification.notificationId}>
              <Card className={cx(!notification.read && 'border-signal-300 bg-signal-50/40')}>
                <CardBody className="flex items-start gap-3">
                  {notification.kind === 'tag_ready' && (
                    <span className="mt-0.5 rounded-control bg-warn-100 p-1.5 text-warn-600">
                      <Tag className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold text-ink-900">{notification.title}</h2>
                      <span className="text-sm text-ink-500">{relativeTime(notification.createdAt)}</span>
                    </div>
                    <p className="prose-measure mt-1 text-sm text-ink-700">{notification.body}</p>
                    {!notification.read && (
                      <Button
                        variant="subtle"
                        size="sm"
                        className="mt-2 -ml-3 hover:bg-ink-500/10"
                        onClick={() => markRead.mutate(notification.notificationId)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
