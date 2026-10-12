/**
 *  Displays a registered bike and its RFID tag information in a
 * clickable card
 * The card displays:
 * - Bike photo, name, make/model, and colour
 * - Bike registration status
 * - RFID tag status, when a tag is assigned
 * - Shortened RFID tag reference
 * - Bike registration date
 * - A short explanation of the current bike status
 */
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { BikeView } from '@/types';
import { BIKE_STATUS_META } from '@/lib/constants';
import { formatDate, shortRef } from '@/lib/format';
import { BikeStatusBadge, TagStatusBadge } from './StatusBadges';

export function BikeCard({ view, to }: { view: BikeView; to: string }) {
  const { bike, tag } = view;
  return (
    <Link
      to={to}
      className="group flex gap-4 rounded-card border border-ink-100 bg-white p-3 transition-colors hover:border-signal-300"
    >
      {bike.photo.live ? (
        <img src={bike.photo.live} alt="" className="h-24 w-32 shrink-0 rounded-control object-cover" />
      ) : (
        <div className="h-24 w-32 shrink-0 rounded-control bg-ink-50" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink-900">{bike.name}</h3>
            <p className="truncate text-sm text-ink-500">
              {bike.makeModel} · {bike.colour}
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-300 group-hover:text-signal-500" aria-hidden="true" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BikeStatusBadge status={bike.status} />
          {tag && <TagStatusBadge status={tag.status} />}
        </div>
        <p className="mt-2 text-sm text-ink-500">
          {tag ? `Tag ${shortRef(tag.tagRef)} · ` : ''}
          Registered {formatDate(bike.submittedAt)}
        </p>
        <p className="mt-1 text-sm text-ink-600">{BIKE_STATUS_META[bike.status].help}</p>
      </div>
    </Link>
  );
}
