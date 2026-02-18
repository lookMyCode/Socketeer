# Lesson 2: Security (Authentication)

**Goal**: Identify users connecting to our WebSocket server.

### 2.1 Define Payload

We need a place to store the user ID in the connection context.

Create `src/Payload.ts`:

```typescript
// src/Payload.ts
export interface Payload {
  userId: number;
}
```

### 2.2 Create AuthGuard

The Guard will check for a `token` cookie. Explicitly type that the guard expects our `Payload`.

Create `src/AuthGuard.ts`:

```typescript
// src/AuthGuard.ts
import { IncomingMessage } from 'http';
import { CanActivateConnect, SocketContext } from '@dimski/socketeer';

export class AuthGuard implements CanActivateConnect {

  canActivate(context: SocketContext) {
    const token = this.getToken(context.request);
    // Simple verification: in this example, the token IS the userId
    if (!token || isNaN(+token)) return false;

    // Attach user data to context
    context.payload = {
      userId: +token,
    }
    
    return true;
  }

  private getToken(req: IncomingMessage) {
    const cookies = req.headersDistinct.cookie;
    if (!cookies) return null;

    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if (!tokenCookie) return null;
    return tokenCookie.split('token=')[1];
  }
}
```

### 2.3 Register Global Guard

Update `src/main.ts` to enforce authentication for **all** connections.

```typescript
import { AuthGuard } from "./AuthGuard";

const socketeer = new Socketeer({
  // ...
  connectGuards: [
    new AuthGuard(),
  ],
});
```

Now, clients must send a `Cookie: token=1` header to connect.

---

[← Previous Lesson: Foundation](lesson-1.md) | [Course Index](../COURSE.md) | [Next Lesson: Listing Dialogs →](lesson-3.md)
