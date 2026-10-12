import type {
  Alarm,
  AuditAction,
  Bike,
  BikePermission,
  Gate,
  GateEvent,
  MismatchReason,
  Notification,
  PhotoModeration,
  RfidTag,
  User,
} from '@/types';
import { avatarFor, bikePhotoFor } from './media';

/**
 * Seed data for the mock service.
 *
 * Every person, number and bike below is invented for demonstration. No real
 * NWU student or staff details are used.
 *
 * The pilot is limited to one gate (Business Case 9.3), so only Gate 1 runs
 * live traffic. A second gate is present in a staging state to exercise the
 * multi-gate filter (FR-SEC-06) and the nine-gate scale target (NFR-SCA-01)
 * without pretending the pilot has been expanded.
 */

/** Small deterministic PRNG so the demo data is identical on every load. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const DAY = 86_400_000;

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

function userPhoto(userId: string, name: string): PhotoModeration {
  const live = avatarFor(name);
  if (userId === 'u-102') {
    return {
      live,
      pending: avatarFor('Pieter updated photo'),
      status: 'pending',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: iso(2 * 60 * 60_000),
    };
  }
  if (userId === 'u-103') {
    return {
      live,
      pending: avatarFor('Lerato rejected photo'),
      status: 'rejected',
      rejectionReason: 'Please upload a clear, front-facing photo.',
      reviewedBy: 'u-301',
      reviewedAt: iso(DAY),
      submittedAt: iso(2 * DAY),
    };
  }
  return {
    live,
    pending: null,
    status: 'approved',
    rejectionReason: null,
    reviewedBy: 'u-301',
    reviewedAt: iso(30 * DAY),
    submittedAt: iso(31 * DAY),
  };
}

function student(
  id: string,
  number: string,
  name: string,
  email: string,
): User {
  const photo = userPhoto(id, name);
  return {
    userId: id,
    studentStaffNumber: number,
    name,
    role: 'student',
    email,
    phone: null,
    photo,
    photoPath: photo.live,
    accountStatus: 'active',
  };
}

export function buildSeed() {
  const johanPhoto = userPhoto('u-201', 'Johan Prinsloo');
  const gracePhoto = userPhoto('u-202', 'Grace Mahlangu');
  const riaanPhoto = userPhoto('u-301', 'Riaan Coetzee');
  const users: User[] = [
    student('u-101', '41002381', 'Thandi Mokoena', '41002381@mynwu.ac.za'),
    student('u-102', '41118742', 'Pieter van Wyk', '41118742@mynwu.ac.za'),
    student('u-103', '42207766', 'Lerato Dlamini', '42207766@mynwu.ac.za'),
    student('u-104', '41930514', 'Sipho Ndlovu', '41930514@mynwu.ac.za'),
    student('u-105', '42456109', 'Anja Botha', '42456109@mynwu.ac.za'),
    student('u-106', '41772230', 'Kwame Osei', '41772230@mynwu.ac.za'),
    student('u-107', '42019948', 'Chloe Steyn', '42019948@mynwu.ac.za'),
    student('u-108', '41660382', 'Naledi Khumalo', '41660382@mynwu.ac.za'),
    {
      userId: 'u-201',
      studentStaffNumber: '90014477',
      name: 'Johan Prinsloo',
      role: 'guard',
      email: 'j.prinsloo@nwu.ac.za',
      phone: null,
      photo: johanPhoto,
      photoPath: johanPhoto.live,
      accountStatus: 'active',
    },
    {
      userId: 'u-202',
      studentStaffNumber: '90015520',
      name: 'Grace Mahlangu',
      role: 'guard',
      email: 'g.mahlangu@nwu.ac.za',
      phone: null,
      photo: gracePhoto,
      photoPath: gracePhoto.live,
      accountStatus: 'active',
    },
    {
      userId: 'u-301',
      studentStaffNumber: '90008812',
      name: 'Riaan Coetzee',
      role: 'admin',
      email: 'r.coetzee@nwu.ac.za',
      phone: null,
      photo: riaanPhoto,
      photoPath: riaanPhoto.live,
      accountStatus: 'active',
    },
    
  ];

  const bikeSpecs: Array<{
    id: string;
    owner: string;
    name: string;
    make: string;
    colour: string;
    status: Bike['status'];
    days: number;
    note?: string;
  }> = [
    { id: 'b-01', owner: 'u-101', name: 'Blue commuter', make: 'Giant Escape 3', colour: 'Blue', status: 'active', days: 46 },
    { id: 'b-02', owner: 'u-101', name: 'Weekend gravel bike', make: 'Momsen Vipa', colour: 'Orange', status: 'tag_pending', days: 3 },
    { id: 'b-03', owner: 'u-102', name: 'Silver mountain bike', make: 'Silverback Stride', colour: 'Silver', status: 'active', days: 58 },
    { id: 'b-04', owner: 'u-103', name: 'Red road bike', make: 'Trek Domane AL2', colour: 'Red', status: 'active', days: 71 },
    { id: 'b-05', owner: 'u-104', name: 'Black hardtail', make: 'Scott Aspect 960', colour: 'Black', status: 'active', days: 39 },
    { id: 'b-06', owner: 'u-105', name: 'Green city bike', make: 'Raleigh Strada', colour: 'Green', status: 'active', days: 24 },
    { id: 'b-07', owner: 'u-106', name: 'Grey campus bike', make: 'Avalanche Cosmic', colour: 'Grey', status: 'active', days: 18 },
    { id: 'b-08', owner: 'u-107', name: 'Purple hybrid', make: 'Merida Crossway', colour: 'Purple', status: 'pending_approval', days: 1 },
    { id: 'b-09', owner: 'u-108', name: 'White racer', make: 'Specialized Allez', colour: 'White', status: 'active', days: 33 },
    { id: 'b-10', owner: 'u-102', name: 'Spare townie', make: 'Probike Urban', colour: 'Yellow', status: 'pending_approval', days: 2 },
    {
      id: 'b-11',
      owner: 'u-104',
      name: 'Second-hand BMX',
      make: 'Unknown',
      colour: 'Black',
      status: 'rejected',
      days: 5,
      note: 'The photo does not show the full frame. Upload a clear side-on photo and resubmit.',
    },
    { id: 'b-12', owner: 'u-106', name: 'Old trail bike', make: 'Titan Calypso', colour: 'Teal', status: 'removed', days: 120 },
    { id: 'b-13', owner: 'u-103', name: 'Folding bike', make: 'Dahon Mariner', colour: 'Navy', status: 'active', days: 12 },
    { id: 'b-14', owner: 'u-105', name: 'Training bike', make: 'Fuji Sportif', colour: 'Yellow', status: 'draft', days: 0 },
  ];

  const bikes: Bike[] = bikeSpecs.map((spec) => {
    const live = bikePhotoFor(spec.colour, spec.make);
    const photo: PhotoModeration = spec.id === 'b-03'
      ? {
          live,
          pending: bikePhotoFor('Silver', 'Silverback updated photo'),
          status: 'pending',
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: iso(3 * 60 * 60_000),
        }
      : {
          live,
          pending: null,
          status: 'approved',
          rejectionReason: null,
          reviewedBy: 'u-301',
          reviewedAt: iso(30 * DAY),
          submittedAt: iso(31 * DAY),
        };
    return {
      bikeId: spec.id,
      ownerUserId: spec.owner,
      name: spec.name,
      makeModel: spec.make,
      colour: spec.colour,
      photo,
      photoPath: photo.live,
      status: spec.status,
      submittedAt: iso(spec.days * DAY),
      reviewedAt: ['active', 'tag_pending', 'rejected', 'removed'].includes(spec.status)
        ? iso(Math.max(0, spec.days - 1) * DAY)
        : null,
      reviewNote: spec.note ?? null,
    };
  });

  const tags: RfidTag[] = [
    { tagId: 't-01', bikeId: 'b-01', tagRef: 'BG-4A19C2', status: 'active', issuedAt: iso(45 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-02', bikeId: 'b-03', tagRef: 'BG-77E0B1', status: 'active', issuedAt: iso(57 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-03', bikeId: 'b-04', tagRef: 'BG-1C55D8', status: 'active', issuedAt: iso(70 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-04', bikeId: 'b-05', tagRef: 'BG-90F31A', status: 'active', issuedAt: iso(38 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-05', bikeId: 'b-06', tagRef: 'BG-2B8844', status: 'active', issuedAt: iso(23 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-06', bikeId: 'b-07', tagRef: 'BG-63AD07', status: 'lost', issuedAt: iso(17 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-07', bikeId: 'b-09', tagRef: 'BG-0E7729', status: 'active', issuedAt: iso(32 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-08', bikeId: 'b-13', tagRef: 'BG-58C104', status: 'active', issuedAt: iso(11 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-09', bikeId: 'b-02', tagRef: 'BG-9D2E60', status: 'awaiting_collection', issuedAt: iso(2 * DAY), deactivatedAt: null, replacesTagId: null },
    { tagId: 't-10', bikeId: 'b-12', tagRef: 'BG-31FF9B', status: 'deactivated', issuedAt: iso(118 * DAY), deactivatedAt: iso(9 * DAY), replacesTagId: null },
  ];

  // Gate health, mode and manualSince now live directly on Gate ,  there is no
  // separate lane entity. Only Gate 1 and Gate 2 carry live traffic below.
  const gates: Gate[] = [
    { gateId: 'g-1', name: 'Gate 1', location: 'Hoffman Street ,  pilot gate', health: 'good', commissioned: true, mode: 'automated', manualSince: null },
    { gateId: 'g-2', name: 'Gate 2', location: 'Borcherd Street ,  staging bridge', health: 'warning', commissioned: true, mode: 'manual', manualSince: iso(42 * 60_000) },
    { gateId: 'g-3', name: 'Gate 3', location: 'Esselen Street', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-4', name: 'Gate 4', location: 'Meyer Street', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-5', name: 'Gate 5', location: 'Thabo Mbeki Avenue', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-6', name: 'Gate 6', location: 'Molen Street', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-7', name: 'Gate 7', location: 'Chris Hani Street', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-8', name: 'Gate 8', location: 'Peet Street', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
    { gateId: 'g-9', name: 'Gate 9', location: 'Sports grounds', health: 'not_commissioned', commissioned: false, mode: 'automated', manualSince: null },
  ];

  const permissions: BikePermission[] = [
    {
      permissionId: 'p-01',
      bikeId: 'b-01',
      authorisedUserId: 'u-103',
      status: 'active',
      grantedAt: iso(6 * DAY),
      revokedAt: null,
    },
    {
      permissionId: 'p-02',
      bikeId: 'b-04',
      authorisedUserId: 'u-102',
      status: 'revoked',
      grantedAt: iso(40 * DAY),
      revokedAt: iso(14 * DAY),
    },
  ];

  // ---- Crossing history -------------------------------------------------
  // 14 days of traffic at the pilot gate, weighted to the morning and
  // late-afternoon peaks so the throughput reporting has a realistic shape.
  const random = makeRandom(20260913);
  const events: GateEvent[] = [];
  const alarms: Alarm[] = [];
  const activeBikes = bikes.filter((bike) => bike.status === 'active');
  const tagByBike = new Map(tags.map((tag) => [tag.bikeId, tag]));
  const numberByUser = new Map(users.map((user) => [user.userId, user.studentStaffNumber]));

  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${(++sequence).toString().padStart(5, '0')}`;

  const mismatchReasons: MismatchReason[] = [
    'tag_registered_to_other_user',
    'tag_not_registered',
    'tag_deactivated',
    'incomplete_read',
    'tag_reported_lost',
  ];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
    const base = new Date(Date.now() - dayOffset * DAY);
    const weekday = base.getDay();
    const crossings = weekday === 0 || weekday === 6 ? 8 + Math.floor(random() * 6) : 22 + Math.floor(random() * 14);

    for (let index = 0; index < crossings; index += 1) {
      const peak = random();
      const hour = peak < 0.4 ? 7 + Math.floor(random() * 2) : peak < 0.75 ? 15 + Math.floor(random() * 3) : 9 + Math.floor(random() * 6);
      const stamp = new Date(base);
      stamp.setHours(hour, Math.floor(random() * 60), Math.floor(random() * 60), 0);
      if (stamp.getTime() > Date.now()) stamp.setTime(Date.now() - Math.floor(random() * 3_600_000));

      const bike = activeBikes[Math.floor(random() * activeBikes.length)];
      const tag = tagByBike.get(bike.bikeId) ?? null;
      const gateId = random() > 0.45 ? 'g-1' : 'g-2';
      const roll = random();
      const isMismatch = roll > 0.94;
      const isManual = !isMismatch && roll > 0.925;

      const event: GateEvent = {
        eventId: nextId('e'),
        timestamp: stamp.toISOString(),
        gateId,
        userId: bike.ownerUserId,
        bikeId: isMismatch ? null : bike.bikeId,
        studentNumber: numberByUser.get(bike.ownerUserId) ?? null,
        tagRef: tag?.tagRef ?? null,
        result: isMismatch ? 'mismatch' : isManual ? 'manual' : 'match',
        mismatchReason: isMismatch ? mismatchReasons[Math.floor(random() * mismatchReasons.length)] : null,
        source: isManual ? 'manual_entry' : 'automated',
        guardUserId: isManual ? 'u-201' : null,
        verificationMs: isManual ? null : 140 + Math.floor(random() * 380),
        offline: isManual,
        note: isManual ? 'Logged during reader outage.' : null,
      };
      events.push(event);

      if (isMismatch) {
        const resolvedStolen = random() > 0.8;
        alarms.push({
          alarmId: nextId('a'),
          eventId: event.eventId,
          status: resolvedStolen ? 'reported_stolen' : 'cleared_in_person',
          raisedAt: event.timestamp,
          escalatedAt: null,
          resolvedByUserId: random() > 0.5 ? 'u-201' : 'u-202',
          resolvedAt: new Date(new Date(event.timestamp).getTime() + 4 * 60_000).toISOString(),
          notes: resolvedStolen
            ? 'Rider could not describe the bike. Bike held at the gatehouse and Protection Services called.'
            : 'Rider produced the registration on the portal. Same person, replacement tag not yet fitted.',
        });
      }
    }
  }

  // Three alarms left open so the guard dashboard has live work on first load.
  const openAlarmSpecs: Array<{
    userId: string;
    tagRef: string;
    reason: MismatchReason;
    minutesAgo: number;
    gateId: string;
    status: Alarm['status'];
  }> = [
    { userId: 'u-102', tagRef: 'BG-1C55D8', reason: 'tag_registered_to_other_user', minutesAgo: 4, gateId: 'g-1', status: 'open' },
    { userId: 'u-106', tagRef: 'BG-63AD07', reason: 'tag_reported_lost', minutesAgo: 21, gateId: 'g-2', status: 'open' },
    { userId: 'u-108', tagRef: 'BG-B41D77', reason: 'tag_not_registered', minutesAgo: 63, gateId: 'g-1', status: 'escalated' },
  ];

  openAlarmSpecs.forEach((spec) => {
    const event: GateEvent = {
      eventId: nextId('e'),
      timestamp: iso(spec.minutesAgo * 60_000),
      gateId: spec.gateId,
      userId: spec.userId,
      bikeId: null,
      studentNumber: numberByUser.get(spec.userId) ?? null,
      tagRef: spec.tagRef,
      result: 'mismatch',
      mismatchReason: spec.reason,
      source: 'automated',
      guardUserId: null,
      verificationMs: 210 + Math.floor(Math.random() * 120),
      offline: false,
      note: null,
    };
    events.push(event);
    alarms.push({
      alarmId: nextId('a'),
      eventId: event.eventId,
      status: spec.status,
      raisedAt: event.timestamp,
      escalatedAt: spec.status === 'escalated' ? iso((spec.minutesAgo - 3) * 60_000) : null,
      resolvedByUserId: null,
      resolvedAt: null,
      notes: null,
    });
  });

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const notifications: Notification[] = [
    {
      notificationId: 'n-01',
      userId: 'u-101',
      title: 'Your tag is ready to collect',
      body: 'Tag BG-9D2E60 for “Weekend gravel bike” is ready at the Protection Services desk, Building F1.',
      createdAt: iso(2 * DAY),
      read: false,
      kind: 'tag_ready',
    },
    {
      notificationId: 'n-02',
      userId: 'u-101',
      title: 'Blue commuter is protected',
      body: 'Tag BG-4A19C2 is active. Tap your card at the gate and the boom will lift automatically.',
      createdAt: iso(45 * DAY),
      read: true,
      kind: 'registration',
    },
    {
      notificationId: 'n-03',
      userId: 'u-104',
      title: 'Second-hand BMX needs a clearer photo',
      body: 'Upload a side-on photo showing the whole frame, then submit the registration again.',
      createdAt: iso(4 * DAY),
      read: false,
      kind: 'registration',
    },
    {
      notificationId: 'n-04',
      userId: 'u-106',
      title: 'Lost tag recorded',
      body: 'Tag BG-63AD07 is flagged as lost. Collect a replacement from Protection Services to restore gate access.',
      createdAt: iso(1 * DAY),
      read: false,
      kind: 'security',
    },
  ];

  const audit: AuditAction[] = [
    {
      auditId: 'au-01',
      actorUserId: 'u-301',
      action: 'tag.issued',
      entityType: 'rfid_tag',
      entityId: 't-09',
      timestamp: iso(2 * DAY),
      detail: 'Tag BG-9D2E60 allocated to bike b-02 and marked awaiting collection.',
    },
    {
      auditId: 'au-02',
      actorUserId: 'u-106',
      action: 'tag.reported_lost',
      entityType: 'rfid_tag',
      entityId: 't-06',
      timestamp: iso(1 * DAY),
      detail: 'Owner reported tag BG-63AD07 lost from the student portal.',
    },
    {
      auditId: 'au-03',
      actorUserId: 'u-301',
      action: 'registration.rejected',
      entityType: 'bike',
      entityId: 'b-11',
      timestamp: iso(4 * DAY),
      detail: 'Photo did not show the full frame.',
    },
  ];

  return { users, bikes, tags, gates, events, alarms, permissions, notifications, audit };
}

export type SeedData = ReturnType<typeof buildSeed>;