import { useState, type FormEvent } from 'react';
import type { BikeInput } from '@/api/client';
import { COMMON_COLOURS } from '@/lib/constants';
import { hasErrors, requireText, validatePhoto, type FieldErrors } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { PhotoInput } from '@/components/ui/PhotoInput';

type FormField = 'name' | 'makeModel' | 'colour' | 'photo';

export interface BikeFormValues extends BikeInput {}

/**
 * Registration details captured in UC-01 step 2 and FR-STU-02: a name the
 * owner will recognise, the make/model, the frame colour and a reference
 * photo. Nothing else is collected — the Business Case is explicit that the
 * system holds the minimum personal data POPIA allows.
 */
export function BikeForm({
  initial,
  submitLabel,
  secondaryLabel,
  onSubmit,
  onSecondary,
  submitting,
  onCancel,
  submitClassName,
  secondaryVariant = 'secondary',
  cancelVariant = 'ghost',
  photoRequired = true,
}: {
  initial?: Partial<BikeFormValues>;
  submitLabel: string;
  secondaryLabel?: string;
  onSubmit(values: BikeFormValues): void;
  onSecondary?(values: BikeFormValues): void;
  submitting?: boolean;
  onCancel?(): void;
  submitClassName?: string;
  secondaryVariant?: 'secondary' | 'subtle';
  cancelVariant?: 'ghost' | 'subtle' | 'dangerOutline';
  photoRequired?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [makeModel, setMakeModel] = useState(initial?.makeModel ?? '');
  const [colour, setColour] = useState(initial?.colour ?? '');
  const [customColour, setCustomColour] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(initial?.photoDataUrl ?? null);
  const [errors, setErrors] = useState<FieldErrors<FormField>>({});

  const resolvedColour = colour === 'Other' ? customColour : colour;

  function validate(requirePhoto: boolean): FieldErrors<FormField> {
    return {
      name: requireText(name, 'A name for the bike', 2, 60),
      makeModel: requireText(makeModel, 'The make and model', 2, 60),
      colour: requireText(resolvedColour, 'The frame colour', 2, 30),
      // A draft may be saved without the photo; a submission may not.
      photo: requirePhoto && !photoDataUrl ? validatePhoto(photoFile, true) : undefined,
    };
  }

  function collect(): BikeFormValues {
    return { name: name.trim(), makeModel: makeModel.trim(), colour: resolvedColour.trim(), photoDataUrl };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate(photoRequired);
    setErrors(next);
    if (hasErrors(next)) return;
    onSubmit(collect());
  }

  function handleSecondary() {
    const next = validate(false);
    setErrors(next);
    if (hasErrors(next)) return;
    onSecondary?.(collect());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field
        label="Name this bike"
        error={errors.name}
        hint="Something you will recognise on a list, like “Blue commuter”."
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Make and model" error={errors.makeModel} hint="For example “Giant Escape 3”." required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              maxLength={60}
              value={makeModel}
              onChange={(event) => setMakeModel(event.target.value)}
            />
          )}
        </Field>

        <Field label="Frame colour" error={errors.colour} required>
          {({ id, describedBy, invalid }) => (
            <div className="flex flex-col gap-2">
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={colour}
                onChange={(event) => setColour(event.target.value)}
              >
                <option value="">Choose a colour</option>
                {COMMON_COLOURS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              {colour === 'Other' && (
                <Input
                  aria-label="Describe the colour"
                  placeholder="Describe the colour"
                  maxLength={30}
                  value={customColour}
                  onChange={(event) => setCustomColour(event.target.value)}
                />
              )}
            </div>
          )}
        </Field>
      </div>

      <Field label="Reference photo" error={errors.photo} required={photoRequired}>
        {({ id, describedBy, invalid }) => (
          <PhotoInput
            id={id}
            value={photoDataUrl}
            invalid={invalid}
            describedBy={describedBy}
            onChange={(file, dataUrl) => {
              const problem = validatePhoto(file, false);
              setErrors((current) => ({ ...current, photo: problem }));
              setPhotoFile(file);
              if (!problem) setPhotoDataUrl(dataUrl);
            }}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" loading={submitting} className={submitClassName}>
          {submitLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button type="button" variant={secondaryVariant} size="lg" onClick={handleSecondary} disabled={submitting}>
            {secondaryLabel}
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant={cancelVariant} size="lg" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
