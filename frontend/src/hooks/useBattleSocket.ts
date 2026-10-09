import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { BattleEvent } from '../types';
import { getBattleSocketUrl } from '../services/battleService';

export const useBattleSocket = (
  roomCode: string | undefined,
  onEvent: (event: BattleEvent) => void,
) => {
  const callbackRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!roomCode) return;

    const client = new Client({
      brokerURL: getBattleSocketUrl(),
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      reconnectDelay: 2500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/battle/${roomCode}`, message => {
          callbackRef.current(JSON.parse(message.body) as BattleEvent);
        });
      },
      onWebSocketClose: () => setConnected(false),
      onWebSocketError: event => {
        console.error('Không thể kết nối WebSocket phòng đấu.', event);
        setConnected(false);
      },
      onStompError: frame => {
        console.error('Máy chủ từ chối kết nối STOMP:', frame.headers.message, frame.body);
        setConnected(false);
      },
    });

    client.activate();
    return () => {
      setConnected(false);
      void client.deactivate();
    };
  }, [roomCode]);

  return connected;
};
