"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSException = void 0;
const WS_STATUSES_1 = require("../constants/WS_STATUSES");
class WSException extends Error {
    constructor(error, // Wiadomość błedu lub obiekt
    code = WS_STATUSES_1.WS_STATUSES.INTERNAL_SERVER_ERROR.code, // Kod zamknięcia (opcjonalny, domyślnie Internal Error)
    close = false) {
        super(typeof error === 'string' ? error : JSON.stringify(error));
        this.error = error;
        this.code = code;
        this.close = close;
    }
}
exports.WSException = WSException;
