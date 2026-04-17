import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import {
  CollaborationMessage,
  CollaborationMessageType,
  CollaborationPayloads,
} from '../types';
import { createStompClient } from '../utils/stompClient';

export const useCollaboration = (
  projectId: string,
  onMessageReceived?: (msg: CollaborationMessage) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [myIdentity, setMyIdentity] = useState<string>('');
  const stompClient = useRef<Client | null>(null);

  // Client-side local storage device ID generation
  const getDeviceId = () => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('justmakeit_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('justmakeit_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    const client = createStompClient({
      projectId,
      deviceId: getDeviceId(),
      onConnect: () => setIsConnected(true),
      onIdentityReceived: setMyIdentity,
      onMessageReceived,
    });

    client.activate();
    stompClient.current = client;

    return () => {
      if (client.active) client.deactivate();
    };
  }, [projectId]);

  const sendMessage = <T extends CollaborationMessageType>(
    type: T,
    payload: CollaborationPayloads[T]
  ) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: `/app/sync/${projectId}`,
        body: JSON.stringify({
          sender: myIdentity,
          type,
          projectId,
          deviceId: getDeviceId(),
          payload,
        }),
      });
    }
  };

  return { sendMessage, isConnected, myIdentity };
};
