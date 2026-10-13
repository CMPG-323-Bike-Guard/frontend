import type {
  AlarmResolution,
  AlarmView,
  BikeStatus,
  BikeView,
  CrossingView,
  DashboardStats,
  Gate,
  GateMode,
  NewPerson,
  Notification,
  PendingPhoto,
  PersonEdit,
  PhotoReviewResult,
  PhotoTargetType,
  ReportBundle,
  Session,
  User,
} from '@/types';
import { mockApi, MockApiError, type BikeInput, type CrossingFilters, type ProfileDetailsInput } from '@/mocks/server';
import { API_BASE_URL, API_MODE, endpoints, TOKEN_STORAGE_KEY } from './endpoints';

export type { BikeInput, CrossingFilters, ProfileDetailsInput };

export class ApiError extends Error {
  code: string;
  field?: string;
  constructor(code: string, message: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof MockApiError) return new ApiError(error.code, error.message, error.field);
  if (error instanceof TypeError) {
    return new ApiError(
      'network',
      'The BikeGuard API is not reachable. Check that the backend is running, or set VITE_API_MODE=mock.',
    );
  }
  return new ApiError('unknown', error instanceof Error ? error.message : 'Something went wrong.');
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Live transport. JWTs are held in local storage and sent as a bearer token
 * (Technical Specification 4.1, TDEC-07).
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      // Only label the request as JSON when it actually carries a body; Fastify rejects an empty JSON body.
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.code ?? `http_${response.status}`, body.message ?? response.statusText, body.field);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });

/**
 * The live implementation. Signatures are identical to the mock service so the
 * rest of the app never learns which one it is talking to.
 */
const liveApi = {
  login: (studentStaffNumber: string, password: string) =>
    post<Session>(endpoints.auth.login, { studentStaffNumber, password }),
  session: (_token: string) => request<Session>(endpoints.auth.session),

  listBikesForUser: (userId: string) => request<BikeView[]>(endpoints.bikes.listForUser(userId)),
  getBike: (bikeId: string) => request<BikeView>(endpoints.bikes.detail(bikeId)),
  createBike: (ownerUserId: string, input: BikeInput, submit: boolean, _actorUserId: string) =>
    post<BikeView>(endpoints.bikes.create, { ownerUserId, ...input, submit }),
  updateOwnDetails: (_actorUserId: string, input: ProfileDetailsInput) =>
    patch<User>(endpoints.users.me, input),
  changeOwnPassword: (_actorUserId: string, currentPassword: string, newPassword: string) =>
    post<{ success: true }>(endpoints.users.password, { currentPassword, newPassword }),
  submitProfilePhoto: (_actorUserId: string, dataUrl: string) =>
    post<User>(endpoints.users.profilePhoto, { photoDataUrl: dataUrl }),
  submitBikePhoto: (bikeId: string, _actorUserId: string, dataUrl: string) =>
    post<BikeView>(endpoints.photos.bike(bikeId), { photoDataUrl: dataUrl }),
  listPendingPhotos: (_adminUserId: string) => request<PendingPhoto[]>(endpoints.photos.pending),
  approvePhoto: (targetType: PhotoTargetType, entityId: string, _adminUserId: string) =>
    post<PhotoReviewResult>(endpoints.photos.approve(targetType, entityId)),
  rejectPhoto: (targetType: PhotoTargetType, entityId: string, reason: string, _adminUserId: string) =>
    post<PhotoReviewResult>(endpoints.photos.reject(targetType, entityId), { reason }),
  updateBike: (bikeId: string, input: Partial<BikeInput>, _actorUserId: string) =>
    patch<BikeView>(endpoints.bikes.detail(bikeId), input),
  submitBike: (bikeId: string, _actorUserId: string) => post<BikeView>(endpoints.bikes.submit(bikeId)),
  reportTagLost: (bikeId: string, _actorUserId: string, stolen: boolean) =>
    post<BikeView>(endpoints.bikes.reportLost(bikeId), { stolen }),
  removeBike: (bikeId: string, _actorUserId: string) =>
    request<void>(endpoints.bikes.remove(bikeId), { method: 'DELETE' }),

  listNotifications: (userId: string) => request<Notification[]>(endpoints.users.notifications(userId)),
  markNotificationRead: (notificationId: string) =>
    patch<void>(endpoints.users.notification(notificationId), { read: true }),

    grantPermission: (bikeId: string, studentNumber: string, _actorUserId: string, name?: string) =>
    post<BikeView>(endpoints.bikes.permissions(bikeId), { studentNumber, name: name || undefined }),
  revokePermission: (permissionId: string, _actorUserId: string) =>
    request<BikeView>(endpoints.bikes.permission(permissionId), { method: 'DELETE' }),

  listGates: () => request<Gate[]>(endpoints.gates.list),
  setGateMode: (gateId: string, mode: GateMode, _actorUserId: string) =>
    patch<Gate>(endpoints.gates.mode(gateId), { mode }),


  listAlarms: (status: 'live' | 'all' = 'live') =>
    request<AlarmView[]>(`${endpoints.alarms.list}${query({ status })}`),

  /** Acknowledge button: the guard confirms they have seen the alarm (stops the response timer). */
  acknowledgeAlarm: (alarmId: string, _guardUserId: string) =>
    post<AlarmView>(endpoints.alarms.acknowledge(alarmId)),

  /** A guard asks for help from the supervisor before the timer runs out. */
  escalateAlarm: (alarmId: string, notes: string, _guardUserId: string) =>
    post<AlarmView>(endpoints.alarms.escalate(alarmId), { notes }),

  resolveAlarm: (
    alarmId: string,
    outcome: AlarmResolution,
    notes: string,
    _guardUserId: string,
  ) => post<AlarmView>(endpoints.alarms.resolve(alarmId), { outcome, notes }),


  logManualCrossing: (
    input: { gateId: string; studentNumber: string; bikeDescription: string; note: string },
    _guardUserId: string,
  ) => post<CrossingView>(endpoints.crossings.manual, input),

  listCrossings: (filters: CrossingFilters = {}) =>
    request<CrossingView[]>(`${endpoints.crossings.list}${query(filters as Record<string, string | number | undefined>)}`),

  listRegistrations: (status?: BikeStatus) =>
    request<BikeView[]>(`${endpoints.registrations.list}${query({ status })}`),
  approveRegistration: (bikeId: string, tagRef: string, _adminUserId: string) =>
    post<BikeView>(endpoints.registrations.approve(bikeId), { tagRef }),
  rejectRegistration: (bikeId: string, reason: string, _adminUserId: string) =>
    post<BikeView>(endpoints.registrations.reject(bikeId), { reason }),
  markTagCollected: (tagId: string, _adminUserId: string) => post<BikeView>(endpoints.tags.collect(tagId)),
  deactivateTag: (tagId: string, reason: string, _adminUserId: string) =>
    post<BikeView>(endpoints.tags.deactivate(tagId), { reason }),
  replaceTag: (bikeId: string, newTagRef: string, _adminUserId: string) =>
    post<BikeView>(endpoints.tags.replace(bikeId), { tagRef: newTagRef }),

  listUsers: (role?: 'student' | 'guard' | 'admin') =>
    request<User[]>(`${endpoints.users.list}${query({ role })}`),
  findUserByNumber: (studentNumber: string) =>
    request<User | null>(endpoints.users.byNumber(studentNumber)),
  createUser: (person: NewPerson, _adminUserId: string) => 
    post<User>(endpoints.users.create, person),
    updateUser: (userId: string, person: PersonEdit, _adminUserId: string) =>
    patch<User>(endpoints.users.detail(userId), person),
  deactivateUser: (userId: string, reason: string, _adminUserId: string) =>
    post<User>(endpoints.users.deactivate(userId), reason ? { reason } : undefined),
  reactivateUser: (userId: string, _adminUserId: string) => post<User>(endpoints.users.reactivate(userId)),
  removeUser: (userId: string, _adminUserId: string) =>
    request<void>(endpoints.users.detail(userId), { method: 'DELETE' }),
  listAudit: (limit = 40) =>
    request<Array<{ auditId: string; actorName: string; action: string; entityType: string; entityId: string; timestamp: string; detail: string }>>(
      `${endpoints.reporting.audit}${query({ limit })}`,
    ),

  stats: () => request<DashboardStats>(endpoints.reporting.stats),
  reports: (days: number) => request<ReportBundle>(`${endpoints.reporting.bundle}${query({ days })}`),
};

type ApiSurface = typeof liveApi;

const activeApi: ApiSurface = API_MODE === 'live' ? liveApi : (mockApi as unknown as ApiSurface);

/** Wraps every call so components always receive an `ApiError`. */
function guard<T extends (...args: never[]) => Promise<unknown>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toApiError(error);
    }
  }) as T;
}

export const api = Object.fromEntries(
  Object.entries(activeApi).map(([key, value]) => [key, guard(value as never)]),
) as unknown as ApiSurface;

/** Demo-only helpers. Never available when talking to the live backend. */
export const demo = {
  enabled: API_MODE === 'mock',
  simulateCrossing: mockApi.simulateCrossing.bind(mockApi),
  simulateOutage: mockApi.simulateOutage.bind(mockApi),
  reset: mockApi.reset.bind(mockApi),
};

/** Dev-only reader emulator. Talks to the backend's /dev/simulate-crossing route. */
export const devTools = {
  enabled: API_MODE === 'live' && import.meta.env.DEV,
  scan: (gateId: string, studentNumber: string | null, tagUid: string | null) =>
    post<{ crossing: CrossingView; gateShouldOpen: boolean; alarmRaised: boolean }>(
      endpoints.dev.simulateCrossing,
      { gateId, studentNumber, tagUid },
    ),
};