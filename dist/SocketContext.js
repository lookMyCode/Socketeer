"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketContext = void 0;
class SocketContext {
    constructor(socket, request, initialPayload) {
        this.socket = socket;
        this.request = request;
        if (initialPayload)
            this.payload = initialPayload;
    }
}
exports.SocketContext = SocketContext;
