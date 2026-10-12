import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useCurrentUser } from '@/auth/AuthContext';
import { useChangeOwnPassword, useUpdateOwnDetails } from '@/api/queries';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABEL } from '@/lib/constants';
import { hasErrors, requireText, type FieldErrors } from '@/lib/validation';

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
  const [details, setDetails] = useState<DetailsValues>({
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
  });
  const [detailErrors, setDetailErrors] = useState<FieldErrors<DetailsField>>({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<PasswordValues>(EMPTY_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors<PasswordField>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    setDetails({ name: user.name, email: user.email, phone: user.phone ?? '' });
  }, [user.name, user.email, user.phone]);

  function updateDetail(field: DetailsField, value: string) {
    setDetails((current) => ({ ...current, [field]: value }));
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
      await updateDetails.mutateAsync({
        actorUserId: user.userId,
        input: { name: details.name, email: details.email, phone: details.phone },
      });
      toast.confirm('Your details were updated.');
    } catch (error) {
      setDetailError(errorMessage(error, 'Your details could not be updated.'));
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
                    maxLength={30}
                    invalid={invalid}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
              <Field label="Student or staff number">
                {({ id }) => <Input id={id} value={user.studentStaffNumber} readOnly aria-readonly="true" />}
              </Field>
              <Field label="Role">
                {({ id }) => <Input id={id} value={ROLE_LABEL[user.role]} readOnly aria-readonly="true" />}
              </Field>
            </div>
            <div>
              <Button type="submit" loading={updateDetails.isPending}>Save details</Button>
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