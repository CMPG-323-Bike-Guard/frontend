import type { CrossingView } from '@/types';
import { formatDateTime, shortRef } from '@/lib/format';
import { MISMATCH_REASON_META, VERIFICATION_BUDGET_MS } from '@/lib/constants';
import { Td, TableWrap, Th } from '@/components/ui/Table';
import { ResultBadge } from './StatusBadges';
import { cx } from '@/lib/cx';

/**
 * The digital replacement for the paper logbook (FR-VER-07, NFR-AUD-01).
 * Every row carries the fields the Business Case asks for: timestamp, gate,
 * card reference, tag reference and the match/mismatch result.
 */
export function CrossingTable({ rows, showGate = true }: { rows: CrossingView[]; showGate?: boolean }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <Th>Time</Th>
          {showGate && <Th>Gate</Th>}
          <Th>Person</Th>
          <Th>Bike</Th>
          <Th>Card ref</Th>
          <Th>Tag ref</Th>
          <Th>Result</Th>
          <Th align="right">Check</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ event, gateName, userName, studentStaffNumber, bikeName }) => (
          <tr key={event.eventId} className="hover:bg-ink-50/60">
            <Td className="whitespace-nowrap text-ink-700">{formatDateTime(event.timestamp)}</Td>
            {showGate && <Td className="whitespace-nowrap text-ink-700">{gateName}</Td>}
            <Td>
              <span className="font-medium text-ink-900">{userName ?? 'Unidentified card'}</span>
              {studentStaffNumber && <span className="block text-xs text-ink-500">{studentStaffNumber}</span>}
            </Td>
            <Td className="text-ink-700">{bikeName ?? (event.note ? event.note : '—')}</Td>
            <Td className="text-ink-500">{shortRef(event.cardRef)}</Td>
            <Td className="text-ink-500">{shortRef(event.tagRef)}</Td>
            <Td>
              <div className="flex flex-col gap-1">
                <ResultBadge result={event.result} />
                {event.mismatchReason && (
                  <span className="text-xs text-ink-500">{MISMATCH_REASON_META[event.mismatchReason].label}</span>
                )}
                {event.offline && <span className="text-xs text-warn-600">Logged offline</span>}
              </div>
            </Td>
            <Td align="right">
              {event.verificationMs === null ? (
                <span className="text-ink-400">—</span>
              ) : (
                <span className={cx(event.verificationMs > VERIFICATION_BUDGET_MS ? 'text-alert-600' : 'text-ink-600')}>
                  {event.verificationMs} ms
                </span>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
