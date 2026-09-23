import type { Gate } from '@/types';
import { GATE_HEALTH_META } from '@/lib/constants';
import { durationSince } from '@/lib/format';
import { cx } from '@/lib/cx';
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
  selectedGateIds,
}: {
  gates: Gate[];
  lastResultByGate: Record<string, 'match' | 'mismatch' | undefined>;
  selectedGateIds: string[];
}) {
  const visibleGates = gates.filter(
    (gate) => gate.commissioned && (selectedGateIds.length === 0 || selectedGateIds.includes(gate.gateId)),
  );

  return (
    <div className="surface-dark rounded-card bg-ink-950 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Gate board</h2>
        <p className="text-sm text-ink-400">
          {visibleGates.length} commissioned {visibleGates.length === 1 ? 'gate' : 'gates'} ·{' '}
          {gates.length - gates.filter((gate) => gate.commissioned).length} awaiting rollout
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleGates.map((gate) => {
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
                  <h3 className="text-base font-semibold text-white">{gate.name}</h3>
                  <p className="text-sm text-ink-400">{gate.location}</p>
                </div>
                <span
                  className={cx(
                    'rounded-pill px-2.5 py-0.5 text-xs font-semibold',
                    health.tone === 'ok' && 'bg-ok-500/20 text-ok-100',
                    health.tone === 'warn' && 'bg-warn-500/25 text-warn-100',
                    health.tone === 'alert' && 'bg-alert-500/25 text-alert-100',
                    health.tone === 'neutral' && 'bg-white/10 text-ink-200',
                  )}
                >
                  {health.label}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <BoomGate state={boomState} />
                <p className="text-right text-sm">
                  <span className="block font-semibold text-white">
                    {gate.mode === 'manual' ? 'Manual checks' : 'Automated'}
                  </span>
                  <span className="text-ink-400">
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
