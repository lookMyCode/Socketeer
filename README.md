# Socketeer 🚀

> **Modern, structured WebSocket framework for Node.js**

[![Interactive Course](https://img.shields.io/badge/🎓-Interactive_Course-blueviolet?style=for-the-badge)](COURSE.md)

Socketeer is a TypeScript-first framework designed for building scalable and maintainable WebSocket applications. It enforces an **explicit architecture** without the magic of decorators, giving you full control over your application's flow.

## Philosophy

- **Explicit over Implicit**: No hidden magic. Everything is defined in your route configuration.
- **No Decorators**: Pure TypeScript classes and objects. easier to debug and test.
- **Singleton Controllers**: Controllers are singletons per route, perfect for stateful logic (like chat rooms).
- **Lifecycle Hooks**: Granular control over every stage of a connection's life.

## Key Features

- 🏗️ **Structured Architecture**: Clear separation of concerns (Server, Routes, Controllers).
- 🛠️ **Pipes**: Transform and validate data before it reaches your controller.
- 🛡️ **Guards**: Secure your endpoints with authentication logic.
- 🚦 **Exception Filters**: Centralized error handling.
- 🔌 **Context Awareness**: Access `ws` instance, request data, and custom session state easily.

---

## Get Started

This example demonstrates how to create a simple chat endpoint with parameter support.

> 🎓 **Want a step-by-step guide?** Check out the [Interactive Course](COURSE.md)!

### 1. Installation

```bash
npm install socketeer
```

### 2. Define a Controller

The controller handles the business logic. It implements lifecycle interfaces to react to events.

```typescript
// src/EndpointController.ts
import { 
  Controller, 
  OnSocketInit, 
  OnSocketConnect, 
  OnSocketMessage, 
  OnSocketError, 
  OnSocketClose, 
  OnSocketDestroy 
} from 'socketeer';
import { SocketContext } from 'socketeer';

export class EndpointController extends Controller
  implements OnSocketInit, OnSocketConnect, OnSocketMessage, OnSocketError, OnSocketClose, OnSocketDestroy {

  // Called ONCE when the first client connects to this route
  async $onSocketInit() {
    const params = this.$getParams();
    console.log('Controller initialized with params:', params); // e.g., { id: '1' }
  }

  // Called for EVERY new connection
  async $onSocketConnect(context: SocketContext<any>) {
    console.log('New connection established');
    
    // Broadcast to all connected clients in this controller
    this.$forEachContext((ctx) => {
      // ctx.socket is the native WebSocket
    });
  }

  // Handle incoming messages
  async $onSocketMessage(message: unknown, context: SocketContext<any>) {
    console.log('Received:', message);
    
    // Send response to sender
    this.$send(context, { status: 'ok' }); 
    
    // Broadcast to everyone else
    this.$sendBroadcastMessage(message); 
  }

  async $onSocketError(err: Error, context: SocketContext<unknown>) {
    console.error('Socket error:', err);
  }

  async $onSocketClose(code: number, reason: string | Buffer, context: SocketContext<unknown>) {
    console.log('Client disconnected:', code);
  }

  // Called when the LAST client disconnects
  async $onSocketDestroy() {
    console.log('Controller destroyed - no more active clients');
  }
}
```

### 3. Configure Routes

The route definition links a URL path to a controller and configures pipes.

```typescript
// src/routes.ts
import { Route, BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from 'socketeer';
import { EndpointController } from './EndpointController';

export const routes: Route[] = [
  {
    path: '/chat/:id', // Supports path parameters
    controller: EndpointController,
    // Pipes to process incoming messages (Buffer -> String -> JSON)
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    // Pipes to process outgoing messages (Object -> JSON String)
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  }
];
```

### 4. Start the Server

Initialize the `Socketeer` instance with your configuration.

```typescript
// src/main.ts
import { Socketeer } from 'socketeer';
import { routes } from './routes';

const server = new Socketeer({
  port: 3200,
  routes,
  onInit: () => {
    console.log('==============================');
    console.log('Socketeer running on port 3200');
    console.log('==============================');
  }
});
```

---

## Documentation

- [🚀 Get Started](#get-started)
- [🎓 **Interactive Course (COURSE.md)**](COURSE.md)
- [Server (Socketeer)](#server-socketeer)
- [Routes](#routes)
- [Controllers](#controllers)
- [Guards](#guards)
- [Pipes](#pipes)
- [Exception Filters](#exception-filters)
- [Context (SocketContext)](#context-socketcontext)
- [Exceptions & Response Codes](#exceptions--response-codes)
- [Notifications](#notifications)

---

## Server (Socketeer)

The `Socketeer` class is the main entry point of the application. It initializes the WebSocket server and manages the routing of incoming connections.

### Configuration (`SocketeerConfig`)

| Property | Type | Description |
|----------|------|-------------|
| `port` | `number` | The port on which the WebSocket server will listen. |
| `routes` | `Route[]` | An array of route definitions. |
| `onInit` | `() => void` | Lifecycle hook called when the server successfully starts. |
| `onConnect` | `() => void` | Lifecycle hook called when a new client connects (global). |
| `connectGuards` | `CanActivateConnect[]` | Global guards that run for **every** connection attempt. |
| `prefixPath` | `string` | Optional prefix for all routes (e.g., `/ws`). |
| `errorFilter` | `ErrorFilter` | Custom global error handler. |
| `rateLimit` | `RateLimitConfig` | Global rate limiting configuration. |

### Helper Methods

- **`notifyPath(path: string, data: T)`**: Sends an internal event to a specific path. This is useful for inter-controller communication without a direct reference to the controller instance.

---

## Rate Limit Configuration

The `RateLimitConfig` object defines the rules for rate limiting connections and requests.

| Property | Type | Description |
|----------|------|-------------|
| `maxConnections` | `number` | Maximum number of concurrent connections allowed to the server or specific route. |
| `maxRequests` | `object` | Configuration for request rate limiting. |
| `maxRequests.window` | `number` | The time window in **milliseconds** (e.g., 1000 for 1 second). |
| `maxRequests.counter` | `number` | The maximum number of requests allowed within the window. |

```typescript
rateLimit: {
  maxConnections: 100, // Max 100 concurrent users
  maxRequests: {
    window: 1000, // 1 second
    counter: 5    // Max 5 messages per second
  }
}
```

---

## Routes

Routes define how URL paths map to Controllers. Socketeer supports parameterized paths, similar to Express or NestJS.

### Configuration (`Route`)

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string` | The URL path (e.g., `/chat`, `/room/:roomId`). |
| `controller` | `Controller Class` | The class definition of the controller to handle this route. |
| `connectGuards` | `CanActivateConnect[]` | Guards specific to this route. |
| `requestMessagePipes` | `PipeTransform[]` | Pipes that process incoming messages **before** they reach the controller. |
| `responseMessagePipes` | `PipeTransform[]` | Pipes that process outgoing messages **before** they are sent to the client. |
| `rateLimit` | `RateLimitConfig` | Rate limiting specific to this route (overrides global). |

### Path Parameters

Parameters are defined with a colon `:`. They are accessible inside the controller via `this.$getParams()`.

```typescript
{
  path: '/channel/:channelId/user/:userId',
  controller: ChannelController
}
```

In the controller:
```typescript
const { channelId, userId } = this.$getParams();
```

---

## Controllers (Business Logic)

Controllers are the heart of your application. They handle incoming messages, manage connection state, and execute business logic.

### Lifecycle Hooks

Socketeer controllers have a rich lifecycle. Implementing these interfaces allows you to tap into key events.

| Hook | Interface | Description |
|------|-----------|-------------|
| `$onSocketInit` | `OnSocketInit` | Called **once** when the first client connects to this route. Use for setting up shared resources. |
| `$onSocketConnect` | `OnSocketConnect` | Called for **each** new connection. |
| `$onSocketMessage` | `OnSocketMessage` | Called when a client sends a message. |
| `$onSocketError` | `OnSocketError` | Called on socket errors. |
| `$onSocketClose` | `OnSocketClose` | Called when a client disconnects. |
| `$onSocketDestroy` | `OnSocketDestroy` | Called when the **last** client disconnects. Use for cleanup. |

### API Methods

The `Controller` base class provides several protected methods to manage your application.

- **`this.$getParams()`**: Returns route parameters (e.g., `:id`).
- **`this.$getQueryParams()`**: Returns URL query parameters.
- **`this.$send(context, data)`**: Sends a transformed message to a specific client.
- **`this.$sendBroadcastMessage(data)`**: Sends a message to **all** clients currently connected to this controller instance.
- **`this.$forEachContext(callback)`**: Iterates over all connected clients.
- **`this.$findContext(callback)`**: Finds a specific client context.
- **`this.$notifyPath(path, data)`**: Sends data to another controller via the internal event bus.
- **`this.$subscribePathNotifications(callback)`**: Listens for internal events.

---

## Guards (Authentication)

Guards are used to determine whether a connection should be allowed. They are executed **before** the connection is fully established and before the controller's `$onSocketConnect` hook.

### Implementing a Guard

A guard must implement the `CanActivateConnect` interface.

```typescript
import { CanActivateConnect, SocketContext } from 'socketeer';

export class AuthGuard implements CanActivateConnect {
  
  canActivate(context: SocketContext): boolean {
    const token = context.queryParams['token'];
    
    if (validateToken(token)) {
      return true;
    }
    
    return false; // Connection will be rejected with AccessDeniedException
  }
}
```

### Global vs Route Guards

- **Global Guards**: Defined in `SocketeerConfig.connectGuards`. Run for every connection.
- **Route Guards**: Defined in `Route.connectGuards`. Run only for that specific route.

---

## Pipes (Transformation & Validation)

Pipes transform input data to a desired output. They can also be used for validation, throwing an exception if the data is incorrect.

### Built-in Pipes

Socketeer comes with several built-in pipes:

| Pipe | Description |
|------|-------------|
| `BufferToStringPipe` | Converts incoming `Buffer` to `string`. |
| `JsonParsePipe` | Parses a JSON string into an object. |
| `JsonStringifyPipe` | Stringifies an object into a JSON string. |

### Creating a Custom Pipe

Implement the `PipeTransform` interface.

```typescript
import { PipeTransform, SocketContext, BadRequestException } from 'socketeer';

export class ToUpperCasePipe implements PipeTransform {
  transform(value: any, context: SocketContext): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Expected string!');
    }
    return value.toUpperCase();
  }
}
```

### Usage

Pipes can be applied to:
- **Incoming Messages** (`requestMessagePipes`): Transform what the client sends before it reaches `$onSocketMessage`.
- **Outgoing Messages** (`responseMessagePipes`): Transform what you send via `$send` before it reaches the client.

---

## Exception Filters

Exception filters handle errors thrown during the application lifecycle (in guards, pipes, or controllers).

### Default Behavior

By default, Socketeer uses a built-in `ErrorFilter` that:
1.  Checks if the error is an instance of `SocketeerException`.
2.  If yes, it **closes the connection** with the exception's `code` and `message`.
3.  If no, it logs the error to the console (and keeps the connection open, usually).

### Custom Exception Filter

You can provide a custom filter in `SocketeerConfig`.

```typescript
import { ErrorFilter } from 'socketeer';
import * as WebSocket from 'ws';

export class MyErrorFilter extends ErrorFilter {
  handleError(err: unknown, ws?: WebSocket) {
    // Custom logging logic
    console.error('Custom Error Handler:', err);
    
    // Call default behavior if needed
    super.handleError(err, ws);
  }
}
```

---

## Context (SocketContext)

The `SocketContext` wrapper provides access to the underlying WebSocket connection and request data.

| Property | Type | Description |
|----------|------|-------------|
| `socket` | `WebSocket` | The native `ws` WebSocket instance. |
| `request` | `IncomingMessage` | The initial HTTP request that established the connection. |
| `payload` | `T` | A generic property to store session data (e.g., user profile). |

```typescript
// Storing data in context during connection
context.payload = { userId: 123, role: 'admin' };

// Accessing it later
const user = context.payload;
```

---

## Exceptions & Response Codes

Socketeer uses standard exception classes that map to specific close codes.

| Exception | Close Code | Description |
|-----------|------------|-------------|
| `BadRequestException` | `4400` | Invalid data sent by client. |
| `UnauthorizedException` | `4401` | Authentication required. |
| `AccessDeniedException` | `4403` | Authentication passed, but permission denied. |
| `NotFoundException` | `4404` | Route not found. |
| `RateLimitException` | `4429` | Too many requests. |
| `InternalServerErrorException` | `4500` | Generic server error. |
| `BadGatewayException` | `4502` | Upstream error. |
| `ServiceUnavailableException` | `4503` | Server overloaded or maintenance. |

You can throw these exceptions anywhere in your application (Guards, Pipes, Controllers).

```typescript
throw new NotFoundException('Chat room does not exist');
```

---

## Notifications (Internal Event Bus)

The `Notifier` system allows controllers to communicate with each other without direct coupling. This is useful for system-wide events like "User X came online" or "System maintenance starting".

### Publishing an Event

From a controller:
```typescript
this.$notifyPath('/system/alerts', { type: 'maintenance', time: '10m' });
```

From the server instance:
```typescript
socketeer.notifyPath('/chat/general', { type: 'announcement', text: 'Hello!' });
```

### Subscribing to Events

In a controller, you can listen for events targeting its path.

```typescript
this.$subscribePathNotifications((event) => {
  if (event.type === 'maintenance') {
     this.$sendBroadcastMessage({ systemParam: 'shutdown' });
  }
});
```

---

> 🚀 **Ready to dive deeper?** Take the [Interactive Course](COURSE.md)!


