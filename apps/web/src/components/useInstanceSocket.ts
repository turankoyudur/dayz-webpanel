import React from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Creates a Socket.IO connection and subscribes to a single instance room.
 */
export function useInstanceSocket(instanceId: string): Socket | null {
  const [socket, setSocket] = React.useState<Socket | null>(null);

  React.useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('connect', () => {
      s.emit('joinInstance', instanceId);
    });

    return () => {
      try {
        s.emit('leaveInstance', instanceId);
      } catch {
        // ignore
      }
      s.disconnect();
      setSocket(null);
    };
  }, [instanceId]);

  return socket;
}
