import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCrossings, useGates, useReports, useStats } from '@/api/queries';
import type { CrossingView, Gate } from '@/types';
import { formatNumber, formatPercent } from '@/lib/format';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { StatTile } from '@/components/ui/StatTile';
import { cx } from '@/lib/cx';

const REPORT_PERIODS = [7, 14, 30] as const;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface GateCount {
  gateId: string;
  gateName: string;
  count: number;
  commissioned: boolean;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateLabel(date: Date) {
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

function countByGate(gates: Gate[], crossings: CrossingView[]): GateCount[] {
  return gates.map((gate) => ({
    gateId: gate.gateId,
    gateName: gate.name,
    count: gate.commissioned ? crossings.filter((crossing) => crossing.event.gateId === gate.gateId).length : 0,
    commissioned: gate.commissioned,
  }));
}

function GateCountChart({ data, caption }: { data: GateCount[]; caption: string }) {
  return (
    <>
      <div className="h-72 min-w-0" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--color-ink-100)" vertical={false} />
            <XAxis dataKey="gateName" tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} domain={[0, 'dataMax + 1']} tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--color-ink-50)' }} contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-100)' }} />
            <Bar dataKey="count" name="Crossings" radius={[4, 4, 0, 0]}>
              {data.map((gate) => (
                <Cell
                  key={gate.gateId}
                  fill={gate.commissioned ? 'var(--color-brand-purple)' : 'var(--color-ink-100)'}
                />
              ))}
              <LabelList dataKey="count" position="top" fill="var(--color-ink-900)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Gate</th>
            <th scope="col">Crossings</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((gate) => (
            <tr key={gate.gateId}>
              <th scope="row">{gate.gateName}</th>
              <td>{gate.count}</td>
              <td>{gate.commissioned ? 'Commissioned' : 'Awaiting rollout'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function ReportsPage() {
  const [period, setPeriod] = useState<(typeof REPORT_PERIODS)[number]>(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const stats = useStats();
  const gates = useGates();
  const crossings = useCrossings({ limit: 1000 });
  const reports = useReports(period);

  const today = new Date();
  const todayKey = localDateKey(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const crossingsToday = (crossings.data ?? []).filter(
    (crossing) => localDateKey(new Date(crossing.event.timestamp)) === todayKey,
  );
  const todayByGate = countByGate(gates.data ?? [], crossingsToday);
  const selectedCrossings = selectedDate
    ? (crossings.data ?? []).filter((crossing) => localDateKey(new Date(crossing.event.timestamp)) === selectedDate)
    : [];
  const selectedByGate = countByGate(gates.data ?? [], selectedCrossings);
  const historyData = Array.from({ length: period }, (_, index) => {
    const date = new Date(year, month, today.getDate() - (period - index - 1));
    const label = localDateLabel(date);
    const points = (reports.data?.throughputByDay ?? []).filter((point) => point.label === label);
    return {
      label,
      count: points.reduce((total, point) => total + point.matches + point.mismatches + point.manual, 0),
    };
  });
  const reportError = stats.error ?? gates.error ?? crossings.error ?? reports.error;
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(Number(selectedDate.slice(0, 4)), Number(selectedDate.slice(5, 7)) - 1, Number(selectedDate.slice(8, 10))),
      )
    : '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pilot Reports" description="System performance and usage insights." />

      {reportError && <Alert tone="alert">{reportError.message}</Alert>}

      {stats.isLoading ? (
        <SkeletonRows rows={1} />
      ) : stats.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Crossings today" value={formatNumber(stats.data.crossingsToday)} />
          <StatTile label="Gates on manual" value={formatNumber(stats.data.manualGates)} />
          <StatTile label="Read success" value={formatPercent(stats.data.readSuccessRate, 2)} />
        </div>
      ) : null}

      <Card>
        <CardHeader title="Today's bike crossings by gate" />
        <CardBody>
          {gates.isLoading || crossings.isLoading ? (
            <SkeletonRows rows={3} />
          ) : todayByGate.length ? (
            <>
              <GateCountChart data={todayByGate} caption="Today's bike crossings by gate" />
              {crossingsToday.length === 0 && <p className="text-sm text-ink-500">No crossings recorded today.</p>}
            </>
          ) : (
            <EmptyState title="No gates available" description="Gate activity will appear when gates are configured." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Crossing history" />
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Crossing history period">
            {REPORT_PERIODS.map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant={period === days ? 'dark' : 'subtle'}
                aria-pressed={period === days}
                className={period === days ? 'cursor-pointer border border-ink-900' : undefined}
                onClick={() => setPeriod(days)}
              >
                Last {days} Days
              </Button>
            ))}
          </div>
          {reports.isLoading ? (
            <SkeletonRows rows={3} />
          ) : reports.data ? (
            <>
              <div className="h-72 min-w-0" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData} margin={{ top: 24, right: 12, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="var(--color-ink-100)" vertical={false} />
                    <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={12} tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} domain={[0, 'dataMax + 1']} tick={{ fill: 'var(--color-ink-500)', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--color-ink-50)' }} contentStyle={{ borderRadius: 8, borderColor: 'var(--color-ink-100)' }} />
                    <Bar dataKey="count" name="Crossings" fill="var(--color-brand-purple)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" fill="var(--color-ink-900)" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>Crossings by day over the last {period} days</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Crossings</th></tr></thead>
                <tbody>
                  {historyData.map((day, index) => (
                    <tr key={`${day.label}-${index}`}><th scope="row">{day.label}</th><td>{day.count}</td></tr>
                  ))}
                </tbody>
              </table>
              {reports.data.throughputByDay.length === 0 && (
                <p className="text-sm text-ink-500">No crossings recorded in this period.</p>
              )}
            </>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Selected date gate activity" description="Choose a date in the current month to see crossings by gate." />
        <CardBody>
          <p className="mb-3 text-sm font-medium text-ink-700">
            {new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(today)}
          </p>
          <div className="-mx-5 grid grid-cols-7 gap-0.5 px-0.5 sm:gap-1.5">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 text-center text-xs font-semibold text-ink-500">{weekday}</span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`empty-${index}`} aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const date = new Date(year, month, day);
              const dateKey = localDateKey(date);
              const isFuture = dateKey > todayKey;
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={isFuture}
                  aria-label={new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(dateKey)}
                  className={cx(
                    'flex h-12 min-w-0 items-center justify-center rounded-control border text-sm font-medium transition-colors',
                    isFuture
                      ? 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 opacity-50'
                      : isSelected
                        ? 'cursor-pointer border-brand-purple bg-brand-purple text-white'
                        : isToday
                          ? 'cursor-pointer border-signal-600 bg-white text-signal-600 hover:bg-card-header'
                          : 'cursor-pointer border-ink-200 bg-white text-ink-800 hover:border-brand-purple hover:bg-card-header',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-5 border-t border-ink-100 pt-4">
              <h3 className="mb-3 text-base font-semibold text-ink-900">{selectedDateLabel}</h3>
              {gates.isLoading || crossings.isLoading ? (
                <SkeletonRows rows={3} />
              ) : selectedByGate.length ? (
                <>
                  <GateCountChart data={selectedByGate} caption={`Gate activity on ${selectedDateLabel}`} />
                  {selectedCrossings.length === 0 && <p className="text-sm text-ink-500">No crossings recorded on this date.</p>}
                </>
              ) : (
                <EmptyState title="No gates available" description="Gate activity will appear when gates are configured." />
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}