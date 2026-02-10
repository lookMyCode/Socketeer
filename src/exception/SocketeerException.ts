import { SOCKETEER_STATUSES } from '../constants/SOCKETEER_STATUSES';

export class SocketeerException extends Error {
  constructor(
    public readonly error: any, // Wiadomość błedu lub obiekt
    public readonly code: number = SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.code, // Kod zamknięcia (opcjonalny, domyślnie Internal Error)
    public readonly close: boolean = false, // Czy rozłączyć?
  ) {
    super(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
