import { useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { useDeactivateUser, useReactivateUser, useRemoveUser } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { User } from '@/types';

export type PersonAction = { kind: 'deactivate' | 'reactivate' | 'remove'; person: User };

export function PersonActionModal({ action, onClose }: { action: PersonAction | null; onClose(): void }) {
  const admin = useCurrentUser();
  const toast = useToast();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const remove = useRemoveUser();
  const [reason, setReason] = useState('');

  useEffect(() => setReason(''), [action]);

  if (!action) return null;
  const { kind, person } = action;
  const pending = deactivate.isPending || reactivate.isPending || remove.isPending;

  const copy = {
    deactivate: {
      title: `Deactivate ${person.name}?`,
      confirm: 'Deactivate',
      done: `${person.name} was deactivated.`,
    },
    reactivate: {
      title: `Reactivate ${person.name}?`,
      confirm: 'Reactivate',
      done: `${person.name} was reactivated.`,
    },
    remove: {
      title: `Remove ${person.name}?`,
      confirm: 'Remove person',
      done: `${person.name} was removed.`,
    },
  }[kind];

  async function confirm() {
    try {
      if (kind === 'deactivate') {
        await deactivate.mutateAsync({ userId: person.userId, reason: reason.trim(), adminUserId: admin.userId });
      } else if (kind === 'reactivate') {
        await reactivate.mutateAsync({ userId: person.userId, adminUserId: admin.userId });
      } else {
        await remove.mutateAsync({ userId: person.userId, adminUserId: admin.userId });
      }
      toast.confirm(copy.done);
      onClose();
    } catch (error) {
      toast.problem(error instanceof ApiError ? error.message : 'That could not be completed.');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.title}
      footer={
        <>
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={kind === 'reactivate' ? 'primary' : 'danger'}
            loading={pending}
            onClick={confirm}
          >
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {kind === 'deactivate' && (
          <>
            <Alert tone="warn" title="They will be signed out">
              {person.name} can no longer sign in, and their bikes will raise a mismatch alarm at the gate until the
              account is reactivated.
            </Alert>
            <Field label="Reason (optional)">
              {({ id }) => <Input id={id} value={reason} onChange={(event) => setReason(event.target.value)} />}
            </Field>
          </>
        )}
        {kind === 'reactivate' && <p className="text-sm text-ink-700">{person.name} will be able to sign in again.</p>}
        {kind === 'remove' && (
          <Alert tone="alert" title="This cannot be undone">
            {person.name} ({person.studentStaffNumber}) will be deleted. If they still own bikes or have other
            records the system will refuse, and you should deactivate them instead.
          </Alert>
        )}
      </div>
    </Modal>
  );
}