"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonParsePipe = void 0;
const SocketeerException_1 = require("../../exception/SocketeerException");
class JsonParsePipe {
    transform(value) {
        try {
            if (typeof value === 'object')
                return value;
            return JSON.parse(value);
        }
        catch (e) {
            throw new SocketeerException_1.SocketeerException('Invalid JSON', 400, false);
        }
    }
}
exports.JsonParsePipe = JsonParsePipe;
