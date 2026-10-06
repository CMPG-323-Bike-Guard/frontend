import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useEnrolCard } from '@/api/queries';
import { useCurrentUser } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { validateStudentNumber } from '@/lib/validation';

export function EnrolCardModal({ open, onClose }: { open: boolean; onClose(): void }) {
  const admin = useCurrentUser();
  const toast = useToast();
  const enrol = useEnrolCard();

  const [studentNumber, setStudentNumber] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [numberError, setNumberError] = useState<string | undefined>();
  const [cardError, setCardError] = useState<string | undefined>();
  const [confirmReplace, setConfirmReplace] = useState(false);

  function close() {
    setStudentNumber('');
    setCardUid('');
    setNumberError(undefined);
    setCardError(undefined);
    setConfirmReplace(false);
    onClose();
  }

  async function submit() {
    const numberProblem = studentNumber.trim() ? validateStudentNumber(studentNumber) : 'Enter the student or staff number.';
    const cardProblem = cardUid.trim() ? undefined : 'Scan or enter the card UID.';
    setNumberError(numberProblem);
    setCardError(cardProblem);
    if (numberProblem || cardProblem) return;

    try {
      const card = await enrol.mutateAsync({
        studentNumber: studentNumber.trim(),
        cardUid: cardUid.trim(),
        replaceExisting: confirmReplace,
        adminUserId: admin.userId,
      });
      toast.confirm(
        confirmReplace ? `Card ${card.cardRef} enrolled. The previous card no longer opens a gate.` : `Card ${card.cardRef} enrolled.`,
      );
      close();
    } catch (error) {
      if (error instanceof ApiError && error.field === 'studentNumber') {
        setNumberError(error.message);
        setConfirmReplace(error.code === 'conflict');
      } else if (error instanceof ApiError && error.field === 'cardUid') {
        setCardError(error.message);
      } else {
        toast.problem(error instanceof ApiError ? error.message : 'The card could not be enrolled.');
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Enrol a card"
      description="Link an existing NWU card to a person's account so gates can recognise it."
      footer={
        <>
          <Button variant="subtle" onClick={close}>
            Cancel
          </Button>
          <Button variant={confirmReplace ? 'dangerOutline' : 'primary'} loading={enrol.isPending} onClick={submit}>
            {confirmReplace ? 'Replace card' : 'Enrol card'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Student or staff number" error={confirmReplace ? undefined : numberError} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              inputMode="numeric"
              autoComplete="off"
              placeholder="30112244"
              value={studentNumber}
              onChange={(event) => {
                setStudentNumber(event.target.value);
                setConfirmReplace(false);
                setNumberError(undefined);
              }}
            />
          )}
        </Field>
        <Field label="Card UID" error={cardError} hint="As read from the card by the reader. It is stored hashed, never in plain text." required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="off"
              spellCheck={false}
              value={cardUid}
              onChange={(event) => {
                setCardUid(event.target.value);
                setCardError(undefined);
              }}
            />
          )}
        </Field>
        {confirmReplace && (
          <Alert tone="warn" title="This person already has an active card">
            {numberError} Replacing it blocks the old card immediately, so it stops opening gates.
          </Alert>
        )}
      </div>
    </Modal>
  );
}