# Socketeer 🚀

**Socketeer** to nowoczesny, ustrukturyzowany framework WebSocket dla Node.js.

Framework stawia na **jawną architekturę** ("explicit over implicit") i całkowity brak dekoratorów. Zamiast magii, otrzymujesz czytelny podział odpowiedzialności:
1.  **Controller**: Czysta logika biznesowa (Singleton).
2.  **Route**: Konfiguracja, walidacja (Pipes) i bezpieczeństwo (Guards).
3.  **Server**: Infrastruktura i zarządzanie połączeniami.

---

## 🚀 Szybki Start

Poniżej znajdziesz kompletny przykład podzielony na logiczne części.

### Krok 1: Kontroler (Logic)
Kontroler to klasa dziedzicząca po `Controller`. Implementuje metody cyklu życia (np. `$onSocketMessage`), które są chronione (`protected`), aby nie wyciekały na zewnątrz API.

Metoda `$send` służy do wysyłania odpowiedzi do konkretnego klienta (`SocketContext`).

```typescript
import { Controller, SocketContext } from 'socketeer';

export class ChatController extends Controller {
  // Stan jest zachowany między połączeniami (Singleton per Route)
  private messages: string[] = [];

  // Wywoływane, gdy klient wyśle wiadomość
  protected $onSocketMessage(message: { text: string }, context: SocketContext) {
    this.messages.push(message.text);
    console.log(`Nowa wiadomość od klienta: ${message.text}`);

    // Odesłanie potwierdzenia do nadawcy
    this.$send(context, { status: 'OK', echo: message.text });
    
    // Broadcast do wszystkich w tej ścieżce
    this.$sendBroadcastMessage({ event: 'new_message', content: message.text });
  }

  // Wywoływane przy nowym połączeniu
  protected $onSocketConnect(context: SocketContext) {
    // Możemy np. wysłać powitanie
    this.$send(context, { event: 'welcome', history: this.messages });
  }
}
```

### Krok 2: Routing (Configuration)
To tutaj spinamy logikę z walidacją i bezpieczeństwem. Nie brudzimy kontrolera dekoratorami `@UseGuards` czy `@UsePipes`. Wszystko jest w definicji trasy.

```typescript
import { Route } from 'socketeer';
// Zakładamy, że masz ZodValidationPipe (np. z przykładów advanced)
import { ZodValidationPipe } from './pipes/ZodValidationPipe'; 
import { z } from 'zod';

const ChatRoute: Route = {
  path: '/chat',
  controller: ChatController,
  
  // Walidacja wiadomości przychodzących
  requestMessagePipes: [
    new ZodValidationPipe(z.object({ text: z.string().min(1) }))
  ],

  // Limit: max 5 wiadomości na sekundę od klienta
  rateLimit: {
    maxRequests: 5,
    window: 1000
  }
};
```

### Krok 3: Serwer (Infrastructure)
Inicjalizacja serwera jest prosta i przyjmuje listę tras.

```typescript
import { Socketeer } from 'socketeer';

new Socketeer({
  port: 8080,
  routes: [
    ChatRoute
  ],
  onInit: () => {
    console.log('Serwer Socketeer wystartował na porcie 8080 🚀');
  }
});
```

---

## 📖 Dokumentacja

### 🎮 Cykl życia Kontrolera (Lifecycle)
Kontroler posiada zestaw metod (hooks), które możesz nadpisać, aby reagować na zdarzenia. Wszystkie metody są **opcjonalne**.

| Metoda | Opis |
| :--- | :--- |
| `$onSocketInit()` | Wywoływana raz, podczas inicjalizacji kontrolera (start serwera). |
| `$onSocketConnect(ctx)` | Wywoływana przy każdym nowym połączeniu klienta. |
| `$onSocketMessage(msg, ctx)` | Wywoływana po otrzymaniu wiadomości (i przetworzeniu przez Pipes). |
| `$onSocketClose(code, reason, ctx)` | Wywoływana po rozłączeniu klienta. |
| `$onSocketError(err, ctx)` | Wywoływana przy błędzie połączenia/socketu. |
| `$onSocketDestroy()` | Wywoływana przy niszczeniu kontrolera (np. zamknięcie serwera). |

*`ctx` to obiekt `SocketContext`.*

### 📦 SocketContext i Parametry
Każda metoda otrzymuje kontekst połączenia, dający dostęp do:
*   `context.socket`: Natywny obiekt WebSocket.
*   `context.request`: Obiekt `IncomingMessage` (Node.js) – dostęp do nagłówków, IP, URL itp.

Dostęp do parametrów ścieżki i query string wewnątrz kontrolera:
```typescript
const params = this.$getParams(); // np. { roomId: "123" }
const query = this.$getQueryParams(); // np. { sort: "desc" }
```

### 📡 System Powiadomień (Notifier)
Kontrolery w Socketeer są odizolowane. Aby się komunikowały (np. Moduł A chce wysłać coś do klientów Modułu B), używamy wbudowanego `notifiera`.

*   `this.$notifyPath(path, data)`: Wyślij zdarzenie do innej ścieżki.
*   `this.$subscribePathNotifications(callback)`: Nasłuchuj na zdarzenia skierowane do Twojej ścieżki.

---

## ⚡ Przykłady Zaawansowane

### 1. Autentyfikacja (Guard)
Guard implementuje interfejs `CanActivateConnect`. Jeśli zwróci `false`, połączenie jest odrzucane (kod 4403).

```typescript
import { CanActivateConnect, SocketContext } from 'socketeer';

export class AuthGuard implements CanActivateConnect {
  async canActivate(context: SocketContext): Promise<boolean> {
    const token = context.request.headers['authorization'];
    // Tutaj weryfikacja tokena (np. baza danych, JWT)
    return token === 'secret_token'; 
  }
}

// Użycie w Routingu:
// connectGuards: [new AuthGuard()]
```

### 2. Komunikacja Kontrolerów
Scenariusz: Nowa wiadomość na czacie (`/chat`) ma wysłać powiadomienie do panelu admina (`/admin`).

**ChatController:**
```typescript
protected $onSocketMessage(msg: any, ctx: SocketContext) {
  // ... logika czatu ...
  this.$notifyPath('/admin', { event: 'ALERT', msg: 'Ktoś pisze!' });
}
```

**AdminController:**
```typescript
protected $onSocketInit() {
  this.$subscribePathNotifications((data: any) => {
    if (data.event === 'ALERT') {
      this.$sendBroadcastMessage(data); // Prześlij do adminów
    }
  });
}
```

### 3. Rate Limiting (Ochrona)
Możesz chronić serwer na dwóch poziomach:
1.  **Globalnie** (w `SocketeerConfig`): Limituje całkowitą liczbę połączeń (`maxConnections`).
2.  **Per Route** (w `Route`): Limituje częstotliwość wiadomości od jednego klienta.

```typescript
rateLimit: {
  maxRequests: 10,   // 10 wiadomości...
  window: 5000       // ...na 5 sekund
}
```

---

## 📄 Licencja
Projekt objęty licencją **MIT**.
