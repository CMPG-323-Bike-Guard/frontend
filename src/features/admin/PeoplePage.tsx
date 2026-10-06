import { useMemo, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import type { Role } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { keys, useRegistrations } from '@/api/queries';
import { ROLE_LABEL } from '@/lib/constants';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { TableWrap, Td, Th } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { EnrolCardModal } from './EnrolCardModal';


/**
 * BikeGuard does not issue physical cards or create accounts. An administrator
 * can enrol an existing card's UID against a person so the gate recognises
 * it, and otherwise uses this screen to find the right person during an
 * investigation or at the service point.
 */
export function PeoplePage() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const [query, setQuery] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const users = useQuery({ queryKey: keys.users('all'), queryFn: () => api.listUsers() });
  const registrations = useRegistrations();

  const bikeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (registrations.data ?? [])
      .filter((view) => view.bike.status === 'active')
      .forEach((view) => counts.set(view.owner.userId, (counts.get(view.owner.userId) ?? 0) + 1));
    return counts;
  }, [registrations.data]);

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (users.data ?? [])
      .filter((user) => (role === 'all' ? true : user.role === role))
      .filter((user) =>
        search ? `${user.name} ${user.studentStaffNumber} ${user.email}`.toLowerCase().includes(search) : true,
      );
  }, [users.data, role, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="People"
        description="Everyone with a BikeGuard account. Cards are issued by the NWU card system; enrol a card's UID here so gates can recognise it."
        actions={
          <Button icon={<CreditCard className="h-4 w-4" aria-hidden="true" />} onClick={() => setEnrolling(true)}>
            Enrol a card
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-4">
          <Field label="Search people">
            {({ id }) => (
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <Input
                  id={id}
                  className="pl-9"
                  placeholder="Name, number or email"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            )}
          </Field>
          <Tabs<Role | 'all'>
            label="Filter by role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'student', label: 'Students and staff' },
              { value: 'guard', label: 'Guards' },
              { value: 'admin', label: 'Administrators' },
              
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`} />
        <CardBody className={rows.length ? undefined : 'py-0'}>
          {users.isLoading && <SkeletonRows rows={5} className="py-4" />}
          {users.isError && <Alert tone="alert">{(users.error as Error).message}</Alert>}
          {users.isSuccess &&
            (rows.length === 0 ? (
              <EmptyState title="Nobody matches" description="Clear the search or choose another role." />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Number</Th>
                    <Th>Role</Th>
                    <Th>Email</Th>
                    <Th align="right">Bikes protected</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.userId} className="hover:bg-ink-50/60">
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={user.name} src={user.photoPath} size="sm" />
                          <span className="font-medium text-ink-900">{user.name}</span>
                        </span>
                      </Td>
                      <Td className="text-ink-700">{user.studentStaffNumber}</Td>
                      <Td>
                        <Badge tone={user.role === 'student' ? 'neutral' : 'info'}>{ROLE_LABEL[user.role]}</Badge>
                      </Td>
                      <Td className="text-ink-600">{user.email}</Td>
                      <Td align="right" className="text-ink-700">
                        {bikeCounts.get(user.userId) ?? 0}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ))}
        </CardBody>
      </Card>
      <EnrolCardModal open={enrolling} onClose={() => setEnrolling(false)} />
    </div>
  );
}
