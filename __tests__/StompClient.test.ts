import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

test('Stomp client can be instantiated without errors', () => {
  const socket = new SockJS('http://127.0.0.1:8080/ws-justmakeit');
  const client = new Client({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSocketFactory: () => socket as any,
    debug: () => {},
    reconnectDelay: 5000,
  });
  expect(client).toBeInstanceOf(Client);
});
