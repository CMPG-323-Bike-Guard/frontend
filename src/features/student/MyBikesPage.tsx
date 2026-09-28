import { useMemo, useState } from 'react';
import { BikeIcon, Plus } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useBikes, useNotifications } from '@/api/queries';
import { Alert } from '@/components/ui/Alert';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { BikeCard } from '@/components/domain/BikeCard';

/** FR-STU-03: a student sees only their own registrations (FR-VER-09). 
 * My Bikes Page FR-STU-03 and FR-VER-09.
 * Displays the bikes registered to the currently signed-in student or
 * staff member and the status of their associated RFID tags.
 * 
 * Students can:
 * - View their registered bikes.
 * - Register a new bike.
 * See when an RFID tag is ready for collection.
 * - View notifications from Protection Services.
 * - View previously removed bikes.
*/
export function MyBikesPage() {
  const [tagNoticeDismissed, setTagNoticeDismissed] = useState(false);
  const user = useCurrentUser();
  const bikes = useBikes(user.userId);
  const notifications = useNotifications(user.userId);

  const visible = useMemo(
    () => (bikes.data ?? []).filter((view) => view.bike.status !== 'removed'),
    [bikes.data],
  );
  const removed = useMemo(
    () => (bikes.data ?? []).filter((view) => view.bike.status === 'removed'),
    [bikes.data],
  );
  const readyToCollect = visible.filter((view) => view.tag?.status === 'awaiting_collection');
  const unread = (notifications.data ?? []).filter((item) => !item.read).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        description="Your registered bikes and the tags that let them through the gate."
        actions={
          <LinkButton to="/my-bikes/register" icon={<Plus className="h-4 w-4" />}>
            Register a bike
          </LinkButton>
        }
      />

      {readyToCollect.length > 0 && !tagNoticeDismissed && (
        <Alert
          tone="warn"
          variant="orange"
          title="A tag is waiting for you"
          onDismiss={() => setTagNoticeDismissed(true)}
        >
          Collect the tag for {readyToCollect.map((view) => `“${view.bike.name}”`).join(', ')} from the Protection
          Services desk, fit it to the frame, and the gate will start recognising the bike.
        </Alert>
      )}

      {unread > 0 && (
        <Alert tone="info" action={<LinkButton to="/notifications" variant="secondary" size="sm">Open</LinkButton>}>
          You have {unread} unread {unread === 1 ? 'message' : 'messages'} from Protection Services.
        </Alert>
      )}

      {bikes.isLoading && <SkeletonRows rows={3} className="mt-2" />}

      {bikes.isError && (
        <Alert tone="alert" title="Your bikes could not be loaded">
          {(bikes.error as Error).message}
        </Alert>
      )}

      {bikes.isSuccess && visible.length === 0 && (
        <div className="rounded-card border border-ink-100 bg-white">
          <EmptyState
            icon={<BikeIcon className="h-10 w-10" />}
            title="No bikes registered yet"
            description="Register your bike to pair it with your student card. Until it is registered, the gate cannot tell it apart from anyone else's."
            action={<LinkButton to="/my-bikes/register">Register your first bike</LinkButton>}
          />
        </div>
      )}

      {visible.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-2">
          {visible.map((view) => (
            <BikeCard key={view.bike.bikeId} view={view} to={`/my-bikes/${view.bike.bikeId}`} />
          ))}
        </div>
      )}

      {removed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink-500">Removed bikes</h2>
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            {removed.map((view) => (
              <BikeCard key={view.bike.bikeId} view={view} to={`/my-bikes/${view.bike.bikeId}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
