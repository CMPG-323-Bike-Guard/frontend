import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useCreateUser } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABEL } from '@/lib/constants';
import { hasErrors, requireText, validatePassword, validateStudentNumber } from '@/lib/validation';
import type { NewPerson, Role } from '@/types';

type FormField = 'studentStaffNumber' | 'name' | 'email' | 'role' | 'password';
type FormErrors = Partial<Record<FormField, string>>;

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generatePassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

function validate(form: NewPerson): FormErrors {
  const errors: FormErrors = {};
  errors.studentStaffNumber = form.studentStaffNumber.trim()
    ? validateStudentNumber(form.studentStaffNumber)
    : 'Enter the student or staff number.';
  errors.name = requireText(form.name, 'Name', 2, 80);
  errors.email = !form.email.trim()
    ? 'Enter an email address.'
    : EMAIL_PATTERN.test(form.email.trim())
      ? undefined
      : 'Enter a valid email address.';
  errors.password = form.password ? validatePassword(form.password) : 'Set a temporary password.';
  return errors;
}

const EMPTY: NewPerson = { studentStaffNumber: '', name: '', email: '', role: 'student', password: '' };

export function AddPersonModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const admin = useCurrentUser();
  const toast = useToast();
  const create = useCreateUser();

  const [form, setForm] = useState<NewPerson>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [created, setCreated] = useState<NewPerson | null>(null);

  function update<K extends keyof NewPerson>(key: K, value: NewPerson[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function close() {
    setForm(EMPTY);
    setErrors({});
    setCreated(null);
    onClose();
  }

  async function copyDetails(person: NewPerson) {
    try {
      await navigator.clipboard.writeText(`Number: ${person.studentStaffNumber}\nTemporary password: ${person.password}`);
      toast.confirm('Sign-in details copied.');
    } catch {
      toast.problem('Could not copy. Select the password and copy it by hand.');
    }
  }

  async function submit() {
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found)) return;

    const person: NewPerson = {
      ...form,
      studentStaffNumber: form.studentStaffNumber.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
    };

    try {
      await create.mutateAsync({ person, adminUserId: admin.userId });
      setCreated(person);
    } catch (error) {
      if (error instanceof ApiError && error.field && error.field in EMPTY) {
        setErrors({ [error.field]: error.message });
      } else {
        toast.problem(error instanceof ApiError ? error.message : 'The person could not be added.');
      }
    }
  }

  if (created) {
    return (
      <Modal
        open={open}
        onClose={close}
        title={`${created.name} was added`}
        description="Give them these sign-in details in person or over a secure channel."
        footer={
          <>
            <Button variant="subtle" onClick={() => copyDetails(created)}>
              Copy details
            </Button>
            <Button
              onClick={() => {
                setForm(EMPTY);
                setErrors({});
                setCreated(null);
              }}
            >
              Add another
            </Button>
            <Button variant="subtle" onClick={close}>
              Done
            </Button>
          </>
        }
      >
        <Alert tone="ok" title="Copy the password now">
          This is the only time the password is shown. Number {created.studentStaffNumber}, temporary password{' '}
          <span className="font-mono font-semibold">{created.password}</span>.
        </Alert>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a person"
      description="Create a BikeGuard account for a student, staff member, guard or administrator."
      footer={
        <>
          <Button variant="subtle" onClick={close}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={submit}>
            Add person
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Student or staff number" error={errors.studentStaffNumber} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              inputMode="numeric"
              autoComplete="off"
              placeholder="30112244"
              value={form.studentStaffNumber}
              onChange={(event) => update('studentStaffNumber', event.target.value)}
            />
          )}
        </Field>
        <Field label="Full name" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="off"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
            />
          )}
        </Field>
        <Field label="Email address" error={errors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
            />
          )}
        </Field>
        <Field label="Role" error={errors.role} required>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={form.role}
              onChange={(event) => update('role', event.target.value as Role)}
            >
              {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Temporary password"
          error={errors.password}
          hint="At least 8 characters. You will see it once after the account is created."
          required
        >
          {({ id, describedBy, invalid }) => (
            <div className="flex gap-2">
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="new-password"
                spellCheck={false}
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
              />
              <Button variant="subtle" onClick={() => update('password', generatePassword())}>
                Generate
              </Button>
            </div>
          )}
        </Field>
      </div>
    </Modal>
  );
}