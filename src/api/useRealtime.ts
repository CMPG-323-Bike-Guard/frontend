import { useEffect, useRef, useState } from 'react';
import { createRealtimeChannel, type ConnectionState, type RealtimeEvent } from './realtime';

/**
 * Subscribes the guard dashboard to the live gate feed (FR-SEC-02).
 * The handler is held in a ref so the channel is not rebuilt on every render.
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const channel = createRealtimeChannel();
    const unsubscribeEvents = channel.subscribe((event) => handler.current(event));
    const unsubscribeState = channel.onState(setState);
    return () => {
      unsubscribeEvents();
      unsubscribeState();
      channel.close();
    };
  }, []);

  return state;
}
