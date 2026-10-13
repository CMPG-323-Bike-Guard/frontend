import type { ReactNode } from 'react';
import {
  ArrowRight,
  BikeIcon,
  CheckCircle2,
  ClipboardCheck,
  Images,
  Siren,
  Tag,
  TriangleAlert,
} from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useAlarms, useAudit, usePendingPhotos, useRegistrations, useStats } from '@/api/queries';
import { PLANNED_GATE_COUNT, READ_SUCCESS_TARGET, VERIFICATION_BUDGET_MS } from '@/lib/constants';
import { cx } from '@/lib/cx';
import { formatDateTime, formatNumber, formatPercent, relativeTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';

/**
 * One job the admin has to do. Shows a big number and one button.
 * When the count is 0 it turns into a calm "all done" state.
 */
function TaskCard({
  icon,
  title,
  count,
  help,
  doneText,
  to,
  actionLabel,
  urgent = false,
  loading = false,
  items,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  help: string;
  doneText: string;
  to: string;
  actionLabel: string;
  urgent?: boolean;
  loading?: boolean;
  items?: string[];
}) {
  const done = !loading && count === 0;
  return (
    <Card
      className={cx(
        'flex flex-col',
        urgent && !done && 'border-alert-500/50',
        !urgent && !done && 'border-brand-purple/40',
      )}
    >
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cx(
              'grid h-10 w-10 shrink-0 place-items-center rounded-control',
              done && 'bg-tag-status-green/10 text-tag-status-green',
              !done && urgent && 'bg-alert-100 text-alert-600',
              !done && !urgent && 'bg-card-header text-brand-purple',
            )}
          >
            {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
          </span>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        </div>

        {loading ? (
          <SkeletonRows rows={1} />
        ) : done ? (
          <p className="text-sm text-ink-500">{doneText}</p>
        ) : (
          <>
            <p className="text-4xl font-semibold text-ink-900">{formatNumber(count)}</p>
            <p className="text-sm text-ink-500">{help}</p>
            {items && items.length > 0 && (
              <ul className="space-y-1 border-t border-ink-100 pt-3 text-sm text-ink-900">
                {items.map((line) => (
                  <li key={line} className="truncate">
                    {line}
                  </li>
                ))}
                {count > items.length && (
                  <li className="text-ink-500">+ {count - items.length} more</li>
                )}
              </ul>
            )}
          </>
        )}

        <div className="mt-auto pt-1">
          {done ? null : (
            <LinkButton
              to={to}
              variant={urgent ? 'danger' : 'primary'}
              className="w-full"
              icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            >
              {actionLabel}
            </LinkButton>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** Landing screen for Protection Services administrators. */
export function AdminOverviewPage() {
  const admin = useCurrentUser();
  const stats = useStats();
  const pending = useRegistrations('pending_approval');
  const awaitingCollection = useRegistrations('tag_pending');
  const photos = usePendingPhotos(admin.userId);
  const alarms = useAlarms('live');
  const audit = useAudit();

  const alarmCount = alarms.data?.length ?? 0;
  const pendingCount = pending.data?.length ?? 0;
  const handOverCount = awaitingCollection.data?.length ?? 0;
  const photoCount = photos.data?.length ?? 0;
  const todoCount = alarmCount + pendingCount + handOverCount + photoCount;

  const stillLoading =
    alarms.isLoading || pending.isLoading || awaitingCollection.isLoading || photos.isLoading;

  const s = stats.data;
  const noActivityYet = !s || s.crossingsToday === 0;
  const systemHealthy =
    !!s && s.p95VerificationMs <= VERIFICATION_BUDGET_MS && s.readSuccessRate >= READ_SUCCESS_TARGET;

  const firstName = admin.name.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Welcome back, ${firstName}`} description="Here is what needs your attention today." />

      {/* 1. One sentence that says how things are right now */}
      {!stillLoading && (
        <div
          role={alarmCount > 0 ? 'alert' : 'status'}
          className={cx(
            'flex items-center gap-3 rounded-card border px-5 py-4',
            alarmCount > 0 && 'border-alert-500/40 bg-alert-100',
            alarmCount === 0 && todoCount > 0 && 'border-tag-notice-orange/40 bg-tag-notice-orange/10',
            todoCount === 0 && 'border-tag-status-green/40 bg-tag-status-green/10',
          )}
        >
          {todoCount === 0 ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-tag-status-green" aria-hidden="true" />
          ) : (
            <TriangleAlert
              className={cx('h-6 w-6 shrink-0', alarmCount > 0 ? 'text-alert-600' : 'text-tag-notice-orange')}
              aria-hidden="true"
            />
          )}
          <div>
            <p className="text-lg font-semibold text-ink-900">
              {alarmCount > 0
                ? `${alarmCount} gate alarm${alarmCount === 1 ? ' is' : 's are'} still open`
                : todoCount > 0
                  ? `You have ${todoCount} thing${todoCount === 1 ? '' : 's'} to do`
                  : "You're all caught up"}
            </p>
            <p className="text-sm text-ink-600">
              {alarmCount > 0
                ? 'A guard has not yet recorded what they found. Please look at this first.'
                : todoCount > 0
                  ? 'Open a card below to get started.'
                  : 'Nothing is waiting for you right now.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. The jobs, one card each */}
      <section aria-label="Things to do" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {alarmCount > 0 && (
          <TaskCard
            urgent
            icon={<Siren className="h-5 w-5" />}
            title="Open alarms"
            count={alarmCount}
            help="Bikes the gate stopped. A guard still needs to record the outcome."
            doneText="No open alarms."
            to="/reports"
            actionLabel="Review alarms"
          />
        )}
        <TaskCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="Approve registrations"
          count={pendingCount}
          loading={pending.isLoading}
          help="Students are waiting for you to approve their bike and give them a tag."
          doneText="No registrations are waiting."
          to="/admin/registrations"
          actionLabel="Review registrations"
          items={pending.data?.slice(0, 3).map((v) => `${v.bike.name} · ${v.owner.name}`)}
        />
        <TaskCard
          icon={<Images className="h-5 w-5" />}
          title="Check photos"
          count={photoCount}
          loading={photos.isLoading}
          help="New profile and bike photos need to be approved."
          doneText="No photos are waiting."
          to="/admin/photo-reviews"
          actionLabel="Check photos"
          items={photos.data?.slice(0, 3).map((p) => p.ownerName)}
        />
        <TaskCard
          icon={<Tag className="h-5 w-5" />}
          title="Hand over tags"
          count={handOverCount}
          loading={awaitingCollection.isLoading}
          help="Approved bikes. The student needs to collect the tag and fit it."
          doneText="Every tag has been collected."
          to="/admin/tags"
          actionLabel="Open tags"
          items={awaitingCollection.data?.slice(0, 3).map((v) => `${v.bike.name} · ${v.owner.name}`)}
        />
      </section>

      {/* 3. Today at a glance: three plain numbers */}
      <section aria-label="Today at a glance">
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Today at a glance</h2>
        {stats.isLoading ? (
          <SkeletonRows rows={1} />
        ) : s ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Bikes through the gate"
              value={formatNumber(s.matchesToday)}
              detail="Card and tag matched"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatTile
              label="Stopped for a check"
              value={formatNumber(s.mismatchesToday)}
              detail={s.mismatchesToday === 0 ? 'Nothing stopped today' : 'Card and tag did not match'}
              tone={s.mismatchesToday > 0 ? 'alert' : 'neutral'}
              icon={<TriangleAlert className="h-4 w-4" />}
            />
            <StatTile
              label="Bikes protected"
              value={formatNumber(s.registeredBikes)}
              detail="Registered and tagged"
              icon={<BikeIcon className="h-4 w-4" />}
            />
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* 4. Recent activity: what happened first, who and when second */}
        <Card>
          <CardHeader
            title="Recent activity"
            action={
              <LinkButton to="/admin/audit" variant="subtle" size="sm">
                See all
              </LinkButton>
            }
          />
          <CardBody className="py-0">
            {audit.isLoading && <SkeletonRows rows={4} className="py-4" />}
            {audit.isSuccess && audit.data.length === 0 && (
              <p className="py-6 text-sm text-ink-500">Nothing has happened yet.</p>
            )}
            {audit.isSuccess && audit.data.length > 0 && (
              <ul className="divide-y divide-ink-100">
                {audit.data.slice(0, 5).map((entry) => (
                  <li key={entry.auditId} className="py-3">
                    <p className="text-sm font-medium text-ink-900">{entry.detail}</p>
                    <p className="text-sm text-ink-500" title={formatDateTime(entry.timestamp)}>
                      {entry.actorName} · {relativeTime(entry.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* 5. Technical numbers, hidden behind one plain-language status */}
        <Card>
          <CardHeader
            title="Is the system working?"
            description={`Gate 1 is the live pilot. It is built to grow to all ${PLANNED_GATE_COUNT} gates.`}
          />
          <CardBody className="flex flex-col gap-4">
            {stats.isLoading && <SkeletonRows rows={2} />}
            {s && (
              <>
                <div className="flex items-center gap-3">
                  {noActivityYet ? (
                    <Badge tone="neutral">No gate activity yet today</Badge>
                  ) : systemHealthy ? (
                    <Badge variant="tag-active">Working normally</Badge>
                  ) : (
                    <Badge variant="gate-warning">Needs attention</Badge>
                  )}
                </div>
                <p className="text-sm text-ink-600">
                  {noActivityYet
                    ? 'The gate has not been used yet today, so there is nothing to measure.'
                    : systemHealthy
                      ? 'The gate is opening quickly and reading cards and tags reliably.'
                      : 'The gate is slower or less reliable than it should be. Tell the technical team.'}
                </p>
                <details className="group text-sm">
                  <summary className="cursor-pointer font-semibold text-brand-purple">
                    Show technical details
                  </summary>
                  <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-ink-600">
                    <dt>Time to check a bike (slowest 5%)</dt>
                    <dd className="font-medium text-ink-900">
                      {s.p95VerificationMs} ms{' '}
                      <span className="font-normal text-ink-500">(limit {VERIFICATION_BUDGET_MS} ms)</span>
                    </dd>
                    <dt>Cards and tags read successfully</dt>
                    <dd className="font-medium text-ink-900">
                      {formatPercent(s.readSuccessRate, 2)}{' '}
                      <span className="font-normal text-ink-500">(target {READ_SUCCESS_TARGET}%)</span>
                    </dd>
                  </dl>
                </details>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}