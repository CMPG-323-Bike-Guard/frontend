import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { BikeView, TagStatus } from '@/types';
import { useCurrentUser } from '@/auth/AuthContext';
import { useDeactivateTag, useMarkTagCollected, useRegistrations, useReplaceTag } from '@/api/queries';
import { ApiError } from '@/api/client';
import { formatDate } from '@/lib/format';
import { requireText, validateTagRef } from '@/lib/validation';
import { Alert } from '@/components/ui/Alert';
import { ActionsMenu } from '@/components/ui/ActionsMenu';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { TableWrap, Td, Th } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { TagStatusBadge } from '@/components/domain/StatusBadges';

type Filter = 'all' | TagStatus;

/**
 * Tag lifecycle for administrators.
 *
 * UC-04 is the centre of this screen: deactivate a lost or damaged tag and
 * link a replacement without the student losing their registration history.
 * FR-VER-10 keeps this away from guards, so it lives in the admin portal only.
 */
export function TagsPage() {
  const admin = useCurrentUser();
  const toast = useToast();

  const registrations = useRegistrations();
  const markCollected = useMarkTagCollected();
  const deactivate = useDeactivateTag();
  const replace = useReplaceTag();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [replacing, setReplacing] = useState<BikeView | null>(null);
  const [deactivating, setDeactivating] = useState<BikeView | null>(null);

  const [tagRef, setTagRef] = useState('');
  const [tagError, setTagError] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (registrations.data ?? [])
      .filter((view) => view.tag !== null)
      .filter((view) => (filter === 'all' ? true : view.tag?.status === filter))
      .filter((view) => {
        if (!search) return true;
        return [view.tag?.tagRef, view.bike.name, view.owner.name, view.owner.studentStaffNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);
      });
  }, [registrations.data, filter, query]);

  async function submitReplacement() {
    if (!replacing) return;
    const problem = validateTagRef(tagRef);
    setTagError(problem);
    if (problem) return;
    try {
      await replace.mutateAsync({ bikeId: replacing.bike.bikeId, tagRef, adminUserId: admin.userId });
      toast.confirm('Replacement issued. The old tag no longer opens a gate.');
      setReplacing(null);
      setTagRef('');
    } catch (error) {
      if (error instanceof ApiError && error.field === 'tagRef') setTagError(error.message);
      else toast.problem(error instanceof ApiError ? error.message : 'The replacement could not be issued.');
    }
  }

  async function submitDeactivation() {
    if (!deactivating?.tag) return;
    const problem = requireText(reason, 'A reason', 5, 200);
    setReasonError(problem);
    if (problem) return;
    try {
      await deactivate.mutateAsync({ tagId: deactivating.tag.tagId, reason, adminUserId: admin.userId });
      toast.confirm('Tag deactivated.');
      setDeactivating(null);
      setReason('');
    } catch (error) {
      toast.problem(error instanceof ApiError ? error.message : 'The tag could not be deactivated.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tags"
        description="Manage tag handovers, replacements and deactivations."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            aria-label="Search tags"
            className="pl-9"
            placeholder="Tag reference, bike, student name or number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Status"
          className="sm:w-56"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
        >
          <option value="all">All tags</option>
          <option value="awaiting_collection">Awaiting collection</option>
          <option value="active">Active</option>
          <option value="lost">Reported lost</option>
          <option value="stolen">Reported stolen</option>
          <option value="deactivated">Deactivated</option>
        </Select>
        <p aria-live="polite" className="whitespace-nowrap text-right text-sm font-medium text-ink-600">
          {rows.length} {rows.length === 1 ? 'tag' : 'tags'}
        </p>
      </div>

      <Card>
        <CardBody className={rows.length ? undefined : 'py-0'}>
          {registrations.isLoading && <SkeletonRows rows={5} className="py-4" />}
          {registrations.isError && <Alert tone="alert">{(registrations.error as Error).message}</Alert>}
          {registrations.isSuccess &&
            (rows.length === 0 ? (
              <EmptyState
                title="No tags match"
                description="Clear the search or choose another status to see the rest."
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Tag</Th>
                    <Th>Bike</Th>
                    <Th>Owner</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((view) => {
                    const tag = view.tag!;
                    return (
                      <tr key={tag.tagId} className="hover:bg-ink-50/60">
                        <Td>
                          <span className="font-medium text-ink-900">{tag.tagRef}</span>
                          <span className="block text-xs text-ink-500">
                            Issued {tag.issuedAt ? formatDate(tag.issuedAt) : 'Not recorded'}
                            {tag.replacesTagId ? ' · Replacement tag' : ''}
                          </span>
                        </Td>
                        <Td className="text-ink-900">{view.bike.name}</Td>
                        <Td className="text-ink-900">{view.owner.name}</Td>
                        <Td>
                          <div className="flex items-center justify-between gap-3">
                            <TagStatusBadge status={tag.status} />
                            <ActionsMenu label={tag.tagRef} menuId={`tag-actions-${tag.tagId}`}>
                              {tag.status === 'awaiting_collection' && (
                                <Button
                                  className="w-full justify-start"
                                  size="sm"
                                  loading={markCollected.isPending}
                                  onClick={() =>
                                    markCollected.mutate(
                                      { tagId: tag.tagId, adminUserId: admin.userId },
                                      { onSuccess: () => toast.confirm('Handed over. The bike is now protected.') },
                                    )
                                  }
                                >
                                  Mark collected
                                </Button>
                              )}
                              {tag.status !== 'deactivated' ? (
                                <>
                                  <Button className="w-full justify-start" size="sm" variant="subtle" onClick={() => setReplacing(view)}>
                                    Replace
                                  </Button>
                                  <Button className="w-full justify-start" size="sm" variant="dangerOutline" onClick={() => setDeactivating(view)}>
                                    Deactivate
                                  </Button>
                                </>
                              ) : (
                                <p className="px-3 py-2 text-sm text-ink-500">No actions available</p>
                              )}
                            </ActionsMenu>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            ))}
        </CardBody>
      </Card>

      {/* UC-04 */}
      <Modal
        open={replacing !== null}
        onClose={() => setReplacing(null)}
        title="Issue a replacement tag"
        description={replacing ? `${replacing.bike.name} · ${replacing.owner.name}` : undefined}
        footer={
          <>
            <Button variant="subtle" onClick={() => setReplacing(null)}>
              Cancel
            </Button>
            <Button loading={replace.isPending} onClick={submitReplacement}>
              Issue replacement
            </Button>
          </>
        }
      >
        <Field label="New tag reference" error={tagError} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoCapitalize="characters"
              placeholder="BG-9D2E60"
              value={tagRef}
              onChange={(event) => setTagRef(event.target.value.toUpperCase())}
            />
          )}
        </Field>
        <p className="mt-3 text-sm text-ink-500">
          The old tag {replacing?.tag?.tagRef} is deactivated immediately and raises an alarm if it is presented at a
          gate. The bike keeps its registration and its crossing history.
        </p>
      </Modal>

      {/* FR-ADM-03 */}
      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title="Deactivate this tag"
        description={deactivating ? `${deactivating.tag?.tagRef} · ${deactivating.owner.name}` : undefined}
        footer={
          <>
            <Button variant="subtle" onClick={() => setDeactivating(null)}>
              Cancel
            </Button>
            <Button variant="dangerOutline" loading={deactivate.isPending} onClick={submitDeactivation}>
              Deactivate
            </Button>
          </>
        }
      >
        <Field label="Why is this tag being deactivated?" error={reasonError} required>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tag damaged in a fall; student collecting a replacement today."
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
