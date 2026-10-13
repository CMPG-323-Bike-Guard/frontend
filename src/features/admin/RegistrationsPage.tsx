import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { BikeStatus, BikeView } from '@/types';
import { useCurrentUser } from '@/auth/AuthContext';
import {
  useApproveRegistration,
  useCreateBike,
  usePendingRegistrations,
  useRegistrations,
  useRejectRegistration,
} from '@/api/queries';
import { ApiError, api } from '@/api/client';
import { formatDateTime } from '@/lib/format';
import { requireText, validateStudentNumber, validateTagRef } from '@/lib/validation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { BikeForm, type BikeFormValues } from '@/components/domain/BikeForm';
import { BikeStatusBadge, TagStatusBadge } from '@/components/domain/StatusBadges';

type Filter = 'pending_approval' | 'tag_pending' | 'active' | 'rejected';

/**
 * FR-ADM-02: an administrator approves a registration and issues a tag.
 * FR-ADM-04: an administrator can register a bike on a student's behalf, which
 * is the service-point fallback in UC-01's alternative flow.
 */
export function RegistrationsPage() {
  const admin = useCurrentUser();
  const toast = useToast();

  const [filter, setFilter] = useState<Filter>('pending_approval');
  const registrations = useRegistrations(filter as BikeStatus);
  const pendingRegistrations = usePendingRegistrations();
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const createBike = useCreateBike();

  const [approving, setApproving] = useState<BikeView | null>(null);
  const [rejecting, setRejecting] = useState<BikeView | null>(null);
  const [onBehalfOpen, setOnBehalfOpen] = useState(false);

  const [tagRef, setTagRef] = useState('');
  const [tagError, setTagError] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  const [ownerNumber, setOwnerNumber] = useState('');
  const [ownerError, setOwnerError] = useState<string | undefined>();
  const [onBehalfError, setOnBehalfError] = useState<string | null>(null);

  const counts = useMemo(() => registrations.data?.length ?? 0, [registrations.data]);
  const pendingCount = pendingRegistrations.data?.length ?? 0;

  async function submitApproval() {
    if (!approving) return;
    const problem = validateTagRef(tagRef);
    setTagError(problem);
    if (problem) return;
    try {
      await approve.mutateAsync({ bikeId: approving.bike.bikeId, tagRef, adminUserId: admin.userId });
      toast.confirm(`Approved. ${approving.owner.name} has been told the tag is ready to collect.`);
      setApproving(null);
      setTagRef('');
    } catch (error) {
      if (error instanceof ApiError && error.field === 'tagRef') setTagError(error.message);
      else toast.problem(error instanceof ApiError ? error.message : 'The approval could not be saved.');
    }
  }

  async function submitRejection() {
    if (!rejecting) return;
    const problem = requireText(reason, 'A reason the student can act on', 10, 300);
    setReasonError(problem);
    if (problem) return;
    try {
      await reject.mutateAsync({ bikeId: rejecting.bike.bikeId, reason, adminUserId: admin.userId });
      toast.confirm('Sent back to the student with your note.');
      setRejecting(null);
      setReason('');
    } catch (error) {
      toast.problem(error instanceof ApiError ? error.message : 'The rejection could not be saved.');
    }
  }

  async function registerOnBehalf(values: BikeFormValues) {
    const problem = validateStudentNumber(ownerNumber);
    setOwnerError(problem);
    setOnBehalfError(null);
    if (problem) return;
    try {
      const owner = await api.findUserByNumber(ownerNumber);
      if (!owner || owner.role !== 'student') {
        setOwnerError('No student or staff member matches that number.');
        return;
      }
      await createBike.mutateAsync({
        ownerUserId: owner.userId,
        input: values,
        submit: true,
        actorUserId: admin.userId,
      });
      toast.confirm(`Registered for ${owner.name}. It is now in the review queue.`);
      setOnBehalfOpen(false);
      setOwnerNumber('');
    } catch (error) {
      setOnBehalfError(error instanceof ApiError ? error.message : 'The registration could not be saved.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registrations"
        description="Check the details, allocate a tag, and the student is told where to collect it."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOnBehalfOpen(true)}>
            Register for a student
          </Button>
        }
      />

      <Tabs<Filter>
        label="Filter registrations by status"
        value={filter}
        onChange={setFilter}
        options={[
          {
            value: 'pending_approval',
            label: pendingCount > 0 ? `Waiting for review (${pendingCount})` : 'Waiting for review',
          },
          { value: 'tag_pending', label: 'Tag to collect' },
          { value: 'active', label: 'Protected' },
          { value: 'rejected', label: 'Sent back' },
        ]}
      />

      {registrations.isLoading && <SkeletonRows rows={4} />}
      {registrations.isError && <Alert tone="alert">{(registrations.error as Error).message}</Alert>}

      {registrations.isSuccess && counts === 0 && (
        <Card>
          <EmptyState
            title="Nothing in this list"
            description="Try another status, or register a bike on behalf of a student at the service point."
            action={<Button variant="subtle" onClick={() => setOnBehalfOpen(true)}>Register for a student</Button>}
          />
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {(registrations.data ?? []).map((view) => (
          <Card key={view.bike.bikeId}>
            <CardBody className="flex flex-col gap-4 sm:flex-row">
              {view.bike.photo.live && (
                <img
                  src={view.bike.photo.live}
                  alt={`${view.bike.name}, a ${view.bike.colour} ${view.bike.makeModel}`}
                  className="h-32 w-full rounded-control object-cover sm:w-48"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">{view.bike.name}</h2>
                    <p className="text-sm text-ink-600">
                      {view.bike.makeModel} · {view.bike.colour}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <BikeStatusBadge status={view.bike.status} />
                    {view.tag && <TagStatusBadge status={view.tag.status} />}
                  </div>
                </div>

                <p className="mt-2 text-sm text-ink-700">
                  {view.owner.name} · {view.owner.studentStaffNumber}
                </p>
                <p className="text-sm text-ink-500">Submitted {formatDateTime(view.bike.submittedAt)}</p>
                {view.bike.reviewNote && (
                  <p className="mt-2 rounded-control bg-warn-100 px-3 py-2 text-sm text-ink-800">
                    Sent back: {view.bike.reviewNote}
                  </p>
                )}

                {view.bike.status === 'pending_approval' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setApproving(view)}>
                      Approve and issue a tag
                    </Button>
                    <Button size="sm" variant="subtle" onClick={() => setRejecting(view)}>
                      Send back
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Approve + allocate tag */}
      <Modal
        open={approving !== null}
        onClose={() => setApproving(null)}
        title="Approve and issue a tag"
        description={approving ? `${approving.bike.name} · ${approving.owner.name}` : undefined}
        footer={
          <>
            <Button variant="subtle" onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button loading={approve.isPending} onClick={submitApproval}>
              Approve and notify
            </Button>
          </>
        }
      >
        <Field
          label="Tag reference"
          error={tagError}
          hint="Scan the tag or type the reference printed on it. A tag can only belong to one bike."
          required
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoCapitalize="characters"
              placeholder="BG-4A19C2"
              value={tagRef}
              onChange={(event) => setTagRef(event.target.value.toUpperCase())}
            />
          )}
        </Field>
        <p className="mt-3 text-sm text-ink-500">
          The student gets a message telling them to collect the tag. The bike is only recognised at the gate once the
          tag has been handed over and fitted.
        </p>
      </Modal>

      {/* Send back with a reason */}
      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Send this registration back"
        description={rejecting ? `${rejecting.bike.name} · ${rejecting.owner.name}` : undefined}
        footer={
          <>
            <Button variant="subtle" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="dangerOutline" loading={reject.isPending} onClick={submitRejection}>
              Send back
            </Button>
          </>
        }
      >
        <Field label="What does the student need to change?" error={reasonError} required>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="The photo does not show the full frame. Upload a clear side-on photo and submit again."
            />
          )}
        </Field>
      </Modal>

      {/* FR-ADM-04 */}
      <Modal
        open={onBehalfOpen}
        onClose={() => setOnBehalfOpen(false)}
        title="Register a bike for a student"
        description="Use this at the service point when a student cannot complete the self-service form."
        size="lg"
      >
        {onBehalfError && <Alert tone="alert" className="mb-4">{onBehalfError}</Alert>}
        <Field label="Student or staff number" error={ownerError} required className="mb-5">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              inputMode="numeric"
              maxLength={8}
              value={ownerNumber}
              onChange={(event) => setOwnerNumber(event.target.value.replace(/\D/g, ''))}
            />
          )}
        </Field>
        <BikeForm
          submitLabel="Register and queue for a tag"
          submitting={createBike.isPending}
          cancelVariant="subtle"
          onSubmit={registerOnBehalf}
          onCancel={() => setOnBehalfOpen(false)}
        />
      </Modal>
    </div>
  );
}
