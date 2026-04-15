import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { CollaborationMessage } from '../types';

export interface StompSetupParams {
  projectId: string;
  deviceId: string;
  onConnect: () => void;
  onIdentityReceived: (sender: string) => void;
  onMessageReceived?: (msg: CollaborationMessage) => void;
}

export const createStompClient = ({
  projectId,
  deviceId,
  onConnect,
  onIdentityReceived,
  onMessageReceived
}: StompSetupParams): Client => {
  const socket = new SockJS('http://127.0.0.1:8080/ws-justmakeit');
  
  const client = new Client({
    webSocketFactory: () => socket as any,
    debug: () => {},
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  client.onConnect = () => {
    onConnect();
    subscribeToProject(client, projectId, deviceId, onIdentityReceived, onMessageReceived);
    sendHandshake(client, projectId, deviceId);
  };

  client.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
  };

  return client;
};

const subscribeToProject = (
  client: Client,
  projectId: string,
  deviceId: string,
  onIdentityReceived: (sender: string) => void,
  onMessageReceived?: (msg: CollaborationMessage) => void
) => {
  client.subscribe(`/topic/project/${projectId}`, (payload) => {
    const message = JSON.parse(payload.body);

    if (message.type === 'JOIN' && message.deviceId === deviceId) {
      if (message.sender) onIdentityReceived(message.sender);
    }

    if (message.deviceId !== deviceId && onMessageReceived) {
      onMessageReceived(message);
    }
  });
};

const sendHandshake = (client: Client, projectId: string, deviceId: string) => {
  client.publish({
    destination: `/app/sync/${projectId}`,
    body: JSON.stringify({
      type: 'JOIN',
      projectId: projectId,
      deviceId: deviceId,
      payload: {}
    })
  });
};
