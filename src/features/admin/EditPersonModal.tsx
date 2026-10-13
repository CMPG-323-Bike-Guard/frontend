import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { useUpdateUser } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABEL } from '@/lib/constants';
import { hasErrors, requireText, validateStudentNumber } from '@/lib/validation';
import type { PersonEdit, Role, User } from '@/types';

type FormField = keyof PersonEdit;
type FormErrors = Partial<Record<FormField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toForm(user: User): PersonEdit {
  return {
    studentStaffNumber: user.studentStaffNumber,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
  };
}

function validate(form: PersonEdit): FormErrors {
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
  return errors;
}

export function EditPersonModal({ person, onClose }: { person: User | null; onClose(): void }) {
  const admin = useCurrentUser();
  const toast = useToast();
  const update = useUpdateUser();

  const [form, setForm] = useState<PersonEdit | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setForm(person ? toForm(person) : null);
    setErrors({});
  }, [person]);

  if (!person || !form) return null;
  const isSelf = person.userId === admin.userId;

  function change<K extends FormField>(key: K, value: PersonEdit[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit() {
    if (!person || !form) return;
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found)) return;

    const edited: PersonEdit = {
      ...form,
      studentStaffNumber: form.studentStaffNumber.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    try {
      await update.mutateAsync({ userId: person.userId, person: edited, adminUserId: admin.userId });
      toast.confirm(`${edited.name} was updated.`);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.field && error.field in form) {
        setErrors({ [error.field]: error.message });
      } else {
        toast.problem(error instanceof ApiError ? error.message : 'The changes could not be saved.');
      }
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${person.name}`}
      description="Changes apply straight away and are recorded in the audit log."
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} onClick={submit}>
            Save changes
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
              value={form.studentStaffNumber}
              onChange={(event) => change('studentStaffNumber', event.target.value)}
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
              onChange={(event) => change('name', event.target.value)}
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
              onChange={(event) => change('email', event.target.value)}
            />
          )}
        </Field>
        <Field label="Phone number" error={errors.phone}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="tel"
              autoComplete="off"
              value={form.phone}
              onChange={(event) => change('phone', event.target.value)}
            />
          )}
        </Field>
        <Field
          label="Role"
          error={errors.role}
          hint={isSelf ? 'You cannot change your own role.' : undefined}
          required
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              disabled={isSelf}
              value={form.role}
              onChange={(event) => change('role', event.target.value as Role)}
            >
              {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  );
}