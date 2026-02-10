"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketeerException = void 0;
const SOCKETEER_STATUSES_1 = require("../constants/SOCKETEER_STATUSES");
class SocketeerException extends Error {
    constructor(error, // Wiadomość błedu lub obiekt
    code = SOCKETEER_STATUSES_1.SOCKETEER_STATUSES.INTERNAL_SERVER_ERROR.code, // Kod zamknięcia (opcjonalny, domyślnie Internal Error)
    close = false) {
        super(typeof error === 'string' ? error : JSON.stringify(error));
        this.error = error;
        this.code = code;
        this.close = close;
    }
}
exports.SocketeerException = SocketeerException;
