import { SOCKETEER_STATUSES } from "../constants/SOCKETEER_STATUSES";
import { SocketeerException } from "./SocketeerException";


const s = SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR;


export class InternalServerErrorException extends SocketeerException {

  constructor(message: string = s.status) {
    super(message, s.code);
  }
}