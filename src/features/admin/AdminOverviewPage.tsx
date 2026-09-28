import { Activity, BikeIcon, Siren, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAlarms, useAudit, useRegistrations, useStats } from '@/api/queries';
import { PLANNED_GATE_COUNT, READ_SUCCESS_TARGET, VERIFICATION_BUDGET_MS } from '@/lib/constants';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { Alert } from '@/components/ui/Alert';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';

/** Landing screen for Protection Services administrators. */
export function AdminOverviewPage() {
  const stats = useStats();
  const pending = useRegistrations('pending_approval');
  const awaitingCollection = useRegistrations('tag_pending');
  const alarms = useAlarms('live');
  const audit = useAudit();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pilot overview"
        description={`Gate 1 is the live pilot. The system is built to reach all ${PLANNED_GATE_COUNT} gates without a redesign.`}
        actions={<LinkButton to="/admin/registrations">Review registrations</LinkButton>}
      />

      {alarms.data && alarms.data.length > 0 && (
        <Alert
          tone="warn"
          title={`${alarms.data.length} alarm${alarms.data.length === 1 ? '' : 's'} still open`}
          action={<LinkButton to="/reports/alarms" variant="secondary" size="sm">Review</LinkButton>}
        >
          A guard has not yet recorded what they found at the gate.
        </Alert>
      )}

      {stats.isLoading ? (
        <SkeletonRows rows={2} />
      ) : stats.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Crossings today"
            value={formatNumber(stats.data.crossingsToday)}
            detail={`${formatNumber(stats.data.matchesToday)} matched · ${formatNumber(stats.data.mismatchesToday)} held`}
            icon={<Activity className="h-4 w-4" />}
          />
          <StatTile
            label="Bikes protected"
            value={formatNumber(stats.data.registeredBikes)}
            detail={`${stats.data.pendingRegistrations} waiting for review`}
            icon={<BikeIcon className="h-4 w-4" />}
          />
          <StatTile
            label="Verification time"
            value={`${stats.data.p95VerificationMs} ms`}
            detail={`95th percentile · budget ${VERIFICATION_BUDGET_MS} ms`}
            tone={stats.data.p95VerificationMs > VERIFICATION_BUDGET_MS ? 'alert' : 'ok'}
            icon={<Tag className="h-4 w-4" />}
          />
          <StatTile
            label="Read success"
            value={formatPercent(stats.data.readSuccessRate, 2)}
            detail={`Target ${READ_SUCCESS_TARGET}%`}
            tone={stats.data.readSuccessRate < READ_SUCCESS_TARGET ? 'warn' : 'ok'}
            icon={<Siren className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Waiting for review"
            description="New registrations need a tag allocated before the gate can recognise the bike."
            action={<LinkButton to="/admin/registrations" variant="secondary" size="sm">Open queue</LinkButton>}
          />
          <CardBody className="py-0">
            {pending.isLoading && <SkeletonRows rows={3} className="py-4" />}
            {pending.isSuccess && pending.data.length === 0 && (
              <EmptyState title="The queue is clear" description="Every submitted registration has been reviewed." />
            )}
            {pending.isSuccess && pending.data.length > 0 && (
              <ul className="divide-y divide-ink-50">
                {pending.data.slice(0, 5).map((view) => (
                  <li key={view.bike.bikeId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{view.bike.name}</p>
                      <p className="truncate text-sm text-ink-500">
                        {view.owner.name} · {view.owner.studentStaffNumber}
                      </p>
                    </div>
                    <Link to="/admin/registrations" className="text-sm font-semibold text-signal-600 hover:text-signal-700">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tags to hand over"
            description="Approved registrations waiting for the student to collect and fit the tag."
            action={<LinkButton to="/admin/tags" variant="secondary" size="sm">Open tags</LinkButton>}
          />
          <CardBody className="py-0">
            {awaitingCollection.isLoading && <SkeletonRows rows={3} className="py-4" />}
            {awaitingCollection.isSuccess && awaitingCollection.data.length === 0 && (
              <EmptyState title="Nothing to hand over" description="Every issued tag has been collected." />
            )}
            {awaitingCollection.isSuccess && awaitingCollection.data.length > 0 && (
              <ul className="divide-y divide-ink-50">
                {awaitingCollection.data.slice(0, 5).map((view) => (
                  <li key={view.bike.bikeId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{view.bike.name}</p>
                      <p className="truncate text-sm text-ink-500">
                        {view.owner.name} · tag {view.tag?.tagRef ?? 'not allocated'}
                      </p>
                    </div>
                    <Link to="/admin/tags" className="text-sm font-semibold text-signal-600 hover:text-signal-700">
                      Hand over
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Latest activity"
          description="Every administrative action is traceable to a person and a time."
          action={<LinkButton to="/admin/audit" variant="secondary" size="sm">Full audit trail</LinkButton>}
        />
        <CardBody className="py-0">
          {audit.isLoading && <SkeletonRows rows={4} className="py-4" />}
          {audit.isSuccess && (
            <ul className="divide-y divide-ink-50">
              {audit.data.slice(0, 6).map((entry) => (
                <li key={entry.auditId} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{entry.actorName}</p>
                    <p className="text-sm text-ink-500">{formatDateTime(entry.timestamp)}</p>
                  </div>
                  <p className="text-sm text-ink-600">{entry.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
