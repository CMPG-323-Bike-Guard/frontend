import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useReports } from '@/api/queries';
import { MISMATCH_REASON_META, READ_SUCCESS_TARGET, VERIFICATION_BUDGET_MS } from '@/lib/constants';
import { downloadCsv, formatDate, formatNumber, formatPercent, toCsv } from '@/lib/format';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';
import { TableWrap, Td, Th } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';

const CHART_COLOURS = { matches: '#127A4B', mismatches: '#B3261E', manual: '#B26A00', registered: '#1F5EFF' };

/**
 * US-07 and FR-ADM-06: throughput, alarm frequency and repeat-mismatch
 * patterns, which are the figures the Business Case says the pilot has to
 * produce before a wider rollout can be argued for.
 */
export function ReportsPage() {
  const [days, setDays] = useState<'7' | '14' | '30'>('14');
  const reports = useReports(Number(days));

  function exportSummary() {
    if (!reports.data) return;
    const rows = reports.data.throughputByDay.map((point) => ({
      day: point.label,
      matches: point.matches,
      mismatches: point.mismatches,
      logged_by_hand: point.manual,
    }));
    downloadCsv(`bikeguard-throughput-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pilot reports"
        description="What the pilot gate has actually done, as evidence for the rollout decision."
        actions={
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={exportSummary}
            disabled={!reports.data}
          >
            Export throughput
          </Button>
        }
      />

      <Tabs<'7' | '14' | '30'>
        label="Reporting period"
        value={days}
        onChange={setDays}
        options={[
          { value: '7', label: 'Last 7 days' },
          { value: '14', label: 'Last 14 days' },
          { value: '30', label: 'Last 30 days' },
        ]}
      />

      {reports.isLoading && <SkeletonRows rows={4} />}
      {reports.isError && <Alert tone="alert">{(reports.error as Error).message}</Alert>}

      {reports.isSuccess && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Crossings today"
              value={formatNumber(reports.data.stats.crossingsToday)}
              detail={`${formatNumber(reports.data.stats.matchesToday)} opened the gate`}
            />
            <StatTile
              label="Gates held today"
              value={formatNumber(reports.data.stats.mismatchesToday)}
              tone={reports.data.stats.mismatchesToday > 0 ? 'warn' : 'ok'}
              detail={`${reports.data.stats.openAlarms} alarms still open`}
            />
            <StatTile
              label="Verification time"
              value={`${reports.data.stats.p95VerificationMs} ms`}
              tone={reports.data.stats.p95VerificationMs > VERIFICATION_BUDGET_MS ? 'alert' : 'ok'}
              detail={`95th percentile against a ${VERIFICATION_BUDGET_MS} ms budget`}
            />
            <StatTile
              label="Read success"
              value={formatPercent(reports.data.stats.readSuccessRate, 2)}
              tone={reports.data.stats.readSuccessRate < READ_SUCCESS_TARGET ? 'warn' : 'ok'}
              detail={`Target ${READ_SUCCESS_TARGET}%`}
            />
          </div>

          <Card>
            <CardHeader
              title="Crossings per day"
              description="Matches, gates held and crossings logged by hand while a gate was offline."
            />
            <CardBody>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.data.throughputByDay} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EE" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5A6A93' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#5A6A93' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#EFF2F8' }} contentStyle={{ borderRadius: 10, borderColor: '#DDE2EE', fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey="matches" name="Matched" stackId="a" fill={CHART_COLOURS.matches} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="mismatches" name="Gate held" stackId="a" fill={CHART_COLOURS.mismatches} />
                    <Bar dataKey="manual" name="Logged by hand" stackId="a" fill={CHART_COLOURS.manual} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="When the gate is busiest" description="Crossings by hour of day across the period." />
              <CardBody>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.data.throughputByHour} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EE" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5A6A93' }} tickLine={false} axisLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 12, fill: '#5A6A93' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#EFF2F8' }} contentStyle={{ borderRadius: 10, borderColor: '#DDE2EE', fontSize: 13 }} />
                      <Bar dataKey="matches" name="Matched" fill={CHART_COLOURS.matches} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Registration uptake" description="Bikes protected by the system over the period." />
              <CardBody>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reports.data.registrationUptake} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DDE2EE" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5A6A93' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#5A6A93' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#DDE2EE', fontSize: 13 }} />
                      <Line
                        type="monotone"
                        dataKey="registered"
                        name="Bikes protected"
                        stroke={CHART_COLOURS.registered}
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Repeat mismatches"
              description="People whose card and bike have failed to pair more than once. Worth a conversation before it becomes an incident."
            />
            <CardBody className={reports.data.repeatMismatches.length ? undefined : 'py-0'}>
              {reports.data.repeatMismatches.length === 0 ? (
                <EmptyState
                  title="No repeat patterns"
                  description="Nobody has triggered more than one mismatch in this period."
                />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Person</Th>
                      <Th>Number</Th>
                      <Th align="right">Mismatches</Th>
                      <Th>Reasons</Th>
                      <Th>Last seen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.data.repeatMismatches.map((row) => (
                      <tr key={row.userId ?? row.name} className="hover:bg-ink-50/60">
                        <Td className="font-medium text-ink-900">{row.name}</Td>
                        <Td className="text-ink-600">{row.studentStaffNumber}</Td>
                        <Td align="right" className="font-semibold text-alert-600">
                          {row.count}
                        </Td>
                        <Td className="text-ink-600">
                          {row.reasons.map((reason) => MISMATCH_REASON_META[reason].label).join(', ')}
                        </Td>
                        <Td className="whitespace-nowrap text-ink-600">{formatDate(row.lastSeen)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </CardBody>
          </Card>

          <Alert tone="info" title="Return on investment is not calculated here">
            The Feasibility Study defers break-even and ROI until NWU-specific theft and workload figures exist.
            BikeGuard's job is to produce the crossing and alarm data those calculations will use, which is what these
            reports and the CSV export contain.
          </Alert>
        </>
      )}
    </div>
  );
}
