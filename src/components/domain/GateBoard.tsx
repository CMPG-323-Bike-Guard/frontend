import type { Gate } from '@/types';
import { GATE_HEALTH_META } from '@/lib/constants';
import { durationSince } from '@/lib/format';
import { cx } from '@/lib/cx';
import { Badge } from '@/components/ui/Badge';
import { BoomGate } from './BoomGate';

/**
 * The gate board.
 *
 * This is the one dark surface in the product. The guard workstation sits in a
 * gatehouse and this panel is read at a glance from across the room, so it
 * uses the boom bar itself rather than a status chip: bar down means the gate
 * is holding, bar up means the last decision opened it.
 */
export function GateBoard({
  gates,
  lastResultByGate,
  selectedGateId,
}: {
  gates: Gate[];
  lastResultByGate: Record<string, 'match' | 'mismatch' | undefined>;
  selectedGateId: string | null;
}) {
  const commissionedCount = gates.filter((gate) => gate.commissioned).length;
  const awaitingRolloutCount = gates.length - commissionedCount;
  const visibleGates = gates.filter(
    (gate) => selectedGateId === null || selectedGateId === gate.gateId,
  );

  return (
    <div className="surface-dark rounded-card bg-ink-950 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold !text-white">Gate board</h2>
        <p className="text-sm text-white/70">
          {commissionedCount} commissioned {commissionedCount === 1 ? 'gate' : 'gates'} · {awaitingRolloutCount} awaiting rollout
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleGates.map((gate) => {
          if (!gate.commissioned) {
            return (
              <article key={gate.gateId} className="rounded-card border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <h3 className="text-base font-semibold !text-white/80">{gate.name}</h3>
                  <p className="text-sm text-white/60">{gate.location}</p>
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <BoomGate state="held" />
                  <p className="text-right text-sm font-semibold text-white/60">Awaiting rollout</p>
                </div>
              </article>
            );
          }

          const health = GATE_HEALTH_META[gate.health];
          const last = lastResultByGate[gate.gateId];
          const boomState =
            gate.mode === 'manual' ? 'manual' : gate.health === 'error' ? 'offline' : last === 'match' ? 'open' : 'held';

          return (
            <article
              key={gate.gateId}
              className={cx(
                'rounded-card border p-4',
                gate.health === 'error'
                  ? 'border-alert-500/50 bg-alert-500/10'
                  : gate.mode === 'manual'
                    ? 'border-warn-500/40 bg-warn-500/10'
                    : 'border-white/10 bg-white/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold !text-white">{gate.name}</h3>
                  <p className="text-sm text-white/70">{gate.location}</p>
                </div>
                {health.tone === 'warn' ? (
                  <Badge variant="gate-warning">{health.label}</Badge>
                ) : (
                  <span
                    className={cx(
                      'rounded-pill px-2.5 py-0.5 text-xs font-semibold',
                      health.tone === 'ok' && 'bg-emerald-400/20 text-emerald-200',
                      health.tone === 'alert' && 'bg-red-400/20 text-red-200',
                      health.tone === 'neutral' && 'bg-white/10 text-white/70',
                    )}
                  >
                    {health.label}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <BoomGate state={boomState} />
                <p className="text-right text-sm">
                  <span className="block font-semibold text-white">
                    {gate.mode === 'manual' ? 'Manual checks' : 'Automated'}
                  </span>
                  <span className="text-white/70">
                    {gate.mode === 'manual' && gate.manualSince
                      ? `for ${durationSince(gate.manualSince)}`
                      : last === 'mismatch'
                        ? 'last read held the gate'
                        : last === 'match'
                          ? 'last read opened the gate'
                          : 'waiting for the next read'}
                  </span>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
