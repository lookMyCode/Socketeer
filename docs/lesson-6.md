# Lesson 6: Reliability (Errors & Rate Limiting)

**Goal**: Make the server robust.

### 6.1 Custom Error Filter

Handle exceptions gracefully.

Create `src/CustomErrorFilter.ts`:

```typescript
// src/CustomErrorFilter.ts
import * as WebSocket from 'ws';
import { ErrorFilter, SocketeerException } from 'socketeer';

export class CustomErrorFilter extends ErrorFilter {

  public handleError(err: unknown, ws?: WebSocket) {
    if (err instanceof SocketeerException && ws) {
      if (ws.readyState === WebSocket.OPEN) {
          ws.close(err.code, err.message);
      }
      return;
    }
    
    console.error('Unhandled Error:', err);
  }
}
```

### 6.2 Rate Limiting

Protect your server from spam.

Update `src/main.ts`:

```typescript
import { CustomErrorFilter } from "./CustomErrorFilter";

const socketeer = new Socketeer({
  // ...
  errorFilter: new CustomErrorFilter(),
  rateLimit: {
    maxConnections: 10, // Max 10 concurrent connections total
    maxRequests: {
      counter: 10,  // Max 10 messages
      window: 1000, // per 1 second
    },
  },
});
```

---

[← Previous Lesson: System Notifications](lesson-5.md) | [Course Index](../COURSE.md)
