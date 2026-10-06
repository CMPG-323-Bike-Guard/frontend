import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import type { CrossingView } from '@/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { useAlarms, useCrossings, useGates, useResolveAlarm } from '@/api/queries';
import { useRealtime } from '@/api/useRealtime';
import type { RealtimeEvent } from '@/api/realtime';
import { ApiError } from '@/api/client';
import { playAlarmTone } from '@/lib/alarmSound';
import { formatTime, relativeTime } from '@/lib/format';
import { cx } from '@/lib/cx';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { AlarmCard, type Resolution } from '@/components/domain/AlarmCard';
import { ConnectionIndicator } from '@/components/domain/ConnectionIndicator';
import { GateBoard } from '@/components/domain/GateBoard';
import { ResultBadge } from '@/components/domain/StatusBadges';
import { GateSimulator } from './GateSimulator';
import { ReaderEmulator } from './ReaderEmulator';

/**
 * Guard dashboard — UC-02, UC-03 and FR-SEC-01 to FR-SEC-06.
 *
 * Everything a guard needs while a rider is standing at the boom is on this
 * one screen: which gates are live, what the last decision was, and any alarm
 * that is still waiting for a person.
 */
export function GuardDashboardPage() {
  const user = useCurrentUser();
  const toast = useToast();

  const gates = useGates();
  const alarms = useAlarms('live');
  const recent = useCrossings({ limit: 12 });
  const resolveAlarm = useResolveAlarm();

  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [liveFeed, setLiveFeed] = useState<CrossingView[]>([]);
  const [lastResultByGate, setLastResultByGate] = useState<Record<string, 'match' | 'mismatch' | undefined>>({});
  const [announcement, setAnnouncement] = useState('');
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === 'crossing') {
      setLiveFeed((current) => [event.crossing, ...current].slice(0, 12));
      if (event.crossing.event.result !== 'manual') {
        setLastResultByGate((current) => ({
          ...current,
          [event.crossing.event.gateId]: event.crossing.event.result as 'match' | 'mismatch',
        }));
      }
    }
    if (event.type === 'alarm') {
      const who = event.alarm.presentedUser?.name ?? 'An unidentified card';
      setAnnouncement(`Alarm at ${event.alarm.gateName}. ${who}. Gate held.`);
      if (soundRef.current) playAlarmTone();
      void alarms.refetch();
    }
    if (event.type === 'alarm-updated' || event.type === 'gate') {
      void alarms.refetch();
      void gates.refetch();
    }
  }, [alarms, gates]);

  const connection = useRealtime(handleEvent);

  useEffect(() => {
    if (recent.data && liveFeed.length === 0) setLiveFeed(recent.data.slice(0, 12));
  }, [recent.data, liveFeed.length]);

  const gateList = gates.data ?? [];
  const selectedGate = gateList.find((gate) => gate.gateId === selectedGateId);
  const selectedGateAwaitingRollout = selectedGate !== undefined && !selectedGate.commissioned;

  const visibleAlarms = useMemo(
    () =>
      (alarms.data ?? []).filter(
        (view) => selectedGateId === null || selectedGateId === view.event.gateId,
      ),
    [alarms.data, selectedGateId],
  );

  const visibleFeed = useMemo(
    () => liveFeed.filter((row) => selectedGateId === null || selectedGateId === row.event.gateId),
    [liveFeed, selectedGateId],
  );

  const manualGates = gateList.filter((gate) => gate.commissioned && gate.mode === 'manual');

  async function handleResolve(alarmId: string, outcome: Resolution, notes: string) {
    try {
      await resolveAlarm.mutateAsync({ alarmId, outcome, notes, guardUserId: user.userId });
      toast.confirm(
        outcome === 'cleared_in_person'
          ? 'Check recorded against the crossing.'
          : outcome === 'reported_stolen'
            ? 'Reported stolen. Protection Services can see the record.'
            : 'Escalated to Protection Services.',
      );
    } catch (error) {
      toast.problem(error instanceof ApiError ? error.message : 'The alarm could not be updated.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Alarms are announced to screen readers as well as shown and sounded. */}
      <p className="sr-only" role="status" aria-live="assertive">
        {announcement}
      </p>

      <PageHeader
        title="Gate board"
        description={`On duty as ${user.name}. Alarms stay here until someone records what they found.`}
        actions={
          <div className="flex items-center gap-3">
            <ConnectionIndicator state={connection} />
            <Button
              variant="subtle"
              size="sm"
              icon={soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              onClick={() => setSoundOn((on) => !on)}
              aria-pressed={soundOn}
            >
              {soundOn ? 'Sound on' : 'Sound off'}
            </Button>
          </div>
        }
      />

      {connection === 'disconnected' && (
        <Alert tone="alert" title="The live feed is down">
          This board may be out of date. Check the gate in person and use manual checks until the connection returns.
        </Alert>
      )}

      {manualGates.length > 0 && (
        <Alert tone="warn" variant="orange" title={`${manualGates.length} gate${manualGates.length === 1 ? '' : 's'} on manual checks`}>
          Verify the card and the bike yourself and log each crossing so the record stays complete.
        </Alert>
      )}

      {/* FR-SEC-06 */}
      {gateList.length > 1 && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Filter the board by gate</legend>
          <span className="text-sm font-medium text-ink-600">Showing</span>
          <Button
            type="button"
            onClick={() => setSelectedGateId(null)}
            aria-pressed={selectedGateId === null}
            size="sm"
            variant={selectedGateId === null ? 'dark' : 'subtle'}
            className={selectedGateId === null ? 'cursor-pointer border border-ink-900' : undefined}
          >
            All gates
          </Button>
          {gateList.map((gate) => {
            const active = selectedGateId === gate.gateId;
            return (
              <Button
                key={gate.gateId}
                type="button"
                onClick={() => setSelectedGateId(gate.gateId)}
                aria-pressed={active}
                size="sm"
                variant={active ? 'dark' : 'subtle'}
                className={active ? 'cursor-pointer border border-ink-900' : undefined}
              >
                {gate.name}
              </Button>
            );
          })}
        </fieldset>
      )}

      {gates.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <GateBoard
          gates={gateList}
          lastResultByGate={lastResultByGate}
          selectedGateId={selectedGateId}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr] xl:gap-x-4 xl:gap-y-3">
        <div className="flex flex-col gap-3 xl:contents">
          <div className="flex items-baseline justify-between xl:col-start-1 xl:row-start-1">
            <h2 className="text-lg font-semibold">
              Alarms waiting for you
              {visibleAlarms.length > 0 && <span className="ml-2 text-alert-600">{visibleAlarms.length}</span>}
            </h2>
          </div>

          <div className="flex flex-col gap-3 xl:col-start-1 xl:row-start-2">
            {alarms.isLoading && <SkeletonRows rows={2} />}

            {alarms.isSuccess && visibleAlarms.length === 0 && (
              <Card>
                <EmptyState
                  icon={<CheckCircle2 className="h-10 w-10 text-ok-500" />}
                  title={selectedGateAwaitingRollout ? `No alarms for ${selectedGate?.name}` : 'Nothing is waiting'}
                  description={
                    selectedGateAwaitingRollout
                      ? 'This gate is awaiting rollout.'
                      : 'Every alarm raised so far has been checked and recorded. New ones appear here immediately.'
                  }
                />
              </Card>
            )}

            {visibleAlarms.map((view) => (
              <AlarmCard
                key={view.alarm.alarmId}
                view={view}
                onResolve={handleResolve}
                resolving={resolveAlarm.isPending}
              />
            ))}
          </div>
        </div>

        <Card className="h-fit xl:col-start-2 xl:row-start-2">
          <CardHeader title="Live crossings" description="The most recent reads across the gates you are watching." />
          <CardBody className="py-0">
            {visibleFeed.length === 0 ? (
              <EmptyState
                title={selectedGateAwaitingRollout ? `No crossings for ${selectedGate?.name}` : 'No crossings yet'}
                description={
                  selectedGateAwaitingRollout
                    ? 'This gate is awaiting rollout.'
                    : 'Reads appear here the moment a card is tapped.'
                }
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {visibleFeed.map((row) => (
                  <li key={row.event.eventId} className="flex items-center gap-3 py-2.5">
                    <span className="w-16 shrink-0 text-sm text-ink-500">{formatTime(row.event.timestamp)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{row.userName ?? 'Unidentified card'}</p>
                      <p className="truncate text-xs text-ink-500">
                        {row.gateName} · {row.bikeName ?? row.event.note ?? 'no bike matched'}
                      </p>
                    </div>
                    <ResultBadge result={row.event.result} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Recently checked"
          description="Alarms you and other guards have already closed, newest first."
          action={<ShieldCheck className="h-5 w-5 text-ink-300" aria-hidden="true" />}
        />
        <CardBody className="py-0">
          <ClosedAlarms />
        </CardBody>
      </Card>

      <GateSimulator gates={gates.data ?? []} />
      <ReaderEmulator gates={gates.data ?? []} />
    </div>
  );
}

function ClosedAlarms() {
  const all = useAlarms('all');
  const closed = (all.data ?? []).filter((view) => view.alarm.status !== 'open' && view.alarm.status !== 'escalated').slice(0, 6);

  if (all.isLoading) return <SkeletonRows rows={3} className="py-4" />;
  if (closed.length === 0) {
    return <EmptyState title="No closed alarms yet" description="Checks you record are listed here for the shift." />;
  }

  return (
    <ul className="divide-y divide-ink-100">
      {closed.map((view) => (
        <li key={view.alarm.alarmId} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-900">
              {view.presentedUser?.name ?? 'Unidentified card'} · {view.gateName}
            </p>
            <p className="text-sm text-ink-500">{relativeTime(view.alarm.resolvedAt ?? view.alarm.raisedAt)}</p>
          </div>
          <p className="mt-0.5 text-sm text-ink-600">
            {view.alarm.status === 'reported_stolen' ? 'Reported stolen' : 'Cleared in person'}
            {view.resolvedByName ? ` by ${view.resolvedByName}` : ''}
            {view.alarm.notes ? ` — ${view.alarm.notes}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}
