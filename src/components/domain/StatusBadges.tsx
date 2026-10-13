import type { AlarmStatus, BikeStatus, CrossingResult, GateHealth, TagStatus } from '@/types';
import { ALARM_STATUS_META, BIKE_STATUS_META, GATE_HEALTH_META, TAG_STATUS_META } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';

export function BikeStatusBadge({ status }: { status: BikeStatus }) {
  const meta = BIKE_STATUS_META[status];
  return <Badge tone={meta.tone} variant={status === 'tag_pending' ? 'tag-ready' : 'default'}>{meta.label}</Badge>;
}

export function TagStatusBadge({ status }: { status: TagStatus }) {
  const meta = TAG_STATUS_META[status];
  const variant =
    status === 'active'
      ? 'tag-active'
      : status === 'awaiting_collection'
        ? 'tag-ready'
        : status === 'lost'
          ? 'tag-lost'
          : status === 'deactivated'
            ? 'result-mismatch'
          : 'default';
  return <Badge tone={meta.tone} variant={variant}>{meta.label}</Badge>;
}

export function GateHealthBadge({ health }: { health: GateHealth }) {
  const meta = GATE_HEALTH_META[health];
  return (
    <Badge tone={meta.tone}>
      {meta.label}
    </Badge>
  );
}

export function AlarmStatusBadge({ status }: { status: AlarmStatus }) {
  const meta = ALARM_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ResultBadge({ result }: { result: CrossingResult }) {
  if (result === 'match') return <Badge tone="ok" variant="tag-active">Match</Badge>;
  if (result === 'mismatch') return <Badge tone="alert" variant="result-mismatch">Mismatch</Badge>;
  return <Badge tone="warn" variant="tag-ready">Manual</Badge>;
}
