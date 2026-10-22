import { useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import type { Gate } from '@/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { api, ApiError, devTools } from '@/api/client';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useSimulatorStatus } from '@/api/queries';
import { useRealtime } from '@/api/useRealtime';

interface Outcome {
  result: string;
  reason: string | null;
  open: boolean;
  alarm: boolean;
  ms: number | null;
}

export function ReaderEmulator({ gates }: { gates: Gate[] }) {
  const user = useCurrentUser();
  const toast = useToast();
  const [gateId, setGateId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const simulator = useSimulatorStatus();

  const tagInput = useRef<HTMLInputElement>(null);
  useRealtime((event) => {
    if (event.type !== 'card-tap') return;
    if (event.gateId) setGateId(event.gateId);
    setOutcome(null);
    if (!event.studentNumber) {
      setStudentNumber('');
      toast.problem(`Card ${event.cardRef} is not linked to a student yet.`);
      return;
    }
    setStudentNumber(event.studentNumber);
    setTag('');
    setTimeout(() => tagInput.current?.focus(), 0);
  });

  if (!simulator.data?.enabled || gates.length === 0) return null;

  const activeId = gateId || gates[0].gateId;
  const activeGate = gates.find((gate) => gate.gateId === activeId) ?? gates[0];

  async function tap() {
    setBusy(true);
    try {
      const res = await devTools.scan(activeId, studentNumber.trim() || null, tag.trim() || null);
      setOutcome({
        result: res.crossing.event.result,
        reason: res.crossing.event.mismatchReason,
        open: res.gateShouldOpen,
        alarm: res.alarmRaised,
        ms: res.crossing.event.verificationMs,
      });
    } catch (error) {
      setOutcome(null);
      toast.problem(error instanceof ApiError || error instanceof Error ? error.message : 'The scan failed.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleMode() {
    setBusy(true);
    try {
      await api.setGateMode(activeId, activeGate.mode === 'automated' ? 'manual' : 'automated', user.userId);
    } catch (error) {
      toast.problem(error instanceof Error ? error.message : 'Could not change the gate mode.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-ink-400" aria-hidden="true" />
            Reader emulator
          </span>
        }
        description="Testing only. Pretends to be the gate's card reader and tag reader and sends the raw UIDs through the real verification engine. Tap a linked card to fill in the student number, then type the tag UID you registered. These crossings are marked as simulated in the crossing log."
      />
      <CardBody className="flex flex-col gap-4">
        {gates.length > 1 && (
          <Field label="Gate">
            {({ id }) => (
              <Select id={id} value={activeId} onChange={(event) => setGateId(event.target.value)}>
                {gates.map((gate) => (
                  <option key={gate.gateId} value={gate.gateId}>
                    {gate.name} ({gate.mode})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student number read from the card (blank = no card read)">
            {({ id }) => (
              <Input id={id} inputMode="numeric" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} />
            )}
          </Field>
          <Field label="Tag UID (blank = no tag read)">
            {({ id }) => (
              <Input
                ref={tagInput}
                id={id}
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void tap();
                }}
              />
            )}
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={tap}>
            Tap card and tag
          </Button>
          <Button variant="subtle" disabled={busy} onClick={toggleMode}>
            {activeGate.mode === 'automated' ? 'Switch gate to manual' : 'Switch gate back to automated'}
          </Button>
        </div>

        {outcome && (
          <Alert
            tone={outcome.result === 'match' ? 'ok' : 'alert'}
            title={outcome.result === 'match' ? 'Match: boom gate opens' : `Mismatch: ${outcome.reason}`}
          >
            Gate {outcome.open ? 'opens' : 'stays shut'}
            {outcome.alarm ? ', alarm raised' : ''}
            {outcome.ms !== null ? `, verified in ${outcome.ms} ms` : ''}.
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}