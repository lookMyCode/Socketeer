# Socketeer 🚀

Socketeer to nowoczesny, ustrukturyzowany framework WebSocket dla Node.js.

Framework stawia na jawną architekturę ("explicit over implicit") i całkowity brak dekoratorów. Zamiast magii, otrzymujesz czytelny podział odpowiedzialności:

- **Controller**: Czysta logika biznesowa (Singleton dla danej ścieżki).
- **Route**: Konfiguracja, walidacja (Pipes) i bezpieczeństwo (Guards).
- **Server**: Infrastruktura i zarządzanie połączeniami.

> **Inspiracja**: Framework czerpie garściami z **NestJS** oraz **Angulara**, jednak celowo porzuca dekoratory na rzecz jawnej definicji i przejrzystości kodu.

## Kluczowe cechy

- 💎 **Brak dekoratorów**: Czysty TypeScript bez eksperymentalnych flag.
- 🏗️ **Jawna architektura**: Wszystko jest jawnie zdefiniowane w konfiguracji tras.
- 🛠️ **Pipes & Guards**: Wbudowane wsparcie dla transformacji danych i autoryzacji.
- 🔄 **Cykl życia**: Pełna kontrola nad połączeniem dzięki przejrzystym interfejsom.
- 💉 **Singleton Controllers**: Kontrolery są tworzone raz dla danej ścieżki i współdzielone między połączeniami, co pozwala na łatwe zarządzanie stanem.

## Get Started

Poniższy przykład pokazuje, jak skonfigurować logikę czatu z parametrami w ścieżce.

### 1. Definicja Kontrolera
Kontroler zarządza logiką biznesową i stanem dla danej trasy. Metody cyklu życia pozwalają na pełną kontrolę nad połączeniem.

```typescript
// EndpointController.ts
import { 
  Controller, OnSocketClose, OnSocketConnect, 
  OnSocketInit, OnSocketMessage, OnSocketError, OnSocketDestroy
} from 'socketeer';
import { SocketContext } from 'socketeer';

export class EndpointController extends Controller 
implements OnSocketInit, OnSocketConnect, OnSocketMessage, OnSocketError, OnSocketClose, OnSocketDestroy {

  /**
   * $onSocketInit
   * Uruchamiana RAZ po zainicjalizowaniu kontrolera.
   * Kontroler jest tworzony (instancjonowany) przy pierwszym połączeniu klienta do danej ścieżki.
   * Jest to idealne miejsce na inicjalizację zasobów współdzielonych.
   */
  async $onSocketInit() {
    // Dostęp do parametrów ścieżki (np. :id)
    const params = this.$getParams();
    console.log('Controller initialized for params:', params);
  }

  /**
   * $onSocketConnect
   * Uruchamiana przy KAŻDYM nowym połączeniu klienta.
   * Służy do obsługi logiki powitalnej, autoryzacji wewnątrz kontrolera itp.
   */
  async $onSocketConnect(context: SocketContext<any>) {
    console.log('New connection:', context.id);

    // Iteracja po wszystkich aktywnych klientach w tym kontrolerze (np. powiadomienie o nowym użytkowniku)
    this.$forEachContext((ctx) => {
      // ...
    });
  }

  /**
   * $onSocketMessage
   * Uruchamiana gdy klient wyśle wiadomość.
   * Wiadomość przeszła już przez zdefiniowane Request Pipes.
   */
  async $onSocketMessage(message: unknown, context: SocketContext<any>) {
    console.log('Message received:', message);

    // Wysłanie odpowiedzi tylko do nadawcy
    this.$send(context, { response: 'ack' }); 
    
    // Wysłanie wiadomości do wszystkich podłączonych klientów (broadcast)
    this.$sendBroadcastMessage(message); 
  }

  /**
   * $onSocketError
   * Uruchamiana gdy wystąpi błąd w połączeniu WebSocket.
   */
  async $onSocketError(err: Error, context: SocketContext<unknown>) {
    console.error('Socket error:', err);
  }

  /**
   * $onSocketClose
   * Uruchamiana gdy klient albo serwer zamknie połączenie.
   */
  async $onSocketClose(code: number, reason: string | Buffer, context: SocketContext<unknown>) {
    console.log('Client disconnected:', code);
  }

  /**
   * $onSocketDestroy
   * Uruchamiana gdy OSTATNI klient się rozłączy.
   * Kontroler jest niszczony i zwalniany z pamięci.
   * Idealne miejsce na czyszczenie zasobów (clearInterval, unsubscribe itp.).
   */
  async $onSocketDestroy() {
    console.log('All clients disconnected, destroying controller');
  }
}
```

### 2. Konfiguracja Tras (Routes)
Trasy definiują powiązanie między ścieżką URL a kontrolerem oraz konfigurują potoki (Pipes).

```typescript
// routes.ts
import { Route, BufferToStringPipe, JsonParsePipe, JsonStringifyPipe } from 'socketeer';
import { EndpointController } from './EndpointController';

export const routes: Route[] = [
  {
    path: '/chat/:id', // Obsługa parametrów
    controller: EndpointController,
    requestMessagePipes: [
      new BufferToStringPipe(),
      new JsonParsePipe(),
    ],
    responseMessagePipes: [
      new JsonStringifyPipe(),
    ],
  }
];
```

### 3. Inicjalizacja Serwera
Główny punkt wejścia do aplikacji.

```typescript
// main.ts
import { Socketeer } from 'socketeer';
import { routes } from './routes';

const socketeer = new Socketeer({
  port: 3200,
  routes,
  onInit() {
    console.log('Socketeer is running on port 3200');
  }
});
```

## Dokumentacja

### Spis treści

1. **Server (Socketeer)**
   Konfiguracja i uruchamianie instancji serwera.
2. **Routy (Routes)**
   Definiowanie ścieżek, parametrów i przypisywanie kontrolerów.
3. **Kontrolery (Controllers)**
   Logika biznesowa i zarządzanie połączeniami.
4. **Strażnicy (Guardy)**
   Zabezpieczanie połączeń przed ich nawiązaniem (autoryzacja).
5. **Potoki (Pipy)**
   Transformacja i walidacja wiadomości przychodzących i wychodzących.
6. **Filtry Wyjątków**
   Globalna i lokalna obsługa błędów.
7. **Kontekst (SocketContext)**
   Dostęp do obiektu WebSocket, żądania HTTP i danych sesji.
8. **Wyjątki i Kody Odpowiedzi**
   Standardowe wyjątki i zamykanie połączeń.
9. **Notyfikacje**
   Komunikacja między kontrolerami oraz z zewnętrznych modułów.

## Architektura

### Kontrolery (Controllers)
W Socketeer kontroler jest **singletonem** dla konkretnej instancji trasy (URL bez query params). Oznacza to, że jeśli wielu klientów łączy się z tą samą ścieżką (np. `/chat/1`), wszyscy współdzielą tę samą instancję kontrolera. Jest to idealne rozwiązanie do implementacji pokojów czatowych, gier czy systemów powiadomień w czasie rzeczywistym.

### Potoki (Pipes)
Pipes służą do transformacji i walidacji danych wejściowych i wyjściowych. Możesz je łączyć w łańcuchy, np. zamiana `Buffer` na `string`, a następnie `string` na `object`.

### Strażnicy (Guards)
Guards pozwalają na zabezpieczenie połączenia przed jego nawiązaniem. Idealne do integracji z systemami JWT lub sesjami.
