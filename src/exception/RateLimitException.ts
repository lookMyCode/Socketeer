import { SOCKETEER_STATUSES } from '../constants/SOCKETEER_STATUSES';
import { SocketeerException } from './SocketeerException';

export class RateLimitException extends SocketeerException {
  constructor() {
    super(SOCKETEER_STATUSES.TOO_MANY_REQUESTS.status, SOCKETEER_STATUSES.TOO_MANY_REQUESTS.code, true);
  }
}
