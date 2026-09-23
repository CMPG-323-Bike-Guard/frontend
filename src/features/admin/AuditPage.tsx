import { useAudit } from '@/api/queries';
import { formatDateTime } from '@/lib/format';
import { Alert } from '@/components/ui/Alert';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { TableWrap, Td, Th } from '@/components/ui/Table';

/**
 * NFR-AUD-01: every automated and manual decision is traceable to a user, a
 * timestamp and the record it changed. Gate decisions themselves live in the
 * crossing log; this is the administrative half of the same trail.
 */
export function AuditPage() {
  const audit = useAudit();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit trail"
        description="Registrations and tag changes, with the person who made each one."
      />

      <Card>
        <CardHeader title="Administrative actions" description="Newest first." />
        <CardBody className={audit.data?.length ? undefined : 'py-0'}>
          {audit.isLoading && <SkeletonRows rows={6} className="py-4" />}
          {audit.isError && <Alert tone="alert">{(audit.error as Error).message}</Alert>}
          {audit.isSuccess &&
            (audit.data.length === 0 ? (
              <EmptyState title="No actions recorded yet" description="Administrative changes will be listed here." />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Who</Th>
                    <Th>Action</Th>
                    <Th>Record</Th>
                    <Th>Detail</Th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data.map((entry) => (
                    <tr key={entry.auditId} className="hover:bg-ink-50/60">
                      <Td className="whitespace-nowrap text-ink-700">{formatDateTime(entry.timestamp)}</Td>
                      <Td className="font-medium text-ink-900">{entry.actorName}</Td>
                      <Td className="text-ink-700">{entry.action.replace(/[._]/g, ' ')}</Td>
                      <Td className="text-ink-500">
                        {entry.entityType.replace(/_/g, ' ')} {entry.entityId}
                      </Td>
                      <Td className="text-ink-600">{entry.detail}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ))}
        </CardBody>
      </Card>
    </div>
  );
}
