"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferToStringPipe = void 0;
class BufferToStringPipe {
    transform(value) {
        if (Buffer.isBuffer(value)) {
            return value.toString();
        }
        if (value instanceof ArrayBuffer || Array.isArray(value)) { // Basic check
            return Buffer.from(value).toString();
        }
        return String(value);
    }
}
exports.BufferToStringPipe = BufferToStringPipe;
