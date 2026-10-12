import { useState } from 'react';
import { useCurrentUser } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';
import { useApprovePhoto, usePendingPhotos, useRejectPhoto } from '@/api/queries';
import type { PendingPhoto } from '@/types';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonRows } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';

function failureMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'The photo review could not be completed.';
}

export function PhotoReviewsPage() {
  const admin = useCurrentUser();
  const toast = useToast();
  const photos = usePendingPhotos(admin.userId);
  const approve = useApprovePhoto();
  const reject = useRejectPhoto();
  const [selected, setSelected] = useState<PendingPhoto | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);

  async function approvePhoto(item: PendingPhoto) {
    const key = `${item.targetType}:${item.entityId}`;
    setApprovingKey(key);
    setReviewError(null);
    try {
      await approve.mutateAsync({ targetType: item.targetType, entityId: item.entityId, adminUserId: admin.userId });
      toast.confirm('Photo approved.');
    } catch (error) {
      setReviewError(failureMessage(error));
    } finally {
      setApprovingKey(null);
    }
  }

  function openReject(item: PendingPhoto) {
    setSelected(item);
    setReason('');
    setReasonError(null);
    setReviewError(null);
  }

  async function rejectPhoto() {
    if (!selected) return;
    if (!reason.trim()) {
      setReasonError('Enter a reason for rejecting this photo.');
      return;
    }
    setReasonError(null);
    setReviewError(null);
    try {
      await reject.mutateAsync({
        targetType: selected.targetType,
        entityId: selected.entityId,
        reason,
        adminUserId: admin.userId,
      });
      setSelected(null);
      toast.confirm('Photo rejected. The user has been notified.');
    } catch (error) {
      setReviewError(failureMessage(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Photo reviews" description="Review profile pictures and bike photos submitted by users." />

      {reviewError && <Alert tone="alert">{reviewError}</Alert>}
      {photos.isError && <Alert tone="alert">{failureMessage(photos.error)}</Alert>}
      {photos.isLoading && <SkeletonRows rows={4} />}

      {photos.isSuccess && photos.data.length === 0 && (
        <Card>
          <EmptyState
            title="No photos awaiting review"
            description="New profile pictures and bike photos will appear here."
          />
        </Card>
      )}

      {photos.isSuccess && photos.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {photos.data.map((item) => {
            const key = `${item.targetType}:${item.entityId}`;
            const targetName = item.targetType === 'user' ? 'Profile picture' : 'Bike photo';
            return (
              <li key={key}>
                <Card>
                  <CardBody className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-ink-900">{targetName}</h2>
                        <p className="text-sm text-ink-600">
                          Submitted by {item.ownerName}
                          {item.targetType === 'bike' ? ` · ${item.entityId}` : ''}
                        </p>
                      </div>
                      <time className="text-sm text-ink-500" dateTime={item.photo.submittedAt ?? undefined}>
                        {item.photo.submittedAt ? formatDateTime(item.photo.submittedAt) : 'Submission time unavailable'}
                      </time>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex min-h-44 flex-col gap-2 rounded-card border border-ink-100 bg-ink-50 p-3">
                        <p className="text-sm font-semibold text-ink-700">Current live photo</p>
                        <div className="flex flex-1 items-center justify-center">
                          {item.photo.live ? (
                            <img src={item.photo.live} alt={`Current live ${targetName.toLowerCase()} for ${item.ownerName}`} className="max-h-48 max-w-full rounded-control object-contain" />
                          ) : item.targetType === 'user' ? (
                            <Avatar name={item.ownerName} size="lg" />
                          ) : (
                            <p className="text-sm text-ink-500">No live photo</p>
                          )}
                        </div>
                      </div>
                      <div className="flex min-h-44 flex-col gap-2 rounded-card border border-ink-100 bg-white p-3">
                        <p className="text-sm font-semibold text-ink-700">New photo</p>
                        <div className="flex flex-1 items-center justify-center">
                          {item.photo.pending && (
                            <img src={item.photo.pending} alt={`Submitted ${targetName.toLowerCase()} from ${item.ownerName}`} className="max-h-48 max-w-full rounded-control object-contain" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="subtle"
                        disabled={approve.isPending || reject.isPending}
                        loading={approvingKey === key}
                        onClick={() => approvePhoto(item)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="dangerOutline"
                        disabled={approve.isPending || reject.isPending}
                        onClick={() => openReject(item)}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Reject photo"
        description="Give the user a reason so they know what to change before uploading again."
        footer={
          <>
            <Button variant="subtle" className="w-32" onClick={() => setSelected(null)} disabled={reject.isPending}>
              Cancel
            </Button>
            <Button variant="dangerOutline" className="w-32" onClick={rejectPhoto} loading={reject.isPending}>
              Reject photo
            </Button>
          </>
        }
      >
        {reviewError && <Alert tone="alert" className="mb-4">{reviewError}</Alert>}
        <Field label="Reason" required error={reasonError ?? undefined}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              maxLength={500}
              required
              invalid={invalid}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}