import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { CollaborationMessage, CollaborationMessageType, CollaborationPayloads } from '../types';

export const useCollaboration = (projectId: string, onMessageReceived?: (msg: CollaborationMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [myIdentity, setMyIdentity] = useState<string>("");
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
    const client = new Client({
      webSocketFactory: () => new SockJS('http://127.0.0.1:8080/ws-justmakeit'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);

      // Subscribe to target collaboration project sync
      client.subscribe(`/topic/project/${projectId}`, (payload) => {
        const message = JSON.parse(payload.body);

        // Update identity when local join broadcasts back
        if (message.type === 'JOIN' && message.deviceId === getDeviceId()) {
          setMyIdentity(message.sender);
        }

        if (onMessageReceived) {
          onMessageReceived(message);
        }
      });

      // Send handshake initialization payload
      client.publish({
        destination: `/app/sync/${projectId}`,
        body: JSON.stringify({
          type: 'JOIN',
          projectId,
          deviceId: getDeviceId(),
          payload: {}
        })
      });
    };

    client.onDisconnect = () => setIsConnected(false);
    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [projectId]);

  const sendMessage = <T extends CollaborationMessageType>(type: T, payload: CollaborationPayloads[T]) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: `/app/sync/${projectId}`,
        body: JSON.stringify({ sender: myIdentity, type, projectId, deviceId: getDeviceId(), payload })
      });
    }
  };

  return { sendMessage, isConnected, myIdentity };
};