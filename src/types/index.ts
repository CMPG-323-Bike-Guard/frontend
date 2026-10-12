/**
 * Domain types.
 *
 * These mirror the logical data model in the Technical Specification
 * (Section 7.1 / 7.2): users, bikes, cards, rfid_tags, gates,
 * gate_events, alarms, bike_permissions and audit_actions.
 */

export type Role = 'student' | 'guard' | 'admin';

export type PhotoStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface PhotoModeration {
  live: string | null;
  pending: string | null;
  status: PhotoStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
}

export type PhotoTargetType = 'user' | 'bike';

export interface PendingPhoto {
  targetType: PhotoTargetType;
  entityId: string;
  ownerUserId: string;
  ownerName: string;
  photo: PhotoModeration;
}

export interface PhotoReviewResult {
  targetType: PhotoTargetType;
  entityId: string;
  photo: PhotoModeration;
}

/** Account status on the users entity (Technical Specification 7.1). */
export type AccountStatus = 'active' | 'suspended';

/**
 * Registration lifecycle.
 * The Functional Specification flow chart (5.2) and FR-ADM-02 put an admin
 * approval + tag issue step between the student's submission and an active
 * registration, so the lifecycle is modelled explicitly rather than as a
 * single "registered" flag.
 */
export type BikeStatus =
  | 'draft' // UC-01 alternative flow: saved, not yet submitted
  | 'pending_approval' // submitted, waiting for admin review
  | 'rejected' // admin rejected, reason recorded
  | 'tag_pending' // approved; tag allocated or awaiting stock (UC-04)
  | 'active' // tag collected and fitted ,  recognised at the gate
  | 'removed'; // student removed the bike from their profile (FR-STU-05)

export type TagStatus = 'active' | 'deactivated' | 'lost' | 'stolen' | 'awaiting_collection';

/** Live telemetry state shown on the guard dashboard (FR-SEC-01). */
export type GateHealth = 'good' | 'warning' | 'error' | 'not_commissioned';

export type GateMode = 'automated' | 'manual';

export type CrossingResult = 'match' | 'mismatch' | 'manual';

/**
 * UC-03 requires an unregistered tag to be distinguished from a tag that is
 * registered to somebody else, so the guard can judge the risk.
 */
export type MismatchReason =
  | 'tag_not_registered'
  | 'tag_registered_to_other_user'
  | 'tag_deactivated'
  | 'tag_reported_lost'
  | 'tag_reported_stolen'
  | 'incomplete_read';

export type AlarmStatus = 'open' | 'escalated' | 'cleared_in_person' | 'reported_stolen';

export type CrossingSource = 'automated' | 'manual_entry' | 'guard_override';

export interface NewPerson {
  studentStaffNumber: string;
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface User {
  userId: string;
  studentStaffNumber: string;
  name: string;
  role: Role;
  email: string;
  phone: string | null;
  photo: PhotoModeration;
  /** Compatibility projection of photo.live for existing consumers. */
  photoPath: string | null;
  accountStatus: AccountStatus;
}

export interface Bike {
  bikeId: string;
  ownerUserId: string;
  name: string;
  makeModel: string;
  colour: string;
  photo: PhotoModeration;
  /** Compatibility projection of photo.live for existing consumers. */
  photoPath: string | null;
  status: BikeStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface RfidTag {
  tagId: string;
  bikeId: string;
  tagRef: string;
  status: TagStatus;
  issuedAt: string | null;
  deactivatedAt: string | null;
  replacesTagId: string | null;
}

export interface Gate {
  gateId: string;
  name: string;
  location: string;
  health: GateHealth;
  commissioned: boolean;
  mode: GateMode;
  manualSince: string | null;
}

export interface GateEvent {
  eventId: string;
  timestamp: string;
  gateId: string;
  userId: string | null;
  bikeId: string | null;
  studentNumber: string | null;
  tagRef: string | null;
  result: CrossingResult;
  mismatchReason: MismatchReason | null;
  source: CrossingSource;
  guardUserId: string | null;
  verificationMs: number | null;
  offline: boolean;
  note: string | null;
}

export interface Alarm {
  alarmId: string;
  eventId: string;
  status: AlarmStatus;
  raisedAt: string;
  escalatedAt: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  notes: string | null;
}

/** FR-STU-07: a student may authorise another student to use their bike. */
export interface BikePermission {
  permissionId: string;
  bikeId: string;
  authorisedUserId: string | null;
  authorisedStudentNumber?: string;
  authorisedName?: string | null;
  status: 'active' | 'revoked';
  grantedAt: string;
  revokedAt: string | null;
}

/** NFR-AUD-01: every automated and manual decision is traceable. */
export interface AuditAction {
  auditId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  detail: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: 'tag_ready' | 'registration' | 'security' | 'photo_review' | 'system';
}

export interface Session {
  token: string;
  user: User;
}

/** Alarm rows are denormalised for the guard dashboard (FR-SEC-04). */
export interface AlarmView {
  alarm: Alarm;
  event: GateEvent;
  gateName: string;
  presentedUser: User | null;
  registeredOwner: User | null;
  tagBike: Bike | null;
  ownerBikes: Bike[];
  resolvedByName: string | null;
}

export interface CrossingView {
  event: GateEvent;
  gateName: string;
  userName: string | null;
  studentStaffNumber: string | null;
  bikeName: string | null;
  alarmStatus: AlarmStatus | null;
}

export interface PermissionView extends BikePermission {
  authorisedUserName: string;
  authorisedStudentNumber: string;
}

export interface BikeView {
  bike: Bike;
  tag: RfidTag | null;
  owner: User;
  permissions: PermissionView[];
}

export interface DashboardStats {
  crossingsToday: number;
  matchesToday: number;
  mismatchesToday: number;
  openAlarms: number;
  manualGates: number;
  registeredBikes: number;
  pendingRegistrations: number;
  medianVerificationMs: number;
  p95VerificationMs: number;
  readSuccessRate: number;
}

export interface SeriesPoint {
  label: string;
  matches: number;
  mismatches: number;
  manual: number;
}

export interface RepeatMismatchRow {
  userId: string | null;
  name: string;
  studentStaffNumber: string;
  count: number;
  lastSeen: string;
  reasons: MismatchReason[];
}

export interface ReportBundle {
  stats: DashboardStats;
  throughputByDay: SeriesPoint[];
  throughputByHour: SeriesPoint[];
  repeatMismatches: RepeatMismatchRow[];
  registrationUptake: Array<{ label: string; registered: number }>;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}