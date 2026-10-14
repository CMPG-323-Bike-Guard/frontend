import type {
  Alarm,
  AlarmResolution,
  AlarmView,
  Bike,
  BikeStatus,
  BikeView,
  CrossingView,
  DashboardStats,
  Gate,
  GateEvent,
  GateMode,
  MismatchReason,
  NewPerson,
  NewGate,
  Notification,
  PendingPhoto,
  PhotoModeration,
  PhotoReviewResult,
  PhotoTargetType,
  PermissionView,
  ReportBundle,
  RepeatMismatchRow,
  RfidTag,
  SeriesPoint,
  Session,
  User,
} from '@/types';
import { buildSeed, type SeedData } from './seed';
import { bikePhotoFor } from './media';
import { ALARM_ACK_TIMEOUT_MS, isLiveAlarm, PHOTO_ACCEPTED_TYPES, PHOTO_MAX_BYTES } from '@/lib/constants';

/**
 * Mock service.
 *
 * This stands in for the Fastify REST API and the Socket.io gateway described
 * in the Technical Specification (3.2, 6.2) so the whole interface can be
 * demonstrated before the backend exists. Nothing here is a real verification
 * engine: gate decisions are produced by `simulateCrossing`, which is only
 * reachable from the clearly-labelled gate simulator.
 */

let db: SeedData = buildSeed();
let counter = 90_000;

const newId = (prefix: string) => `${prefix}-${(++counter).toString(36)}`;
const nowIso = () => new Date().toISOString();

function latency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 140 + Math.random() * 220));
}

export class MockApiError extends Error {
  code: string;
  field?: string;
  constructor(code: string, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// Realtime channel (stands in for Socket.io / WSS ,  TDEC-05)
// ---------------------------------------------------------------------------

export type RealtimeEvent =
  | { type: 'crossing'; crossing: CrossingView }
  | { type: 'alarm'; alarm: AlarmView }
  | { type: 'alarm-updated'; alarm: AlarmView }
  | { type: 'alarm-escalated'; alarm: AlarmView }
  | { type: 'gate'; gate: Gate };

type Listener = (event: RealtimeEvent) => void;
const listeners = new Set<Listener>();

export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: RealtimeEvent): void {
  listeners.forEach((listener) => listener(event));
}

// ---------------------------------------------------------------------------
// Lookups and view builders
// ---------------------------------------------------------------------------

const userById = (id: string | null) => db.users.find((user) => user.userId === id) ?? null;
const bikeById = (id: string | null) => db.bikes.find((bike) => bike.bikeId === id) ?? null;
const gateById = (id: string) => db.gates.find((gate) => gate.gateId === id) ?? null;
const tagForBike = (bikeId: string) =>
  db.tags.find((tag) => tag.bikeId === bikeId && tag.status !== 'deactivated') ??
  db.tags.find((tag) => tag.bikeId === bikeId) ??
  null;
const tagByRef = (ref: string | null) =>
  ref ? db.tags.find((tag) => tag.tagRef.toUpperCase() === ref.toUpperCase()) ?? null : null;

function permissionViews(bikeId: string): PermissionView[] {
  return db.permissions
    .filter((permission) => permission.bikeId === bikeId)
    .map((permission) => {
      const user = userById(permission.authorisedUserId);
      return {
        ...permission,
        authorisedUserName: user?.name ?? 'Unknown student',
        authorisedStudentNumber: user?.studentStaffNumber ?? ', ',
      };
    });
}

function toBikeView(bike: Bike): BikeView {
  return {
    bike,
    tag: tagForBike(bike.bikeId),
    owner: userById(bike.ownerUserId) ?? db.users[0],
    permissions: permissionViews(bike.bikeId),
  };
}

function toCrossingView(event: GateEvent): CrossingView {
  const alarm = db.alarms.find((item) => item.eventId === event.eventId) ?? null;
  const user = userById(event.userId);
  const bike = bikeById(event.bikeId);
  return {
    event,
    gateName: gateById(event.gateId)?.name ?? 'Unknown gate',
    userName: user?.name ?? null,
    studentStaffNumber: user?.studentStaffNumber ?? null,
    bikeName: bike?.name ?? null,
    alarmStatus: alarm?.status ?? null,
  };
}

function toAlarmView(alarm: Alarm): AlarmView {
  const event = db.events.find((item) => item.eventId === alarm.eventId)!;
  const presentedUser = userById(event.userId);
  const tag = tagByRef(event.tagRef);
  const tagBike = tag ? bikeById(tag.bikeId) : null;
  const registeredOwner = tagBike ? userById(tagBike.ownerUserId) : null;
  return {
    alarm,
    event,
    gateName: gateById(event.gateId)?.name ?? 'Unknown gate',
    presentedUser,
    registeredOwner,
    tagBike,
    ownerBikes: presentedUser
      ? db.bikes.filter((bike) => bike.ownerUserId === presentedUser.userId && bike.status === 'active')
      : [],
    acknowledgedByName: userById(alarm.acknowledgedByUserId)?.name ?? null,
    resolvedByName: userById(alarm.resolvedByUserId)?.name ?? null,
  };
}

function record(actorUserId: string | null, action: string, entityType: string, entityId: string, detail: string) {
  db.audit.unshift({
    auditId: newId('au'),
    actorUserId,
    action,
    entityType,
    entityId,
    timestamp: nowIso(),
    detail,
  });
}

function notify(userId: string, notification: Omit<Notification, 'notificationId' | 'userId' | 'createdAt' | 'read'>) {
  db.notifications.unshift({
    notificationId: newId('n'),
    userId,
    createdAt: nowIso(),
    read: false,
    ...notification,
  });
}

// ---------------------------------------------------------------------------
// Alarm escalation
// ---------------------------------------------------------------------------

/** Supervisors / managers who are told when an alarm is escalated. */
const supervisors = () => db.users.filter((user) => user.role === 'admin' && user.accountStatus === 'active');

function escalate(alarm: Alarm, reason: 'no_acknowledgement' | 'guard_request', actorUserId: string | null, notes?: string) {
  alarm.status = 'escalated';
  alarm.escalatedAt = nowIso();
  alarm.escalationReason = reason;
  if (notes?.trim()) alarm.notes = notes.trim();

  const view = toAlarmView(alarm);
  const who = view.presentedUser?.name ?? 'an unidentified card';
  const why =
    reason === 'no_acknowledgement'
      ? `No guard acknowledged it within ${Math.round(ALARM_ACK_TIMEOUT_MS / 60_000)} min.`
      : `${userById(actorUserId)?.name ?? 'A guard'} asked for help.`;

  record(actorUserId, 'alarm.escalated', 'alarm', alarm.alarmId, `Escalated to supervisor. ${why}`);
  supervisors().forEach((supervisor) =>
    notify(supervisor.userId, {
      kind: 'security',
      title: `Alarm escalated at ${view.gateName}`,
      body: `Gate held for ${who}. ${why} Please follow up with the guard on duty.`,
    }),
  );
  emit({ type: 'alarm-escalated', alarm: view });
}

/**
 * Automatic escalation: any alarm still pending after its deadline is
 * escalated. A real backend runs this as a scheduled job (every few seconds),
 * so it fires even when no guard has the dashboard open.
 */
export function escalateOverdueAlarms(now: number = Date.now()): number {
  const overdue = db.alarms.filter(
    (alarm) => alarm.status === 'pending' && new Date(alarm.acknowledgeBy).getTime() <= now,
  );
  overdue.forEach((alarm) => escalate(alarm, 'no_acknowledgement', null));
  return overdue.length;
}

if (typeof window !== 'undefined') {
  window.setInterval(() => escalateOverdueAlarms(), 5_000);
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function buildStats(): DashboardStats {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = db.events.filter((event) => new Date(event.timestamp) >= startOfDay);
  const durations = db.events
    .map((event) => event.verificationMs)
    .filter((value): value is number => typeof value === 'number');
  const automated = db.events.filter((event) => event.source === 'automated');
  const incomplete = automated.filter((event) => event.mismatchReason === 'incomplete_read');

  return {
    crossingsToday: today.length,
    matchesToday: today.filter((event) => event.result === 'match').length,
    mismatchesToday: today.filter((event) => event.result === 'mismatch').length,
    openAlarms: db.alarms.filter((alarm) => isLiveAlarm(alarm.status)).length,
    manualGates: db.gates.filter((gate) => gate.mode === 'manual').length,
    registeredBikes: db.bikes.filter((bike) => bike.status === 'active').length,
    pendingRegistrations: db.bikes.filter((bike) => bike.status === 'pending_approval').length,
    medianVerificationMs: percentile(durations, 0.5),
    p95VerificationMs: percentile(durations, 0.95),
    readSuccessRate: automated.length === 0 ? 100 : 100 - (incomplete.length / automated.length) * 100,
  };
}

function buildReports(days: number): ReportBundle {
  const cutoff = Date.now() - days * 86_400_000;
  const scoped = db.events.filter((event) => new Date(event.timestamp).getTime() >= cutoff);

  const byDay = new Map<string, SeriesPoint>();
  const byHour = new Map<number, SeriesPoint>();

  scoped.forEach((event) => {
    const date = new Date(event.timestamp);
    const dayKey = date.toISOString().slice(0, 10);
    const dayLabel = date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
    const day = byDay.get(dayKey) ?? { label: dayLabel, matches: 0, mismatches: 0, manual: 0 };
    const hourKey = date.getHours();
    const hour = byHour.get(hourKey) ?? {
      label: `${hourKey.toString().padStart(2, '0')}:00`,
      matches: 0,
      mismatches: 0,
      manual: 0,
    };

    if (event.result === 'match') {
      day.matches += 1;
      hour.matches += 1;
    } else if (event.result === 'mismatch') {
      day.mismatches += 1;
      hour.mismatches += 1;
    } else {
      day.manual += 1;
      hour.manual += 1;
    }

    byDay.set(dayKey, day);
    byHour.set(hourKey, hour);
  });

  const repeats = new Map<string, RepeatMismatchRow>();
  scoped
    .filter((event) => event.result === 'mismatch')
    .forEach((event) => {
      const user = userById(event.userId);
      const key = user?.userId ?? 'unknown';
      const row =
        repeats.get(key) ??
        ({
          userId: user?.userId ?? null,
          name: user?.name ?? 'Unidentified person',
          studentStaffNumber: user?.studentStaffNumber ?? ', ',
          count: 0,
          lastSeen: event.timestamp,
          reasons: [],
        } satisfies RepeatMismatchRow);
      row.count += 1;
      row.lastSeen = event.timestamp > row.lastSeen ? event.timestamp : row.lastSeen;
      if (event.mismatchReason && !row.reasons.includes(event.mismatchReason)) {
        row.reasons.push(event.mismatchReason);
      }
      repeats.set(key, row);
    });

  const uptake: Array<{ label: string; registered: number }> = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const edge = Date.now() - offset * 86_400_000;
    uptake.push({
      label: new Date(edge).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      registered: db.bikes.filter(
        (bike) => bike.status === 'active' && new Date(bike.submittedAt).getTime() <= edge,
      ).length,
    });
  }

  return {
    stats: buildStats(),
    throughputByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
    throughputByHour: [...byHour.entries()].sort(([a], [b]) => a - b).map(([, value]) => value),
    repeatMismatches: [...repeats.values()].filter((row) => row.count > 1).sort((a, b) => b.count - a.count),
    registrationUptake: uptake,
  };
}

// ---------------------------------------------------------------------------
// Operations ,  grouped to match the REST resources in src/api/endpoints.ts
// ---------------------------------------------------------------------------

export interface CrossingFilters {
  gateId?: string;
  result?: 'match' | 'mismatch' | 'manual';
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface BikeInput {
  name: string;
  makeModel: string;
  colour: string;
  photoDataUrl: string | null;
}

export interface ProfileDetailsInput {
  name: string;
  email: string;
  phone: string;
}

function requireActor(userId: string) {
  const actor = userById(userId);
  if (!actor) throw new MockApiError('unauthenticated', 'Sign in before making this change.');
  if (actor.accountStatus !== 'active') {
    throw new MockApiError('account_suspended', 'This account is suspended.');
  }
  return actor;
}

function requireSelf(actorUserId: string, ownerUserId: string) {
  requireActor(actorUserId);
  if (actorUserId !== ownerUserId) {
    throw new MockApiError('forbidden', 'You can only update your own details.');
  }
}

function requireAdmin(adminUserId: string) {
  const admin = requireActor(adminUserId);
  if (admin.role !== 'admin') throw new MockApiError('forbidden', 'Only admins can review photos.');
  return admin;
}

function validatePhotoDataUrl(dataUrl: string) {
  if (typeof dataUrl !== 'string') {
    throw new MockApiError('invalid_photo', 'Upload a JPG, PNG or WebP image.', 'photoDataUrl');
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match || !PHOTO_ACCEPTED_TYPES.includes(match[1])) {
    throw new MockApiError('invalid_file_type', 'Use a JPG, PNG or WebP image.', 'photoDataUrl');
  }
  const encoded = match[2];
  if (!encoded || encoded.length % 4 !== 0) {
    throw new MockApiError('invalid_photo', 'The image file is empty or invalid.', 'photoDataUrl');
  }
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((encoded.length * 3) / 4) - padding;
  if (byteLength > PHOTO_MAX_BYTES) {
    throw new MockApiError('file_too_large', 'The image must be 5 MB or smaller.', 'photoDataUrl');
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  } catch {
    throw new MockApiError('invalid_photo', 'The image file is empty or invalid.', 'photoDataUrl');
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => bytes[index] === byte);
  const isWebp = bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  const matchesType = match[1] === 'image/jpeg' ? isJpeg
    : match[1] === 'image/png' ? isPng
      : isWebp;
  if (!matchesType) {
    throw new MockApiError('invalid_file_type', 'The image content must match its JPG, PNG or WebP type.', 'photoDataUrl');
  }
}

function setPendingPhoto(photo: PhotoModeration, dataUrl: string) {
  validatePhotoDataUrl(dataUrl);
  photo.pending = dataUrl;
  photo.status = 'pending';
  photo.rejectionReason = null;
  photo.reviewedBy = null;
  photo.reviewedAt = null;
  photo.submittedAt = nowIso();
}

function photoReviewResult(targetType: PhotoTargetType, entityId: string, photo: PhotoModeration): PhotoReviewResult {
  return { targetType, entityId, photo };
}

export const mockApi = {
  /**
   * There is no real backend or password store yet, so this only checks
   * that the number belongs to an active account ,  it does not verify the
   * password. Replace this with a real credential check once auth exists.
   */
  async login(studentStaffNumber: string, _password: string): Promise<Session> {
    await latency();
    const user = db.users.find((item) => item.studentStaffNumber === studentStaffNumber.trim());
    if (!user) {
      throw new MockApiError('invalid_credentials', 'That student/staff number and password do not match.');
    }
    if (user.accountStatus !== 'active') {
      throw new MockApiError('account_suspended', 'This account is suspended. Contact the IT service desk.');
    }
    record(user.userId, 'auth.login', 'user', user.userId, `${user.name} signed in.`);
    return { token: `mock.${user.userId}.${Date.now()}`, user };
  },

  async session(token: string): Promise<Session> {
    await latency();
    const userId = token.split('.')[1];
    const user = userById(userId);
    if (!user) throw new MockApiError('unauthenticated', 'Your session has expired. Sign in again.');
    return { token, user };
  },

  async updateOwnDetails(actorUserId: string, input: ProfileDetailsInput): Promise<User> {
    await latency();
    const user = userById(actorUserId);
    if (!user) throw new MockApiError('unauthenticated', 'Sign in before making this change.');
    requireSelf(actorUserId, user.userId);

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    if (name.length < 2 || name.length > 80) {
      throw new MockApiError('invalid_name', 'Name must be between 2 and 80 characters.', 'name');
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new MockApiError('invalid_email', 'Enter a valid email address.', 'email');
    }
    if (phone.length > 30 || (phone && !/^\+?[\d\s().-]{7,30}$/.test(phone))) {
      throw new MockApiError('invalid_phone', 'Enter a valid phone number.', 'phone');
    }
    if (db.users.some((item) => item.userId !== user.userId && item.email.toLowerCase() === email)) {
      throw new MockApiError('conflict', 'That email address is already in use.', 'email');
    }

    user.name = name;
    user.email = email;
    user.phone = phone || null;
    record(actorUserId, 'profile.updated', 'user', user.userId, 'Name, email, and phone updated.');
    return user;
  },

  async changeOwnPassword(actorUserId: string, currentPassword: string, newPassword: string): Promise<{ success: true }> {
    await latency();
    const user = userById(actorUserId);
    if (!user) throw new MockApiError('unauthenticated', 'Sign in before making this change.');
    requireSelf(actorUserId, user.userId);
    if (!currentPassword) {
      throw new MockApiError('current_password_required', 'Enter your current password.', 'currentPassword');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new MockApiError('invalid_password', 'Passwords must be at least 8 characters.', 'newPassword');
    }
    // The mock intentionally neither retains nor records password values.
    record(actorUserId, 'profile.password_changed', 'user', user.userId, 'Password change requested.');
    return { success: true };
  },

  async submitProfilePhoto(actorUserId: string, dataUrl: string): Promise<User> {
    await latency();
    const user = userById(actorUserId);
    if (!user) throw new MockApiError('unauthenticated', 'Sign in before making this change.');
    requireSelf(actorUserId, user.userId);
    setPendingPhoto(user.photo, dataUrl);
    record(actorUserId, 'profile.photo_submitted', 'user', user.userId, 'Profile photo submitted for review.');
    return user;
  },

  async submitBikePhoto(bikeId: string, actorUserId: string, dataUrl: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    requireSelf(actorUserId, bike.ownerUserId);
    setPendingPhoto(bike.photo, dataUrl);
    record(actorUserId, 'bike.photo_submitted', 'bike', bike.bikeId, 'Bike photo submitted for review.');
    return toBikeView(bike);
  },

  // ---- Student -----------------------------------------------------------

  async listBikesForUser(userId: string): Promise<BikeView[]> {
    await latency();
    return db.bikes
      .filter((bike) => bike.ownerUserId === userId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map(toBikeView);
  },

  async getBike(bikeId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike is no longer on your profile.');
    return toBikeView(bike);
  },

  /** UC-01. `submit: false` keeps the registration as a draft (alternative flow). */
  async createBike(
    ownerUserId: string,
    input: BikeInput,
    submit: boolean,
    actorUserId: string,
  ): Promise<BikeView> {
    await latency();
    const owner = userById(ownerUserId);
    if (!owner) throw new MockApiError('not_found', 'No student matches that number.', 'studentNumber');

  

    const livePhoto = bikePhotoFor(input.colour, input.makeModel);
    const photo: PhotoModeration = {
      live: livePhoto,
      pending: null,
      status: 'approved',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: null,
    };
    if (input.photoDataUrl) setPendingPhoto(photo, input.photoDataUrl);

    const bike: Bike = {
      bikeId: newId('b'),
      ownerUserId,
      name: input.name.trim(),
      makeModel: input.makeModel.trim(),
      colour: input.colour.trim(),
      photo,
      photoPath: photo.live,
      status: submit ? 'pending_approval' : 'draft',
      submittedAt: nowIso(),
      reviewedAt: null,
      reviewNote: null,
    };
    db.bikes.unshift(bike);
    record(actorUserId, submit ? 'registration.submitted' : 'registration.drafted', 'bike', bike.bikeId, `${bike.name} (${bike.makeModel}).`);
    if (submit && actorUserId !== ownerUserId) {
      notify(ownerUserId, {
        title: 'A bike was registered for you',
        body: `${bike.name} was added to your profile at the Protection Services desk.`,
        kind: 'registration',
      });
    }
    return toBikeView(bike);
  },

  async updateBike(bikeId: string, input: Partial<BikeInput>, actorUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    if (input.name !== undefined) bike.name = input.name.trim();
    if (input.makeModel !== undefined) bike.makeModel = input.makeModel.trim();
    if (input.colour !== undefined) bike.colour = input.colour.trim();
    if (input.photoDataUrl) {
      requireSelf(actorUserId, bike.ownerUserId);
      setPendingPhoto(bike.photo, input.photoDataUrl);
    }
    record(actorUserId, 'registration.updated', 'bike', bike.bikeId, `Details updated for ${bike.name}.`);
    return toBikeView(bike);
  },

  async submitBike(bikeId: string, actorUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    bike.status = 'pending_approval';
    bike.reviewNote = null;
    bike.submittedAt = nowIso();
    record(actorUserId, 'registration.submitted', 'bike', bike.bikeId, `${bike.name} submitted for review.`);
    return toBikeView(bike);
  },

  /** FR-STU-04. The owner flags the tag; deactivation stays an admin action. */
  async reportTagLost(bikeId: string, actorUserId: string, stolen: boolean): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    const tag = tagForBike(bikeId);
    if (!bike || !tag) throw new MockApiError('not_found', 'No active tag is linked to that bike.');
    tag.status = stolen ? 'stolen' : 'lost';
    record(actorUserId, stolen ? 'tag.reported_stolen' : 'tag.reported_lost', 'rfid_tag', tag.tagId, `${tag.tagRef} flagged by the owner.`);
    notify(bike.ownerUserId, {
      title: stolen ? 'Bike reported stolen' : 'Lost tag recorded',
      body: `Tag ${tag.tagRef} is flagged. Guards are alerted if it is presented at a gate. Collect a replacement from Protection Services.`,
      kind: 'security',
    });
    return toBikeView(bike);
  },

  /** FR-STU-05. Unlinks the tag and takes the bike off the student's profile. */
  async removeBike(bikeId: string, actorUserId: string): Promise<void> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    const tag = tagForBike(bikeId);
    if (tag && tag.status !== 'deactivated') {
      tag.status = 'deactivated';
      tag.deactivatedAt = nowIso();
    }
    bike.status = 'removed';
    record(actorUserId, 'registration.removed', 'bike', bike.bikeId, `${bike.name} removed from the profile; tag deactivated.`);
  },

  async listNotifications(userId: string): Promise<Notification[]> {
    await latency();
    return db.notifications.filter((item) => item.userId === userId);
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await latency();
    const notification = db.notifications.find((item) => item.notificationId === notificationId);
    if (notification) notification.read = true;
  },

  /** FR-STU-07. */
  async grantPermission(bikeId: string, studentNumber: string, actorUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    const target = db.users.find((user) => user.studentStaffNumber === studentNumber.trim() && user.role === 'student');
    if (!target) throw new MockApiError('not_found', 'No student matches that number.', 'studentNumber');
    if (target.userId === bike.ownerUserId) {
      throw new MockApiError('invalid', 'You already own this bike.', 'studentNumber');
    }
    const existing = db.permissions.find(
      (permission) => permission.bikeId === bikeId && permission.authorisedUserId === target.userId && permission.status === 'active',
    );
    if (existing) throw new MockApiError('conflict', `${target.name} can already use this bike.`, 'studentNumber');

    db.permissions.push({
      permissionId: newId('p'),
      bikeId,
      authorisedUserId: target.userId,
      status: 'active',
      grantedAt: nowIso(),
      revokedAt: null,
    });
    record(actorUserId, 'permission.granted', 'bike_permission', bikeId, `${target.name} authorised to use ${bike.name}.`);
    notify(target.userId, {
      title: `You can use ${bike.name}`,
      body: `${userById(bike.ownerUserId)?.name ?? 'The owner'} authorised you to take this bike through the gate.`,
      kind: 'registration',
    });
    return toBikeView(bike);
  },

  async revokePermission(permissionId: string, actorUserId: string): Promise<BikeView> {
    await latency();
    const permission = db.permissions.find((item) => item.permissionId === permissionId);
    if (!permission) throw new MockApiError('not_found', 'That permission no longer exists.');
    permission.status = 'revoked';
    permission.revokedAt = nowIso();
    record(actorUserId, 'permission.revoked', 'bike_permission', permission.bikeId, 'Authorisation withdrawn.');
    return toBikeView(bikeById(permission.bikeId)!);
  },

  // ---- Gates and guard work -----------------------------------------------

  async listGates(): Promise<Gate[]> {
    await latency();
    return [...db.gates];
  },

    async createGate(input: NewGate, adminUserId: string): Promise<Gate> {
    await latency();
    const name = input.name.trim();
    if (db.gates.some((item) => item.name === name)) {
      throw new MockApiError('conflict', 'A gate with that name already exists.', 'name');
    }
    const gate: Gate = {
      gateId: newId('g'),
      name,
      location: input.location.trim(),
      health: 'good',
      commissioned: true,
      mode: 'automated',
      manualSince: null,
    };
    db.gates.push(gate);
    record(adminUserId, 'gate.created', 'gate', gate.gateId, `Gate "${gate.name}" was added${gate.location ? ` at ${gate.location}` : ''}.`);
    emit({ type: 'gate', gate });
    return gate;
  },

  /** UC-06. */
  async setGateMode(gateId: string, mode: GateMode, actorUserId: string): Promise<Gate> {
    await latency();
    const gate = gateById(gateId);
    if (!gate) throw new MockApiError('not_found', 'That gate is not configured.');
    gate.mode = mode;
    gate.manualSince = mode === 'manual' ? nowIso() : null;
    // A reader that is genuinely down stays in error until it answers again.
    gate.health = mode === 'automated' ? 'good' : gate.health === 'error' ? 'error' : 'warning';
    record(actorUserId, mode === 'manual' ? 'gate.manual_mode_on' : 'gate.manual_mode_off', 'gate', gateId, `Gate switched to ${mode} mode.`);
    emit({ type: 'gate', gate });
    return gate;
  },

  async listAlarms(status: 'live' | 'all' = 'live'): Promise<AlarmView[]> {
    await latency();
    escalateOverdueAlarms();
    return db.alarms
      .filter((alarm) => (status === 'live' ? isLiveAlarm(alarm.status) : true))
      .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))
      .slice(0, status === 'live' ? 20 : 100)
      .map(toAlarmView);
  },

  /** Acknowledge button: the guard confirms they have seen the alarm. */
  async acknowledgeAlarm(alarmId: string, guardUserId: string): Promise<AlarmView> {
    await latency();
    const alarm = db.alarms.find((item) => item.alarmId === alarmId);
    if (!alarm) throw new MockApiError('not_found', 'That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw new MockApiError('conflict', 'That alarm has already been resolved.');
    if (alarm.acknowledgedAt) throw new MockApiError('conflict', 'Another guard has already acknowledged this alarm.');

    alarm.acknowledgedAt = nowIso();
    alarm.acknowledgedByUserId = guardUserId;
    // A late acknowledgement keeps the escalated status so the supervisor still sees it.
    if (alarm.status === 'pending') alarm.status = 'acknowledged';

    const seconds = Math.round((Date.now() - new Date(alarm.raisedAt).getTime()) / 1000);
    record(
      guardUserId,
      'alarm.acknowledged',
      'alarm',
      alarmId,
      `${userById(guardUserId)?.name ?? 'Guard'} acknowledged the alarm after ${seconds}s.`,
    );
    const view = toAlarmView(alarm);
    emit({ type: 'alarm-updated', alarm: view });
    return view;
  },

  /** A guard asks the supervisor for help (manual escalation). */
  async escalateAlarm(alarmId: string, notes: string, guardUserId: string): Promise<AlarmView> {
    await latency();
    const alarm = db.alarms.find((item) => item.alarmId === alarmId);
    if (!alarm) throw new MockApiError('not_found', 'That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw new MockApiError('conflict', 'That alarm has already been resolved.');
    if (alarm.status === 'escalated') throw new MockApiError('conflict', 'This alarm is already escalated.');
    if (!alarm.acknowledgedAt) {
      alarm.acknowledgedAt = nowIso();
      alarm.acknowledgedByUserId = guardUserId;
    }
    escalate(alarm, 'guard_request', guardUserId, notes);
    return toAlarmView(alarm);
  },

  /** FR-SEC-05: the guard who performed the in-person check is recorded. */
  async resolveAlarm(
    alarmId: string,
    outcome: AlarmResolution,
    notes: string,
    guardUserId: string,
  ): Promise<AlarmView> {
    await latency();
    const alarm = db.alarms.find((item) => item.alarmId === alarmId);
    if (!alarm) throw new MockApiError('not_found', 'That alarm no longer exists.');
    if (!isLiveAlarm(alarm.status)) throw new MockApiError('conflict', 'That alarm has already been resolved.');

    const now = nowIso();
    // Resolving implies the guard has seen it; keep the audit trail complete.
    if (!alarm.acknowledgedAt) {
      alarm.acknowledgedAt = now;
      alarm.acknowledgedByUserId = guardUserId;
    }
    alarm.status = outcome;
    alarm.notes = notes.trim() || alarm.notes;
    alarm.resolvedByUserId = guardUserId;
    alarm.resolvedAt = now;

    const guard = userById(guardUserId);
    record(
      guardUserId,
      `alarm.resolved.${outcome}`,
      'alarm',
      alarmId,
      `${guard?.name ?? 'Guard'} resolved the alarm: ${outcome.replace(/_/g, ' ')}.`,
    );
    const view = toAlarmView(alarm);
    emit({ type: 'alarm-updated', alarm: view });
    return view;
  },

  /** UC-06 step 3: a crossing logged by hand while the gate is offline. */
  async logManualCrossing(
    input: { gateId: string; studentNumber: string; bikeDescription: string; note: string },
    guardUserId: string,
  ): Promise<CrossingView> {
    await latency();
    const gate = gateById(input.gateId);
    if (!gate) throw new MockApiError('not_found', 'That gate is not configured.');
    const user = db.users.find((item) => item.studentStaffNumber === input.studentNumber.trim()) ?? null;

    const event: GateEvent = {
      eventId: newId('e'),
      timestamp: nowIso(),
      gateId: gate.gateId,
      userId: user?.userId ?? null,
      bikeId: null,
      studentNumber: user?.studentStaffNumber ?? null,
      tagRef: null,
      result: 'manual',
      mismatchReason: null,
      source: 'manual_entry',
      guardUserId,
      verificationMs: null,
      offline: true,
      note: `${input.bikeDescription.trim()}${input.note.trim() ? ` ,  ${input.note.trim()}` : ''}`,
    };
    db.events.push(event);
    record(guardUserId, 'crossing.manual', 'gate_event', event.eventId, `Manual crossing for ${input.studentNumber}.`);
    const view = toCrossingView(event);
    emit({ type: 'crossing', crossing: view });
    return view;
  },

  async listCrossings(filters: CrossingFilters = {}): Promise<CrossingView[]> {
    await latency();
    const query = filters.query?.trim().toLowerCase() ?? '';
    const from = filters.from ? new Date(filters.from).getTime() : null;
    const to = filters.to ? new Date(filters.to).getTime() + 86_399_000 : null;

    return db.events
      .filter((event) => {
        if (filters.gateId && event.gateId !== filters.gateId) return false;
        if (filters.result && event.result !== filters.result) return false;
        const time = new Date(event.timestamp).getTime();
        if (from && time < from) return false;
        if (to && time > to) return false;
        if (query) {
          const user = userById(event.userId);
          const bike = bikeById(event.bikeId);
          const haystack = [
            user?.name,
            user?.studentStaffNumber,
            bike?.name,
            bike?.makeModel,
            event.tagRef,
            event.studentNumber,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, filters.limit ?? 200)
      .map(toCrossingView);
  },

  // ---- Administration ----------------------------------------------------

  async listRegistrations(status?: BikeStatus): Promise<BikeView[]> {
    await latency();
    return db.bikes
      .filter((bike) => (status ? bike.status === status : true))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map(toBikeView);
  },

  async listPendingPhotos(adminUserId: string): Promise<PendingPhoto[]> {
    await latency();
    requireAdmin(adminUserId);
    const userPhotos: PendingPhoto[] = db.users
      .filter((user) => user.photo.status === 'pending' && user.photo.pending)
      .map((user) => ({
        targetType: 'user',
        entityId: user.userId,
        ownerUserId: user.userId,
        ownerName: user.name,
        photo: user.photo,
      }));
    const bikePhotos: PendingPhoto[] = db.bikes
      .filter((bike) => bike.photo.status === 'pending' && bike.photo.pending)
      .map((bike) => ({
        targetType: 'bike',
        entityId: bike.bikeId,
        ownerUserId: bike.ownerUserId,
        ownerName: userById(bike.ownerUserId)?.name ?? 'Unknown user',
        photo: bike.photo,
      }));
    return [...userPhotos, ...bikePhotos].sort((left, right) =>
      (right.photo.submittedAt ?? '').localeCompare(left.photo.submittedAt ?? ''),
    );
  },

  async approvePhoto(
    targetType: PhotoTargetType,
    entityId: string,
    adminUserId: string,
  ): Promise<PhotoReviewResult> {
    await latency();
    requireAdmin(adminUserId);
    const target = targetType === 'user' ? userById(entityId) : bikeById(entityId);
    if (!target) throw new MockApiError('not_found', 'That photo owner or bike no longer exists.');
    if (target.photo.status !== 'pending' || !target.photo.pending) {
      throw new MockApiError('not_pending', 'That photo is not awaiting review.');
    }
    target.photo.live = target.photo.pending;
    target.photo.pending = null;
    target.photo.status = 'approved';
    target.photo.rejectionReason = null;
    target.photo.reviewedBy = adminUserId;
    target.photo.reviewedAt = nowIso();
    target.photo.submittedAt ??= target.photo.reviewedAt;
    target.photoPath = target.photo.live;
    record(adminUserId, 'photo.approved', targetType, entityId, `${targetType} photo approved.`);
    const ownerUserId = targetType === 'user' ? (target as User).userId : (target as Bike).ownerUserId;
    const subject = targetType === 'user' ? 'Your profile picture' : `The photo for ${target.name}`;
    notify(ownerUserId, {
      title: `${subject} was approved`,
      body: `${subject} is approved and now live.`,
      kind: 'photo_review',
    });
    return photoReviewResult(targetType, entityId, target.photo);
  },

  async rejectPhoto(
    targetType: PhotoTargetType,
    entityId: string,
    reason: string,
    adminUserId: string,
  ): Promise<PhotoReviewResult> {
    await latency();
    requireAdmin(adminUserId);
    const target = targetType === 'user' ? userById(entityId) : bikeById(entityId);
    if (!target) throw new MockApiError('not_found', 'That photo owner or bike no longer exists.');
    if (target.photo.status !== 'pending' || !target.photo.pending) {
      throw new MockApiError('not_pending', 'That photo is not awaiting review.');
    }
    const rejectionReason = reason.trim();
    if (!rejectionReason) {
      throw new MockApiError('reason_required', 'A rejection reason is required.', 'reason');
    }
    target.photo.status = 'rejected';
    target.photo.rejectionReason = rejectionReason;
    target.photo.reviewedBy = adminUserId;
    target.photo.reviewedAt = nowIso();
    target.photoPath = target.photo.live;
    record(adminUserId, 'photo.rejected', targetType, entityId, `Photo rejected: ${rejectionReason}`);
    const ownerUserId = targetType === 'user' ? (target as User).userId : (target as Bike).ownerUserId;
    const subject = targetType === 'user' ? 'Your profile picture' : `The photo for ${target.name}`;
    notify(ownerUserId, {
      title: `${subject} was not approved`,
      body: `${subject} was not approved. Reason: ${rejectionReason}`,
      kind: 'photo_review',
    });
    return photoReviewResult(targetType, entityId, target.photo);
  },

  /** FR-ADM-02 + flow chart 5.2: approve, allocate a tag, tell the student. */
  async approveRegistration(bikeId: string, tagRef: string, adminUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That registration no longer exists.');
    const normalised = tagRef.trim().toUpperCase();
    // UC-01 step 4: a tag may only ever belong to one registration.
    const clash = db.tags.find((tag) => tag.tagRef.toUpperCase() === normalised && tag.status !== 'deactivated');
    if (clash) {
      throw new MockApiError('conflict', `Tag ${normalised} is already issued to another bike.`, 'tagRef');
    }

    const tag: RfidTag = {
      tagId: newId('t'),
      bikeId,
      tagRef: normalised,
      status: 'awaiting_collection',
      issuedAt: nowIso(),
      deactivatedAt: null,
      replacesTagId: null,
    };
    db.tags.push(tag);
    bike.status = 'tag_pending';
    bike.reviewedAt = nowIso();
    bike.reviewNote = null;

    record(adminUserId, 'registration.approved', 'bike', bikeId, `Approved and tag ${normalised} allocated.`);
    notify(bike.ownerUserId, {
      title: 'Your tag is ready to collect',
      body: `Tag ${normalised} for “${bike.name}” is ready at the Protection Services desk. Bring your student card.`,
      kind: 'tag_ready',
    });
    return toBikeView(bike);
  },

  async rejectRegistration(bikeId: string, reason: string, adminUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That registration no longer exists.');
    bike.status = 'rejected';
    bike.reviewedAt = nowIso();
    bike.reviewNote = reason.trim();
    record(adminUserId, 'registration.rejected', 'bike', bikeId, reason.trim());
    notify(bike.ownerUserId, {
      title: `${bike.name} needs another look`,
      body: reason.trim(),
      kind: 'registration',
    });
    return toBikeView(bike);
  },

  /** Flow chart 5.2 final step: the student collected and fitted the tag. */
  async markTagCollected(tagId: string, adminUserId: string): Promise<BikeView> {
    await latency();
    const tag = db.tags.find((item) => item.tagId === tagId);
    if (!tag) throw new MockApiError('not_found', 'That tag no longer exists.');
    tag.status = 'active';
    const bike = bikeById(tag.bikeId)!;
    bike.status = 'active';
    record(adminUserId, 'tag.collected', 'rfid_tag', tagId, `${tag.tagRef} collected and fitted to ${bike.name}.`);
    notify(bike.ownerUserId, {
      title: `${bike.name} is protected`,
      body: 'Tap your card at the pilot gate and the boom lifts automatically.',
      kind: 'registration',
    });
    return toBikeView(bike);
  },

  /** UC-04. */
  async deactivateTag(tagId: string, reason: string, adminUserId: string): Promise<BikeView> {
    await latency();
    const tag = db.tags.find((item) => item.tagId === tagId);
    if (!tag) throw new MockApiError('not_found', 'That tag no longer exists.');
    tag.status = 'deactivated';
    tag.deactivatedAt = nowIso();
    const bike = bikeById(tag.bikeId)!;
    bike.status = 'tag_pending';
    record(adminUserId, 'tag.deactivated', 'rfid_tag', tagId, `${tag.tagRef} deactivated: ${reason.trim() || 'no reason given'}.`);
    return toBikeView(bike);
  },

  /** UC-04 main flow: deactivate and re-link without losing history. */
  async replaceTag(bikeId: string, newTagRef: string, adminUserId: string): Promise<BikeView> {
    await latency();
    const bike = bikeById(bikeId);
    if (!bike) throw new MockApiError('not_found', 'That bike no longer exists.');
    const normalised = newTagRef.trim().toUpperCase();
    const clash = db.tags.find((tag) => tag.tagRef.toUpperCase() === normalised && tag.status !== 'deactivated');
    if (clash) throw new MockApiError('conflict', `Tag ${normalised} is already issued.`, 'tagRef');

    const previous = tagForBike(bikeId);
    if (previous) {
      previous.status = 'deactivated';
      previous.deactivatedAt = nowIso();
    }
    db.tags.push({
      tagId: newId('t'),
      bikeId,
      tagRef: normalised,
      status: 'awaiting_collection',
      issuedAt: nowIso(),
      deactivatedAt: null,
      replacesTagId: previous?.tagId ?? null,
    });
    bike.status = 'tag_pending';
    record(adminUserId, 'tag.replaced', 'bike', bikeId, `${previous?.tagRef ?? 'previous tag'} replaced by ${normalised}. Registration history retained.`);
    notify(bike.ownerUserId, {
      title: 'Replacement tag ready to collect',
      body: `Tag ${normalised} is ready at the Protection Services desk. Your registration history is unchanged.`,
      kind: 'tag_ready',
    });
    return toBikeView(bike);
  },

  async listUsers(role?: 'student' | 'guard' | 'admin'): Promise<User[]> {
    await latency();
    return db.users.filter((user) => (role ? user.role === role : true));
  },

  async findUserByNumber(studentNumber: string): Promise<User | null> {
    await latency();
    return db.users.find((user) => user.studentStaffNumber === studentNumber.trim()) ?? null;
  },


    async createUser(person: NewPerson, adminUserId: string): Promise<User> {
    await latency();
    const number = person.studentStaffNumber.trim();
    const email = person.email.trim().toLowerCase();
    if (db.users.some((item) => item.studentStaffNumber === number)) {
      throw new MockApiError('conflict', 'Someone with that student or staff number already exists.', 'studentStaffNumber');
    }
    if (db.users.some((item) => item.email.toLowerCase() === email)) {
      throw new MockApiError('conflict', 'That email address is already in use.', 'email');
    }

    const user: User = {
      userId: newId('u'),
      studentStaffNumber: number,
      name: person.name.trim(),
      role: person.role,
      email,
      phone: null,
      photo: {
        live: null,
        pending: null,
        status: 'none',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        submittedAt: null,
      },
      photoPath: null,
      accountStatus: 'active',
    };
    db.users.push(user);
    record(adminUserId, 'user.created', 'user', user.userId, `${user.name} (${user.role}) was added with number ${number}.`);
    return user;
  },

  async listAudit(limit = 40) {
    await latency();
    return db.audit.slice(0, limit).map((entry) => ({
      ...entry,
      actorName: userById(entry.actorUserId)?.name ?? 'System',
    }));
  },

  async stats(): Promise<DashboardStats> {
    await latency();
    return buildStats();
  },

  async reports(days: number): Promise<ReportBundle> {
    await latency();
    return buildReports(days);
  },

  // ---- Gate simulator (demonstration only) ------------------------------

  /**
   * Produces the gate events that the real verification engine would produce.
   * Only the demo simulator calls this ,  it is not part of the production API
   * surface and has no equivalent in src/api/endpoints.ts.
   */
  async simulateCrossing(
    gateId: string,
    scenario:
      | 'match'
      | 'tag_registered_to_other_user'
      | 'tag_not_registered'
      | 'tag_reported_lost'
      | 'incomplete_read',
  ): Promise<{ crossing: CrossingView; alarm: AlarmView | null }> {
    await latency();
    const gate = gateById(gateId);
    if (!gate) throw new MockApiError('not_found', 'That gate is not configured.');
    if (gate.mode === 'manual') {
      throw new MockApiError('gate_manual', 'This gate is in manual mode. Switch it back to automated first.');
    }

    const activeBikes = db.bikes.filter((bike) => bike.status === 'active');
    const bike = activeBikes[Math.floor(Math.random() * activeBikes.length)];
    const owner = userById(bike.ownerUserId)!;
    const tag = tagForBike(bike.bikeId);
    

    let presentedUser = owner;
    let tagRef = tag?.tagRef ?? null;
    let reason: MismatchReason | null = null;

    if (scenario === 'tag_registered_to_other_user') {
      presentedUser = db.users.find((user) => user.role === 'student' && user.userId !== owner.userId)!;
      reason = 'tag_registered_to_other_user';
    } else if (scenario === 'tag_not_registered') {
      tagRef = `BG-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
      reason = 'tag_not_registered';
    } else if (scenario === 'tag_reported_lost') {
      const lostTag = db.tags.find((item) => item.status === 'lost' || item.status === 'stolen');
      tagRef = lostTag?.tagRef ?? tagRef;
      presentedUser = lostTag ? userById(bikeById(lostTag.bikeId)?.ownerUserId ?? null) ?? owner : owner;
      reason = lostTag?.status === 'stolen' ? 'tag_reported_stolen' : 'tag_reported_lost';
    } else if (scenario === 'incomplete_read') {
      tagRef = null;
      reason = 'incomplete_read';
    }

    
    const isMatch = reason === null;

    const event: GateEvent = {
      eventId: newId('e'),
      timestamp: nowIso(),
      gateId: gate.gateId,
      userId: presentedUser.userId,
      bikeId: isMatch ? bike.bikeId : null,
      studentNumber: presentedUser.studentStaffNumber,
      tagRef,
      result: isMatch ? 'match' : 'mismatch',
      mismatchReason: reason,
      source: 'automated',
      guardUserId: null,
      verificationMs: 160 + Math.floor(Math.random() * 340),
      offline: false,
      note: null,
    };
    db.events.push(event);

    let alarmView: AlarmView | null = null;
    if (!isMatch) {
      const alarm: Alarm = {
        alarmId: newId('a'),
        eventId: event.eventId,
        status: 'pending',
        raisedAt: event.timestamp,
        acknowledgeBy: new Date(new Date(event.timestamp).getTime() + ALARM_ACK_TIMEOUT_MS).toISOString(),
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        escalatedAt: null,
        escalationReason: null,
        resolvedByUserId: null,
        resolvedAt: null,
        notes: null,
      };
      db.alarms.push(alarm);
      record(null, 'alarm.raised', 'alarm', alarm.alarmId, `Alarm raised at ${gate.name}: ${reason?.replace(/_/g, ' ') ?? 'mismatch'}.`);
      alarmView = toAlarmView(alarm);
    }

    const crossing = toCrossingView(event);
    emit({ type: 'crossing', crossing });
    if (alarmView) emit({ type: 'alarm', alarm: alarmView });
    return { crossing, alarm: alarmView };
  },

  /** Simulates a reader or verification-service outage (UC-06 trigger). */
  async simulateOutage(gateId: string, actorUserId: string): Promise<Gate> {
    const gate = gateById(gateId);
    if (!gate) throw new MockApiError('not_found', 'That gate is not configured.');
    gate.health = 'error';
    return this.setGateMode(gateId, 'manual', actorUserId);
  },

  /** Resets the demo dataset. */
  reset(): void {
    db = buildSeed();
  },
};

export type MockApi = typeof mockApi;