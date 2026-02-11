import { SOCKETEER_STATUSES } from "../constants/SOCKETEER_STATUSES";
import { SocketeerException } from "./SocketeerException";


const s = SOCKETEER_STATUSES.BAD_REQUEST;


export class BadRequestException extends SocketeerException {

  constructor(message: string = s.status) {
    super(message, s.code);
  }
}