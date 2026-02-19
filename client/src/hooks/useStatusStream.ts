import { useEffect, useRef, useCallback } from 'react';

interface StatusUpdate {
  id: number;
  status: string;
  phone: string;
}

interface StreamEvent {
  type: string;
  updates?: StatusUpdate[];
}

export function useStatusStream(onUpdate: (updates: StatusUpdate[]) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/sse/stream');

    es.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        if (data.type === 'status-update' && data.updates) {
          onUpdateRef.current(data.updates);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);
}
