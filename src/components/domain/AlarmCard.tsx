import { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Siren } from 'lucide-react';
import type { AlarmView } from '@/types';
import { MISMATCH_REASON_META } from '@/lib/constants';
import { formatDateTime, relativeTime } from '@/lib/format';
import { cx } from '@/lib/cx';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { AlarmStatusBadge } from './StatusBadges';
import { MismatchNote } from './MismatchNote';

export type Resolution = 'cleared_in_person' | 'reported_stolen' | 'escalated';

/**
 * FR-SEC-04: the alarm shows the photo of the person whose card was tapped,
 * their number, the bike the tag is registered to and the bikes that person
 * has registered — everything a guard needs to decide without leaving the
 * screen.
 */
export function AlarmCard({
  view,
  onResolve,
  resolving,
  compact = false,
}: {
  view: AlarmView;
  onResolve?(alarmId: string, outcome: Resolution, notes: string): Promise<void>;
  resolving?: boolean;
  compact?: boolean;
}) {
  const [dialog, setDialog] = useState<Resolution | null>(null);
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState<string | undefined>();

  const { alarm, event, presentedUser, registeredOwner, tagBike, ownerBikes, gateName } = view;
  const live = alarm.status === 'open' || alarm.status === 'escalated';
  const risk = event.mismatchReason ? MISMATCH_REASON_META[event.mismatchReason].risk : 'low';

  async function submit() {
    if (!dialog || !onResolve) return;
    // A theft report and an escalation both leave the gate; both need a reason.
    if (dialog !== 'cleared_in_person' && notes.trim().length < 10) {
      setNotesError('Describe what you saw, in at least 10 characters. This goes into the investigation record.');
      return;
    }
    setNotesError(undefined);
    await onResolve(alarm.alarmId, dialog, notes);
    setNotes('');
    setDialog(null);
  }

  return (
    <article
      className={cx(
        'rounded-card border bg-white',
        live && risk === 'high' ? 'border-alert-500' : live ? 'border-warn-500' : 'border-ink-100',
        live && risk === 'high' && !compact && 'animate-alarm-pulse',
      )}
    >
      <header
        className={cx(
          'flex flex-wrap items-center justify-between gap-2 rounded-t-card px-4 py-2.5',
          live ? 'border-b border-action-red bg-action-red-tint text-ink-900' : 'bg-ink-50 text-ink-700',
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          {live && <Siren className="h-4 w-4" aria-hidden="true" />}
          Gate held · {gateName}
        </p>
        <p className="text-sm text-ink-500">
          {relativeTime(alarm.raisedAt)} · {formatDateTime(alarm.raisedAt)}
        </p>
      </header>

      <div className="px-4 py-4">
        <MismatchNote reason={event.mismatchReason} />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold text-ink-500">Card presented</h3>
            {presentedUser ? (
              <div className="mt-2 flex items-center gap-3">
                <Avatar name={presentedUser.name} src={presentedUser.photoPath} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{presentedUser.name}</p>
                  <p className="text-sm text-ink-600">{presentedUser.studentStaffNumber}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">No card was read at this gate.</p>
            )}

            {ownerBikes.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-ink-500">Bikes registered to this person</p>
                <ul className="mt-1.5 flex flex-wrap gap-2">
                  {ownerBikes.map((bike) => (
                    <li key={bike.bikeId} className="w-32">
                      {bike.photoPath && (
                        <img src={bike.photoPath} alt="" className="h-20 w-32 rounded-control object-cover" />
                      )}
                      <p className="mt-1 truncate text-xs font-medium text-ink-700">{bike.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-ink-500">Tag read on the bike</h3>
            <p className="mt-2 text-sm text-ink-600">Tag {event.tagRef ?? 'not read'}</p>
            {tagBike ? (
              <div className="mt-2">
                {tagBike.photoPath && (
                  <img
                    src={tagBike.photoPath}
                    alt={`${tagBike.name}, a ${tagBike.colour} ${tagBike.makeModel}`}
                    className="h-28 w-44 rounded-control object-cover"
                  />
                )}
                <p className="mt-1.5 font-semibold text-ink-900">{tagBike.name}</p>
                <p className="text-sm text-ink-600">
                  {tagBike.makeModel} · {tagBike.colour}
                </p>
                {registeredOwner && (
                  <p className="mt-1 text-sm text-ink-700">
                    Registered to <span className="font-semibold">{registeredOwner.name}</span> (
                    {registeredOwner.studentStaffNumber})
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">
                This tag is not linked to any registration, so there is no bike photo to compare against.
              </p>
            )}
          </section>
        </div>

        {!live && (
          <div className="mt-4 rounded-control bg-ink-50 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <AlarmStatusBadge status={alarm.status} />
              {view.resolvedByName && (
                <span className="text-sm text-ink-600">
                  Checked by {view.resolvedByName}
                  {alarm.resolvedAt ? ` · ${formatDateTime(alarm.resolvedAt)}` : ''}
                </span>
              )}
            </div>
            {alarm.notes && <p className="mt-1.5 text-sm text-ink-700">{alarm.notes}</p>}
          </div>
        )}

        {live && onResolve && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button icon={<ShieldCheck className="h-4 w-4" />} onClick={() => setDialog('cleared_in_person')}>
              Checked in person — all clear
            </Button>
            <Button variant="danger" icon={<Siren className="h-4 w-4" />} onClick={() => setDialog('reported_stolen')}>
              Report as stolen
            </Button>
            {alarm.status === 'open' && (
              <Button
                variant="subtle"
                icon={<ArrowUpRight className="h-4 w-4" />}
                onClick={() => setDialog('escalated')}
              >
                Escalate to Protection Services
              </Button>
            )}
          </div>
        )}
      </div>

      {/* FR-SEC-05: the guard who performed the check is recorded with the outcome. */}
      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog === 'cleared_in_person'
            ? 'Record an in-person check'
            : dialog === 'reported_stolen'
              ? 'Report this bike as stolen'
              : 'Escalate to Protection Services'
        }
        description="Your name and the time are recorded against this crossing. The original result is not changed."
        footer={
          <>
            <Button variant="subtle" className="w-32" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog === 'cleared_in_person' ? 'primary' : 'dangerOutline'}
              className="w-32"
              loading={resolving}
              onClick={submit}
            >
              {dialog === 'cleared_in_person' ? 'Record check' : dialog === 'reported_stolen' ? 'Report stolen' : 'Escalate'}
            </Button>
          </>
        }
      >
        <Field
          label="What did you find?"
          error={notesError}
          hint={
            dialog === 'cleared_in_person'
              ? 'Optional. Useful when the same person triggers the alarm repeatedly.'
              : 'Required. This is the record an investigation will rely on.'
          }
          required={dialog !== 'cleared_in_person'}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Rider produced the registration on their phone; tag had come loose from the frame."
            />
          )}
        </Field>
      </Modal>
    </article>
  );
}
