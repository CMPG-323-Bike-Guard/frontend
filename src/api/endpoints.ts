/**
 * Backend integration surface.
 *
 * This is the single place that names the REST resources the frontend expects
 * from the Fastify API (Technical Specification 3.2, 6.2). Nothing is
 * implemented on the server yet, when the backend lands, only this map and
 * `client.ts` should need to change.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const REALTIME_URL = import.meta.env.VITE_REALTIME_URL ?? 'http://localhost:3000';

/** `mock` runs entirely in the browser; `live` talks to the Fastify API. */
export const API_MODE: 'mock' | 'live' = import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';

export const endpoints = {
  auth: {
    login: '/auth/login',
    session: '/auth/session',
  },
  bikes: {
    listForUser: (userId: string) => `/users/${userId}/bikes`,
    detail: (bikeId: string) => `/bikes/${bikeId}`,
    create: '/bikes',
    submit: (bikeId: string) => `/bikes/${bikeId}/submit`,
    reportLost: (bikeId: string) => `/bikes/${bikeId}/report-lost`,
    remove: (bikeId: string) => `/bikes/${bikeId}`,
    permissions: (bikeId: string) => `/bikes/${bikeId}/permissions`,
    permission: (permissionId: string) => `/permissions/${permissionId}`,
  },
  registrations: {
    list: '/registrations',
    approve: (bikeId: string) => `/registrations/${bikeId}/approve`,
    reject: (bikeId: string) => `/registrations/${bikeId}/reject`,
  },
  tags: {
    collect: (tagId: string) => `/tags/${tagId}/collect`,
    deactivate: (tagId: string) => `/tags/${tagId}/deactivate`,
    replace: (bikeId: string) => `/bikes/${bikeId}/tag`,
  },
  gates: {
    list: '/gates',
    mode: (gateId: string) => `/gates/${gateId}/mode`,
  },
  crossings: {
    list: '/crossings',
    manual: '/crossings/manual',
  },
  
  alarms: {
    list: '/alarms',
    acknowledge: (alarmId: string) => `/alarms/${alarmId}/acknowledge`,
    escalate: (alarmId: string) => `/alarms/${alarmId}/escalate`,
    resolve: (alarmId: string) => `/alarms/${alarmId}/resolution`,
  },

  users: {
    list: '/users',
    byNumber: (studentNumber: string) => `/users/lookup/${studentNumber}`,
    notifications: (userId: string) => `/users/${userId}/notifications`,
    notification: (notificationId: string) => `/notifications/${notificationId}`,
  },
  reporting: {
    stats: '/reports/stats',
    bundle: '/reports',
    audit: '/audit',
  },
} as const;

export const TOKEN_STORAGE_KEY = 'bikeguard.token';