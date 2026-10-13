import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldOff, Trash2, UserPlus, VenetianMask } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import {
  useBike,
  useGrantPermission,
  useRemoveBike,
  useReportTagLost,
  useRevokePermission,
  useSubmitBikePhoto,
  useSubmitBike,
} from '@/api/queries';
import { ApiError } from '@/api/client';
import { BIKE_STATUS_META } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { validateStudentNumber } from '@/lib/validation';
import { validatePhoto } from '@/lib/validation';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PhotoInput } from '@/components/ui/PhotoInput';
import { Modal } from '@/components/ui/Modal';
import { SkeletonRows } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { BikeStatusBadge, TagStatusBadge } from '@/components/domain/StatusBadges';

type DialogKind = 'lost' | 'stolen' | 'remove' | 'share' | null;

/* Bike Detail Page FR-STU-04, FR-STU-05 and FR-STU-07.
* Displays the details of a student's registered bike, including its
* registration status, RFID tag status, and authorised users.
*/
export function BikeDetailPage() {
  const { bikeId } = useParams<{ bikeId: string }>();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const toast = useToast();

  const query = useBike(bikeId);
  const reportLost = useReportTagLost();
  const removeBike = useRemoveBike();
  const submitBike = useSubmitBike();
  const submitBikePhoto = useSubmitBikePhoto();
  const grant = useGrantPermission();
  const revoke = useRevokePermission();

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [shareNumber, setShareNumber] = useState('');
  const [shareName, setShareName] = useState('');
  const [shareError, setShareError] = useState<string | undefined>();
  const [pageError, setPageError] = useState<string | null>(null);
  const [photoCandidate, setPhotoCandidate] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  if (query.isLoading) return <SkeletonRows rows={5} />;
  if (query.isError || !query.data) {
    return (
      <Alert tone="alert" title="This bike could not be loaded">
        {(query.error as Error | undefined)?.message ?? 'It may have been removed from your profile.'}
      </Alert>
    );
  }

  const { bike, tag, permissions } = query.data;
  // FR-VER-09: a student may only ever open their own record.
  if (bike.ownerUserId !== user.userId) {
    return (
      <Alert tone="alert" title="This bike is not on your profile">
        You can only view bikes registered to your own student or staff number.
      </Alert>
    );
  }

  const activePermissions = permissions.filter((permission) => permission.status === 'active');
  const canReportLost = Boolean(tag) && tag?.status !== 'lost' && tag?.status !== 'stolen';

  async function run(action: () => Promise<unknown>, message: string) {
    setPageError(null);
    try {
      await action();
      toast.confirm(message);
      setDialog(null);
    } catch (error) {
      setPageError(error instanceof ApiError ? error.message : 'That action could not be completed.');
    }
  }

  function selectBikePhoto(file: File | null, dataUrl: string | null) {
    setPhotoError(null);
    if (!file || !dataUrl) {
      setPhotoCandidate(null);
      return;
    }
    const problem = validatePhoto(file, false);
    if (problem) {
      setPhotoCandidate(null);
      setPhotoError(problem);
      return;
    }
    setPhotoCandidate(dataUrl);
  }

  async function saveBikePhoto() {
    if (!photoCandidate) {
      setPhotoError('Choose a JPG, PNG or WebP photo before submitting.');
      return;
    }
    setPhotoError(null);
    try {
      await submitBikePhoto.mutateAsync({
        bikeId: bike.bikeId,
        actorUserId: user.userId,
        photoDataUrl: photoCandidate,
      });
      setPhotoCandidate(null);
      toast.confirm('Your bike photo was submitted for admin approval.');
    } catch (error) {
      setPhotoError(error instanceof ApiError ? error.message : 'Your bike photo could not be submitted.');
    }
  }

  async function handleShare() {
    const problem = validateStudentNumber(shareNumber);
    setShareError(problem);
    if (problem) return;
    setPageError(null);
    try {
      await grant.mutateAsync({
        bikeId: bike.bikeId,
        studentNumber: shareNumber,
        name: shareName.trim() || undefined,
        actorUserId: user.userId,
      });
      toast.confirm('They can now take this bike through the gate with their own card.');
      setShareNumber('');
      setShareName('');
    } catch (error) {
      if (error instanceof ApiError && error.field === 'studentNumber') setShareError(error.message);
      else setPageError(error instanceof ApiError ? error.message : 'The authorisation could not be saved.');
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/my-bikes" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My bikes
      </Link>

      {pageError && <Alert tone="alert">{pageError}</Alert>}

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row">
          {bike.photo.live && (
            <img src={bike.photo.live} alt={`${bike.name}, a ${bike.colour} ${bike.makeModel}`} className="h-44 w-full rounded-control object-cover sm:w-64" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{bike.name}</h1>
            <p className="mt-0.5 text-ink-600">
              {bike.makeModel} · {bike.colour}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BikeStatusBadge status={bike.status} />
              {tag && <TagStatusBadge status={tag.status} />}
            </div>
            <p className="prose-measure mt-3 text-sm text-ink-600">{BIKE_STATUS_META[bike.status].help}</p>

            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">Registered</dt>
                <dd className="font-medium text-ink-900">{formatDate(bike.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Tag reference</dt>
                <dd className="font-medium text-ink-900">{tag ? tag.tagRef : 'Not issued yet'}</dd>
              </div>
              {tag?.issuedAt && (
                <div>
                  <dt className="text-ink-500">Tag issued</dt>
                  <dd className="font-medium text-ink-900">{formatDate(tag.issuedAt)}</dd>
                </div>
              )}
              {tag?.replacesTagId && (
                <div>
                  <dt className="text-ink-500">Replacement</dt>
                  <dd className="font-medium text-ink-900">Replaces an earlier tag</dd>
                </div>
              )}
            </dl>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bike photo" description="A new photo stays private until an administrator approves it." />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-ink-700">Current live photo</p>
            {bike.photo.live ? (
              <img src={bike.photo.live} alt={`Current live photo of ${bike.name}`} className="h-16 w-24 rounded-control object-cover" />
            ) : (
              <span className="text-sm text-ink-500">No current photo</span>
            )}
          </div>

          {bike.photo.status === 'pending' && bike.photo.pending ? (
            <div className="flex flex-col gap-3 rounded-card border border-tag-notice-orange/40 bg-tag-notice-orange/10 p-4 sm:flex-row sm:items-center">
              <img src={bike.photo.pending} alt={`New bike photo awaiting admin approval for ${bike.name}`} className="h-16 w-24 rounded-control object-cover" />
              <div>
                <Badge variant="tag-ready">Pending approval</Badge>
                <p className="mt-1 text-sm font-medium text-ink-900">Awaiting admin approval</p>
              </div>
              <span className="sr-only" role="status">The new bike photo is pending admin approval.</span>
            </div>
          ) : (
            <>
              {bike.photo.status === 'rejected' && (
                <>
                  <Badge tone="alert">Rejected</Badge>
                  <Alert tone="alert" title="Your new photo was not approved">
                    {bike.photo.rejectionReason || 'The administrator did not provide a reason.'}
                  </Alert>
                  <span className="sr-only" role="status">The new bike photo was rejected.</span>
                </>
              )}
              {photoError && <Alert tone="alert">{photoError}</Alert>}
              <PhotoInput
                id={`bike-photo-${bike.bikeId}`}
                value={photoCandidate}
                onChange={selectBikePhoto}
                helperText="Choose a clear side-on photo of the whole bike."
                buttonLabel="Upload a different photo"
                inputLabel="New bike photo file"
                previewAlt={`Preview of a new photo for ${bike.name}`}
                disabled={submitBikePhoto.isPending}
              />
              <div>
                <Button
                  type="button"
                  loading={submitBikePhoto.isPending}
                  disabled={!photoCandidate}
                  onClick={saveBikePhoto}
                >
                  Submit for approval
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {bike.status === 'rejected' && bike.reviewNote && (
        <Alert
          tone="warn"
          title="Protection Services sent this back"
          action={
            <Button
              size="sm"
              variant="subtle"
              loading={submitBike.isPending}
              onClick={() => run(() => submitBike.mutateAsync({ bikeId: bike.bikeId, actorUserId: user.userId }), 'Sent back for review.')}
            >
              Resubmit
            </Button>
          }
        >
          {bike.reviewNote}
        </Alert>
      )}

      {bike.status === 'draft' && (
        <Alert
          tone="info"
          title="This registration is still a draft"
          action={
            <Button
              size="sm"
              loading={submitBike.isPending}
              onClick={() => run(() => submitBike.mutateAsync({ bikeId: bike.bikeId, actorUserId: user.userId }), 'Submitted for approval.')}
            >
              Submit for approval
            </Button>
          }
        >
          Nothing is protected until it has been approved and a tag has been fitted.
        </Alert>
      )}

      {(tag?.status === 'lost' || tag?.status === 'stolen') && (
        <Alert tone="alert" title={tag.status === 'stolen' ? 'This bike is flagged as stolen' : 'This tag is flagged as lost'}>
          Guards are alerted if the tag is presented at a gate. Collect a replacement tag from Protection Services to
          restore gate access ,  your registration history stays with the bike.
        </Alert>
      )}

      {/* FR-STU-07 */}
      <Card>
        <CardHeader
          title="People who may use this bike"
          description="Their card opens the gate with this bike's tag. You can withdraw this at any time."
          action={
            bike.status === 'active' || bike.status === 'tag_pending' ? (
              <Button variant="subtle" size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setDialog('share')}>
                Authorise a student
              </Button>
            ) : undefined
          }
        />
        <CardBody className="py-0">
          {activePermissions.length === 0 ? (
            <EmptyState
              title="Only you can use this bike"
              description="If you lend it to someone, authorise them here so the gate does not raise an alarm."
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {activePermissions.map((permission) => (
                <li key={permission.permissionId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink-900">{permission.authorisedUserName}</p>
                    <p className="text-sm text-ink-500">
                      {permission.authorisedStudentNumber} · authorised {formatDate(permission.grantedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      run(
                        () => revoke.mutateAsync({ permissionId: permission.permissionId, actorUserId: user.userId }),
                        'Authorisation withdrawn.',
                      )
                    }
                  >
                    Withdraw
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tag and registration" description="Report a problem or take this bike off your profile." />
        <CardBody className="flex flex-wrap gap-2">
          <Button
            variant="subtle"
            icon={<ShieldOff className="h-4 w-4" />}
            disabled={!canReportLost}
            onClick={() => setDialog('lost')}
          >
            Report the tag lost
          </Button>
          <Button
            variant="subtle"
            icon={<VenetianMask className="h-4 w-4" />}
            disabled={!canReportLost}
            onClick={() => setDialog('stolen')}
          >
            Report the bike stolen
          </Button>
          {bike.status !== 'removed' && (
            <Button variant="dangerOutline" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDialog('remove')}>
              Remove this bike
            </Button>
          )}
        </CardBody>
      </Card>

      {/* FR-STU-04 */}
      <Modal
        open={dialog === 'lost' || dialog === 'stolen'}
        onClose={() => setDialog(null)}
        title={dialog === 'stolen' ? 'Report this bike stolen' : 'Report this tag lost'}
        description={
          dialog === 'stolen'
            ? 'Guards are alerted immediately if the tag is presented at any gate.'
            : 'The tag stops opening the gate and guards are warned if someone presents it.'
        }
        footer={
          <>
            <Button variant="subtle" className="w-32" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="dangerOutline"
              className="w-32"
              loading={reportLost.isPending}
              onClick={() =>
                run(
                  () =>
                    reportLost.mutateAsync({
                      bikeId: bike.bikeId,
                      actorUserId: user.userId,
                      stolen: dialog === 'stolen',
                    }),
                  dialog === 'stolen' ? 'Reported stolen. Guards have been alerted.' : 'Tag reported lost.',
                )
              }
            >
              {dialog === 'stolen' ? 'Report stolen' : 'Report lost'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          {dialog === 'stolen' ? (
            <>
              Tag {tag?.tagRef} on “{bike.name}” will be flagged as stolen. It stops opening the gate, and guards are
              alerted if anyone presents it. Please also report the theft to Protection Services and the police. Your
              registration and its history stay exactly as they are.
            </>
          ) : (
            <>
              Tag {tag?.tagRef} on “{bike.name}” will be flagged. Go to Protection Services with your student card for a
              replacement tag ,  your registration and its history stay exactly as they are.
            </>
          )}
        </p>
      </Modal>

      {/* FR-STU-05 */}
      <Modal
        open={dialog === 'remove'}
        onClose={() => setDialog(null)}
        title="Remove this bike"
        description="Use this if you have sold the bike or no longer bring it onto campus."
        footer={
          <>
            <Button variant="subtle" className="w-32" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button
              variant="dangerOutline"
              className="w-32"
              loading={removeBike.isPending}
              onClick={async () => {
                await run(
                  () => removeBike.mutateAsync({ bikeId: bike.bikeId, actorUserId: user.userId }),
                  'Bike removed and its tag deactivated.',
                );
                navigate('/my-bikes');
              }}
            >
              Remove bike
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          The tag is deactivated, so it no longer opens a gate. If someone else now owns the bike, they need to register
          it under their own number before riding through a gate.
        </p>
      </Modal>

      {/* FR-STU-07 */}
      <Modal
        open={dialog === 'share'}
        onClose={() => setDialog(null)}
        title="Let someone use this bike"
description="Any NWU student can take this bike through the gate with their own card. They do not need a BikeGuard account."
        footer={
          <>
            <Button variant="subtle" className="w-32" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button loading={grant.isPending} onClick={handleShare}>
              Authorise
            </Button>
          </>
        }
      >
        <Field label="Their student or staff number" error={shareError} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              inputMode="numeric"
              maxLength={8}
              value={shareNumber}
              onChange={(event) => setShareNumber(event.target.value.replace(/\D/g, ''))}
            />
          )}
        </Field>
        <p className="mt-3 text-sm text-ink-500">
          <div className="mt-4">
            <Field label="Their name" hint="Optional. Only so you recognise them in your list.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} maxLength={80}
                value={shareName} onChange={(event) => setShareName(event.target.value)} />
              )}
            </Field>
          </div>
          Every crossing is still logged against whoever tapped their card, so the record shows who actually took the
          bike out.
        </p>
      </Modal>
    </div>
  );
}
