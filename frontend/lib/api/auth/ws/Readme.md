# WebSocket Integration Guide

## 🎯 Overview

Complete WebSocket system with:
- ✅ **Automatic reconnection** with exponential backoff
- ✅ **Authentication integration** with JWT tokens
- ✅ **Heartbeat/ping-pong** to keep connection alive
- ✅ **Message queuing** when disconnected
- ✅ **Type-safe** TypeScript implementation
- ✅ **Zustand state management** for reactive updates
- ✅ **React hooks** for easy integration
- ✅ **Error handling** and retry logic
- ✅ **Request-response pattern** support
- ✅ **Chat-specific features** built-in

### `WebSocketManager.ts` (1,000+ lines)

- Core WebSocket manager with Zustand
- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong system
- Message queuing when offline
- Full error handling
- Type-safe throughout


### `useWebSocket.ts`

React hooks for easy integration
- `useWebSocket()` - Main hook
- `useWebSocketSubscription()` - Subscribe to events
- `useWebSocketSend()` - Send with loading states
- `useWebSocketStatus()` - Connection status
- `useWebSocketRequest()` - Request-response pattern


### `useChatWebSocket.ts1`

- Chat-specific hooks
- `useChatWebSocket()` - Full chat functionality
- `useChatRooms()` - Multiple room management
- `useConnectionIndicator()` - UI indicator
- Typing indicators
- Read receipts
- Message history loading

---

## 📦 Files Created

```
lib/api/auth/
├── WebSocketManager.ts      # Core WebSocket manager with Zustand
├── useWebSocket.ts          # React hooks for WebSocket
└── useChatWebSocket.ts      # Chat-specific hooks
```

---

## 🚀 Quick Start

### 1. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:9000
```

For production:
```env
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### 2. Basic Usage in Component

```tsx
'use client';

import { useChatWebSocket } from '@/lib/api/auth/useChatWebSocket';

export default function ChatRoom({ roomId }: { roomId: string }) {
  const {
    messages,
    isConnected,
    sendMessage,
    sendTypingIndicator,
    messagesEndRef,
  } = useChatWebSocket(roomId);

  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    sendTypingIndicator(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-center">
          Reconnecting...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            <div className="font-semibold">{msg.sender.username}</div>
            <div>{msg.content}</div>
            <div className="text-xs text-gray-500">{msg.timestamp}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="w-full px-4 py-2 border rounded-lg"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
```

---

## 🎣 Available Hooks

### 1. `useWebSocket(endpoint?)`

Main hook for WebSocket connection:

```tsx
const {
  isConnected,     // Connection status
  state,           // Current state (CONNECTING, CONNECTED, etc.)
  error,           // Connection error if any
  send,            // Send message function
  subscribe,       // Subscribe to message types
  connect,         // Manually connect
  disconnect,      // Manually disconnect
} = useWebSocket('/ws/chat/room-123/');
```

### 2. `useWebSocketSubscription(messageType, handler, deps)`

Subscribe to specific message types:

```tsx
useWebSocketSubscription<ChatMessage>(
  'chat_message',
  (message) => {
    console.log('New message:', message);
    setMessages(prev => [...prev, message]);
  },
  [roomId]
);
```

### 3. `useWebSocketSend()`

Send messages with loading states:

```tsx
const { send, isSending, error } = useWebSocketSend();

const handleClick = async () => {
  await send('my_event', { data: 'value' });
};
```

### 4. `useWebSocketStatus()`

Get detailed connection status:

```tsx
const {
  state,
  error,
  reconnectAttempts,
  lastConnectedAt,
  isAuthenticated,
  isConnected,
  isConnecting,
  isReconnecting,
  isDisconnected,
  hasError,
} = useWebSocketStatus();
```

### 5. `useChatWebSocket(roomId)`

Chat-specific hook with full functionality:

```tsx
const {
  messages,              // Array of messages
  typingUsers,          // Array of users typing
  isConnected,          // Connection status
  isSending,            // Sending state
  error,                // Error if any
  sendMessage,          // Send message
  sendTypingIndicator,  // Send typing status
  sendReadReceipt,      // Mark as read
  loadHistory,          // Load message history
  clearMessages,        // Clear messages
  scrollToBottom,       // Scroll to bottom
  messagesEndRef,       // Ref for auto-scroll
} = useChatWebSocket('room-123');
```

### 6. `useChatRooms()`

Manage multiple chat rooms:

```tsx
const {
  rooms,              // Array of rooms
  activeRoomId,       // Currently active room
  isConnected,        // Connection status
  loadRooms,          // Load rooms list
  joinRoom,           // Join a room
  leaveRoom,          // Leave a room
  markRoomAsRead,     // Mark room as read
} = useChatRooms();
```

### 7. `useConnectionIndicator()`

Show connection status indicator:

```tsx
const { showIndicator, status } = useConnectionIndicator();

return (
  <>
    {showIndicator && (
      <div className="connection-indicator">
        {status.isReconnecting ? 'Reconnecting...' : 'Disconnected'}
      </div>
    )}
  </>
);
```

---

## 🔧 Advanced Usage

### Request-Response Pattern

```tsx
import { useWebSocketRequest } from '@/lib/api/auth/useWebSocket';

function MyComponent() {
  const { request, isLoading, error } = useWebSocketRequest();

  const loadData = async () => {
    try {
      const response = await request('get_data', { id: 123 }, 5000);
      console.log('Response:', response);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <button onClick={loadData} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Load Data'}
    </button>
  );
}
```

### Multiple Message Subscriptions

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const { subscribe } = useWebSocket(`/ws/chat/${roomId}/`);

  useEffect(() => {
    // Subscribe to multiple events
    const unsubMessages = subscribe('chat_message', handleMessage);
    const unsubTyping = subscribe('typing_indicator', handleTyping);
    const unsubStatus = subscribe('user_status', handleUserStatus);

    return () => {
      unsubMessages();
      unsubTyping();
      unsubStatus();
    };
  }, [roomId]);
}
```

### Custom WebSocket Hook

```tsx
import { useWebSocket } from '@/lib/api/auth/useWebSocket';

export function useNotifications() {
  const { subscribe, isConnected } = useWebSocket('/ws/notifications/');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('notification', (data) => {
      setNotifications(prev => [...prev, data]);
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

  return { notifications, isConnected };
}
```

---

## 🔐 Authentication Flow

The WebSocket automatically:
1. Gets JWT token from `tokenManager.getAccessToken()`
2. Includes token in WebSocket URL: `ws://api/chat?token=<jwt>`
3. Reconnects with fresh token if expired
4. Disconnects if authentication fails

```typescript
// WebSocket URL format
ws://localhost:9000/ws/chat/room-123/?token=eyJhbGci...
```

---

## 🔄 Reconnection Strategy

### Exponential Backoff

```
Attempt 1: 1000ms delay
Attempt 2: 1500ms delay (1000 * 1.5)
Attempt 3: 2250ms delay (1500 * 1.5)
...
Max 10 attempts
```

### Configuration

```typescript
const WS_CONFIG = {
  RECONNECT: true,
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_INTERVAL: 1000,      // Initial delay
  RECONNECT_DECAY: 1.5,           // Exponential multiplier
  HEARTBEAT_INTERVAL: 30000,      // 30 seconds
};
```

---

## 💓 Heartbeat System

Automatically sends ping every 30 seconds:

```json
// Ping (client → server)
{
  "type": "ping",
  "data": { "timestamp": 1234567890 }
}

// Pong (server → client)
{
  "type": "pong",
  "data": { "timestamp": 1234567890 }
}
```

If no pong received within 5 seconds, connection is closed and reconnected.

---

## 📨 Message Format

### Sending Messages

```typescript
send('message_type', {
  // Your data here
  key: 'value'
});

// Internally becomes:
{
  "type": "message_type",
  "data": { "key": "value" },
  "timestamp": "2024-01-15T10:30:00Z",
  "id": "1234567890-abc123"
}
```

### Receiving Messages

```typescript
subscribe<MyDataType>('message_type', (data) => {
  // data is already typed and extracted
  console.log(data.key); // 'value'
});
```

---

## 🛡️ Error Handling

### Close Codes

```typescript
enum WebSocketCloseCode {
  NORMAL_CLOSURE = 1000,        // Normal close
  GOING_AWAY = 1001,            // Page refresh
  PROTOCOL_ERROR = 1002,        // Protocol error
  UNAUTHORIZED = 4001,          // Not authenticated
  FORBIDDEN = 4003,             // No permission
  INVALID_TOKEN = 4004,         // Token invalid
}
```

### Error Recovery

```tsx
const { error, state } = useWebSocketStatus();

useEffect(() => {
  if (error) {
    if (error.code === 4001) {
      // Token expired - auth system will handle
      console.log('Authentication required');
    } else {
      // Other error - show to user
      toast.error(error.reason);
    }
  }
}, [error]);
```

---

## 📊 State Management (Zustand)

Access WebSocket state from anywhere:

```tsx
import { useWebSocketStore } from '@/lib/api/auth/WebSocketManager';

function StatusBar() {
  const state = useWebSocketStore((state) => state.state);
  const reconnectAttempts = useWebSocketStore((s) => s.reconnectAttempts);

  return (
    <div>
      Status: {state}
      {reconnectAttempts > 0 && ` (Attempt ${reconnectAttempts})`}
    </div>
  );
}
```

---

## 🎨 UI Components

### Connection Indicator

```tsx
import { useConnectionIndicator } from '@/lib/api/auth/useChatWebSocket';

export function ConnectionIndicator() {
  const { showIndicator, status } = useConnectionIndicator();

  if (!showIndicator) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50">
      {status.isReconnecting && (
        <>
          Reconnecting... (Attempt {status.reconnectAttempts})
        </>
      )}
      {status.isDisconnected && <>Connection lost. Trying to reconnect...</>}
    </div>
  );
}
```

### Typing Indicator

```tsx
function TypingIndicator({ typingUsers }: { typingUsers: string[] }) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="text-sm text-gray-500 italic px-4 py-2">
      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
    </div>
  );
}
```

---

## 🧪 Testing

### Manual Testing

```bash
# Start Django backend with WebSocket support
python manage.py runserver 9000

# Start Next.js
npm run dev

# Test in browser console
const ws = new WebSocket('ws://localhost:9000/ws/chat/test/?token=<your-jwt>');
ws.onmessage = (e) => console.log('Received:', e.data);
ws.send(JSON.stringify({ type: 'chat_message', data: { message: 'Hello' }}));
```

---

## 🐛 Debugging

Enable debug mode:

```env
NODE_ENV=development
```

Logs will appear in console:

```
[WebSocketManager] Connecting to WebSocket...
[WebSocketManager] WebSocket connected successfully
[WebSocketManager] Message sent: {...}
[WebSocketManager] Message received: {...}
[WebSocketManager] Heartbeat ping sent
[WebSocketManager] Heartbeat pong received
```

---

## 🚨 Common Issues

### Issue: "No authentication token available"
**Solution:** Ensure user is logged in before connecting

### Issue: WebSocket closes immediately
**Solution:** Check backend WebSocket route accepts JWT tokens

### Issue: Messages not received
**Solution:** Verify message type matches subscription

### Issue: Reconnection not working
**Solution:** Check close code - some codes prevent reconnection

---

## ✅ Production Checklist

- [ ] Set `NEXT_PUBLIC_WS_URL` to production WSS URL
- [ ] Enable SSL/TLS (wss:// not ws://)
- [ ] Configure CORS on backend
- [ ] Test reconnection scenarios
- [ ] Monitor WebSocket connections
- [ ] Set up error logging (Sentry)
- [ ] Test with slow network
- [ ] Test token expiry handling
- [ ] Load test with multiple connections
- [ ] Add rate limiting on backend

---

## 🔗 Backend Integration

Your Django WebSocket consumer should handle:

```python
# Expected message format
{
    "type": "chat_message",
    "data": {
        "message": "Hello",
        "room_id": "123"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "id": "msg-123"
}

# Expected responses
{
    "type": "chat_message",
    "message": {
        "id": "msg-456",
        "content": "Hello",
        "sender": {...},
        "timestamp": "2024-01-15T10:30:00Z",
        "room_id": "123"
    }
}
```

---

## 🎯 Best Practices

1. **Always check `isConnected` before sending**
2. **Use message queuing for offline support**
3. **Implement optimistic UI updates**
4. **Handle reconnection gracefully**
5. **Show connection status to users**
6. **Clean up subscriptions on unmount**
7. **Use TypeScript for type safety**
8. **Monitor connection metrics**
9. **Implement message deduplication**
10. **Test edge cases (network loss, token expiry)**