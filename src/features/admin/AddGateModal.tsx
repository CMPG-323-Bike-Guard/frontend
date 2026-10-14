import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useCreateGate } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { hasErrors, requireText } from '@/lib/validation';
import type { NewGate } from '@/types';

type FormErrors = Partial<Record<keyof NewGate, string>>;

const EMPTY: NewGate = { name: '', location: '' };

export function AddGateModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const admin = useCurrentUser();
  const toast = useToast();
  const create = useCreateGate();

  const [form, setForm] = useState<NewGate>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});

  function update<K extends keyof NewGate>(key: K, value: NewGate[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function close() {
    setForm(EMPTY);
    setErrors({});
    onClose();
  }

  async function submit() {
    const found: FormErrors = {
      name: requireText(form.name, 'Gate name', 2, 60),
      location: form.location.trim().length > 120 ? 'Location cannot be longer than 120 characters.' : undefined,
    };
    setErrors(found);
    if (hasErrors(found)) return;

    try {
      const gate = await create.mutateAsync({
        input: { name: form.name.trim(), location: form.location.trim() },
        adminUserId: admin.userId,
      });
      toast.confirm(`${gate.name} was added.`);
      close();
    } catch (error) {
      if (error instanceof ApiError && error.field === 'name') {
        setErrors({ name: error.message });
      } else {
        toast.problem(error instanceof ApiError ? error.message : 'The gate could not be added.');
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a gate"
      description="New gates start in automated mode and can be used straight away."
      footer={
        <>
          <Button variant="subtle" onClick={close}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={submit}>
            Add gate
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Gate name" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="off"
              placeholder="Gate 2"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
            />
          )}
        </Field>
        <Field label="Location" error={errors.location}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="off"
              placeholder="Hoffman Street entrance"
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}