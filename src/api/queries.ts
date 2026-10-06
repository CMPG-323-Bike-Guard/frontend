import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlarmStatus, BikeStatus, GateMode, Notification } from '@/types';
import { api, type BikeInput, type CrossingFilters } from './client';

/** Query keys are namespaced so a mutation can invalidate exactly what changed. */
export const keys = {
  bikes: (userId: string) => ['bikes', userId] as const,
  bike: (bikeId: string) => ['bike', bikeId] as const,
  registrations: (status?: BikeStatus) => ['registrations', status ?? 'all'] as const,
  gates: ['gates'] as const,
  alarms: (scope: 'live' | 'all') => ['alarms', scope] as const,
  crossings: (filters: CrossingFilters) => ['crossings', filters] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  stats: ['stats'] as const,
  reports: (days: number) => ['reports', days] as const,
  users: (role?: string) => ['users', role ?? 'all'] as const,
  audit: ['audit'] as const,
};

export function useBikes(userId: string) {
  return useQuery({ queryKey: keys.bikes(userId), queryFn: () => api.listBikesForUser(userId) });
}

export function useBike(bikeId: string | undefined) {
  return useQuery({
    queryKey: keys.bike(bikeId ?? 'none'),
    queryFn: () => api.getBike(bikeId!),
    enabled: Boolean(bikeId),
  });
}

export function useGates() {
  return useQuery({ queryKey: keys.gates, queryFn: () => api.listGates() });
}

export function useAlarms(scope: 'live' | 'all' = 'live') {
  return useQuery({ queryKey: keys.alarms(scope), queryFn: () => api.listAlarms(scope) });
}

export function useCrossings(filters: CrossingFilters) {
  return useQuery({ queryKey: keys.crossings(filters), queryFn: () => api.listCrossings(filters) });
}

export function useRegistrations(status?: BikeStatus) {
  return useQuery({ queryKey: keys.registrations(status), queryFn: () => api.listRegistrations(status) });
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: keys.notifications(userId ?? ''),
    queryFn: () => api.listNotifications(userId!),
    enabled: Boolean(userId),
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api.stats() });
}

export function useReports(days: number) {
  return useQuery({ queryKey: keys.reports(days), queryFn: () => api.reports(days) });
}

export function useAudit() {
  return useQuery({ queryKey: keys.audit, queryFn: () => api.listAudit() });
}

/** Broad invalidation after a write. Cheap here, and keeps every screen honest. */
function useRefresh() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries();
  };
}

export function useCreateBike() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { ownerUserId: string; input: BikeInput; submit: boolean; actorUserId: string }) =>
      api.createBike(vars.ownerUserId, vars.input, vars.submit, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useUpdateBike() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; input: Partial<BikeInput>; actorUserId: string }) =>
      api.updateBike(vars.bikeId, vars.input, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useSubmitBike() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; actorUserId: string }) => api.submitBike(vars.bikeId, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useReportTagLost() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; actorUserId: string; stolen: boolean }) =>
      api.reportTagLost(vars.bikeId, vars.actorUserId, vars.stolen),
    onSuccess: refresh,
  });
}

export function useRemoveBike() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; actorUserId: string }) => api.removeBike(vars.bikeId, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useGrantPermission() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; studentNumber: string; actorUserId: string }) =>
      api.grantPermission(vars.bikeId, vars.studentNumber, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useRevokePermission() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { permissionId: string; actorUserId: string }) =>
      api.revokePermission(vars.permissionId, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useSetGateMode() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { gateId: string; mode: GateMode; actorUserId: string }) =>
      api.setGateMode(vars.gateId, vars.mode, vars.actorUserId),
    onSuccess: refresh,
  });
}

export function useResolveAlarm() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: {
      alarmId: string;
      outcome: Extract<AlarmStatus, 'cleared_in_person' | 'reported_stolen' | 'escalated'>;
      notes: string;
      guardUserId: string;
    }) => api.resolveAlarm(vars.alarmId, vars.outcome, vars.notes, vars.guardUserId),
    onSuccess: refresh,
  });
}

export function useManualCrossing() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: {
      input: { gateId: string; studentNumber: string; bikeDescription: string; note: string };
      guardUserId: string;
    }) => api.logManualCrossing(vars.input, vars.guardUserId),
    onSuccess: refresh,
  });
}

export function useApproveRegistration() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; tagRef: string; adminUserId: string }) =>
      api.approveRegistration(vars.bikeId, vars.tagRef, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useRejectRegistration() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; reason: string; adminUserId: string }) =>
      api.rejectRegistration(vars.bikeId, vars.reason, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useMarkTagCollected() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { tagId: string; adminUserId: string }) => api.markTagCollected(vars.tagId, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useDeactivateTag() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { tagId: string; reason: string; adminUserId: string }) =>
      api.deactivateTag(vars.tagId, vars.reason, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useReplaceTag() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { bikeId: string; tagRef: string; adminUserId: string }) =>
      api.replaceTag(vars.bikeId, vars.tagRef, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useEnrolCard() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (vars: { studentNumber: string; cardUid: string; replaceExisting: boolean; adminUserId: string }) =>
      api.enrolCard(vars.studentNumber, vars.cardUid, vars.replaceExisting, vars.adminUserId),
    onSuccess: refresh,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  const notificationQueries = { queryKey: ['notifications'] as const };
  return useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onMutate: async (notificationId) => {
      await client.cancelQueries(notificationQueries);
      const previous = client.getQueriesData<Notification[]>(notificationQueries);
      client.setQueriesData<Notification[]>(notificationQueries, (current) =>
        current?.map((notification) =>
          notification.notificationId === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      context?.previous.forEach(([queryKey, notifications]) => {
        client.setQueryData(queryKey, notifications);
      });
    },
    onSettled: () => {
      void client.invalidateQueries(notificationQueries);
    },
  });
}