import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useChangeOwnPassword, useSubmitProfilePhoto, useUpdateOwnDetails } from '@/api/queries';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PhotoInput } from '@/components/ui/PhotoInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABEL } from '@/lib/constants';
import { hasErrors, requireText, validatePhoto, type FieldErrors } from '@/lib/validation';

type DetailsField = 'name' | 'email' | 'phone';
type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

interface DetailsValues {
  name: string;
  email: string;
  phone: string;
}

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PASSWORDS: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function validateDetails(values: DetailsValues): FieldErrors<DetailsField> {
  const email = values.email.trim();
  const phone = values.phone.trim();
  return {
    name: requireText(values.name, 'Name', 2, 80),
    email: !email
      ? 'Email is required.'
      : email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Enter a valid email address.'
        : undefined,
    phone: phone && (phone.length > 30 || !/^\+?[\d\s().-]{7,30}$/.test(phone))
      ? 'Enter a valid phone number.'
      : undefined,
  };
}

function validatePasswords(values: PasswordValues): FieldErrors<PasswordField> {
  return {
    currentPassword: values.currentPassword ? undefined : 'Enter your current password.',
    newPassword: !values.newPassword
      ? 'Enter a new password.'
      : values.newPassword.length < 8
        ? 'Passwords are at least 8 characters.'
        : undefined,
    confirmPassword: !values.confirmPassword
      ? 'Confirm your new password.'
      : values.confirmPassword !== values.newPassword
        ? 'The passwords do not match.'
        : undefined,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function ProfilePage() {
  const user = useCurrentUser();
  const toast = useToast();
  const updateDetails = useUpdateOwnDetails();
  const changePassword = useChangeOwnPassword();
  const submitProfilePhoto = useSubmitProfilePhoto();
  const [details, setDetails] = useState<DetailsValues>({
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
  });
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [detailErrors, setDetailErrors] = useState<FieldErrors<DetailsField>>({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [photoCandidate, setPhotoCandidate] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<PasswordValues>(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors<PasswordField>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (!detailsDirty) {
      setDetails({ name: user.name, email: user.email, phone: user.phone ?? '' });
    }
  }, [user.name, user.email, user.phone, detailsDirty]);

  function updateDetail(field: DetailsField, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
    setDetailsDirty(true);
    setDetailErrors((current) => ({ ...current, [field]: undefined }));
    setDetailError(null);
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDetailError(null);
    const errors = validateDetails(details);
    setDetailErrors(errors);
    if (hasErrors(errors)) return;

    try {
      const savedUser = await updateDetails.mutateAsync({
        actorUserId: user.userId,
        input: { name: details.name, email: details.email, phone: details.phone },
      });
      setDetails({ name: savedUser.name, email: savedUser.email, phone: savedUser.phone ?? '' });
      setDetailsDirty(false);
      toast.confirm('Your details were updated.');
    } catch (error) {
      setDetailError(errorMessage(error, 'Your details could not be updated.'));
    }
  }

  function selectPhoto(file: File | null, dataUrl: string | null) {
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

  async function submitPhoto() {
    if (!photoCandidate) {
      setPhotoError('Choose a JPG, PNG or WebP picture before submitting.');
      return;
    }
    setPhotoError(null);
    try {
      await submitProfilePhoto.mutateAsync({ actorUserId: user.userId, photoDataUrl: photoCandidate });
      setPhotoCandidate(null);
      toast.confirm('Your picture was submitted for admin approval.');
    } catch (error) {
      setPhotoError(errorMessage(error, 'Your picture could not be submitted.'));
    }
  }

  function updatePassword(field: PasswordField, value: string) {
    setPasswords((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined }));
    setPasswordError(null);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    const errors = validatePasswords(passwords);
    setPasswordErrors(errors);
    if (hasErrors(errors)) return;

    try {
      await changePassword.mutateAsync({
        actorUserId: user.userId,
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords(EMPTY_PASSWORDS);
      setPasswordErrors({});
      toast.confirm('Your password was changed.');
    } catch (error) {
      setPasswordError(errorMessage(error, 'Your password could not be changed.'));
    }
  }

  function passwordField(field: PasswordField, label: string, autoComplete: 'current-password' | 'new-password') {
    const showing = visiblePasswords[field];
    return (
      <Field label={label} required error={passwordErrors[field]}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <Input
              id={id}
              type={showing ? 'text' : 'password'}
              autoComplete={autoComplete}
              value={passwords[field]}
              onChange={(event) => updatePassword(field, event.target.value)}
              required
              invalid={invalid}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="pr-12"
            />
            <button
              type="button"
              aria-label={`${showing ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
              aria-pressed={showing}
              onClick={() => setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))}
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-control text-ink-500 hover:bg-ink-50 hover:text-ink-800 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-600"
            >
              {showing ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        )}
      </Field>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Profile" description="Your details and password." />

      <Card>
        <CardHeader title="Profile picture" description="New pictures are visible after admin approval." />
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.photo.live} size="xl" />
            <div>
              <p className="font-semibold text-ink-900">Current picture</p>
              <p className="text-sm text-ink-500">Only your approved picture is shown on your profile.</p>
            </div>
          </div>

          {user.photo.status === 'pending' && user.photo.pending ? (
            <div className="flex flex-col gap-3 rounded-card border border-tag-notice-orange/40 bg-tag-notice-orange/10 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <img
                  src={user.photo.pending}
                  alt="New profile picture awaiting admin approval"
                  className="h-16 w-16 shrink-0 rounded-control object-cover"
                />
                <div>
                  <Badge variant="tag-ready">Pending approval</Badge>
                  <p className="mt-1 text-sm font-medium text-ink-900">Awaiting admin approval</p>
                </div>
              </div>
              <span className="sr-only" role="status">Your new profile picture is pending admin approval.</span>
            </div>
          ) : (
            <>
              {user.photo.status === 'rejected' && (
                <>
                  <Badge tone="alert">Rejected</Badge>
                  <Alert tone="alert" title="Your new picture was not approved">
                    {user.photo.rejectionReason || 'The administrator did not provide a reason.'}
                  </Alert>
                  <span className="sr-only" role="status">Your new profile picture was rejected.</span>
                </>
              )}

              {photoError && <Alert tone="alert">{photoError}</Alert>}
              <PhotoInput
                id="profile-picture"
                value={photoCandidate}
                onChange={selectPhoto}
                helperText="Choose a clear picture of yourself."
                buttonLabel="Change picture"
                inputLabel="Profile picture file"
                previewAlt="Preview of your new profile picture"
                disabled={submitProfilePhoto.isPending}
              />
              <div>
                <Button
                  type="button"
                  loading={submitProfilePhoto.isPending}
                  disabled={!photoCandidate}
                  onClick={submitPhoto}
                >
                  Submit for approval
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your details" description="Your student or staff number and role cannot be changed here." />
        <CardBody>
          {detailError && <Alert tone="alert" className="mb-4">{detailError}</Alert>}
          <form onSubmit={saveDetails} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={detailErrors.name}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    name="name"
                    autoComplete="name"
                    value={details.name}
                    onChange={(event) => updateDetail('name', event.target.value)}
                    disabled={updateDetails.isPending}
                    required
                    maxLength={80}
                    invalid={invalid}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
              <Field label="Email" required error={detailErrors.email}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={details.email}
                    onChange={(event) => updateDetail('email', event.target.value)}
                    disabled={updateDetails.isPending}
                    required
                    maxLength={254}
                    invalid={invalid}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
              <Field label="Phone" error={detailErrors.phone}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={details.phone}
                    onChange={(event) => updateDetail('phone', event.target.value)}
                    disabled={updateDetails.isPending}
                    maxLength={30}
                    invalid={invalid}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
              <Field label="Student or staff number">
                {({ id }) => <Input id={id} value={user.studentStaffNumber} readOnly disabled={updateDetails.isPending} aria-readonly="true" />}
              </Field>
              <Field label="Role">
                {({ id }) => <Input id={id} value={ROLE_LABEL[user.role]} readOnly disabled={updateDetails.isPending} aria-readonly="true" />}
              </Field>
            </div>
            <div>
              <Button type="submit" loading={updateDetails.isPending} disabled={updateDetails.isPending}>Save details</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Change password" description="Choose a password with at least 8 characters." />
        <CardBody>
          {passwordError && <Alert tone="alert" className="mb-4">{passwordError}</Alert>}
          <form onSubmit={savePassword} noValidate className="flex flex-col gap-4">
            {passwordField('currentPassword', 'Current password', 'current-password')}
            {passwordField('newPassword', 'New password', 'new-password')}
            {passwordField('confirmPassword', 'Confirm new password', 'new-password')}
            <div>
              <Button type="submit" loading={changePassword.isPending}>Change password</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}