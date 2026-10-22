import { useState } from 'react';
import type { User } from '@/types';
import { ApiError, cardTools } from '@/api/client';
import { useRealtime } from '@/api/useRealtime';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export function LinkCardModal({ person, onClose }: { person: User | null; onClose(): void }) {
  const toast = useToast();
  const [seen, setSeen] = useState<{ cardRef: string; studentNumber: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useRealtime((event) => {
    if (person && event.type === 'card-tap') {
      setSeen({ cardRef: event.cardRef, studentNumber: event.studentNumber });
    }
  });

  function close() {
    setSeen(null);
    onClose();
  }

  async function link() {
    if (!person) return;
    setBusy(true);
    try {
      const result = await cardTools.link(person.userId);
      toast.confirm(`Card ${result.cardRef} linked to ${person.name}.`);
      close();
    } catch (error) {
      toast.problem(error instanceof ApiError || error instanceof Error ? error.message : 'Could not link the card.');
    } finally {
      setBusy(false);
    }
  }

  let message = 'Waiting for a card. Tap it on the reader now.';
  if (seen) {
    if (!seen.studentNumber) message = `Card ${seen.cardRef} detected. It is not linked to anyone yet.`;
    else if (person && seen.studentNumber === person.studentStaffNumber) message = `Card ${seen.cardRef} is already linked to ${person.name}.`;
    else message = `Card ${seen.cardRef} is currently linked to ${seen.studentNumber}. Linking will move it to ${person?.name}.`;
  }

  return (
    <Modal
      open={person !== null}
      onClose={close}
      title="Link a card"
      description={person ? `Tap ${person.name}'s student card on the reader.` : undefined}
      footer={
        <>
          <Button variant="subtle" onClick={close}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!seen} onClick={link}>
            Link this card
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-700" aria-live="polite">
        {message}
      </p>
    </Modal>
  );
}