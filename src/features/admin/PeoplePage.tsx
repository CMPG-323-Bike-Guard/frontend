import { useMemo, useState } from 'react';
import { CreditCard, Pencil, Search, UserPlus } from 'lucide-react';
import type { Role, User } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { keys } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { ROLE_LABEL } from '@/lib/constants';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { TableWrap, Td, Th } from '@/components/ui/Table';
import { AddPersonModal } from './AddPersonModal';
import { EditPersonModal } from './EditPersonModal';
import { PersonActionModal, type PersonAction } from './PersonActionModal';
import { LinkCardModal } from './LinkCardModal';


/**
 * * BikeGuard reads the existing NWU card system and does not issue or replace
 * cards (Functional Specification, Out of Scope). An administrator can add a
 * person's account here, and otherwise uses this screen to find the right
 * person during an investigation or at the service point.
 */
export function PeoplePage() {
  const [role, setRole] = useState<Role | 'all'>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [linking, setLinking] = useState<User | null>(null);
  const [action, setAction] = useState<PersonAction | null>(null);
  const admin = useCurrentUser();

  const users = useQuery({ queryKey: keys.users('all'), queryFn: () => api.listUsers() });
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
        description="Manage BikeGuard accounts and access."
        actions={
          <Button icon={<UserPlus className="h-4 w-4" aria-hidden="true" />} onClick={() => setAdding(true)}>
            Add a person
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            aria-label="Search people"
            className="pl-9"
            placeholder="Name, number or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Role"
          className="sm:w-56"
          value={role}
          onChange={(event) => setRole(event.target.value as Role | 'all')}
        >
          <option value="all">Everyone</option>
          <option value="student">Students and staff</option>
          <option value="guard">Guards</option>
          <option value="admin">Administrators</option>
        </Select>
        <p aria-live="polite" className="whitespace-nowrap text-right text-sm font-medium text-ink-600">
          {rows.length} {rows.length === 1 ? 'person' : 'people'}
        </p>
      </div>

      <Card>
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
                    <Th>Person</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr key={user.userId} className="hover:bg-ink-50/60">
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar name={user.name} src={user.photo.live} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-medium text-ink-900">{user.name}</span>
                            <span className="block text-xs text-ink-500">{user.studentStaffNumber}</span>
                          </span>
                        </span>
                      </Td>
                      <Td className="text-ink-700">{ROLE_LABEL[user.role]}</Td>
                      <Td>
                        <Badge tone={user.accountStatus === 'active' ? 'ok' : 'warn'}>
                          {user.accountStatus === 'active' ? 'Active' : 'Deactivated'}
                        </Badge>
                      </Td>
                      <Td align="right">
                        <ActionsMenu label={user.name} menuId={`person-actions-${user.userId}`}>
                          <Button
                            className="w-full justify-start"
                            size="sm"
                            variant="subtle"
                            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => setEditing(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            className="w-full justify-start"
                            size="sm"
                            variant="subtle"
                            icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => setLinking(user)}
                          >
                            Link card
                          </Button>
                          {user.userId !== admin.userId && (
                            <>
                              {user.accountStatus === 'active' ? (
                                <Button
                                  className="w-full justify-start"
                                  size="sm"
                                  variant="warningOutline"
                                  onClick={() => setAction({ kind: 'deactivate', person: user })}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  className="w-full justify-start"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setAction({ kind: 'reactivate', person: user })}
                                >
                                  Reactivate
                                </Button>
                              )}
                              <Button
                                className="w-full justify-start"
                                size="sm"
                                variant="dangerOutline"
                                onClick={() => setAction({ kind: 'remove', person: user })}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </ActionsMenu>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ))}
        </CardBody>
            </Card>
      <AddPersonModal open={adding} onClose={() => setAdding(false)} />
      <EditPersonModal person={editing} onClose={() => setEditing(null)} />
      <LinkCardModal person={linking} onClose={() => setLinking(null)} />
      <PersonActionModal action={action} onClose={() => setAction(null)} />
    </div>
  );
}
