import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cx } from '@/lib/cx';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Reference-photo picker used during registration (FR-STU-02, UC-01 step 2).
 * The file is read to a data URL for the preview; the real upload goes to the
 * photo store described in Technical Specification 7.3.1.
 */
export function PhotoInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string | null;
  onChange(file: File | null, dataUrl: string | null): void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProblem(null);
    if (!file) {
      onChange(null, null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setProblem('That photo is larger than 5 MB. Choose a smaller one — the rest of your details are safe.');
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      onChange(file, typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => {
      // UC-01 error flow: a failed upload must not discard the other fields.
      setReading(false);
      setProblem('That photo could not be read. Try again — nothing else you have typed is lost.');
      onChange(file, null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={cx(
        'flex flex-col gap-3 rounded-card border border-dashed p-4 sm:flex-row sm:items-center',
        invalid ? 'border-alert-500 bg-alert-100/40' : 'border-ink-200 bg-white',
      )}
    >
      {value ? (
        <img src={value} alt="Preview of the bike photo you selected" className="h-28 w-44 rounded-control object-cover" />
      ) : (
        <div className="flex h-28 w-44 items-center justify-center rounded-control bg-white text-ink-300">
          <ImagePlus className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm text-ink-700">
          A clear side-on photo of the whole bike. Guards use this photo to identify your bike when an alarm is raised.
        </p>
        <p className="mt-1 text-sm text-ink-500">JPG, PNG or WebP, up to 5 MB.</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="subtle" size="sm" loading={reading} onClick={() => inputRef.current?.click()}>
            {value ? 'Choose a different photo' : 'Choose a photo'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                onChange(null, null);
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {problem && (
          <p className="mt-2 text-sm font-medium text-action-red" role="alert">
            {problem}
          </p>
        )}
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
