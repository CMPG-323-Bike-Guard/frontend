import type { AlarmStatus, BikeStatus, CrossingResult, GateHealth, TagStatus } from '@/types';
import { ALARM_STATUS_META, BIKE_STATUS_META, GATE_HEALTH_META, TAG_STATUS_META } from '@/lib/constants';
import { Badge, StatusDot } from '@/components/ui/Badge';

export function BikeStatusBadge({ status }: { status: BikeStatus }) {
  const meta = BIKE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function TagStatusBadge({ status }: { status: TagStatus }) {
  const meta = TAG_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function GateHealthBadge({ health }: { health: GateHealth }) {
  const meta = GATE_HEALTH_META[health];
  return (
    <Badge tone={meta.tone}>
      <StatusDot tone={meta.tone} />
      {meta.label}
    </Badge>
  );
}

export function AlarmStatusBadge({ status }: { status: AlarmStatus }) {
  const meta = ALARM_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ResultBadge({ result }: { result: CrossingResult }) {
  if (result === 'match') return <Badge tone="ok">Match</Badge>;
  if (result === 'mismatch') return <Badge tone="alert">Mismatch</Badge>;
  return <Badge tone="warn">Manual</Badge>;
}
