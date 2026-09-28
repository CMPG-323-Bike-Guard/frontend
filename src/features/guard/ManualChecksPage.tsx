import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardList } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useCrossings, useGates, useManualCrossing, useSetGateMode } from '@/api/queries';
import { ApiError } from '@/api/client';
import { GATE_HEALTH_META } from '@/lib/constants';
import { durationSince, formatTime } from '@/lib/format';
import { hasErrors, requireText, validateStudentNumber, type FieldErrors } from '@/lib/validation';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

type FormField = 'gateId' | 'studentNumber' | 'bikeDescription';

/**
 * UC-06, Fail-Safe Manual Override, and FR-VER-06.
 *
 * When a reader or the verification service is unreachable the gate reverts to
 * the pre-BikeGuard process: the guard checks the card and the bike by eye and
 * records the crossing here, so the digital record stays complete instead of
 * access being blocked outright.
 */
export function ManualChecksPage() {
  const user = useCurrentUser();
  const toast = useToast();

  const gates = useGates();
  const setGateMode = useSetGateMode();
  const manualCrossing = useManualCrossing();
  const manualLog = useCrossings({ result: 'manual', limit: 25 });

  const [gateId, setGateId] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [bikeDescription, setBikeDescription] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors<FormField>>({});

  const manualGates = useMemo(() => (gates.data ?? []).filter((gate) => gate.mode === 'manual'), [gates.data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const chosenGate = gateId || manualGates[0]?.gateId || '';
    const next: FieldErrors<FormField> = {
      gateId: chosenGate ? undefined : 'Choose the gate you are standing at.',
      studentNumber: validateStudentNumber(studentNumber),
      bikeDescription: requireText(bikeDescription, 'A description of the bike', 3, 120),
    };
    setErrors(next);
    if (hasErrors(next)) return;

    try {
      await manualCrossing.mutateAsync({
        input: { gateId: chosenGate, studentNumber, bikeDescription, note },
        guardUserId: user.userId,
      });
      toast.confirm('Crossing logged. It is marked as recorded offline.');
      setStudentNumber('');
      setBikeDescription('');
      setNote('');
    } catch (error) {
      toast.problem(error instanceof ApiError ? error.message : 'The crossing could not be logged.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manual checks"
        description="Use this when a gate is offline. Everything you record here joins the same crossing log."
      />

      <Card>
        <CardHeader title="Gate status" description="Switch a gate back to automated once the reader is answering again." />
        <CardBody className="py-0">
          {gates.isLoading ? (
            <SkeletonRows rows={2} className="py-4" />
          ) : (
            <ul className="divide-y divide-ink-50">
              {(gates.data ?? []).map((gate) => (
                <li key={gate.gateId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink-900">{gate.name}</p>
                    <p className="text-sm text-ink-500">
                      {gate.mode === 'manual'
                        ? `On manual checks for ${gate.manualSince ? durationSince(gate.manualSince) : 'a moment'}`
                        : 'Verifying automatically'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      tone={GATE_HEALTH_META[gate.health].tone}
                      variant={
                        gate.health === 'good'
                          ? 'tag-active'
                          : gate.health === 'warning'
                            ? 'gate-warning'
                            : 'default'
                      }
                    >
                      {GATE_HEALTH_META[gate.health].label}
                    </Badge>
                    <Button
                      variant={gate.mode === 'manual' ? 'primary' : 'warningOutline'}
                      size="sm"
                      className="cursor-pointer"
                      loading={setGateMode.isPending}
                      onClick={() =>
                        setGateMode.mutate({
                          gateId: gate.gateId,
                          mode: gate.mode === 'manual' ? 'automated' : 'manual',
                          actorUserId: user.userId,
                        })
                      }
                    >
                      {gate.mode === 'manual' ? 'Return to automated' : 'Switch to manual'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {manualGates.length === 0 && (
        <Alert tone="info" title="Every gate is verifying automatically">
          You can still log a crossing by hand if you need to — choose the gate below.
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Log a crossing by hand"
            description="Check the card against the person and the bike against the rider before recording it."
          />
          <CardBody>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <Field label="Gate" error={errors.gateId} required>
                {({ id, describedBy, invalid }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={gateId || manualGates[0]?.gateId || ''}
                    onChange={(event) => setGateId(event.target.value)}
                  >
                    <option value="">Choose a gate</option>
                    {(gates.data ?? []).map((gate) => (
                      <option key={gate.gateId} value={gate.gateId}>
                        {gate.name}
                        {gate.mode === 'manual' ? ' (manual)' : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Student or staff number on the card" error={errors.studentNumber} required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    inputMode="numeric"
                    maxLength={8}
                    value={studentNumber}
                    onChange={(event) => setStudentNumber(event.target.value.replace(/\D/g, ''))}
                  />
                )}
              </Field>

              <Field
                label="Bike description"
                error={errors.bikeDescription}
                hint="Make and colour, as you would have written in the logbook."
                required
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    maxLength={120}
                    placeholder="Silver Giant mountain bike"
                    value={bikeDescription}
                    onChange={(event) => setBikeDescription(event.target.value)}
                  />
                )}
              </Field>

              <Field label="Anything else worth recording" hint="Optional.">
                {({ id }) => (
                  <Textarea
                    id={id}
                    maxLength={300}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Student showed their registration on the portal."
                  />
                )}
              </Field>

              <Button type="submit" size="lg" loading={manualCrossing.isPending}>
                Log this crossing
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Logged by hand" description="Marked as recorded offline so reports can tell them apart." />
          <CardBody className="py-0">
            {manualLog.isLoading && <SkeletonRows rows={4} className="py-4" />}
            {manualLog.isSuccess && manualLog.data.length === 0 && (
              <EmptyState
                icon={<ClipboardList className="h-10 w-10" />}
                title="Nothing logged by hand yet"
                description="Crossings you record during an outage appear here."
              />
            )}
            {manualLog.isSuccess && manualLog.data.length > 0 && (
              <ul className="divide-y divide-ink-50">
                {manualLog.data.map((row) => (
                  <li key={row.event.eventId} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900">
                        {row.userName ?? row.studentStaffNumber ?? 'Unidentified'} · {row.gateName}
                      </p>
                      <p className="text-sm text-ink-500">{formatTime(row.event.timestamp)}</p>
                    </div>
                    {row.event.note && <p className="mt-0.5 text-sm text-ink-600">{row.event.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
