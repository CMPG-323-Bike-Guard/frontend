import { useMemo, useState } from 'react';
import type { AlarmStatus } from '@/types';
import { useAlarms } from '@/api/queries';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { AlarmCard } from '@/components/domain/AlarmCard';

type Filter = 'all' | 'live' | AlarmStatus;

/**
 * US-08 / UC-05: the investigation view. Read-only, only a guard on duty
 * records what they found at the gate (FR-SEC-05), so no resolution controls
 * are offered here.
 */
export function AlarmHistoryPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const alarms = useAlarms('all');

  const rows = useMemo(() => {
    const data = alarms.data ?? [];
    if (filter === 'all') return data;
    if (filter === 'live') return data.filter((view) => view.alarm.status === 'open' || view.alarm.status === 'escalated');
    return data.filter((view) => view.alarm.status === filter);
  }, [alarms.data, filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alarm history"
        description="Every gate that was held, what the guard found, and who recorded it."
      />

      <Tabs<Filter>
        label="Filter alarms"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All alarms' },
          { value: 'live', label: 'Still open' },
          { value: 'reported_stolen', label: 'Reported stolen' },
          { value: 'cleared_in_person', label: 'Cleared in person' },
        ]}
      />

      {alarms.isLoading && <SkeletonRows rows={3} />}
      {alarms.isError && <Alert tone="alert">{(alarms.error as Error).message}</Alert>}

      {alarms.isSuccess && rows.length === 0 && (
        <Card>
          <EmptyState
            title="No alarms in this list"
            description="Choose another filter to see the rest of the alarm history."
          />
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((view) => (
          <AlarmCard key={view.alarm.alarmId} view={view} compact />
        ))}
      </div>
    </div>
  );
}
