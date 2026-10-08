import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { Gate } from '@/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { ApiError, demo } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const SCENARIOS = [
  { value: 'match', label: 'Registered pair ,  gate opens' },
  { value: 'tag_registered_to_other_user', label: 'Bike belongs to someone else' },
  { value: 'tag_not_registered', label: 'Tag has never been registered' },
  { value: 'tag_reported_lost', label: 'Tag reported lost or stolen' },
  { value: 'incomplete_read', label: 'Card read, no tag detected' },
] as const;

type Scenario = (typeof SCENARIOS)[number]['value'];

/**
 * Demonstration harness ,  not part of the product.
 *
 * There is no reader hardware and no verification engine behind this build, so
 * this panel generates the gate events that the engine would produce. It is
 * only rendered when the app is running against the mock service, and it has
 * no counterpart in the REST surface.
 */
export function GateSimulator({ gates }: { gates: Gate[] }) {
  const user = useCurrentUser();
  const toast = useToast();
  const [gateId, setGateId] = useState(gates[0]?.gateId ?? '');
  const [scenario, setScenario] = useState<Scenario>('match');
  const [busy, setBusy] = useState(false);

  if (!demo.enabled || gates.length === 0) return null;

  const activeGate = gates.find((gate) => gate.gateId === (gateId || gates[0].gateId));

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      toast.confirm(message);
    } catch (error) {
      toast.problem(error instanceof ApiError || error instanceof Error ? error.message : 'The simulation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-ink-400" aria-hidden="true" />
            Gate simulator
          </span>
        }
        description="Demonstration only. No reader hardware is connected, so this stands in for the verification engine and produces the same events a real read would."
      />
      <CardBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gate">
            {({ id }) => (
              <Select id={id} value={gateId || gates[0].gateId} onChange={(event) => setGateId(event.target.value)}>
                {gates.map((gate) => (
                  <option key={gate.gateId} value={gate.gateId}>
                    {gate.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="What happens at the gate">
            {({ id }) => (
              <Select id={id} value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
                {SCENARIOS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            loading={busy}
            onClick={() => run(() => demo.simulateCrossing(gateId || gates[0].gateId, scenario), 'Crossing generated.')}
          >
            Send a crossing
          </Button>
          {activeGate?.mode === 'automated' ? (
            <Button
              variant="subtle"
              disabled={busy}
              onClick={() =>
                run(
                  () => demo.simulateOutage(gateId || gates[0].gateId, user.userId),
                  'Reader marked offline. The gate fell back to manual checks.',
                )
              }
            >
              Simulate a reader outage
            </Button>
          ) : (
            <Button variant="subtle" disabled>
              Gate is already on manual checks
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
