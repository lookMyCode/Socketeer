"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitException = void 0;
const SOCKETEER_STATUSES_1 = require("../constants/SOCKETEER_STATUSES");
const SocketeerException_1 = require("./SocketeerException");
class RateLimitException extends SocketeerException_1.SocketeerException {
    constructor() {
        super(SOCKETEER_STATUSES_1.SOCKETEER_STATUSES.TOO_MANY_REQUESTS.status, SOCKETEER_STATUSES_1.SOCKETEER_STATUSES.TOO_MANY_REQUESTS.code, true);
    }
}
exports.RateLimitException = RateLimitException;
