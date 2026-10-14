import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useGates } from '@/api/queries';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { TableWrap, Td, Th } from '@/components/ui/Table';
import { GateHealthBadge } from '@/components/domain/StatusBadges';
import { ReaderEmulator } from '@/features/guard/ReaderEmulator';
import { AddGateModal } from './AddGateModal';

/** Admin view of every gate, with a way to add new ones and try them out. */
export function GatesPage() {
  const gates = useGates();
  const [adding, setAdding] = useState(false);
  const rows = gates.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gates"
        description="Every gate BikeGuard knows about. Add a gate, then test it with the reader emulator below."
        actions={
          <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setAdding(true)}>
            Add a gate
          </Button>
        }
      />

      {gates.isError && <Alert tone="alert">{(gates.error as Error).message}</Alert>}

      <Card>
        <CardBody className={rows.length ? undefined : 'py-0'}>
          {gates.isLoading && <SkeletonRows rows={3} className="py-4" />}
          {gates.isSuccess && rows.length === 0 && (
            <EmptyState title="No gates yet" description="Add the first gate to start verifying bikes." />
          )}
          {gates.isSuccess && rows.length > 0 && (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Gate</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                  <Th>Mode</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((gate) => (
                  <tr key={gate.gateId}>
                    <Td className="font-medium text-ink-900">{gate.name}</Td>
                    <Td>{gate.location || 'Not set'}</Td>
                    <Td>
                      <GateHealthBadge health={gate.health} />
                    </Td>
                    <Td>{gate.mode === 'automated' ? 'Automated' : 'Manual checks'}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      <ReaderEmulator gates={rows} />

      <AddGateModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}