import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { CrossingResult } from '@/types';
import { useCrossings, useGates } from '@/api/queries';
import type { CrossingFilters } from '@/api/client';
import { downloadCsv, formatDateTime, toCsv } from '@/lib/format';
import { MISMATCH_REASON_META } from '@/lib/constants';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { CrossingTable } from '@/components/domain/CrossingTable';

function localDateValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * FR-ADM-05: search the crossing log by student, bike, time range and gate.
 *
 * This is the screen that replaces paging through a paper logbook during an
 * investigation, so the filters mirror the questions actually asked: who, what
 * bike, which gate, when.
 */
export function CrossingLogPage({
  canExport = false,
  preventFutureDates = true,
}: {
  canExport?: boolean;
  preventFutureDates?: boolean;
}) {
  const gates = useGates();

  const [query, setQuery] = useState('');
  const [gateId, setGateId] = useState('');
  const [result, setResult] = useState<CrossingResult | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [, setDateRefresh] = useState(0);
  const today = localDateValue();

  function refreshDateLimit() {
    if (preventFutureDates) setDateRefresh((current) => current + 1);
  }

  const fromError = preventFutureDates
    ? from > today
      ? 'Choose today or an earlier date.'
      : from && to && from > to
        ? 'The start date must be before the end date.'
        : undefined
    : undefined;
  const toError = preventFutureDates && to > today ? 'Choose today or an earlier date.' : undefined;
  const validFrom = from && !fromError ? from : undefined;
  const validTo = to && !toError ? to : undefined;
  const fromMax = preventFutureDates ? (to && to < today ? to : today) : to || undefined;
  const toMin = preventFutureDates ? (from && from <= today ? from : undefined) : from || undefined;

  const filters = useMemo<CrossingFilters>(
    () => ({
      query: query.trim() || undefined,
      gateId: gateId || undefined,
      result: result === 'all' ? undefined : result,
      from: validFrom,
      to: validTo,
      limit: 200,
    }),
    [query, gateId, result, validFrom, validTo],
  );

  const crossings = useCrossings(filters);
  const filtered = query || gateId || result !== 'all' || from || to;

  function exportCsv() {
    const rows = (crossings.data ?? []).map((row) => ({
      timestamp: formatDateTime(row.event.timestamp),
      gate: row.gateName,
      person: row.userName ?? 'Unidentified person',
      student_staff_number: row.studentStaffNumber ?? '',
      bike: row.bikeName?.trim() || '',
      student_number: row.event.studentNumber ?? '',
      tag_ref: row.event.tagRef ?? '',
      result: row.event.result,
      reason: row.event.mismatchReason ? MISMATCH_REASON_META[row.event.mismatchReason].label : '',
      verification_ms: row.event.verificationMs ?? '',
      recorded_offline: row.event.offline ? 'yes' : 'no',
    }));
    downloadCsv(`bikeguard-crossings-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  }

  function clearFilters() {
    setQuery('');
    setGateId('');
    setResult('all');
    setFrom('');
    setTo('');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Crossing log"
        description="Every read at every gate, with the result the system recorded at the time."
        actions={
          canExport ? (
            <Button
              variant="subtle"
              icon={<Download className="h-4 w-4" />}
              onClick={exportCsv}
              disabled={!crossings.data?.length}
            >
              Export as CSV
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Field label="Search" className="min-w-0">
          {({ id }) => (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <Input
                id={id}
                className="pl-9"
                placeholder="Name, number, bike or tag"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          )}
        </Field>

        <Field label="Gate" className="min-w-0">
          {({ id }) => (
            <Select id={id} value={gateId} onChange={(event) => setGateId(event.target.value)}>
              <option value="">All gates</option>
              {(gates.data ?? [])
                .filter((gate) => gate.commissioned)
                .map((gate) => (
                  <option key={gate.gateId} value={gate.gateId}>
                    {gate.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>

        <Field label="From" error={fromError} className="min-w-0">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={from}
              aria-describedby={describedBy}
              invalid={invalid}
              max={fromMax}
              onFocus={refreshDateLimit}
              onPointerDown={refreshDateLimit}
              onKeyDown={refreshDateLimit}
              onChange={(event) => setFrom(event.target.value)}
            />
          )}
        </Field>

        <Field label="To" error={toError} className="min-w-0">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={to}
              aria-describedby={describedBy}
              invalid={invalid}
              min={toMin}
              max={preventFutureDates ? today : undefined}
              onFocus={refreshDateLimit}
              onPointerDown={refreshDateLimit}
              onKeyDown={refreshDateLimit}
              onChange={(event) => setTo(event.target.value)}
            />
          )}
        </Field>

        <Field label="Result" className="min-w-0">
          {({ id }) => (
            <Select id={id} value={result} onChange={(event) => setResult(event.target.value as CrossingResult | 'all')}>
              <option value="all">All results</option>
              <option value="match">Matches</option>
              <option value="mismatch">Mismatches</option>
              <option value="manual">Logged by hand</option>
            </Select>
          )}
        </Field>
      </div>

      <Card>
        <CardHeader
          title={crossings.data ? `${crossings.data.length} crossings` : 'Crossings'}
          description={crossings.data?.length === 200 ? 'Showing the 200 most recent matches. Narrow the dates to see more.' : undefined}
          action={filtered ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined}
        />
        <CardBody className={crossings.data?.length ? undefined : 'py-0'}>
          {crossings.isLoading && <SkeletonRows rows={6} className="py-4" />}
          {crossings.isError && <Alert tone="alert">{(crossings.error as Error).message}</Alert>}
          {crossings.isSuccess &&
            (crossings.data.length === 0 ? (
              <EmptyState
                title="No crossings match these filters"
                description="Widen the dates or clear the search to see the full log."
                action={
                  filtered ? (
                    <Button variant="subtle" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <CrossingTable rows={crossings.data} />
            ))}
        </CardBody>
      </Card>
    </div>
  );
}