import { ArrowUpRight, BellRing, CheckCircle2, Eye } from 'lucide-react';
import type { AlarmView } from '@/types';
import { formatDateTime } from '@/lib/format';
import { cx } from '@/lib/cx';

type Step = {
  key: string;
  label: string;
  at: string | null;
  detail?: string | null;
  icon: typeof BellRing;
  tone: 'alert' | 'warn' | 'ok' | 'neutral';
};

function elapsed(fromIso: string, toIso: string) {
  const seconds = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60}s`;
}

/**
 * Audit trail for one alarm: when it was triggered, acknowledged, escalated
 * and resolved, who did each step and how long it took. The same events are
 * also written to the system-wide audit log.
 */
export function AlarmTimeline({ view }: { view: AlarmView }) {
  const { alarm } = view;

  const steps: Step[] = [
    { key: 'raised', label: 'Triggered', at: alarm.raisedAt, icon: BellRing, tone: 'alert', detail: view.gateName },
    {
      key: 'ack',
      label: 'Acknowledged',
      at: alarm.acknowledgedAt,
      icon: Eye,
      tone: 'warn',
      detail: alarm.acknowledgedAt
        ? `${view.acknowledgedByName ?? 'Guard'} · after ${elapsed(alarm.raisedAt, alarm.acknowledgedAt)}`
        : null,
    },
    {
      key: 'escalated',
      label: 'Escalated',
      at: alarm.escalatedAt,
      icon: ArrowUpRight,
      tone: 'alert',
      detail:
        alarm.escalationReason === 'no_acknowledgement'
          ? 'No acknowledgement before the deadline · supervisor notified'
          : alarm.escalationReason === 'guard_request'
            ? 'Guard asked for help · supervisor notified'
            : null,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      at: alarm.resolvedAt,
      icon: CheckCircle2,
      tone: 'ok',
      detail: alarm.resolvedAt
        ? `${alarm.status === 'reported_stolen' ? 'Reported stolen' : 'Cleared in person'} by ${
            view.resolvedByName ?? 'guard'
          } · ${elapsed(alarm.raisedAt, alarm.resolvedAt)} after trigger`
        : null,
    },
  ];

  // Escalation is optional, so only show it when it happened.
  const visible = steps.filter((step) => step.key !== 'escalated' || step.at);

  return (
    <ol className="relative flex flex-col gap-3 border-l border-ink-100 pl-5" aria-label="Alarm audit trail">
      {visible.map((step) => {
        const Icon = step.icon;
        const done = Boolean(step.at);
        return (
          <li key={step.key} className="relative">
            <span
              className={cx(
                'absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-white',
                !done && 'border-ink-100 text-ink-500',
                done && step.tone === 'alert' && 'border-alert-500 text-alert-600',
                done && step.tone === 'warn' && 'border-tag-notice-orange text-tag-notice-orange',
                done && step.tone === 'ok' && 'border-tag-status-green text-tag-status-green',
              )}
              aria-hidden="true"
            >
              <Icon className="h-3 w-3" />
            </span>
            <p className={cx('text-sm font-semibold', done ? 'text-ink-900' : 'text-ink-500')}>
              {step.label}
              <span className="ml-2 font-normal text-ink-500">{step.at ? formatDateTime(step.at) : 'Not yet'}</span>
            </p>
            {step.detail && <p className="text-xs text-ink-500">{step.detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}