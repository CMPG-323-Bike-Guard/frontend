import { io, type Socket } from 'socket.io-client';
import { subscribeRealtime, type RealtimeEvent } from '@/mocks/server';
import { API_MODE, REALTIME_URL } from './endpoints';
import { getStoredToken } from './client';

export type { RealtimeEvent };

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * Realtime channel for the guard dashboard (FR-SEC-02, TDEC-05).
 *
 * In `live` mode this is a Socket.io connection to the gateway; the guard
 * joins a room per gate. In `mock` mode the same event shapes come from the
 * in-browser service, so the dashboard code is identical either way.
 */
export interface RealtimeChannel {
  subscribe(listener: (event: RealtimeEvent) => void): () => void;
  onState(listener: (state: ConnectionState) => void): () => void;
  close(): void;
}

export function createRealtimeChannel(): RealtimeChannel {
  const stateListeners = new Set<(state: ConnectionState) => void>();
  let state: ConnectionState = 'connecting';

  const setState = (next: ConnectionState) => {
    state = next;
    stateListeners.forEach((listener) => listener(state));
  };

  if (API_MODE === 'mock') {
    // The mock service is always "connected"; the short delay makes the
    // connecting state visible so the indicator can be seen working.
    const timer = setTimeout(() => setState('connected'), 400);
    return {
      subscribe: (listener) => subscribeRealtime(listener),
      onState: (listener) => {
        stateListeners.add(listener);
        listener(state);
        return () => stateListeners.delete(listener);
      },
      close: () => clearTimeout(timer),
    };
  }

  const socket: Socket = io(REALTIME_URL, {
    transports: ['websocket'],
    auth: { token: getStoredToken() },
  });

  socket.on('connect', () => setState('connected'));
  socket.on('disconnect', () => setState('disconnected'));
  socket.on('connect_error', () => setState('disconnected'));

  return {
    subscribe: (listener) => {
      const forward = (event: RealtimeEvent) => listener(event);
      socket.on('gate-event', forward);
      return () => {
        socket.off('gate-event', forward);
      };
    },
    onState: (listener) => {
      stateListeners.add(listener);
      listener(state);
      return () => stateListeners.delete(listener);
    },
    close: () => socket.close(),
  };
}
