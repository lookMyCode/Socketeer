import { SOCKETEER_STATUSES } from '../constants/SOCKETEER_STATUSES';


export class SocketeerException extends Error {

  constructor(
    public readonly error: any,
    public readonly code: number = SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.code,
  ) {
    super(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
