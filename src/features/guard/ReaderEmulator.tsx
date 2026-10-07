import { useState } from 'react';
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

const PRESETS = [
  { label: 'Thabo + his own bike', student: '30112233', tag: 'TAG-RAW-0001', expect: 'match' },
  { label: "Lerato's card + Thabo's bike", student: '30112244', tag: 'TAG-RAW-0001', expect: 'tag_registered_to_other_user' },
  { label: 'Unknown tag', student: '30112233', tag: 'TAG-NOPE', expect: 'tag_not_registered' },
  { label: 'Card only (no tag)', student: '30112233', tag: '', expect: 'incomplete_read' },
  { label: 'Tag only (no card)', student: '', tag: 'TAG-RAW-0001', expect: 'incomplete_read' },
];

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
  const [studentNumber, setStudentNumber] = useState(PRESETS[0].student);
  const [tag, setTag] = useState(PRESETS[0].tag);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (!devTools.enabled || gates.length === 0) return null;

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
        description="Development only. Pretends to be the gate's card reader and tag reader and sends the raw UIDs through the real verification engine."
      />
      <CardBody className="flex flex-col gap-4">
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

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="subtle"
              onClick={() => {
                setStudentNumber(preset.student);
                setTag(preset.tag);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student number read from the card (blank = no card read)">
            {({ id }) => (
              <Input id={id} inputMode="numeric" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} />
            )}
          </Field>
          <Field label="Tag UID (blank = no tag read)">
            {({ id }) => <Input id={id} value={tag} onChange={(event) => setTag(event.target.value)} />}
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