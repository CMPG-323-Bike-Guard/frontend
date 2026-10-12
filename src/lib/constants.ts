import type {
  AlarmStatus,
  BikeStatus,
  GateHealth,
  MismatchReason,
  Role,
  TagStatus,
} from '@/types';

export const APP_NAME = 'BikeGuard';
export const INSTITUTION = 'North-West University';
export const PROFILE_PATH = '/profile';

/** NFR-PER-01: the pairing check and gate release must complete in under 1.0s. */
export const VERIFICATION_BUDGET_MS = 1000;

/** NFR-REL-02: minimum read success rate for card/tag pairings. */
export const READ_SUCCESS_TARGET = 99.9;

/** NFR-SCA-01: the pilot gate must scale to all nine NWU gates without redesign. */
export const PLANNED_GATE_COUNT = 9;

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student / staff',
  guard: 'Security guard',
  admin: 'Administrator',
  
};

export const ROLE_HOME: Record<Role, string> = {
  student: '/my-bikes',
  guard: '/guard',
  admin: '/admin',
  
};

type Tone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info';

export const BIKE_STATUS_META: Record<BikeStatus, { label: string; tone: Tone; help: string }> = {
  draft: {
    label: 'Draft',
    tone: 'neutral',
    help: 'Saved but not submitted. Finish the details and submit it for review.',
  },
  pending_approval: {
    label: 'Waiting for review',
    tone: 'info',
    help: 'An administrator is checking the details before a tag is allocated.',
  },
  rejected: {
    label: 'Returned to you',
    tone: 'alert',
    help: 'The details need correcting before a tag can be issued.',
  },
  tag_pending: {
    label: 'Tag ready to collect',
    tone: 'warn',
    help: 'Collect the tag from Protection Services and fit it to the frame.',
  },
  active: {
    label: 'Protected',
    tone: 'ok',
    help: 'The gate recognises this bike when you tap your card.',
  },
  removed: {
    label: 'Removed',
    tone: 'neutral',
    help: 'This bike is no longer linked to your profile.',
  },
};

export const TAG_STATUS_META: Record<TagStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'ok' },
  awaiting_collection: { label: 'Awaiting collection', tone: 'warn' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
  lost: { label: 'Reported lost', tone: 'warn' },
  stolen: { label: 'Reported stolen', tone: 'alert' },
};

export const GATE_HEALTH_META: Record<GateHealth, { label: string; tone: Tone }> = {
  good: { label: 'Good', tone: 'ok' },
  warning: { label: 'Warning', tone: 'warn' },
  error: { label: 'Error', tone: 'alert' },
  not_commissioned: { label: 'Not commissioned', tone: 'neutral' },
};

export const ALARM_STATUS_META: Record<AlarmStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'alert' },
  escalated: { label: 'Escalated', tone: 'alert' },
  cleared_in_person: { label: 'Cleared in person', tone: 'ok' },
  reported_stolen: { label: 'Reported stolen', tone: 'alert' },
};

/**
 * UC-03 error flow: an unknown tag is presented differently from a tag that
 * belongs to somebody else, because the second carries far more theft risk.
 */
export const MISMATCH_REASON_META: Record<
  MismatchReason,
  { label: string; detail: string; risk: 'high' | 'medium' | 'low' }
> = {
  tag_not_registered: {
    label: 'Tag not registered',
    detail: 'This tag has never been issued on BikeGuard. The bike may be unregistered.',
    risk: 'medium',
  },
  tag_registered_to_other_user: {
    label: 'Tag belongs to another person',
    detail: 'The bike is registered to a different student. Treat as a possible theft.',
    risk: 'high',
  },
  tag_deactivated: {
    label: 'Tag deactivated',
    detail: 'This tag was deactivated and replaced. It can no longer open a gate.',
    risk: 'medium',
  },
  tag_reported_lost: {
    label: 'Tag reported lost',
    detail: 'The owner reported this tag lost. Confirm who is holding the bike.',
    risk: 'high',
  },
  tag_reported_stolen: {
    label: 'Bike reported stolen',
    detail: 'This bike is flagged as stolen. Hold the rider and call Protection Services.',
    risk: 'high',
  },
  incomplete_read: {
    label: 'Incomplete read',
    detail: 'Only one of the card and tag was read at the gate. Ask the rider to present both.',
    risk: 'low',
  },
};

/** Colour options offered during registration; free text is also accepted. */
export const COMMON_COLOURS = [
  'Black',
  'White',
  'Silver',
  'Grey',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Orange',
  'Purple',
  'Matte black',
  'Other',
];

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
